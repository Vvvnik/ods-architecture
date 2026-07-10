# Tasks: Граф проекта — канон, ingest, API, UI

**Input**: `specs/006-project-graph/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅; MVP `002` + `003` реализованы; **`005` checkpoint B2+** (envelope в `ods-parser-envelopes`, оркестратор сохраняет envelope)

**Tests**: Не запрошены в spec; приёмка — `quickstart.md` (SC-001–SC-005); Vitest unit/integration — в соответствующих фазах и Polish

**Organization**: По user stories spec.md; backend ingest/API + расширение `frontend/`

**Согласование**: `005` — envelope и hook-точка (**006** T021 закрывает **005** T044); `002` — DELETE каскад; `003` — замена `GraphStubPage`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно
- **[Story]**: US1–US6 из spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Каталоги ingest, тестовые фикстуры

- [X] T001 Создать структуру `backend/src/services/ingest/` и `backend/src/services/ingest/adapters/` по `plan.md`
- [X] T002 [P] Добавить фикстуру native model `backend/tests/fixtures/ingest/typescript-model-v1.json` (минимальный набор symbols + refs для adapter)
- [X] T003 [P] Добавить фикстуру envelope `backend/tests/fixtures/ingest/envelope-typescript-v1.json` по `specs/005-code-analysis/contracts/envelope-schema.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Домен, ES-индексы графа, репозитории, каркас ingest/API — блокирует все user stories

**⚠️ CRITICAL**: User story work не начинается до checkpoint **F1**

- [X] T004 Реализовать `backend/src/domain/graph-node.ts` — типы GraphNode, NodeKind, Location по `data-model.md`
- [X] T005 [P] Реализовать `backend/src/domain/graph-edge.ts` — типы GraphEdge, EdgeType
- [X] T006 Добавить коды в `backend/src/domain/errors.ts` — `graph_not_found`, `graph_node_not_found`, `ingest_adapter_missing`
- [X] T007 Расширить `backend/src/infra/elasticsearch.ts` — bootstrap индексов `ods-graph-nodes`, `ods-graph-edges` по `contracts/elasticsearch-indices.md`
- [X] T008 [P] Реализовать `backend/src/repositories/graph-node.repository.ts` — bulkUpsert, listByProjectAndRun, deleteByQuery (project_id + run + parser_id + paths)
- [X] T009 [P] Реализовать `backend/src/repositories/graph-edge.repository.ts` — bulkUpsert, listByNode, deleteByQuery
- [X] T010 Реализовать `backend/src/services/ingest/types.ts` — IngestAdapter, IngestContext, GraphNodeInput, GraphEdgeInput по `contracts/ingest-pipeline.md`
- [X] T011 Реализовать `backend/src/services/ingest/ingest-registry.service.ts` — register/get по `parser_id`
- [X] T012 Реализовать каркас `backend/src/services/graph.service.ts` — resolveLatestAnalysisRunId: `status` ∈ {success, partial} **и** `ingest_status` ∈ {success, partial} (см. `data-model.md` §Latest run)
- [X] T013 Создать `backend/src/api/routes/graph.ts` и зарегистрировать в `backend/src/index.ts` под `/api/v1/projects/:projectId/graph`
- [X] T014 [P] Добавить zod-схемы в `backend/src/api/schemas/graph.schemas.ts` по `contracts/openapi-graph.yaml`
- [X] T015 [P] Расширить `backend/src/repositories/analysis-run.repository.ts` — `patchIngestMetadata(runId, { ingest_status, ingest_completed_at, ingest_errors })`

**Checkpoint F1**: ES поднимает `ods-graph-*`; реестр ingest пустой; маршрут graph зарегистрирован

---

## Phase 3: User Story 1 — Ingest в канонический граф (Priority: P1) 🎯 MVP

**Goal**: Envelope (`005`) → адаптер → узлы/рёбра в ES; hook после save envelope; оркестратор не парсит `model`

**Independent Test**: `quickstart.md` §1 — после анализа документы в `ods-graph-nodes`/`ods-graph-edges` с корректным `project_id`, `parser_id`

**Инкремент плана**: **A** (индексы + ingest TS + hook)

**Depends on**: **F1**; данные envelope из `005` (stub или `parsers/typescript`)

### Implementation for User Story 1

- [X] T016 [US1] Реализовать `backend/src/services/ingest/node-id.ts` — стабильный id `{parser_id}:{path}:{kind}:{qualified_name}` + суффикс `:line:{start}` при коллизии (research R3)
- [X] T017 [US1] Реализовать `backend/src/services/ingest/ingest.service.ts` — `ingestEnvelope(envelopeId)` по алгоритму `contracts/ingest-pipeline.md` §IngestService
- [X] T018 [US1] Добавить resolve `element_id` в `ingest.service.ts` — lookup `ods-elements` по `(project_id, path)` (research R7, best-effort)
- [X] T019 [US1] Реализовать `backend/src/services/ingest/adapters/typescript.ingest.ts` — `transform(model, ctx)` для `schema_version=1`
- [X] T020 [US1] Зарегистрировать typescript adapter в `ingest-registry.service.ts` при старте backend (`backend/src/index.ts` или DI-модуль)
- [X] T021 [US1] Hook `ingestService.ingestEnvelope` в `backend/src/services/analysis-orchestrator.service.ts` после `saveParserEnvelope` (закрывает **005** T044); оркестратор передаёт только id/envelope DTO
- [X] T022 [US1] Обновлять `ingest_status`, `ingest_errors`, `ingest_completed_at` на `ods-analysis-runs` в `ingest.service.ts` (partial при ошибках адаптера, не throw)
- [X] T023 [P] [US1] Unit-тест adapter в `backend/tests/unit/ingest/typescript.ingest.test.ts` — fixture `typescript-model-v1.json` → ожидаемые nodes/edges
- [X] T024 [P] [US1] Integration-тест в `backend/tests/integration/graph-ingest.test.ts` — envelope doc в ES → ingest → assert counts в `ods-graph-*`

**Checkpoint A1**: curl ES или integration test — узлы после прогона анализа с TS envelope

---

## Phase 4: User Story 2 — Просмотр зависимостей файла через API (Priority: P1)

**Goal**: REST чтения графа: summary, nodes, edges, file dependencies; latest `analysis_run_id` по умолчанию

**Independent Test**: `quickstart.md` §2–§4 — GET summary, file dependencies, node edges; пустой ответ без 500

**Инкремент плана**: **B** (API)

**Depends on**: **A1** (данные в ES)

### Implementation for User Story 2

- [X] T025 [US2] Реализовать `GraphService.getSummary` в `graph.service.ts` — node_count, edge_count, languages
- [X] T026 [US2] Реализовать `GraphService.listNodes` — фильтр path/kind, пагинация limit≤100 (research R9)
- [X] T027 [US2] Реализовать `GraphService.getNodeById` и `getNodeEdges` — direction outgoing|incoming|both, 1 hop
- [X] T028 [US2] Реализовать `GraphService.getFileDependencies` — nodes + edges для path
- [X] T029 [US2] Реализовать `GET /api/v1/projects/:projectId/graph/summary` в `graph.ts` — русские ApiError
- [X] T030 [US2] Реализовать `GET .../graph/nodes` и `GET .../graph/nodes/:nodeId` в `graph.ts`
- [X] T031 [US2] Реализовать `GET .../graph/nodes/:nodeId/edges` в `graph.ts`
- [X] T032 [US2] Реализовать `GET .../graph/files/:filePath/dependencies` в `graph.ts` — decode URI path, query `analysis_run_id` опционально

**Checkpoint B1**: curl file dependencies для известного `.ts` файла после A1

---

## Phase 5: User Story 3 — Минимальный UI «Граф» (Priority: P1)

**Goal**: Замена `GraphStubPage` — список узлов + таблица рёбер; empty state на русском

**Independent Test**: `contracts/graph-ui.md` — `/graph` с анализом показывает узлы; без анализа — подсказка sync+анализ

**Инкремент плана**: **C** (UI)

**Depends on**: **B1** (API)

### Implementation for User Story 3

- [X] T033 [P] [US3] Реализовать `frontend/src/api/graph.ts` — getSummary, listNodes, getNodeEdges, getFileDependencies
- [X] T034 [P] [US3] Дополнить `frontend/src/api/types.ts` типами graph endpoints (после merge OpenAPI или вручную по `openapi-graph.yaml`)
- [X] T035 [US3] Реализовать `frontend/src/hooks/useGraph.ts` — загрузка summary/nodes, выбор узла, пагинация offset
- [X] T036 [US3] Реализовать `frontend/src/components/graph/GraphEmptyState.tsx` — тексты по `contracts/graph-ui.md`
- [X] T037 [P] [US3] Реализовать `frontend/src/components/graph/NodeList.tsx` — клик → выбор узла
- [X] T038 [P] [US3] Реализовать `frontend/src/components/graph/EdgeTable.tsx` — колонки from → to, type, path
- [X] T039 [US3] Реализовать `frontend/src/pages/GraphPage.tsx` — layout по `contracts/graph-ui.md` (без React Flow)
- [X] T040 [US3] Заменить `GraphStubPage` на `GraphPage` в `frontend/src/app/router.tsx`
- [X] T041 [US3] Добавить русские строки графа в `frontend/src/i18n/ru.ts` по `contracts/graph-ui.md` (FR-014)
- [X] T042 [P] [US3] Убрать `graph_stub` из `frontend/src/context/SessionContext.tsx` если больше не используется

**Checkpoint C1**: SC-001 — `/graph` непустой список узлов в течение 10 с после ingest (пилот)

---

## Phase 6: User Story 4 — Инкрементальный ingest (Priority: P2)

**Goal**: Обновление/удаление канона только для затронутых paths; без полной пересборки

**Independent Test**: `quickstart.md` §6 — правка одного файла → изменения только для его path

**Инкремент плана**: **D**

**Depends on**: **A1**; change set из `005` (`analysis_run` / change-set service)

### Implementation for User Story 4

- [X] T043 [US4] Построение `IngestContext.affected_paths` и `deleted_paths` в `ingest.service.ts` из change set прогона (`005`)
- [X] T044 [US4] Реализовать `deleteByPaths` в `graph-node.repository.ts` и `graph-edge.repository.ts` — фильтр project_id + analysis_run_id + parser_id + path ∈ paths
- [X] T045 [US4] Встроить delete-before-upsert в `ingest.service.ts` для incremental (шаги 5a–5c `ingest-pipeline.md`)
- [X] T046 [US4] Для `deleted_paths` — только delete, skip `adapter.transform` в `ingest.service.ts`
- [X] T047 [P] [US4] Integration-тест в `backend/tests/integration/graph-incremental-ingest.test.ts` — два прогона, изменён один path

**Checkpoint D1**: SC-003 — инкремент ≥2× быстрее полной пересборки при ≤5% файлов (пилот)

---

## Phase 7: User Story 5 — Связь графа с деревом файлов (Priority: P2)

**Goal**: Переход узел → файл в workspace; опционально панель «Граф для файла»

**Independent Test**: Узел с `path=src/app.ts` → клик «Открыть файл» → тот же path в workspace

**Depends on**: **C1** (UI), **B1** (file dependencies API)

### Implementation for User Story 5

- [X] T048 [US5] Добавить действие «Открыть файл» в `NodeList.tsx` / `GraphPage.tsx` — navigate `/projects/:id?highlightPath=...`
- [X] T049 [US5] Расширить `frontend/src/pages/WorkspacePage.tsx` (или hook дерева) — выделение элемента по `highlightPath` query param
- [X] T050 [P] [US5] Реализовать `frontend/src/components/graph/FileGraphPanel.tsx` — `getFileDependencies` для выбранного файла
- [X] T051 [US5] Подключить `FileGraphPanel` в `WorkspacePage.tsx` при выборе файла (боковая панель или вкладка)
- [X] T052 [US5] Документировать поведение stale `element_id` в комментарии `ingest.service.ts`; toast-предупреждение в `GraphPage.tsx` если `element_id` не найден в дереве

**Checkpoint E1**: навигация graph ↔ workspace по path

---

## Phase 8: User Story 6 — Очистка при удалении проекта (Priority: P2)

**Goal**: DELETE проекта удаляет все документы `ods-graph-nodes` и `ods-graph-edges`

**Independent Test**: `quickstart.md` §7 — count по `project_id` = 0 после DELETE

**Depends on**: **F1** (репозитории delete_by_query); координация с `005` T057

### Implementation for User Story 6

- [X] T053 [US6] Расширить `backend/src/services/project.service.ts` DELETE — delete_by_query `ods-graph-nodes` и `ods-graph-edges` по `project_id` (вместе с каскадом **005** T057)
- [X] T054 [P] [US6] Integration-тест в `backend/tests/integration/project-delete-graph.test.ts` — ingest → DELETE → count 0
- [X] T055 [P] [US6] Добавить cross-ref в `specs/002-domain-model/data-model.md` (§Удаление проекта) на индексы `006` `ods-graph-*`

**Checkpoint F-delete**: SC-005 — 0 документов графа после DELETE

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Адаптеры C#/Python/C++, OpenAPI merge, приёмка, документация

**Инкременты плана**: **E–G** (адаптеры синхронно с парсерами `005`)

- [X] T056 [P] Реализовать `backend/src/services/ingest/adapters/csharp.ingest.ts` — `model` v1 (после `005` checkpoint D1)
- [X] T057 [P] Реализовать `backend/src/services/ingest/adapters/python.ingest.ts` — `model` v1 (после `005` E1)
- [X] T058 [P] Реализовать `backend/src/services/ingest/adapters/cpp.ingest.ts` — `model` v1 (после `005` F1)
- [X] T059 Зарегистрировать csharp/python/cpp adapters в `ingest-registry.service.ts`
- [X] T060 Расширить `specs/002-domain-model/contracts/openapi.yaml` — merge paths/components из `specs/006-project-graph/contracts/openapi-graph.yaml` (версия → 1.3.0)
- [X] T061 [P] Обновить `specs/003-portal-mvp/contracts/api-consumer.yaml` — зеркало graph endpoints
- [X] T062 Запустить сценарии `specs/006-project-graph/quickstart.md` на `docker compose --profile full` (включая §7 DELETE — каскад `005`+`006`) — зафиксировать находки в `ods-help/user-guide/implement-feedback-guide.md` при необходимости
- [ ] T063 [P] Опционально: e2e Playwright `frontend/tests/e2e/graph-page.spec.ts` — анализ → `/graph` → выбор узла (SC-004)
- [ ] T064 [P] Опционально: benchmark в `backend/tests/performance/ingest-incremental.bench.ts` — SC-003
- [X] T065 [P] Обновить `ods-help/user-guide/commands.md` — шаг `speckit-implement specs/006-project-graph`
- [X] T067 [P] Добавить fixture `backend/tests/fixtures/graph/expected-file-dependencies.json` и integration-тест SC-002 в `backend/tests/integration/graph-file-dependencies.test.ts` — 100% ожидаемых рёбер фикстуры
- [X] T066 Обновить статус в `specs/006-project-graph/spec.md` — «Черновик (spec/plan/tasks готовы)»

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US2 (4)** → **US3 (5)** → **US4 (6)** → **US5 (7)** → **US6 (8)** → **Polish (9)**
- US2–US3 требуют данных из US1; US4 расширяет US1; US5 требует US2+US3; US6 можно начать после F1 параллельно с US2–US3 (но интеграционный тест T054 — после A1)

### User Story Dependencies

| Story | Зависит от | Checkpoint |
|-------|------------|------------|
| US1 | F1, envelope `005` | A1 |
| US2 | A1 | B1 |
| US3 | B1 | C1 |
| US4 | A1, change set `005` | D1 |
| US5 | B1, C1 | E1 |
| US6 | F1 (репозитории); тест после A1 | F-delete |

### Parallel Opportunities

- Phase 1: T002, T003 параллельно
- Phase 2: T005, T008–T009, T014–T015 параллельно после T004/T006/T007
- US1: T023, T024 параллельно после T022
- US2: T025–T028 последовательно в service; T029–T032 можно разбить по файлам route handlers [P] после service
- US3: T033–T034, T037–T038, T042 параллельно; T039 после компонентов
- US4: T047 параллельно после T046
- US5: T050 параллельно с T048–T049
- US6: T054, T055 параллельно после T053
- Polish: T056–T058 параллельно после соответствующих парсеров `005`; T061, T063–T065 параллельно

### Parallel Example: US1

```bash
# После T022:
T023 unit/typescript.ingest.test.ts
T024 integration/graph-ingest.test.ts
```

### Parallel Example: Polish adapters (после парсеров 005)

```bash
T056 csharp.ingest.ts
T057 python.ingest.ts
T058 cpp.ingest.ts
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1–2 → **F1**
2. Phase 3 (US1) → **A1**
3. **STOP**: ingest в ES после анализа; проверка через integration test / ES

### Инкремент A (ingest TS)

1. F1 → US1 → **A1**

### Инкремент B (API)

1. A1 → US2 → **B1**

### Инкремент C (UI)

1. B1 → US3 → **C1** — полная цепочка 005 → 006 для пользователя (SC-001)

### Инкремент D (инкремент)

1. C1 → US4 → **D1**

### Инкремент E (навигация + DELETE)

1. US5 → **E1**; US6 → **F-delete** (можно параллельно US5)

### Полная приёмка

1. Polish T056–T062 + quickstart + SC-001–SC-005

---

## Notes

- **Граница 005/006**: только `IngestService` и adapters интерпретируют `model`; hook в orchestrator — **006** T021 (не путать с **005** T021 = детектор после sync)
- **`_id` ES**: `{analysis_run_id}:{id}` для nodes/edges (см. `contracts/elasticsearch-indices.md`)
- Адаптеры C#/Python/C++ (T056–T059) — **после** соответствующих парсеров `005`; MVP = typescript only
- `FileGraphPanel` (T050–T051) — post-MVP в `graph-ui.md`, но включён в tasks как P2 US5
- Русские сообщения — `errors.ts` + `i18n/ru.ts` + ApiError в routes
- `[P]` — разные файлы, нет зависимости от незавершённых задач в той же группе
