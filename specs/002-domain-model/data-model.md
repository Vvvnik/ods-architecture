# Модель данных: Backend MVP

**Спека**: [spec.md](./spec.md)

## Обзор хранилищ

| Слой | Технология | Содержимое |
|------|------------|------------|
| Метаданные | Elasticsearch | Project, ProjectElement |
| Файлы | Filesystem | Рабочая копия git-репозитория |

`working_copy_root` в документе Project — абсолютный путь на диске backend.

## Индекс `ods-projects`

Документ = один проект.

| Поле | Тип ES | Описание |
|------|--------|----------|
| `id` | keyword | UUID, document `_id` |
| `name` | text + keyword | Отображаемое имя |
| `source_type` | keyword | `git_url` \| `local_path` |
| `source_value` | keyword | URL или путь |
| `working_copy_root` | keyword | Путь WC на диске |
| `created_at` | date | ISO-8601 |
| `last_sync_at` | date \| null | |
| `sync_status` | keyword | idle, running, success, failed, partial |
| `last_error_message` | text | nullable |

**Уникальность:** `source_type` + `source_value` — один проект (FR идемпотентность
регистрации). Реализация: search перед insert.

## Индекс `ods-elements`

Документ = файл или папка.

| Поле | Тип ES | Описание |
|------|--------|----------|
| `id` | keyword | UUID, `_id` |
| `project_id` | keyword | FK → Project |
| `path` | keyword | Относительный путь POSIX (`src/index.ts`) |
| `parent_path` | keyword | `""` для корня; иначе путь родителя |
| `type` | keyword | `file` \| `directory` |
| `status` | keyword | ElementStatus |
| `is_active` | boolean | false = soft-delete после sync |
| `status_manually_set` | boolean | true если пользователь менял статус |

`status_manually_set` — внутреннее поле для правила reactivate (сохранить статус).

### ElementStatus

`auto_found` | `needed` | `not_needed` | `found` | `unused`

## Запросы

### Список проектов

Sort: `last_sync_at` desc (missing last).

### Дети папки (пагинация)

```text
project_id = :id
AND parent_path = :parent
AND is_active = true
```

Sort: `type` asc (directories first), `path.keyword` asc.  
From/size: `offset`, `limit` (max 100).

### Уникальность path в проекте

При sync: upsert по `(project_id, path)`; не создавать второй активный документ.

## Удаление проекта (hard-delete)

Операция `DELETE /api/v1/projects/{id}` (FR-013). Отличие от soft-delete элементов
при sync (`is_active=false`):

| Шаг | Действие |
|-----|----------|
| 1 | Проверка: проект существует; `sync_status` ≠ `running` |
| 2 | ES `ods-elements`: delete_by_query `project_id = :id` (все записи, в т.ч. `is_active=false`) |
| 3 | ES `ods-graph-nodes`: delete_by_query `project_id = :id` — **006** T053, индексы [`006/elasticsearch-indices.md`](../../006-project-graph/contracts/elasticsearch-indices.md) |
| 4 | ES `ods-graph-edges`: delete_by_query `project_id = :id` — **006** T053 |
| 5 | ES `ods-projects`: delete document `_id = :id` |
| 6 | FS: если `source_type=git_url` — удалить `working_copy_root` рекурсивно |
| 7 | FS: если `source_type=local_path` — не изменять `source_value` (mount) |

После удаления пара `(source_type, source_value)` снова свободна для `POST /projects`.

**Не затрагивает:** другие проекты, volume `es-data` целиком, mount `/repos`.

**Post-MVP (`005-code-analysis`, `006-project-graph`):** при DELETE дополнительно каскад:

| Спека | Индексы |
|-------|---------|
| `005` | `ods-language-reports`, `ods-analysis-runs`, `ods-parser-envelopes`, `ods-sync-snapshots` |
| `006` | `ods-graph-nodes`, `ods-graph-edges` |

Детали — [`005/data-model.md`](../../005-code-analysis/data-model.md) (§DELETE) и
[`006/data-model.md`](../../006-project-graph/data-model.md) (§DELETE).
Реализация каскада графа — **006** T053 (`ods-graph-nodes`, `ods-graph-edges`);
артефакты анализа — **005** T057.

## Sync — алгоритм (логический)

```text
1. Установить project.sync_status = running
2. Обновить WC:
   - git_url: clone (первый раз) или pull
   - local_path: использовать source_value как корень сканирования
3. Обойти дерево файлов (исключить .git)
4. Для каждого path:
   - есть в ES → обновить type, is_active=true
   - нет → insert, status=auto_found
5. Для элементов ES проекта не встреченных в скане → is_active=false
6. project.sync_status = success | partial | failed
7. project.last_sync_at = now
```

**partial:** ошибки на отдельных путях (битые symlink), но основное дерево построено.

## FileContent (не в ES)

Ответ API, не персистируется:

| kind | Условие |
|------|---------|
| `text` | UTF-8 текст |
| `not_text` | бинарный |
| `error` | `error_code`: `encoding_unsupported`, `file_not_available` |

## Переходы sync_status

```text
idle → running (register или POST sync)
running → success | failed | partial
* → running (новый sync, если не running)
running + crash → failed при старте сервиса (recovery job)
```

## Переменные окружения

| Переменная | Пример | Назначение |
|------------|--------|------------|
| `PORT` | 3000 | HTTP |
| `ELASTICSEARCH_URL` | http://localhost:9200 | ES |
| `DATA_ROOT` | /data/ods | WC для git clone |
| `LOCAL_REPOS_MOUNT` | /repos | База для local_path в Docker |
| `GIT_CLONE_DEPTH` | 1 | shallow clone (опционально) |

## Связь с API DTO

Публичные DTO — [openapi.yaml](./contracts/openapi.yaml). Внутренние поля
(`working_copy_root`, `status_manually_set`) в API **не отдаются**.
