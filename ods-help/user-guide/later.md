# Доработки после MVP (backlog)

См. также: [implement-feedback-guide.md](./implement-feedback-guide.md).

Заметки по пилоту на **http://localhost:8080** (Docker `--profile full`).
В спеки выносим по мере необходимости (`002`, `003`, `004-mvp-runtime`).

**Статус (2026-07-09):** MVP `002` + `003` для локального пилота **принят** — импорт (`local_path`, Git URL), sync, дерево, файлы, DELETE проекта работают. База локальная, работает один разработчик — известные ограничения ниже **пока допустимы**.

---

## Контекст

- Список `/projects` = записи в Elasticsearch (volume `es-data`). `down` без `-v` проекты **не** удаляет.
- Идемпотентность: точное совпадение `(source_type, source_value)` → тот же проект, без дубликата.
- Повторный импорт с **новым именем** того же пути/URL → сначала **Удалить** проект (или `down -v` для полной очистки).
- Импорт в Docker: `local_path` = `/repos/...` (mount `docker/fixtures/repos` → `/repos`).
- Git URL: backend клонирует в volume `ods-mvp_ods-data` (`working-copies/<id>`). Публичный и private GitHub по HTTPS **работают** из контейнера (есть `git` в образе).

Полная очистка ES (редко):

```bash
docker compose -f docker/docker-compose.dev.yml --profile full down -v
docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
```

---

## Сделано (не backlog)

| Тема | Где | Примечание |
|------|-----|------------|
| DELETE проекта + кнопка «Удалить» | `002` US5, `003` US6 | Каскад ES, WC для `git_url`, повторный импорт с новым именем |
| Откат при ошибке `prepareProject` | `002` T053 | Нет «висящего» проекта с `idle` после неудачного импорта |
| Sync: зависшее «Синхронизация уже выполняется» | код `useSync` + `project.service` | Гонка 409 / статус `running` (вне speckit, 2026-07-09) |
| Столбец «Действия» в таблице проектов | `003` T058 | Заголовки: Имя, Источник, Статус sync, Последний sync, Ошибка, Действия |
| Подсветка открытого проекта на `/projects` | `003` T059 | `activeProjectId` → строка + метка «открыт» |

---

## Backlog

| # | Проблема | Симптом | Решение | Спека |
|---|----------|---------|---------|-------|
| 2 | Дубликаты одного репо | `/repos/sample-project` и `/Users/.../sample-project` — два проекта | Нормализация `source_value`; предупреждение в UI | `002` |
| 3 | Тесты засоряют ES | После `npm test` — `Perf Bulk`, `Large Repo` в списке | Изолированный ES / cleanup в `afterAll` | `002` tests, `004` |
| 4 | Прерванный sync | После рестарта backend: `failed` «Синхронизация прервана…» | Статус `interrupted` или авто-retry; UX сообщения | `002`, `003` |
| 5 | Путь не для окружения | Импорт `/Users/...` в Docker → «путь недоступен» | Подсказки на Import: Docker → `/repos/...` | `003` |
| 7 | Жизненный цикл данных | Неочевидно про `down -v` vs DELETE одного проекта | Уже в [commands-run-project.md](./commands-run-project.md); опционально — блок в UI | docs, `003` |
| **8** | **Токен Git в `source_value` и в UI** | Private repo: `https://ghp_…@github.com/org/repo.git` **целиком** в колонке «Источник», в ES, в API | См. детали ниже; **для локального соло-пилота пока оставляем как есть** | `002`, `003` |

Пункты **#1** (DELETE) и **#6** (`idle` после failed import) — закрыты, см. таблицу «Сделано».

---

## 8. Private Git URL: токен в URL и отображение в списке

**Проверено на пилоте (2026-07-09):**

- Публичный Git URL (`https://github.com/.../repo.git`) — импорт и sync OK, clone в `ods-mvp_ods-data`.
- Private repo через PAT в URL (`https://<token>@github.com/org/repo.git`) — **технически работает** (clone/pull из backend-контейнера).

**Проблема (безопасность и UX):**

- PAT хранится в Elasticsearch в поле `source_value` **в открытом виде**.
- На `/projects` в колонке «Источник» показывается полный URL с токеном (`ProjectListPage` выводит `project.source_value` как есть).
- Токен может попасть в логи, бэкап `es-data`, скриншоты.

**Сейчас (осознанно для локальной базы):** не маскируем — работает один человек, риск приемлем до выхода за пределы машины.

**Целевое решение (post-MVP):**

| Уровень | Что сделать |
|---------|-------------|
| UI (быстро) | `maskGitUrl()` — в списке показывать `github.com/org/repo`, без `user:password@` / `ghp_…@` |
| Backend (правильно) | В ES хранить **чистый** URL без секрета; PAT — `GITHUB_TOKEN` в `docker/.env` или отдельное защищённое поле; clone с подстановкой credentials на сервере |
| Import UI | Отдельное поле «токен» (password), не попадающее в список проектов |
| Операционка | Не вставлять PAT в чаты, issues, скриншоты; при утечке — revoke на GitHub |

**Обход без доработки кода:** клон на хост в `docker/fixtures/repos/` → импорт `local_path` `/repos/...` (токен в `.git/config` клона, не в ES).

---

## Краткие детали (остальной backlog)

### 2. Дубликаты путей

`ProjectService.register()` сравнивает `source_value` как строку. Один физический репозиторий с разными путями → несколько UUID.

### 3. Тесты и ES

`children-pagination.perf.test.ts`, `large-repo.test.ts` — `POST /projects` на `:9200`, cleanup проектов в `afterAll` нет.

### 4. Прерванный sync

`recoverInterruptedSyncs()` при старте backend: `running` → `failed`. В UI выглядит как ошибка пользователя; повторный sync из меню обычно помогает.

### 5. Подсказки Import

Корректно в Docker: `/repos/sample-project` ([fixtures README](../../docker/fixtures/repos/README.md)).

---

## Куда в спеках (черновик)

| Тема | Кандидат |
|------|----------|
| Маскировка Git URL, PAT вне `source_value` | `002` API + `003` UI |
| Нормализация путей, дубликаты | `002` |
| Изоляция тестов ES | `004-mvp-runtime` |
| Подсказки Import, статусы sync | `003`, `002` |

---

## Ссылки

- [commands-run-project.md](./commands-run-project.md) — Docker, импорт, `down -v`
- [commands.md](./commands.md) — Spec Kit
- [docker/fixtures/repos/README.md](../../docker/fixtures/repos/README.md) — `/repos/...`
- `backend/src/services/workspace.service.ts` — `git clone` / `local_path`
- `frontend/src/pages/ProjectListPage.tsx` — колонка «Источник»
