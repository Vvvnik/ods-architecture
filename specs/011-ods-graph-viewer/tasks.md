# Tasks: Просмотр графа системы (011)

**Input**: `specs/011-ods-graph-viewer/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-15); `006`–`010` реализованы

**Tests**: unit slice-builder; contract/integration `GET .../graph/view`; frontend selection≠focus / empty / truncate; регресс меню «Граф анализ» (plan Testing + SC)

**Organization** (по priority): US1 меню P1 → US2 карта Система P1 → US3 вход/фокус P1 → US6 усечение/empty P1 → US4 крошки P2 → US5 связка анализ↔просмотр P2 → Polish

**DoD MVP**: только system-навигация. Follow-up «до дна» code — tracking в Polish (SC-008), не implement.

**Язык**: русский (конституция)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимости от незавершённых)
- **[Story]**: US1–US6 из spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Зависимости frontend, каркас каталогов, сверка контрактов

- [ ] T001 Добавить `@xyflow/react` и **`@dagrejs/dagre`** (дефолт layout; ELK только если dagre не подойдёт) в `frontend/package.json` + lockfile
- [ ] T002 [P] Создать каркас `frontend/src/components/graph-view/` (placeholder README или пустые index) и `frontend/src/pages/GraphViewPage.tsx` stub
- [ ] T003 [P] Сверить `specs/011-ods-graph-viewer/quickstart.md` с `contracts/openapi-graph-view.yaml` и `contracts/graph-view-ui.md` (маршруты, caps 200/500)

**Checkpoint S1**: deps установлены; stub page существует

---

## Phase 2: Foundational — типы + GraphViewService + wiring (BLOCKER)

**Purpose**: Серверный срез и API shell до UI-историй

**⚠️ CRITICAL**: User story work (кроме чисто UI-rename US1 меню) не закрывает SC карты без **F1**

- [ ] T004 Типы/DTO среза (`GraphViewSlice`, `ViewNode.role`, limits, `resolve_status`, `empty_reason`) в `backend/src/services/graph-view.types.ts` (или рядом) по `data-model.md`
- [ ] T005 [P] Zod-схемы query/response view в `backend/src/api/schemas/graph.schemas.ts` по `contracts/openapi-graph-view.yaml`
- [ ] T006 [P] Зеркало типов клиента в `frontend/src/api/graph-types.ts` (+ при необходимости `frontend/src/api/analysis-types` не трогать)
- [ ] T007 Реализовать `GraphViewService.buildSlice` в `backend/src/services/graph-view.service.ts` — focus=null peer kinds (R6), focus inside/external, caps 200/500, priority service→инфро (R3); без N+1 на весь граф
- [ ] T008 Unit `backend/tests/unit/graph-view.service.test.ts` — Система peers; broker→topics; database без фейковой иерархии; truncation priority; resolve_from code→service / system_fallback (R5)
- [ ] T009 Подключить `GET /projects/:projectId/graph/view` в `backend/src/api/routes/graph.ts` + делегирование из `GraphService` или прямой inject `GraphViewService` в `backend/src/index.ts`
- [ ] T010 [P] i18n ключи просмотра в `frontend/src/i18n/ru.ts` — меню, empty system, truncate, resolve_fallback, «Войти», «К системе», «В анализе» по `contracts/graph-view-ui.md`
- [ ] T011 [P] Клиент `getGraphView` в `frontend/src/api/graph.ts`

**Checkpoint F1**: `GET .../graph/view` + unit slice зелёные; клиентский API helper готов

---

## Phase 3: User Story 1 — Два пункта меню (Priority: P1) 🎯 MVP start

**Goal**: «Граф анализ» + «Граф просмотр» в меню; анализ = прежний GraphPage (FR-001/002, SC-004)

**Independent Test**: меню показывает оба пункта; `/graph` — дерево/поиск как раньше

**Depends on**: S1 (F1 желателен для осмысленного `/graph-view`, но stub достаточен для теста меню)

### Tests

- [ ] T012 [P] [US1] Frontend test `frontend/src/components/MainMenu.test.tsx` (или расширить существующий) — подписи «Граф анализ» / «Граф просмотр» и href на `/graph` / `/graph-view`

### Implementation

- [ ] T013 [US1] Переименовать пункт меню и ссылки в `frontend/src/components/MainMenu.tsx` по `contracts/graph-view-ui.md`
- [ ] T014 [US1] Зарегистрировать маршрут `/projects/:projectId/graph-view` в `frontend/src/app/router.tsx` и `frontend/src/app/GraphRoutes.tsx` → `GraphViewPage`
- [ ] T015 [P] [US1] Заголовки/i18n списочного экрана: «Граф анализ» в `frontend/src/pages/GraphPage.tsx` / `frontend/src/i18n/ru.ts` без смены поведения дерева

**Checkpoint A1**: меню и маршруты; регресс анализа visually OK

---

## Phase 4: User Story 2 — Карта системы при открытии (Priority: P1)

**Goal**: Старт просмотра = уровень «Система» без class/method (FR-003/004/005, SC-001)

**Independent Test**: quickstart §2 на system-landscape-demo; topics не обязаны peer при наличии broker

**Depends on**: **F1**, A1

### Tests

- [ ] T016 [P] [US2] Integration/API test `backend/tests/integration/graph-view-system.test.ts` — view без focus на фикстуре/минимальном ES seed: service+infra, нет class как обязательного содержимого

### Implementation

- [ ] T017 [US2] `GraphViewPage` загружает slice `focus` omit и обрабатывает loading/error в `frontend/src/pages/GraphViewPage.tsx`
- [ ] T018 [US2] Canvas React Flow: узлы/рёбра среза, kind-стили узлов, fit-view; подпись **типа ребра** по hover и/или selection (i18n, FR-020) в `frontend/src/components/graph-view/GraphCanvas.tsx` (или аналог)
- [ ] T019 [P] [US2] Авто-layout после загрузки среза (dagre/ELK) в `frontend/src/components/graph-view/layoutGraph.ts`
- [ ] T020 [US2] Pan/zoom viewport (FR-014) — встроенные controls React Flow + проверка, что зум не перезапрашивает полный граф

**Checkpoint A2**: карта Система читаема на демо &lt; 10 с (SC-001)

---

## Phase 5: User Story 3 — Вход в участника (Priority: P1)

**Goal**: selection≠focus; «Войти»/double-click; inside+только внешние; service/broker/database (FR-006…011, SC-002/006)

**Independent Test**: клик → inspector без смены фокуса; Войти в сервис → несвязанные исчезли; БД без схем

**Depends on**: A2

### Tests

- [ ] T021 [P] [US3] Frontend test `frontend/src/pages/GraphViewPage.focus.test.tsx` (или components) — click selects; enter changes focus; external stub style
- [ ] T022 [P] [US3] Unit дополнения в `backend/tests/unit/graph-view.service.test.ts` — focus service externals; broker topics inside; database empty inside

### Implementation

- [ ] T023 [US3] Inspector выбранного узла в `frontend/src/components/graph-view/GraphInspector.tsx` — имя, kind, краткие связи, кнопка «Войти»
- [ ] T024 [US3] Состояние selection vs focus + double-click/«Войти» → `?focus=` и перезагрузка slice в `frontend/src/pages/GraphViewPage.tsx`
- [ ] T025 [US3] Визуал `role=external` (stub) в `frontend/src/components/graph-view/GraphCanvas.tsx` / custom node
- [ ] T026 [US3] Убедиться backend inside rules (R6) закрывают FR-008/009/010 в `backend/src/services/graph-view.service.ts` (допилить зазоры после T007)

**Checkpoint A3**: SC-002/006 на демо; нет авто-входа по одиночному клику

---

## Phase 6: User Story 6 — Крупный граф / empty system (Priority: P1)

**Goal**: caps + баннер усечения; empty_reason no_system; нет dump всего индекса (FR-013/019, SC-003)

**Independent Test**: `max_nodes`↓ → truncated banner; code-only → empty + ссылка на анализ

**Depends on**: A2 (UI), F1 (API)

### Tests

- [ ] T027 [P] [US6] Unit truncation в `backend/tests/unit/graph-view.service.test.ts` — при малом cap остаются service раньше «хвоста» по имени
- [ ] T028 [P] [US6] Frontend test empty/truncate banners в `frontend/src/pages/GraphViewPage.empty.test.tsx` (или component)

### Implementation

- [ ] T029 [US6] Баннер `truncated` + текст из i18n в `frontend/src/pages/GraphViewPage.tsx`
- [ ] T030 [US6] Empty state `empty_reason=no_system_participants` + ссылка «Граф анализ» в `frontend/src/components/graph-view/GraphViewEmpty.tsx` (или GraphEmptyState reuse)
- [ ] T031 [US6] Состояния graph_not_found / нет проекта — согласовать с анализом (`GraphEmptyState`) в `frontend/src/pages/GraphViewPage.tsx`

**Checkpoint A6**: SC-003; пустой system не показывает code-корни

---

## Phase 7: User Story 4 — Крошки и наверх (Priority: P2)

**Goal**: крошки / «Наверх» / «К системе» (FR-011, часть SC-007)

**Independent Test**: Система → сервис → сосед → крошка/«К системе»

**Depends on**: A3

### Implementation

- [ ] T032 [US4] Компонент крошек + стек фокусов в `frontend/src/components/graph-view/GraphBreadcrumbs.tsx`
- [ ] T033 [US4] Синхронизация URL `focus` с крошками в `frontend/src/pages/GraphViewPage.tsx`
- [ ] T034 [P] [US4] Frontend test навигации крошек в `frontend/src/components/graph-view/GraphBreadcrumbs.test.tsx`

**Checkpoint A4**: SC-007 цепочка без тупика

---

## Phase 8: User Story 5 — Связка анализ ↔ просмотр (Priority: P2)

**Goal**: «Открыть на схеме» / «Показать в анализе»; resolve code→service (FR-012)

**Independent Test**: quickstart §6

**Depends on**: A3, A1

### Tests

- [ ] T035 [P] [US5] Unit resolve_from в `backend/tests/unit/graph-view.service.test.ts` (если ещё не полностью в T008) — system exact; code→service; fallback

### Implementation

- [ ] T036 [US5] Кнопка «Открыть на схеме» из выбора узла в `frontend/src/pages/GraphPage.tsx` / search/tree → `/graph-view?resolve_from=` или `focus=`
- [ ] T037 [US5] Обработка `resolve_from` / `resolve_status` + banner system_fallback в `frontend/src/pages/GraphViewPage.tsx`
- [ ] T038 [US5] «Показать в анализе» из inspector → `/projects/:id/graph?select=<nodeId>` в `frontend/src/components/graph-view/GraphInspector.tsx`; принять deep-link в `frontend/src/pages/GraphPage.tsx` по `contracts/graph-view-ui.md` §«Показать в анализе»

**Checkpoint A5**: связка в обе стороны на демо

---

## Phase 9: Polish & Cross-Cutting

**Purpose**: DoD, документация, запрет edit, follow-up tracking

- [ ] T039 Прогон `specs/011-ods-graph-viewer/quickstart.md` §§1–7 на system-landscape-demo; записать результат в `specs/011-ods-graph-viewer/research.md` (секция `## R10. Quickstart run`)
- [ ] T040 [P] DoD-проверки UI просмотра и запись в `specs/011-ods-graph-viewer/research.md` §R10: (a) SC-005 нет edit/delete в `frontend/src/pages/GraphViewPage.tsx` + `frontend/src/components/graph-view/`; (b) FR-018 нет поля/кнопки поиска на просмотре; (c) FR-017 нет записи координат узлов в ES (только MAY sessionStorage на клиенте)
- [ ] T041 [P] Подтвердить tracking follow-up «до дна» code + иерархия БД в `specs/011-ods-graph-viewer/plan.md` и `specs/011-ods-graph-viewer/spec.md` «Отложено» (SC-008; код не писать)
- [ ] T042 [P] При необходимости ссылка на 011 view в `specs/006-project-graph/contracts/openapi-graph.yaml` (без ломки FR `006`)
- [ ] T043 Регрессия SC-004: smoke дерево+поиск в `frontend/src/pages/GraphPage.tsx` на том же проекте после rename; deep-link `?select=` из T038
- [ ] T044 Сверка scope: `git`/diff без правок `parsers/**` и ingest `009`; caps только в `backend/src/services/graph-view.service.ts`

**Checkpoint DoD**: SC-001…008 закрыты или явно задокументированы; MVP system-only

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational F1 (2)** → stories
- **US1** может стартовать после S1 (меню); полный value с F1+US2
- **US2** после F1+A1
- **US3** после A2
- **US6** после F1+A2 (параллельно с US3 частично)
- **US4** после A3
- **US5** после A3 (+ A1)
- **Polish** после нужных story checkpoints

### User Story Dependencies

| Story | Depends |
|-------|---------|
| US1 | S1 |
| US2 | F1, US1 |
| US3 | US2 |
| US6 | F1, US2 |
| US4 | US3 |
| US5 | US1, US3 |

### Parallel Opportunities

- T002/T003; T005/T006/T010/T011 после T004
- T012 ‖ T015; T018/T019 частично; T021/T022; T027/T028; T034; T035; T040–T042

---

## Parallel Example: Foundational + US2

```bash
# После T004:
Task: "Zod schemas graph.schemas.ts"
Task: "Frontend graph-types.ts"
Task: "i18n ru.ts view keys"

# После F1 + A1:
Task: "GraphCanvas.tsx React Flow"
Task: "layoutGraph.ts dagre"
Task: "integration graph-view-system.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup  
2. Phase 2 F1 (`GET .../view` + unit)  
3. US1 меню + US2 карта Система → **демо обзора**  
4. STOP / validate SC-001  

### Incremental

5. US3 вход/inspector → SC-002/006  
6. US6 truncate/empty → SC-003  
7. US4 крошки → SC-007  
8. US5 связка  
9. Polish DoD + SC-008 tracking  

### Notes

- Не реализовывать code-drill «до дна» и иерархию БД в этих tasks  
- Не писать координаты узлов в ES  
- Клиентский N+1 вместо `graph/view` — не DoD  
