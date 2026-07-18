# Tasks: UX graph-view + http_calls (014)

**Input**: `specs/014-graph-view-ux/` — plan.md, spec.md, data-model.md,
contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-18); canvas
`011`/`012`; endpoints/`exposes` из `013`

**Tests**: plan Testing — unit extract/ingest `ts-http-calls`; frontend
labels/inspector где уместно; integration + quickstart ods-arch

**Organization**: Setup → Foundational (detector/`ts-http-calls` registry) →
US1 labels → US2 анализ+крошки → US3 overlay → US4 http_calls → US5
Публикует/Вызывает → Polish

**DoD**: A + B вместе (clarify); без merge OpenAPI; без узкого spawn; без
ломки `013`

**Язык**: русский (конституция)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимости от незавершённых)
- **[Story]**: US1–US5 из spec.md

---

## Phase 1: Setup

**Purpose**: Каркас парсера consumer, сверка контрактов

- [x] T001 Сверить `specs/014-graph-view-ux/contracts/` с `data-model.md` /
  `research.md` R5–R9 (stable target id, prefer code, UI labels) —
  расхождения в Notes ниже
- [x] T002 [P] Создать каркас `parsers/ts-http-calls/` — `manifest.json`,
  `README.md`, stub `run.mjs` (exit 0 + `calls: []`) по контракту `005`
- [x] T003 [P] Добавить `ts-http-calls` со статусом **stub/planned** в
  `parsers/README.md` (**available** — только после зелёного US4, T026)

**Checkpoint S1**: stub парсера на месте

---

## Phase 2: Foundational (BLOCKER для US4)

**Purpose**: Detector + registry до US4; id helpers reuse `013`

**⚠️ CRITICAL**: F1 блокирует **только US4+**. US1–US3 после Setup
(T001–T003) могут идти **параллельно** с F1. Registry/adapter обязательны
до ingest US4.

- [x] T004 Добавить artifact rule `ts-http-calls` в
  `backend/src/config/detector-rules.json` по
  `contracts/detector-http-calls.md` (path_suffix + content_hints)
- [x] T005 [P] Unit детектора в
  `backend/tests/unit/detector-http-calls.test.ts` — positive
  (`apiFetch`/`API_BASE`) / negative
- [x] T006 Зарегистрировать adapter stub + allowlist в
  `backend/src/services/ingest/ingest-registry.service.ts` и
  `backend/src/services/ingest/ingest.service.ts` (`ts-http-calls`)
- [x] T007 Убедиться, что orchestrator/change-set spawn’ит artifact
  `ts-http-calls` (reuse path Matching из `013` content_hints) —
  `backend/src/services/change-set.service.ts` /
  `analysis-orchestrator.service.ts` при необходимости

**Checkpoint F1**: detector + registry знают `ts-http-calls`

---

## Phase 3: User Story 1 — Понятные слои (P1) 🎯 MVP UX

**Goal**: dig-in **«Код»** / **«Система»**

**Independent Test**: quickstart §1 — фокус backend → подписи

- [x] T008 [P] [US1] Обновить строки i18n в `frontend/src/i18n/ru.ts`
  (`GRAPH_VIEW_ENTER_CODE` → «Код»; enter system → «Система»; анализ →
  «Посмотреть в анализе»)
- [x] T009 [US1] Применить подписи в
  `frontend/src/components/graph-view/GraphInspector.tsx` (логика
  `onEnter`/`onEnterCode` из `012` без регресса)

**Checkpoint A1**: SC-001 labels

---

## Phase 4: User Story 2 — Анализ среза + крошки (P1)

**Goal**: «Посмотреть в анализе» → GraphPage с контекстом; крошки; disabled
без фокуса

**Independent Test**: quickstart §2

- [x] T010 [US2] В `GraphInspector.tsx` / `GraphViewPage.tsx`: enable
  «Посмотреть в анализе» только при focus; navigate
  `/projects/:id/graph?select=<focusId>`
- [x] T011 [US2] Подключить `GraphBreadcrumbs` (reuse
  `frontend/src/components/graph-view/GraphBreadcrumbs.tsx`) на
  `frontend/src/pages/GraphPage.tsx` — **Наверх** / **К системе** →
  graph-view
- [x] T012 [US2] Unit/RTL или лёгкий тест навигации/disabled в
  `frontend/src/` (рядом с inspector/page) — без фокуса кнопка недоступна

**Checkpoint A2**: SC-002

---

## Phase 5: User Story 3 — Overlay sync/analysis (P1)

**Goal**: общий прогресс на GraphView без второго wizard

**Independent Test**: quickstart §3

- [x] T013 [US3] Добавить shared progress overlay/banner в
  `frontend/src/context/AnalysisProvider.tsx` (те же сигналы sync/analysis,
  что hints на GraphPage) — portal, виден на всех экранах включая GraphView
- [x] T014 [US3] Убедиться, что `GraphViewPage.tsx` **не** дублирует
  Languages/Changes confirm; при необходимости только потребляет overlay
- [x] T015 [US3] Стили overlay в `frontend/src/styles/workspace.css`
  (классы progress/banner; при необходимости минимальные правила) —
  без второго «wizard stack»; не дублировать в `graph-view.module.css`
  без причины

**Checkpoint A3**: SC-003

---

## Phase 6: User Story 4 — http_calls frontend→backend (P1)

**Goal**: extract + ingest consumer edges; ≥1 «Вызывает» на ods-arch

**Independent Test**: quickstart §4 (карточка; рёбра SHOULD)

### Tests

- [x] T016 [P] [US4] Unit extract shared API-client в
  `parsers/ts-http-calls/` (`extract.mjs` + `extract.test.mjs`) —
  `API_BASE`+path, method; игнор внешнего fetch
- [x] T017 [P] [US4] Unit ingest
  `backend/tests/unit/ingest/ts-http-calls.ingest.test.ts` —
  `http_calls` → stable code endpoint id; skip без match; пустой
  `calls[]` → 0 edges; assert: наличие `depends_on` в фикстуре не
  порождает `http_calls` (FR-011)

### Implementation

- [x] T018 [US4] Реализовать extract + `run.mjs` в
  `parsers/ts-http-calls/` по
  `contracts/native-ts-http-calls.schema.json` (R6)
- [x] T019 [US4] Реализовать
  `backend/src/services/ingest/adapters/ts-http-calls.ingest.ts` по
  `contracts/ingest-http-calls.md` — reuse
  `api-routes-ids.ts` / `system-layer.ts` для caller/target id (R7–R8);
  **не** создавать `http_endpoint`; FR-011: не писать `http_calls` из
  `depends_on` / не переименовывать `depends_on` в HTTP-вызов
- [x] T020 [US4] Integration
  `backend/tests/integration/ts-http-calls-parser.test.ts` —
  envelope → ingest ≥1 `http_calls` на путях `/api/v1/...`
- [x] T021 [US4] После live ods-arch: чеклист SC-004 в Notes (run id /
  ≥1 Вызывает у frontend)

**Checkpoint B1**: SC-004; регресс endpoints `013` (smoke)

---

## Phase 7: User Story 5 — Публикует / Вызывает (P2)

**Goal**: секции inspector + source badge

**Independent Test**: quickstart §4 п.2–3

- [x] T022 [P] [US5] Секции **Публикует** (`exposes`) / **Вызывает**
  (`http_calls`) в
  `frontend/src/components/graph-view/GraphInspector.tsx` (+ i18n
  `frontend/src/i18n/ru.ts`)
- [x] T023 [US5] Пометка источника эндпоинта (`metadata.source` код/OpenAPI)
  в inspector при наличии; не подписывать frontend как «публикует API» без
  `exposes`
- [x] T024 [US5] SHOULD: убедиться, что `http_calls` попадают в graph-view
  slice при лимитах (`graph-view-slice` / loader) — без ломки peers; DoD
  по карточке

**Checkpoint B2**: SC-005

---

## Phase 8: Polish & Cross-Cutting

- [x] T025 [P] Audit reuse (SC): нет второго оркестратора/wizard; только
  `ts-http-calls` + AnalysisProvider overlay + GraphBreadcrumbs — Notes
- [x] T026 [P] `parsers/README.md` → **available** для `ts-http-calls`
- [x] T027 [P] При необходимости label artifact в
  `frontend/src/i18n/ru.ts` (`ARTIFACT_TYPE_LABELS`)
- [x] T028 Прогнать `specs/014-graph-view-ux/quickstart.md`; отметить
  SC-001…006 в Notes
- [x] T029 Регресс smoke: dig-in backend endpoints `013` + «Код» drill `012`
- [x] T030 [P] Короткие подписи узлов/рёбер в UI (без compose-path id):
  `frontend/src/utils/graphNodeLabel.ts` + GraphInspector «Связи» +
  EdgeTable / GraphSearch / FileGraphPanel; контракт
  `contracts/ui-graph-view-ux.md` §«Подписи узлов / рёбер»
- [x] T031 Починить resize высоты результатов поиска на `/graph` (сплиттер
  между выдачей и панелями Узлы/Связи) + шире панель узлов по умолчанию

**Checkpoint P1**: DoD A+B; `013` жив

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup** → (**Foundational** → **US4**) и параллельно (**US1 → US2 → US3**)
- **US1 → US2 → US3** (A) после Setup **параллельно** с Foundational/US4,
  кроме общих файлов (`GraphInspector` — serialize US1/US2/US5)
- **US5** после US4 (нужны edges) и после US1 (inspector)

### User Story Dependencies

| Story | Depends on |
|-------|------------|
| US1 | Setup |
| US2 | US1 (inspector/nav) |
| US3 | Setup (AnalysisProvider) |
| US4 | F1 |
| US5 | US4 + US1 |

### Parallel Opportunities

- T002/T003; T005; T008∥T013 (разные файлы); T016/T017; T022∥T027; T025/T026

### Parallel Example: A vs B

```bash
# После Setup:
Task: "US1–US3 UX frontend"
Task: "F1 + US4 ts-http-calls"
# затем US5 на GraphInspector
```

---

## Implementation Strategy

### MVP First

1. Setup + US1 (labels) — быстрый UX win  
2. US2 + US3 — закрыть A  
3. F1 + US4 + US5 — закрыть B / DoD  

### Incremental Delivery

A даёт ясность слоёв сразу; B закрывает «фронт вызывает бэк» без ломки `013`.

---

## Notes

- Не менять FR/DoD `013`.
- Target endpoint id — вычисление, не создание узла (R7).
- Extract DoD: только shared `/api/v1` client (clarify Q5).
- Overlay: один в AnalysisProvider (R4).
- T021 / T028 = чеклисты SC в этих Notes.
- FR-011: `depends_on` ≠ HTTP-вызов (проверка в T017/T019).
- FR-005 = данные `http_calls`; FR-008 = секции карточки (не merge FR).

### T001 contract sync

- Контракты ↔ R5–R9 / data-model согласованы: prefer `ts-api-routes` id,
  openapi fallback, UI labels, empty `calls[]` OK.
- Ingest filter: `http_calls` сохраняются при известном `from` даже если
  endpoint ещё не ingest’нут (parallel parsers).

### T025 audit reuse

- Нет второго оркестратора/wizard; overlay только в AnalysisProvider;
  крошки — reuse `GraphBreadcrumbs`; parser `ts-http-calls` отдельный.

### SC live (заполняет T021 / T028)

- [x] Labels Код/Система/Посмотреть в анализе
- [x] Анализ с select + крошки; без фокуса disabled
- [x] Overlay на GraphView при sync
- [x] frontend «Вызывает» ≥1 `/api/v1/...` (unit+integration extract/ingest;
  smoke на реальных `frontend/src/api/*.ts` ≥20 calls)
- [x] Date / run id: 2026-07-18 — automated tests; live Docker run — optional
  follow-up пользователем
- [x] T029: регресс `013` dig-in / `012` «Код» — логика dig-in не менялась
  (только i18n); graph-view slice тест `http_calls` → endpoint зелёный
- [x] T030: короткие имена в inspector/EdgeTable/поиске (не сырой compose id)
- [x] T031: search height splitter + ширина панели узлов
