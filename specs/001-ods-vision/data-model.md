# Data Model: ODS-портал MVP

**Дата**: 2026-06-27  
**Обновлено**: 2026-06-27 (только Elasticsearch; spec v1.5.0)  
**Scope**: FR-001–FR-011 (MVP портала). Post-MVP — справочно.

## Обзор

```
Elasticsearch (единый кластер)
├── portal-projects
├── portal-elements      ← дерево, статусы
├── portal-sync-jobs
├── portal-document-links
└── (post-MVP) nodes | edges | files
```

Содержимое текстовых файлов — **рабочая копия** на диске.  
Метаданные, статусы, связи — **Elasticsearch** (FR-007).

Все запросы к индексам портала фильтруются по `project_id`.

---

## Индекс: `portal-projects`

Документ = проект.

| Поле | Тип ES | Правила |
|------|--------|---------|
| id | keyword | document `_id` (UUID) |
| name | keyword + text | unique |
| source_type | keyword | `local` \| `git` |
| source_uri | keyword | путь или Git URL |
| working_copy_path | keyword | e.g. `/workspace/repos/{id}` |
| last_sync_at | date | |
| last_sync_status | keyword | `pending`, `running`, `success`, `failed` |
| last_sync_error | text | |
| created_at | date | |
| updated_at | date | |

---

## Индекс: `portal-elements`

Документ = узел дерева (файл или папка).

| Поле | Тип ES | Правила |
|------|--------|---------|
| id | keyword | `_id` (UUID) |
| project_id | keyword | обязательный фильтр |
| path | keyword | относительный путь |
| parent_path | keyword | для lazy tree |
| kind | keyword | `file` \| `directory` |
| status | keyword | см. ниже |
| is_document | boolean | по расширению |
| disk_present | boolean | false если удалён при sync |
| content_hash | keyword | SHA-256, только files |
| last_seen_sync_id | keyword | |

**Unique**: `(project_id, path)` — enforced в application layer (search + index).

### Статусы (FR-005)

| Значение | UI (RU) |
|----------|---------|
| `auto_discovered` | найдено автоматически |
| `needed` | нужен |
| `not_needed` | не нужен |
| `found` | найден |
| `unused` | не используется |

---

## Индекс: `portal-sync-jobs`

| Поле | Тип ES | Правила |
|------|--------|---------|
| id | keyword | `_id` |
| project_id | keyword | |
| status | keyword | |
| started_at | date | |
| finished_at | date | |
| files_added | integer | |
| files_updated | integer | |
| files_removed | integer | |
| error_message | text | |

---

## Индекс: `portal-document-links`

| Поле | Тип ES | Правила |
|------|--------|---------|
| id | keyword | `_id` |
| project_id | keyword | |
| code_element_id | keyword | → portal-elements |
| document_element_id | keyword | → portal-elements |
| code_path | keyword | denormalized для UI |
| document_path | keyword | denormalized |
| note | text | optional |
| created_at | date | |

---

## SessionContext (client-side)

| Поле | Описание |
|------|----------|
| active_project_id | текущий проект |
| open_file_paths | вкладки |
| file_open_hash | hash при открытии (FR-011) |

---

## Post-MVP индексы (тот же Elasticsearch)

См. `ods-help/requirements/canonical-graph-model.md`:

| Индекс | Сущность | Ключевые поля |
|--------|----------|---------------|
| `nodes` | class, method, … | id, kind, name, language, parentId, location |
| `edges` | calls, inherits, … | from, to, type, language |
| `files` | метаданные файлов | path, hash, stats |

Фильтр: `project_id` / `repo_id`.

| Сущность | Индекс / хранение | Спека |
|----------|-------------------|-------|
| GraphifyRun | артефакты на диске + meta в ES | 007-graphify-integration |
| User / Role | post-MVP | FR-018 |
