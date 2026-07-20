# Tasks: UX graph-view + http_calls (014)

**Input**: `specs/014-graph-view-ux/` — plan.md, spec.md, data-model.md,
contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-18); canvas
`011`/`012`; endpoints/`exposes` from `013`

**Tests**: plan Testing — unit extract/ingest `ts-http-calls`; frontend
labels/inspector where appropriate; integration + quickstart ods-arch

**Organization**: Setup → Foundational (detector/`ts-http-calls` registry) →
US1 labels → US2 analysis+breadcrumbs → US3 overlay → US4 http_calls → US5
Publishes/Calls → Polish

**DoD**: A + B together (clarify); without merge OpenAPI; without narrow spawn; without
breaking `013`

**Language of**: Russian (Constitution)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: you can simultaneously (in different files, there is no dependence on incomplete)
- **[Story]**: US1–US5 from spec.md

---

## Phase 1: Setup

**Purpose**: Frame parser consumer, reconciliation of contracts

- [x] T001 Check `specs/014-graph-view-ux/contracts/` with `data-model.md` /
  `research.md` R5–R9 (stable target id, prefer code, UI labels) —
  The discrepancies in Notes are lower
- [x] T002 [P] Create a frame `parsers/ts-http-calls/` — `manifest.json`,
  `README.md`, stub `run.mjs` (exit 0 + `calls: []`) contract `005`
- [x] T003 [P] Add `ts-http-calls` status **stub/planned** in
  `parsers/README.md` (**available** — only after green US4, T026)

**Checkpoint S1**: stub parser in place

---

## Phase 2: Foundational (BLOCKER for US4)

**Purpose**: Detector + registry to US4; id helpers reuse `013`

**⚠️ CRITICAL**: F1 blocks **only US4+**. US1–US3 after Setup
(T001–T003) can go **parallel** with F1. Registry/adapter mandatory
up to ingest US4.

- [x] T004 Add artifact rule `ts-http-calls` in
  `backend/src/config/detector-rules.json` by
  `contracts/detector-http-calls.md` (path_suffix + content_hints)
- [x] T005 [P] Unit detector in
  `backend/tests/unit/detector-http-calls.test.ts` — positive
  (`apiFetch`/`API_BASE`) / negative
- [x] T006 Register adapter stub + allowlist in
  `backend/src/services/ingest/ingest-registry.service.ts` and
  `backend/src/services/ingest/ingest.service.ts` (`ts-http-calls`)
- [x] T007 Make sure that orchestrator/change-set spawn'it artifact
  `ts-http-calls` (reuse path Matching from `013` content_hints) —
  `backend/src/services/change-set.service.ts` /
  `analysis-orchestrator.service.ts` if necessary

**Checkpoint F1**: detector + registry know `ts-http-calls`

---

## Phase 3: User Story 1 — friendly layers (P1) 🎯 MVP UX

**Goal**: dig-in **"Code"** / **"System"**

**Independent Test**: quickstart §1 — focus backend → signature

- [x] T008 [P] [US1] Update rows i18n in `frontend/src/i18n/ru.ts`
  (`GRAPH_VIEW_ENTER_CODE` → "Code"; enter system → "System" analysis →
  "View in the analysis")
- [x] T009 [US1] Apply signatures in
  `frontend/src/components/graph-view/GraphInspector.tsx` (logic
  `onEnter`/`onEnterCode` from `012` without recourse)

**Checkpoint A1**: SC-001 labels

---

## Phase 4: User Story 2 — Analysis cutoff + breadcrumbs (P1)

**Goal**: "View analysis" → GraphPage context; breadcrumbs; disabled
without focus

**Independent Test**: quickstart §2

- [x] T010 [US2] IN `GraphInspector.tsx` / `GraphViewPage.tsx`: enable
  "View in analysis" only for focus; navigate
  `/projects/:id/graph?select=<focusId>`
- [x] T011 [US2] To connect `GraphBreadbreadcrumbs` (reuse
  `frontend/src/components/graph-view/GraphBreadbreadcrumbs.tsx`) on
  `frontend/src/pages/GraphPage.tsx` — **Up** / **To the system** →
  graph-view
- [x] T012 [US2] Unit/RTL or easy test navigation/disabled in
  `frontend/src/` (near inspector/page) — without focus button is unavailable

**Checkpoint A2**: SC-002

---

## Phase 5: User Story 3 — Overlay sync/analysis (P1)

**Goal**: overall progress on GraphView without a second wizard

**Independent Test**: quickstart §3

- [x] T013 [US3] Add shared progress overlay/banner in
  `frontend/src/context/AnalysisProvider.tsx` (the same signals sync/analysis,
  what hints on GraphPage) — portal, visible on all screens including GraphView
- [x] T014 [US3] Make sure that `GraphViewPage.tsx` **not** duplicates
  Languages/Changes confirm; only consumes ⟪overlay if necessary
- [x] T015 [US3] Styles overlay in `frontend/src/styles/workspace.css`
  (classes progress/banner; minimum rules if necessary) —
  without a second "wizard stack"; do not duplicate in `graph-view.module.css`
  for no reason

**Checkpoint A3**: SC-003

---

## Phase 6: User Story 4 — http_calls frontend→backend (P1)

**Goal**: extract + ingest consumer edges; ≥1 Causes for ods-arch

**Independent Test**: quickstart §4 (card; ribs SHOULD)

### Tests

- [x] T016 [P] [US4] Unit extract shared API-client in
  `parsers/ts-http-calls/` (`extract.mjs` + `extract.test.mjs`) —
  `API_BASE`+path, method; ignore external fetch
- [x] T017 [P] [US4] Unit ingest
  `backend/tests/unit/ingest/ts-http-calls.ingest.test.ts` —
  `http_calls` → stable code endpoint id; skip no match; empty
  `calls[]` → 0 edges; assert: availability `depends_on` in the fixture is not
  generates `http_calls` (FR-011)

### Implementation

- [x] T018 [US4] Implement extract + `run.mjs` in
  `parsers/ts-http-calls/` by
  `contracts/native-ts-http-calls.schema.json` (R6)
- [x] T019 [US4] To realize
  `backend/src/services/ingest/adapters/ts-http-calls.ingest.ts` by
  `contracts/ingest-http-calls.md` — reuse
  `api-routes-ids.ts` / `system-layer.ts` for caller/target id (R7–R8);
  **not** create `http_endpoint`; FR-011: not to write `http_calls` from
  `depends_on` / not rename `depends_on` in HTTP-challenge
- [x] T020 [US4] Integration
  `backend/tests/integration/ts-http-calls-parser.test.ts` —
  envelope → ingest ≥1 `http_calls` on ways `/api/v1/...`
- [x] T021 [US4] After live ods-arch: checklist SC-004 in Notes (run id /
  ≥1 Causes frontend)

**Checkpoint B1**: SC-004; regression endpoints `013` (smoke)

---

## Phase 7: User Story 5 — Posts / Call (P2)

**Goal**: section inspector + source badge

**Independent Test**: quickstart §4 p.2–3

- [x] T022 [P] [US5] Section **Publishes** (`exposes`) / **Causes**
  (`http_calls`) in
  `frontend/src/components/graph-view/GraphInspector.tsx` (+ i18n
  `frontend/src/i18n/ru.ts`)
- [x] T023 [US5] Mark the source of the endpoint (`metadata.source` code/OpenAPI)
  in inspector if any; not to sign frontend as "publishes API" without
  `exposes`
- [x] T024 [US5] SHOULD: make sure `http_calls` fall into graph-view
  slice when limits (`graph-view-slice` / loader) — without breaking peers; DoD
  by card

**Checkpoint B2**: SC-005

---

## Phase 8: Polish & Cross-Cutting

- [x] T025 [P] Audit reuse (SC): There is no second orchestrator/wizard; only
  `ts-http-calls` + AnalysisProvider overlay + GraphBreadbreadcrumbs — Notes
- [x] T026 [P] `parsers/README.md` → **available** for `ts-http-calls`
- [x] T027 [P] If necessary, label artifact in
  `frontend/src/i18n/ru.ts` (`ARTIFACT_TYPE_LABELS`)
- [x] T028 Banish `specs/014-graph-view-ux/quickstart.md`; mark
  SC-001...006 in Notes
- [x] T029 Regression smoke: dig-in backend endpoints `013` + "Code" drill `012`
- [x] T030 [P] Short node/edge signatures in UI (without compose-path id):
  `frontend/src/utils/graphNodeLabel.ts` + GraphInspector "Connection" +
  EdgeTable / GraphSearch / FileGraphPanel; contract
  `contracts/ui-graph-view-ux.md` §"Node/edge signatures"
- [x] T031 To fix resize height search results on `/graph` (splitter
  between output and panels Nodes/Connections) + the default node panel is wider

**Checkpoint P1**: DoD A+B; `013` alive

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup** → (**Foundational** → **US4**) and parallel (**US1 → US2 → US3**)
- **US1 → US2 → US3** (A) after Setup **parallel** with Foundational/US4,
  in addition to shared files (`GraphInspector` — serialize US1/US2/US5)
- **US5** after US4 (need edges) and after US1 (inspector)

### User Story Dependencies

| Story | Depends on |
|-------|------------|
| US1 | Setup |
| US2 | US1 (inspector/nav) |
| US3 | Setup (AnalysisProvider) |
| US4 | F1 |
| US5 | US4 + US1 |

### Parallel Opportunities

- T002/T003; T005; T008–T013 (misc files); T016/T017; T022–T027; T025/T026

### Parallel Example: A vs B

```bash
# After Setup:
Task: "US1–US3 UX frontend"
Task: "F1 + US4 ts-http-calls"
# then US5 to GraphInspector
```

---

## Implementation Strategy

### MVP First

1. Setup + US1 (labels) — quick UX win  
2. US2 + US3 — close A
3. F1 + US4 + US5 — close B / DoD  

### Incremental Delivery

A gives clarity layers at once; B closes "front calls buck" without breaking `013`.

---

## Notes

- Do not change FR/DoD `013`.
- Target endpoint id — computation is not the creation of node (R7).
- Extract DoD: only shared `/api/v1` client (clarify Q5).
- Overlay: one in AnalysisProvider (R4).
- T021 / T028 = checklists SC these Notes.
- FR-011: `depends_on` ≠ HTTP-challenge (check in T017/T019).
- FR-005 = data `http_calls`; FR-008 = section of the card (not merge FR).

### T001 contract sync

- Contracts ↔ R5–R9 / data-model agreed: prefer `ts-api-routes` id,
  openapi fallback, UI labels, empty `calls[]` OK.
- Ingest filter: `http_calls` saved when a famous `from` even if
  endpoint not yet ingest’chickpea (parallel parsers).

### T025 audit reuse

- There are no second Orchestrator/wizard; overlay only AnalysisProvider;
  chips — reuse `GraphBreadbreadcrumbs`; parser `ts-http-calls` individual.

### SC live (fills T021 / T028)

- [x] Labels Code/System/View in the analysis
- [x] Analysis select + breadcrumbs; without focus disabled
- [x] Overlay on GraphView when sync
- [x] frontend Causes ≥1 `/api/v1/...` (unit+integration extract/ingest;
  smoke real `frontend/src/api/*.ts` ≥20 calls)
- [x] Date / run id: 2026-07-18 — automated tests; live Docker run — optional
  follow-up by user
- [x] T029: regression `013` dig-in / `012` Code — logic dig-in not been changed
  (only i18n); graph-view slice test `http_calls` → endpoint green
- [x] T030: short names in inspector/EdgeTable/search (not raw compose id)
- [x] T031: search height splitter + width of the node panel
