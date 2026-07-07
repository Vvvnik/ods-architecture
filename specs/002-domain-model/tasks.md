# Tasks: Модель данных MVP (backend)

**Input**: `specs/002-domain-model/` — plan.md, spec.md, data-model.md, contracts/, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: Не запрошены в spec; приёмка — через quickstart.md (curl) и SC-001–SC-005.

**Organization**: По user stories spec.md; блокер для `003-portal-mvp`.

**Согласование с `003`**: см. раздел [Согласование с порталом](#согласование-с-порталом-003-portal-mvp) и checkpoint'ы **B1–B4**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимостей от незавершённых задач)
- **[Story]**: US1–US4 из spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Инициализация пакета `backend/` и общих настроек

- [x] T001 Создать структуру каталогов `backend/` по plan.md (`src/`, `tests/`, `package.json`, `tsconfig.json`)
- [x] T002 Инициализировать `backend/package.json`: Fastify 4, `@elastic/elasticsearch` 8, `simple-git`, `uuid`, `zod`, `pino`, TypeScript 5, Vitest
- [x] T003 [P] Настроить `backend/tsconfig.json` (strict, ES2022, outDir `dist`)
- [x] T004 [P] Добавить скрипты в `backend/package.json`: `dev`, `build`, `start`, `test`, `lint`
- [x] T005 [P] Создать `backend/.gitignore` (node_modules, dist, .env)
- [x] T006 [P] Добавить `data/` в корневой `.gitignore` (working-copies)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Каркас API, ES, ошибки — блокирует все user stories

**⚠️ CRITICAL**: User story work не начинается до завершения этой фазы

- [x] T007 Реализовать `backend/src/config.ts` (PORT, ELASTICSEARCH_URL, DATA_ROOT, LOCAL_REPOS_MOUNT, GIT_CLONE_DEPTH, zod-валидация)
- [x] T008 Реализовать `backend/src/domain/errors.ts` — коды ApiError (`source_unreachable`, `sync_in_progress`, `encoding_unsupported`, `file_not_available`, `not_found`, `validation_error`)
- [x] T009 Реализовать `backend/src/domain/project.ts` и `backend/src/domain/element.ts` — типы Project, ProjectElement, ElementStatus, sync_status
- [x] T010 Реализовать `backend/src/infra/elasticsearch.ts` — клиент ES, bootstrap индексов `ods-projects` и `ods-elements` по `contracts/elasticsearch-indices.md`
- [x] T011 Реализовать `backend/src/api/plugins/error-handler.ts` — маппинг ошибок в русские сообщения + HTTP-коды (FR-012)
- [x] T012 Реализовать `backend/src/index.ts` — bootstrap Fastify, регистрация плагинов и маршрутов, `GET /health`
- [x] T013 [P] Реализовать `backend/src/repositories/project.repository.ts` — CRUD проекта, поиск по `source_type`+`source_value`
- [x] T014 [P] Реализовать `backend/src/repositories/element.repository.ts` — upsert по `(project_id, path)`, list children с пагинацией, soft-delete batch

**Checkpoint F1**: `npm run dev` + ES → `curl localhost:3000/health` → 200

---

## Phase 3: User Story 1 — Регистрация проекта (Priority: P1) 🎯 MVP

**Goal**: POST регистрации создаёт проект и запускает начальный sync; идемпотентность по источнику

**Independent Test**: `quickstart.md` — регистрация Git URL → проект в `GET /api/v1/projects`; повтор → тот же `id`

### Implementation for User Story 1

- [x] T015 [US1] Реализовать `backend/src/services/workspace.service.ts` — git clone (shallow) и валидация local_path
- [x] T016 [US1] Реализовать `backend/src/services/sync.service.ts` — каркас async sync, lock per project (`sync_in_progress`)
- [x] T017 [US1] Реализовать `backend/src/services/project.service.ts` — register (идемпотентность), запуск начального sync
- [x] T018 [US1] Реализовать `backend/src/api/routes/projects.ts` — `GET /api/v1/projects`, `POST /api/v1/projects`, `GET /api/v1/projects/:projectId`
- [x] T019 [US1] Добавить валидацию тела регистрации (zod) в `backend/src/api/routes/projects.ts`

**Checkpoint B1** *(разблокирует 003 US1)*: регистрация + список проектов работают; sync может быть в статусе `running`

---

## Phase 4: User Story 2 — Синхронизация и дерево (Priority: P1)

**Goal**: Sync строит дерево; дети папки с пагинацией; soft-delete; без `.git`

**Independent Test**: После sync `GET .../elements?parent_path=` возвращает дерево; удалённый файл → `is_active=false`

### Implementation for User Story 2

- [x] T020 [US2] Дополнить `backend/src/services/sync.service.ts` — обход WC, upsert элементов, soft-delete, статусы success/failed/partial
- [x] T021 [US2] Реализовать `backend/src/api/routes/projects.ts` — `POST /api/v1/projects/:projectId/sync` (409 при `sync_in_progress`)
- [x] T022 [US2] Реализовать `backend/src/api/routes/elements.ts` — `GET /api/v1/projects/:projectId/elements` (parent_path, limit≤100, offset)
- [x] T023 [US2] Recovery при старте: проекты в `running` → `failed` в `backend/src/index.ts` или отдельном bootstrap-хуке

**Checkpoint B2** *(разблокирует 003 US2–US3)*: sync + дерево с пагинацией; SC-001 backend

---

## Phase 5: User Story 3 — Просмотр содержимого файла (Priority: P1)

**Goal**: Read-only чтение UTF-8; `not_text`; ошибки кодировки и неактивного файла

**Independent Test**: `GET .../elements/:id/content` — text / not_text / error

### Implementation for User Story 3

- [x] T024 [US3] Реализовать `backend/src/services/file-content.service.ts` — чтение с диска, детект бинарных, UTF-8, `file_not_available` для `is_active=false`
- [x] T025 [US3] Реализовать `backend/src/api/routes/elements.ts` — `GET /api/v1/projects/:projectId/elements/:elementId/content`
- [x] T026 [US3] Реализовать `backend/src/api/routes/elements.ts` — `GET /api/v1/projects/:projectId/elements/:elementId` (метаданные узла)

**Checkpoint B3** *(разблокирует 003 FileViewer)*: полная цепочка дерево → содержимое файла

---

## Phase 6: User Story 4 — Статус элемента (Priority: P2)

**Goal**: PATCH статуса; сохранение `status_manually_set`; дефолт `auto_found`

**Independent Test**: PATCH status → перечитать элемент → статус сохранён после рестарта

### Implementation for User Story 4

- [x] T027 [US4] Дополнить `backend/src/repositories/element.repository.ts` — update status + `status_manually_set`
- [x] T028 [US4] Реализовать `backend/src/api/routes/elements.ts` — `PATCH /api/v1/projects/:projectId/elements/:elementId` (body: status)
- [x] T029 [US4] Правило reactivate в `backend/src/services/sync.service.ts` — сохранять ручной статус при повторном появлении файла

**Checkpoint B4** *(разблокирует 003 US5)*: смена статуса через API

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Docker, контракт, приёмка

- [x] T030 [P] Создать `backend/Dockerfile` (multi-stage, Node 20 alpine)
- [x] T031 [P] Проверить сервис `backend` в `docker/docker-compose.dev.yml` (профиль `full`, env, volumes, depends_on ES)
- [x] T032 Сверить `specs/002-domain-model/contracts/openapi.yaml` с реализованными маршрутами; обновить при расхождении
- [x] T033 [P] Уведомить владельца `003`: обновить `specs/003-portal-mvp/contracts/api-consumer.yaml` после T032
- [x] T034 Прогнать сценарии `specs/002-domain-model/quickstart.md` (curl, SC-001–SC-005)
- [x] T035 [P] Unit-тесты Vitest: `backend/tests/unit/sync.service.test.ts`, `backend/tests/unit/file-content.service.test.ts`
- [x] T036 [P] Integration-тест API: `backend/tests/integration/projects.test.ts` (register, sync, tree, content)
- [x] T037 [P] Обработка симлинков в `backend/src/services/sync.service.ts` — обход; битые symlink → `partial` + отчёт, sync не падает целиком
- [x] T038 [P] Бенчмарк SC-004: `backend/tests/integration/children-pagination.perf.test.ts` — папка 500+ элементов, первая страница (≤100) < 2 с на пилотном железе
- [x] T039 [P] Smoke большого репозитория: `backend/tests/integration/large-repo.test.ts` — 1000+ файлов, sync завершается success/partial < 60 с
- [x] T040 Документировать фикстуры: `docker/fixtures/repos/README.md` — как добавить тестовый репозиторий для quickstart

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **User Stories (Phase 3–6)** → **Polish (Phase 7)**
- US2 зависит от US1 (проект должен существовать)
- US3 зависит от US2 (элементы в дереве)
- US4 зависит от US2 (активные элементы)

### User Story Dependencies

| Story | Зависит от | Checkpoint для 003 |
|-------|------------|-------------------|
| US1 | Phase 2 | **B1** — Import + список |
| US2 | US1 | **B2** — Sync + FileTree |
| US3 | US2 | **B3** — FileViewer |
| US4 | US2 | **B4** — смена статуса |

### Parallel Opportunities

- Phase 1: T003–T006 параллельно после T002
- Phase 2: T013, T014 параллельно после T010
- Phase 7: T030, T031, T033, T035, T036, T037, T038, T039 параллельно

### Parallel Example: Phase 2

```bash
# После T010:
Task T013: project.repository.ts
Task T014: element.repository.ts
```

---

## Согласование с порталом (`003-portal-mvp`)

| Checkpoint | Задачи 002 | Что может начать 003 |
|------------|------------|----------------------|
| **B1** | T015–T019 | API-клиент, ImportPage, ProjectListPage |
| **B2** | T020–T023 | WorkspacePage, Sync, FileTree |
| **B3** | T024–T026 | FileViewer, ElementProperties (read) |
| **B4** | T027–T029 | селект статуса в правой панели |
| **Full** | T030–T040 + 003 docker | `docker compose --profile full`, SC-006 |

**Порядок MVP:** завершить **B2** до активной работы над FileTree в 003; **B3** до FileViewer.

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1–2 → Foundation
2. US1 → B1 (портал: импорт/список)
3. US2 → B2 (портал: рабочее место + дерево)
4. US3 → B3 (просмотр файла end-to-end)
5. US4 + 003 US5 → полный UX статусов
6. Polish + 003 Polish → compose full stack

### Incremental Delivery

Каждый checkpoint даёт работающий API-срез для параллельной разработки frontend.

---

## Notes

- Канон API: `specs/002-domain-model/contracts/openapi.yaml`
- Портал потребляет тот же контракт; при изменении — синхронизировать `003/contracts/api-consumer.yaml`
- SC-005 `002` = SC-006 `003` (цепочка только через UI)
