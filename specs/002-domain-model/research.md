# Research: Backend — модель данных MVP

**Дата**: 2026-07-08

## R1. HTTP-фреймворк

**Decision:** Fastify 4.

**Rationale:** TypeScript-first, быстрый, встроенная схема/валидация, удобен
для OpenAPI-подобных маршрутов.

**Alternatives:** Express — больше бойлерплата; NestJS — избыточен для MVP API.

## R2. Клиент Elasticsearch

**Decision:** `@elastic/elasticsearch` v8, официальный JS-клиент.

**Rationale:** Согласовано со spec (`001`, `002`); JSON-документы без ORM.

**Alternatives:** PostgreSQL — отклонено в `001` для метаданных MVP.

## R3. Индексация ES

**Decision:** Два индекса `ods-projects`, `ods-elements`; элементы с полем
`project_id` + keyword `path`; уникальность `(project_id, path)` на уровне
приложения при sync (FR-007).

**Rationale:** Простая модель; пагинация детей через bool filter +
`parent_path.keyword`.

**Alternatives:** Один индекс nested — сложнее запросы дерева.

## R4. Git sync

**Decision:** `simple-git` — clone при первом sync URL, `pull` при повторном.

**Rationale:** Достаточно для MVP пилота; без push/merge (вне scope).

**Alternatives:** Нативный `git` subprocess — меньше контроля ошибок.

## R5. Local path sync

**Decision:** `source_type=local_path` — чтение каталога напрямую (без копирования)
или однократное копирование в `working_copy_root` при первой регистрации;
повторный sync — повторное сканирование источника.

**Rationale:** Пилот: путь смонтирован в контейнер backend (`LOCAL_REPOS_MOUNT`).

**Default для MVP:** сканирование **источника** `source_value` если доступен;
метаданные WC в `DATA_ROOT` только для `git_url` clone.

## R6. Асинхронный sync

**Decision:** POST sync → `sync_status=running` → фоновая задача в том же процессе
(in-memory lock `Map<projectId, boolean>`); при рестарте — `running` → `failed`
с сообщением «sync прерван».

**Rationale:** FR sync_in_progress; без Redis/очереди в MVP.

**Alternatives:** BullMQ — post-MVP при масштабировании.

## R7. Определение бинарных файлов

**Decision:** Проверка null-byte в первых 8KB или `file`-magic; иначе попытка
UTF-8 decode; при ошибке — `encoding_unsupported`.

**Rationale:** FR-010, edge cases spec.

## R8. Идентификаторы

**Decision:** UUID v4 для `id` проекта и элемента; `element.id` стабилен при
reactivate того же `path`.

**Rationale:** PATCH по `elementId`; reactivate обновляет `is_active`, не создаёт
новый id если path совпадает.

## R9. Docker dev stack

**Decision:** `docker/docker-compose.dev.yml` — профиль по умолчанию: только
`elasticsearch`; профиль `full`: `elasticsearch` + `backend` + `frontend` (nginx).
Фикстуры — `docker/fixtures/repos/`. Спека `004-mvp-runtime` формализует
smoke/CI; не блокирует разработку `002`/`003`.

**Rationale:** Единый каталог `docker/` для обеих спек MVP; `004` — приёмка runtime.

## R10. Согласование OpenAPI с `003`

**Decision:** Канонический файл в `002/contracts/openapi.yaml`; копия потребителя
в `003` ссылается на него; CI/check — сравнение hash или ручной `/speckit-analyze`.

**Rationale:** Один источник правды для контракта.

## R11. Удаление проекта (инкремент 2026-07-08)

**Decision:** `DELETE /api/v1/projects/{projectId}` → HTTP 204 без тела.

**Порядок операций:**

1. Загрузить проект; если нет — `not_found` (404).
2. Если `sync_status=running` — `sync_in_progress` (409).
3. Снять in-memory sync lock для `projectId` (если есть).
4. ES: `delete_by_query` всех `ods-elements` с `project_id`; удалить документ
   `ods-projects`.
5. Filesystem: для `git_url` — рекурсивно удалить `working_copy_root`
   (`DATA_ROOT/working-copies/{id}`); для `local_path` — **ничего** (mount RO).

**Rationale:** FR-013, US5; освобождает `(source_type, source_value)` для новой
регистрации; не трогает другие проекты и volumes целиком.

**Alternatives:**

- Soft-delete проекта (`is_deleted`) — отложено; усложняет список и идемпотентность.
- Удаление при `running` — отклонено (риск гонки с фоновым sync).
