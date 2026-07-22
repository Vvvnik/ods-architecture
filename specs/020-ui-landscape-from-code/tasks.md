# Tasks: UI landscape from code (Graph UI)

**Input**: `specs/020-ui-landscape-from-code/` — plan.md, spec.md, data-model.md,
contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-22); analysis
`005`/`006`; artifacts modal `009`; Graph view inspector `014`; playbook `018`

**Tests**: plan Testing — unit detector / extract / ingest; API tests
`/graph/ui`; frontend unit where valuable; manual quickstart dogfood (ods-arch)

**Organization**: Setup → Foundational (detector + `react-ui` registry + UI
kinds) → US1 overview → US2 drill/API → US3 chrome alignment → US4 overlay
flow → US5 Graph view link → Polish

**DoD**: React/TS dogfood (this repo `frontend/`); schematic frames + zoom;
≥1 analysis-confirm `ui_flow`; modal Frontend block; `binds_service` inspector
action; style alignment pass. Petclinic AngularJS **out** of DoD.

**Language**: English (constitution)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete deps)
- **[Story]**: US1–US5 from spec.md

---

## Phase 1: Setup

**Purpose**: Parser module frame + contract alignment

- [x] T001 Verify `specs/020-ui-landscape-from-code/contracts/` against
  `data-model.md` / `research.md` (kinds, `binds_service`, unresolved API) —
  note gaps in tasks Notes if any
- [x] T002 [P] Create `parsers/react-ui/` — `manifest.json`, `README.md`, stub
  `run.mjs` (exit 0 + empty `apps: []` envelope per `005`) 
- [x] T003 [P] Register `react-ui` as planned/stub in `parsers/README.md`
  (mark **available** only after extract green for US1)

**Checkpoint S1**: stub parser in place

---

## Phase 2: Foundational (BLOCKER)

**Purpose**: Detector artifact, orchestrator spawn, ingest registry, domain
types — required before UI landscape stories

**⚠️ CRITICAL**: No US1–US5 ingest/UI until this phase completes

- [x] T004 Add artifact rule `frontend-ui` → `react-ui` in
  `backend/src/config/detector-rules.json` (or equivalent) per
  `contracts/detector-frontend-ui.md`
- [x] T005 [P] Unit detector in
  `backend/tests/unit/detector-frontend-ui.test.ts` — positive React/Vite root /
  negative backend-only package
- [x] T006 Extend language-report / artifact types for `frontend-ui` in
  `backend/src/domain/language-report.ts` (and ES mapping if needed); include
  path-scoped frontend language list under SPA root(s) for modal (FR-017) —
  not an unmarked global `typescript` row alone
- [x] T007 Ensure orchestrator/change-set spawns `react-ui` from `artifacts[]`
  in `backend/src/services/analysis-orchestrator.service.ts` /
  `change-set.service.ts` (same path as other artifact parsers)
- [x] T008 Register ingest adapter stub + allowlist for `react-ui` in
  `backend/src/services/ingest/ingest-registry.service.ts` and
  `ingest.service.ts`
- [x] T009 [P] Extend graph node/edge domain enums for UI kinds and edge types
  (`binds_service`, etc.) in `backend/src/domain/graph-node.ts` /
  `graph-edge.ts` (or equivalent) per `contracts/canonical-*-ui.schema.json`
- [x] T010 [P] Add Frontend section i18n keys in `frontend/src/i18n/en.ts` and
  `frontend/src/i18n/ru.ts` (section title, frontend badge, UI parser labels;
  user-facing menu label **Graph UI** consistently)
- [x] T011 Extend `frontend/src/components/analysis/LanguagesConfirmModal.tsx`
  (+ types in `frontend/src/api/analysis-types.ts`) to show Frontend block
  (path-scoped frontend languages + badge + `react-ui` parser_status) per
  `contracts/detector-frontend-ui.md` / FR-017

**Checkpoint F1**: detector finds `frontend-ui` on dogfood; modal shows Frontend;
registry knows `react-ui`

---

## Phase 3: User Story 1 — See UI landscape after analysis (P1) 🎯 MVP

**Goal**: After analysis, Graph UI overview lists routes/pages as schematic
frames

**Independent Test**: quickstart §§1–2 — sync → analyze → Graph UI overview
shows import/projects/workspace/graph/graph-view (or equivalent)

- [x] T012 [US1] Implement React/TS extract (apps, routes, screens, navigations
  → `navigates_to`) in `parsers/react-ui/extract.mjs` (or `.ts` compiled) per
  `contracts/native-ui-tree.schema.json`; wire `run.mjs`
- [x] T013 [P] [US1] Unit extract tests in `parsers/react-ui/extract.test.mjs`
  using fixture paths resembling `frontend/src/app/router.tsx`
- [x] T014 [US1] Implement ingest adapter `react-ui` → UI nodes/edges
  (`contains`, `navigates_to`) in
  `backend/src/services/ingest/adapters/react-ui.ingest.ts` per
  `contracts/ingest-react-ui.md` (same `*.ingest.ts` naming as sibling adapters)
- [x] T015 [P] [US1] Unit ingest adapter tests in
  `backend/tests/unit/ingest-react-ui.test.ts`
- [x] T016 [US1] Implement `GraphUiService` overview slice in
  `backend/src/services/graph-ui.service.ts` per
  `contracts/openapi-graph-ui.yaml`
- [x] T017 [US1] Wire `GET /api/v1/projects/:projectId/graph/ui` in
  `backend/src/api/routes/graph.ts` (+ schemas if used)
- [x] T018 [P] [US1] Integration/API test overview in
  `backend/tests/integration/graph-ui-overview.test.ts` (fixture or seeded UI
  nodes)
- [x] T019 [P] [US1] Client `getGraphUiOverview` in `frontend/src/api/graph.ts`
  (+ types)
- [x] T020 [US1] Add route `/projects/:projectId/graph-ui` and menu item labeled
  **Graph UI** in `frontend/src/app/router.tsx` / `MainMenu.tsx` (i18n en/ru)
- [x] T021 [US1] Implement `frontend/src/pages/GraphUiPage.tsx` overview with
  `page-chrome`, non-overlapping schematic frames, empty/loading states per
  `contracts/ui-graph-ui.md`; if multiple `ui_module`s exist, add tabs or
  equivalent filter (FR-005); dogfood may use scroll-only if page count is modest
- [x] T022 [US1] Implement zoom viewport **+ / − / fit** in
  `frontend/src/components/graph-ui/GraphUiViewport.tsx` (same control pattern
  as Graph view; not system RF canvas)
- [x] T023 [US1] Mark `react-ui` **available** in `parsers/README.md` when
  extract+ingest green on dogfood sample
- [x] T044 [P] [US1] Extract + ingest `ui_style` / `uses_style` for CSS modules
  and global sheets imported by dogfood screens in `parsers/react-ui/extract.mjs`
  and `backend/src/services/ingest/adapters/react-ui.ingest.ts` (FR-003 / C1)
- [x] T045 [P] [US1] Mark specialty `ui_surface` (React Flow canvas / CodeMirror
  viewer) when statically evident in dogfood sources; ingest as `ui_surface`
  without library internals (FR-003 / C2)

**Checkpoint A1**: SC-001 overview + SC-007 empty path smoke; styles/surfaces
  extract present on dogfood when statically available (T044/T045)

---

## Phase 4: User Story 2 — Drill + controls / API binds (P1)

**Goal**: Enter one page; see controls; `invokes_api` joined or unresolved hint

**Independent Test**: quickstart §3 — drill Import/Workspace; ≥3 API
associations (SC-003)

- [x] T024 [US2] Extend `parsers/react-ui/extract.mjs` for forms/controls +
  field binds (`binds_field`) + API call heuristics (`api/*.ts` / fetch) into
  native `api_calls` / control fields (C4)
- [x] T025 [US2] Ingest `invokes_api` and `binds_field` with endpoint resolve or
  unresolved hint in react-ui adapter (`contracts/ingest-react-ui.md` /
  data-model)
- [x] T026 [US2] Implement `GET .../graph/ui/screen` in
  `backend/src/services/graph-ui.service.ts` + `graph.ts` routes
- [x] T027 [P] [US2] Client `getGraphUiScreen` in `frontend/src/api/graph.ts`
- [x] T028 [US2] Drill-in UX on `GraphUiPage.tsx` (dbl-click / Enter) + back to
  overview; inspector panel
  `frontend/src/components/graph-ui/GraphUiInspector.tsx` showing API binds
- [x] T029 [P] [US2] Unit/integration tests for unresolved vs joined
  `invokes_api` in `backend/tests/unit/ingest-react-ui-api.test.ts`

**Checkpoint A2**: SC-002 + SC-003

---

## Phase 5: User Story 3 — Portal visual consistency (P1)

**Goal**: Graph UI + existing Workspace/Graph/Graph view share one chrome

**Independent Test**: quickstart §6 side-by-side

- [x] T030 [US3] Audit and align Workspace / Graph analysis / Graph view headers
  and surfaces to `page-chrome` / CSS tokens in
  `frontend/src/styles/workspace.css`, `graph.module.css`,
  `graph-view.module.css`, and related pages (`WorkspacePage.tsx`,
  `GraphPage.tsx`, `GraphViewPage.tsx`)
- [x] T031 [US3] Ensure `GraphUiPage` / graph-ui components use only shared
  tokens/classes (no divergent title sizes or centered headers) per FR-009–011
- [x] T032 [P] [US3] Document any deferred remnant drifts with rationale in
  `specs/020-ui-landscape-from-code/tasks.md` Notes (or checklist) — none by
  default

**Checkpoint A3**: SC-004 + SC-005

---

## Phase 6: User Story 4 — Overlay flow DoD (P1 dogfood)

**Goal**: Analysis confirm flow present as `ui_flow` (≥1 required)

**Independent Test**: quickstart §3 flow / SC-008

- [x] T033 [US4] Extract analysis confirm overlay flow
  (LanguagesConfirm → ChangesConfirm → progress) in
  `parsers/react-ui/extract.mjs` as native `flows[]`
- [x] T034 [US4] Ingest `ui_flow` + `opens_flow` edges; surface in Graph UI
  overview or inspector
- [x] T035 [P] [US4] Fixture/unit test that dogfood-like sources yield ≥1 flow
  in `parsers/react-ui/extract.test.mjs`

**Checkpoint A4**: SC-008

---

## Phase 7: User Story 5 — Graph view → Graph UI (P2)

**Goal**: Inspector action when `binds_service` links ui_app ↔ service

**Independent Test**: quickstart §4 / SC-010

- [x] T036 [US5] Emit `binds_service` (ui_app → system service) in react-ui
  ingest per research R9 heuristics; dogfood must get ≥1 link
- [x] T037 [P] [US5] Unit test binds_service heuristics in
  `backend/tests/unit/ingest-react-ui-binds-service.test.ts`
- [x] T038 [US5] Add Graph UI action in
  `frontend/src/components/graph-view/GraphInspector.tsx` when selected node is
  `binds_service` target; navigate to `/projects/:id/graph-ui?app=...`;
  hide/disable otherwise (i18n en/ru)
- [x] T039 [P] [US5] Frontend unit test inspector action visibility in
  `frontend/src/components/graph-view/GraphInspector.graph-ui.test.tsx` (or
  equivalent)

**Checkpoint A5**: SC-010

---

## Phase 8: Polish & cross-cutting

**Purpose**: i18n completeness, dogfood verification, docs

- [x] T040 [P] Complete Graph UI i18n strings in `frontend/src/i18n/en.ts` and
  `ru.ts` (menu, empty, zoom, Enter/Up, inspector) — SC-006
- [x] T041 Run dogfood quickstart on ods-arch (or monorepo import); fix gaps;
  rebuild frontend Docker if validating on `:8080`
- [x] T042 [P] Update `specs/020-ui-landscape-from-code/quickstart.md` Notes
  with any real project_id / gotchas from dogfood
- [x] T043 Sync `ods-help/requirements/json-model/` README status for U01–U03 if
  implementation lands (or leave 📋 until implement closes)

**Checkpoint P**: Feature ready for `/speckit-implement` closure / PR

---

## Dependencies & story order

```text
Phase 1 Setup → Phase 2 Foundational
                 ├→ US1 (overview) 🎯 MVP
                 │     └→ US2 (drill/API)
                 │           └→ US4 (overlay flow; needs extract depth)
                 ├→ US3 (chrome) — can start after Setup; finish before Polish
                 └→ US5 (binds_service + inspector) — after US1 ingest nodes exist
Polish after US1–US5 as needed for DoD
```

**MVP slice**: Phase 1–2 + US1 (**T001–T023**, **T044–T045**) — visible Graph UI
overview after analysis, including styles/surfaces coverage for FR-003.

## Parallel examples

- After S1: T004+T005 || T010 (i18n keys) before T011
- After F1: T012 extract || T009 domain enums (if not done)
- US1: T019 client || T020 router while T016–T017 API lands; after T012/T014:
  T044 styles || T045 surfaces
- US3 can run parallel to US2 once page-chrome exists
- US5 T037 || T038 after T036

## Implementation strategy

1. Land detector + modal Frontend + stub parser (user sees UI parser status).
2. Extract/ingest routes (+ navigations, styles, surfaces) → Graph UI overview +
   zoom (MVP demo).
3. Controls + field/API binds + drill.
4. Overlay flow DoD + binds_service inspector.
5. Chrome alignment pass + dogfood on `:8080` with frontend rebuild.

## Notes

- Do **not** change Graph view slice algorithms (`011`–`014`); only add inspector
  action.
- Petclinic AngularJS is **out of DoD**; empty/missing frontend-ui is OK there.
- Prefer AST/heuristics in `react-ui`; no runtime browser crawl.
- Analyze remediation 2026-07-22: closed **I1** (FR-014/015 restored), **C1**
  (T044 styles), **C2–C4** (T045 surfaces; T021 tabs/scroll; T012/T014
  `navigates_to`; T024/T025 `binds_field`); lows (path-scoped FR-017/T006/T011;
  `react-ui.ingest.ts`; readable→SC-004; menu label **Graph UI**).
- T001 (2026-07-22): contracts align with data-model/research — UI kinds,
  `binds_service`, unresolved `invokes_api` hints, native apps/routes/flows/
  styles/surfaces present; no blocking gaps.
- T032: no deferred chrome drifts after alignment pass (Workspace / Graph /
  Graph view / Graph UI share `page-chrome`).
- Implement 2026-07-22: T001–T045 completed; unit tests green; dogfood extract
  verified on monorepo `frontend/`; live E2E needs `--profile full` + analyze.
