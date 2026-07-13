# Tasks: Масштаб UX портала (007)

**Input**: `specs/007-portal-scale-ux/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅ (clarify 2026-07-13); `002`/`003`/`006` реализованы в коде

**Tests**: В spec не запрошен TDD; по `plan.md` — точечные Vitest unit/integration для каскада, hierarchy/search и splitters; смоук — `quickstart.md`

**Organization**: По user stories spec.md (US1 каскад P1 → US2 иерархия P1 → US3 поиск P2 → US4 панели P2)

**Согласование с кодом**: Phase 2 — обязательный аудит существующего `backend/`/`frontend/` (без дублей, reuse паттернов `002`/`006`/`003`, библиотеки из текущих `package.json`)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимости от незавершённых)
- **[Story]**: US1–US4 из spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Зафиксировать точки расширения без нового пакета/репо

- [X] T001 Зафиксировать карту затрагиваемых файлов в секции `## R9. Code reuse audit` файла `specs/007-portal-scale-ux/research.md` (ссылки на `backend/src/repositories/element.repository.ts`, `backend/src/services/sync.service.ts`, `backend/src/api/routes/graph.ts`, `frontend/src/pages/GraphPage.tsx`, `frontend/src/layouts/WorkspaceLayout.tsx`) — без нового файла в `contracts/` и без новых top-level каталогов
- [X] T002 [P] Проверить `backend/package.json` и `frontend/package.json`: **не** добавлять зависимости без явной необходимости из plan (splitters — CSS/pointer events; ES — уже `@elastic/elasticsearch`); при потребности библиотеки — обосновать в комментарии к задаче implement

---

## Phase 2: Foundational — аудит и точки расширения

**Purpose**: Согласовать `007` с кодом прошлых спек; подготовить общие API/ошибки до user stories

**⚠️ CRITICAL**: User story work не начинается до checkpoint **F1**

- [X] T003 **Аудит согласованности кода** — пройти текущую реализацию `002`/`003`/`006` и заполнить `specs/007-portal-scale-ux/research.md` секцию `## R9. Code reuse audit`: (1) что **переиспользовать** as-is (`ElementRepository.updateStatus` как база, `GraphService.listNodes`, `EdgeTable`, zod/AppError/пагинация limit≤100); (2) что **расширить** in-place без копипасты сервисов; (3) **`NodeList` не использовать на `GraphPage`** (плоский список убираем; `NodeList` может остаться только если нужен FileGraphPanel/compat-тестам); (4) уже используемые библиотеки (Fastify, zod, Vitest, React) vs запрет нового UI-kit без нужды; (5) паттерны ES `update_by_query` / `deleteByQuery` из репозиториев `005`/`006` для каскада; (6) карта файлов из T001
- [X] T004 [P] Добавить коды ошибок в `backend/src/domain/errors.ts` — `cascade_too_large`, `cascade_failed` (+ русские сообщения в месте throw/`AppError`) по `contracts/status-cascade.md`
- [X] T005 [P] Расширить zod в `backend/src/api/schemas/graph.schemas.ts` — query `parent_id`, `q` (min 2), ответ search/ancestors по `contracts/openapi-portal-scale.yaml` (reuse существующих GraphNode/GraphEdge schemas)
- [X] T006 Убедиться, что маршруты `elements` и `graph` уже зарегистрированы в `backend/src/index.ts` — только плагин/расширение, без второго router-файла-дубля

**Checkpoint F1**: Аудит R9 записан; коды ошибок и схемы готовы; понятно, какие файлы расширять vs не трогать

---

## Phase 3: User Story 1 — Каскад статуса папки (Priority: P1) 🎯 MVP

**Goal**: PATCH directory → атомарный каскад; lift из `not_needed` без детей; sync наследует `not_needed`

**Independent Test**: `quickstart.md` §1; SC-003 (≥50 потомков или полный отказ)

**Depends on**: **F1**

### Implementation for User Story 1

- [X] T007 [US1] Расширить `backend/src/repositories/element.repository.ts` — `countActiveDescendants(projectId, folderPath)`, `updateStatusCascadeByPath(...)` через один `update_by_query` (folder + prefix), soft-limit **5000** по `contracts/status-cascade.md` / research R1; reuse существующий client/index `ods-elements`
- [X] T008 [US1] Добавить lookup предков в `backend/src/repositories/element.repository.ts` — `findActiveAncestorsByPath` / walk по `parent_path` для sync inheritance (не дублировать дерево на клиенте)
- [X] T009 [US1] Создать оркестрацию в `backend/src/services/element.service.ts` (или расширить тонкий слой у routes, **без** второй копии `updateStatus`) — правила FR-010–013: file-only; directory cascade; lift из `not_needed` только папка; ответ с `cascade.updated_count`
- [X] T010 [US1] Подключить каскад в `backend/src/api/routes/elements.ts` — заменить прямой `elementRepository.updateStatus` на `element.service` / cascade path
- [X] T011 [US1] Обновить `backend/src/services/sync.service.ts` `resolveStatusOnSync` — наследование `not_needed` от предка с `status_manually_set`; у наследника `status_manually_set=false` (research R3)
- [X] T012 [P] [US1] Unit-тесты в `backend/tests/unit/status-cascade.test.ts` — cascade / lift / overwrite child; sync inheritance
- [X] T013 [P] [US1] Integration-тест в `backend/tests/integration/status-cascade.test.ts` — PATCH directory с потомками в ES; 422 при too_large (мок/счётчик)

**Checkpoint A1**: curl/UI — смена статуса папки каскадит; lift не трогает детей; sync наследует `not_needed`

---

## Phase 4: User Story 2 — Иерархия узлов графа (Priority: P1)

**Goal**: `/graph` только деревом по `parent_id`; lazy load; плоский список узлов убран

**Independent Test**: `quickstart.md` §2; SC-001

**Depends on**: **F1** (данные графа из `006`); может идти параллельно с US1 после F1

### Implementation for User Story 2

- [X] T014 [US2] Расширить `backend/src/repositories/graph-node.repository.ts` — `listByParentId(projectId, runId, parentId|root, limit, offset)` + опционально `has_children`; **переиспользовать** существующие filters `project_id`/`analysis_run_id`
- [X] T015 [US2] Расширить `backend/src/services/graph.service.ts` — `listNodes` принимает `parent_id`; добавить `getNodeAncestors` для path-раскрытия (под US3, но API здесь)
- [X] T016 [US2] Расширить `backend/src/api/routes/graph.ts` — query `parent_id` на `GET .../nodes`; `GET .../nodes/:nodeId/ancestors` по openapi `007`
- [X] T017 [US2] Создать `frontend/src/components/graph/GraphNodeTree.tsx` — lazy expand, пагинация детей; стили рядом с существующими `frontend/src/components/graph/*.module.css` (не копировать `FileTree` wholesale — при желании только паттерн loading)
- [X] T018 [US2] Обновить `frontend/src/api/graph.ts` и `frontend/src/api/graph-types.ts` — `listGraphNodes({ parentId, limit, offset })`, `getNodeAncestors`
- [X] T019 [US2] Переписать `frontend/src/pages/GraphPage.tsx` — заменить плоский `NodeList` на `GraphNodeTree`; **не** оставлять режим плоского списка; сохранить `EdgeTable` / empty states из `006`
- [X] T020 [P] [US2] Unit/smoke `frontend/src/components/graph/GraphNodeTree.test.tsx` — expand вызывает API с `parent_id`

**Checkpoint B1**: `/graph` показывает дерево; плоского списка нет

---

## Phase 5: User Story 3 — Поиск по узлам и рёбрам (Priority: P2)

**Goal**: Один `q` → nodes+edges; клик узел → path; клик ребро → edges + `from`

**Independent Test**: `quickstart.md` §3; SC-002

**Depends on**: **B1** (иерархия + ancestors)

### Implementation for User Story 3

- [X] T021 [US3] Расширить `backend/src/repositories/graph-node.repository.ts` и `backend/src/repositories/graph-edge.repository.ts` — `search(q, limit, offset)` multi-match; игнор reserved `filter_*` на уровне route (не реализовывать фасеты)
- [X] T022 [US3] Добавить `GraphService.search` в `backend/src/services/graph.service.ts` — параллельный поиск nodes+edges → `{ q, nodes, edges }`
- [X] T023 [US3] Добавить `GET .../graph/search` в `backend/src/api/routes/graph.ts` — валидация `q` ≥2, русская 400
- [X] T024 [US3] Создать `frontend/src/components/graph/GraphSearch.tsx` — поле, кнопка «Найти», вкладки Узлы/Рёбра, пагинация
  <!-- 2026-07-14: UI Назад/Далее + offset (было marked [X] без пагинации в UI) -->
- [X] T025 [US3] Связать поиск в `frontend/src/pages/GraphPage.tsx` — клик узла: ancestors + expand/scroll/select; клик ребра: `EdgeTable` + select `from` (`contracts/graph-ui-scale.md`)
- [X] T026 [P] [US3] Integration-тест `backend/tests/integration/graph-search.test.ts` — известное имя из фикстуры в первой странице
  <!-- 2026-07-14: добавлен реальный integration (ES+fixture); unit smoke остаётся в tests/unit/ -->

**Checkpoint C1**: поиск находит узел; навигация из результатов работает

---

## Phase 6: User Story 4 — Регулируемая ширина панелей (Priority: P2)

**Goal**: Splitters + `localStorage`; минимумы; без серверного API

**Independent Test**: `quickstart.md` §4; SC-004

**Depends on**: **F1**; независима от US1–US3 (можно после F1 параллельно с осторожностью на те же layout-файлы)

### Implementation for User Story 4

- [X] T027 [US4] Создать `frontend/src/hooks/usePanelWidths.ts` — ключ `ods.workspace.panelWidths.v1`, defaults/minima из `contracts/workspace-panels.md`; без новых npm-зависимостей
- [X] T028 [US4] Встроить разделители только в `frontend/src/layouts/WorkspaceLayout.tsx` + стили в `frontend/src/styles/workspace.css` — clamp, `role="separator"`; **не** дублировать splitters в `WorkspacePage.tsx`
- [X] T029 [P] [US4] Unit-тест `frontend/src/hooks/usePanelWidths.test.ts` — restore из mock `localStorage`, clamp к минимумам

**Checkpoint D1**: reload workspace сохраняет ширины ≤5% погрешности

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Согласованность, регрессии, быстрая приёмка

- [X] T030 Повторная сверка с аудитом R9: нет дублирующих сервисов/репозиториев; `NodeList` не на `GraphPage`; cascade/search не обходят AppError/zod; новых deps в lockfile нет без обоснования; **DoD:** нет migration job для каскада; нет canvas / edit-delete узлов и рёбер в UI — отметить в `specs/007-portal-scale-ux/research.md` «R9 done»
- [X] T031 [P] Прогнать релевантные Vitest: `backend` cascade/search + `frontend` tree/panels; регрессии `006` GraphPage — `GraphNodeTree.test.tsx` / FileGraphPanel (плоский `NodeList.test.tsx` удалён)
- [X] T032 [P] Смоук по `specs/007-portal-scale-ux/quickstart.md` на compose `full` — каскад, дерево, поиск, панели; SC-001 при ≥1000 — опционально вручную (не gate CI)
- [X] T033 Канон scale API: **extension** `contracts/openapi-portal-scale.yaml` (+ R8); полный merge в `002` OpenAPI не обязателен (как graph YAML у `006`)

---

## Dependencies & Execution Order

### Story order

```text
Phase 1–2 (Setup + F1 audit)
    ├── US1 каскад (P1) 🎯 MVP
    ├── US2 иерархия (P1)     ⎫ после F1 можно параллельно с US1
    ├── US4 панели (P2)       ⎭ (избегать одновременного редактирования GraphPage)
    └── US3 поиск (P2) — после B1 (нужны tree + ancestors)
Polish — после выбранных stories
```

### Parallel opportunities

- После **F1**: US1 ∥ US2 ∥ US4 (разные владельцы файлов предпочтительны)
- Внутри US1: T012 ∥ T013 после T011
- Внутри US2: T020 после T017
- US3 только после checkpoint **B1**

### MVP scope

**Минимум для ценности:** Phase 1–2 + **US1 (каскад)** → затем US2 → US3 → US4.

---

## Implementation Strategy

1. Выполнить **T003 аудит** до написания логики — не плодить `ElementRepository2` / второй Graph client.
2. Каскад in-place в `element.repository` + тонкий service; sync — точечный patch `resolveStatusOnSync`.
3. Граф: расширить `graph.service`/`graph.ts`/`graph-node.repository`; UI — новый `GraphNodeTree` + `GraphSearch`, удалить flat list с `GraphPage`.
4. Панели — hook + layout, без npm resizable-kit, если хватает pointer events.
5. Polish: R9 re-check + Vitest + quickstart.

## Task count summary

| Phase | Tasks | Notes |
|-------|-------|-------|
| Setup | T001–T002 | 2 |
| Foundational | T003–T006 | 4 (T003 = code audit) |
| US1 каскад | T007–T013 | 7 |
| US2 иерархия | T014–T020 | 7 |
| US3 поиск | T021–T026 | 6 |
| US4 панели | T027–T029 | 3 |
| Polish | T030–T033 | 4 |
| **Total** | **T001–T033** | **33** |

**Format validation**: все задачи — `- [ ]`, ID, пути файлов; story-лейблы на US-фазах; Setup/Foundational/Polish без `[USx]`.
