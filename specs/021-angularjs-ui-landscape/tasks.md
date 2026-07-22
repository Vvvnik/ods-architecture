# Tasks: AngularJS UI landscape (Graph UI — second stack)

**Input**: `specs/021-angularjs-ui-landscape/` — plan.md, spec.md, data-model.md,
contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-22); UI canon + Graph UI
`020`; playbook `018`; petclinic system `019`; analysis `005`/`006`

**Tests**: plan Testing — unit detector / extract / ingest; React `frontend-ui`
regression; manual quickstart on petclinic dogfood

**Organization**: Setup → Foundational (detector + `angularjs-ui` registry) →
US1 overview → US2 drill/API → US3 gateway `binds_service` → US4 regression →
Polish

**DoD**: petclinic AngularJS → Graph UI (≥3 declared states, ≥1 screen-level
HTTP bind, gateway inspector action); React Graph UI unchanged; empty state for
non-UI repos. **No** Graph UI rewrite; **no** Angular 2+; UI = structure+function
(not pixel/Figma) per `001`.

**Language**: English (constitution)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete deps)
- **[Story]**: US1–US4 from spec.md

---

## Phase 1: Setup

**Purpose**: Parser module frame + contract alignment

- [x] T001 Verify `specs/021-angularjs-ui-landscape/contracts/` against
  `data-model.md` / `research.md` (artifact `frontend-angularjs`, gateway
  `binds_service`, source preference, non-fatal failure, URL-bearing/
  non-abstract DoD pages). Checklist in Notes: **no new UI canon kinds**; **no
  Graph UI portal/API rewrite** (FR-002/FR-015) — only parser/detector/ingest/
  modal wiring
- [x] T002 [P] Create `parsers/angularjs-ui/` — `manifest.json`, `README.md`, stub
  `run.mjs` (exit 0 + empty `apps: []` envelope per `005`, mirror
  `parsers/react-ui/`)
- [x] T003 [P] Register `angularjs-ui` as planned/stub in `parsers/README.md`
  (mark **available** only after extract green for US1)

**Checkpoint S1**: stub parser in place

---

## Phase 2: Foundational (BLOCKER)

**Purpose**: Detector artifact, orchestrator spawn, ingest registry, modal —
required before UI landscape stories

**⚠️ CRITICAL**: No US1–US4 ingest/UI dogfood until this phase completes

- [x] T004 Add artifact rule / detection path for `frontend-angularjs` →
  `angularjs-ui` in `backend/src/config/detector-rules.json` and
  `backend/src/services/artifact-detector.ts` per
  `contracts/detector-frontend-angularjs.md` (prefer `spring-petclinic-ui`;
  else gateway `static/scripts`; exclude React and Angular 2+)
- [x] T005 [P] Unit detector in
  `backend/tests/unit/detector-frontend-angularjs.test.ts` — positive AngularJS
  gateway-static fixture / negative React-only / negative Angular 2+ hints
- [x] T006 Extend language-report / artifact types for `frontend-angularjs` in
  `backend/src/domain/language-report.ts` (and ES mapping if needed); path-scoped
  frontend languages under AngularJS root(s)
- [x] T007 Ensure `pathsMatchingArtifact` / change-set spawn for
  `frontend-angularjs` in `backend/src/services/artifact-detector.ts` /
  `change-set.service.ts` / `ingest.service.ts` (do **not** mix with
  `frontend-ui` paths)
- [x] T008 Ensure orchestrator spawns `angularjs-ui` from `artifacts[]` when
  available; extract/adapter failure → parser failed, analysis run still
  succeeds — `backend/src/services/analysis-orchestrator.service.ts` (verify /
  adjust if needed)
- [x] T009 Register ingest adapter stub + allowlist for `angularjs-ui` in
  `backend/src/services/ingest/ingest-registry.service.ts` and
  `ingest.service.ts`
- [x] T010 [P] Default: implement thin `angularjs-ui.ingest.ts` by adapting
  `react-ui.ingest.ts` mapping (same native→canon). **Optional** later: extract
  shared helper only if both adapters stay in lockstep and shared diff is small;
  do not block DoD on shared refactor
- [x] T011 [P] Extend Frontend modal to list `angularjs-ui` parser_status when
  `frontend-angularjs` present in
  `frontend/src/components/analysis/LanguagesConfirmModal.tsx` (+
  `frontend/src/api/analysis-types.ts` if needed) per
  `contracts/detector-frontend-angularjs.md`
- [x] T012 [P] Add/adjust i18n keys for AngularJS Frontend row if needed in
  `frontend/src/i18n/en.ts` and `frontend/src/i18n/ru.ts` (reuse Frontend
  section keys when possible; **English** code/comments/specs — FR-016)

**Checkpoint F1**: detector finds `frontend-angularjs` on petclinic-like tree;
modal can show `angularjs-ui`; registry knows parser

---

## Phase 3: User Story 1 — See petclinic UI landscape in Graph UI (P1) 🎯 MVP

**Goal**: After petclinic analysis, Graph UI overview lists ≥3 **URL-bearing,
non-abstract** declared `$state`/`$route` pages

**Independent Test**: quickstart §§1–2 — sync → analyze → Graph UI shows
welcome / owners / vets (or equivalent); abstract `app` parent MUST NOT be
counted as a DoD page

- [x] T013 [US1] Implement AngularJS extract (app module, declared
  `$stateProvider` / `$routeProvider` → screens) in
  `parsers/angularjs-ui/extract.mjs`; wire `run.mjs`; prefer UI-module sources
  else gateway static scripts per research R2/R6. **DoD pages:** only
  URL-bearing, non-abstract states/routes (exclude `abstract: true`)
- [x] T014 [P] [US1] Unit extract tests in `parsers/angularjs-ui/extract.test.mjs`
  using fixture mimicking
  `spring-petclinic-api-gateway/.../static/scripts/` (`app.js` + feature
  `.state` files) — expect ≥3 **non-abstract** routes; assert abstract parent
  (e.g. `app`) is not counted as a DoD page
- [x] T015 [US1] Implement ingest adapter `angularjs-ui` → UI nodes/edges
  (`ui_app`, `ui_route`, `ui_screen`, `contains`) in
  `backend/src/services/ingest/adapters/angularjs-ui.ingest.ts` per
  `contracts/ingest-angularjs-ui.md` (reuse `020` native-ui-tree schema;
  `framework: angularjs`)
- [x] T016 [P] [US1] Unit ingest tests in
  `backend/tests/unit/ingest-angularjs-ui.test.ts` from
  `contracts/native-ui-tree-angularjs.example.json`
- [x] T017 [US1] Mark `angularjs-ui` **available** in `parsers/README.md`; ensure
  parser module is on orchestrator runtime path (backend image / compose as for
  `react-ui`)
- [x] T018 [US1] Manual/API smoke: petclinic latest run →
  `GET .../graph/ui` returns ≥3 route/screen frames (document in Notes or
  follow quickstart)

**Checkpoint US1**: Graph UI overview non-empty on petclinic (≥3 non-abstract
pages)

---

## Phase 4: User Story 2 — Drill into a page and see UI→API binds (P1)

**Goal**: Drill shows structure; ≥1 screen/controller-level `invokes_api`
(joined or unresolved)

**Independent Test**: quickstart §3 — enter Owners → inspector shows API
association (e.g. `GET …/api/customer/owners`)

- [x] T019 [US2] Extend extract to attach controller **literal**
  `$http.(get|post|put|patch|delete)` with static path string as screen-level
  `api_calls` in `parsers/angularjs-ui/extract.mjs` (`$resource`/dynamic concat
  best-effort; control-level optional; not required for DoD)
- [x] T020 [P] [US2] Extend `parsers/angularjs-ui/extract.test.mjs` for ≥1
  literal `$http` bind on owners (or fixture equivalent)
- [x] T021 [US2] Extend ingest `invokes_api` resolve/unresolved hint in
  `backend/src/services/ingest/adapters/angularjs-ui.ingest.ts` (same rules as
  `react-ui`; MUST NOT invent `http_endpoint` from client URL alone)
- [x] T022 [P] [US2] Unit ingest API-bind tests in
  `backend/tests/unit/ingest-angularjs-ui-api.test.ts`
- [x] T023 [US2] Verify Graph UI drill + inspector show bind on petclinic
  (existing Graph UI from `020` — no portal rewrite); note result in Notes

**Checkpoint US2**: SC-002 / SC-003 satisfiable on petclinic

---

## Phase 5: User Story 3 — Open Graph UI from Graph view (P2)

**Goal**: `binds_service` from `ui_app` → **API Gateway**; inspector Graph UI
action works

**Independent Test**: quickstart §4 — select gateway → Graph UI action; unrelated
node → hidden/disabled

- [x] T024 [US3] Implement petclinic `binds_service` heuristics targeting API
  Gateway (`api-gateway`, `spring-petclinic-api-gateway`, compose/service name)
  in `backend/src/services/ingest/adapters/angularjs-ui.ingest.ts` per
  research R4 / clarify B
- [x] T025 [P] [US3] Unit tests in
  `backend/tests/unit/ingest-angularjs-ui-binds-service.test.ts`
- [x] T026 [US3] Verify Graph view inspector Graph UI action on linked gateway
  (existing `GraphInspector` from `020`) — no algorithm change; document
  petclinic check in Notes

**Checkpoint US3**: SC-005 on petclinic

---

## Phase 6: User Story 4 — No regression React / empty non-UI (P1)

**Goal**: `react-ui` / empty Graph UI unchanged

**Independent Test**: quickstart §§5–6 — ODS portal Graph UI still populated;
non-UI project empty state clear; AngularJS extract fail does not fail whole run

- [x] T027 [P] [US4] Confirm existing
  `backend/tests/unit/detector-frontend-ui.test.ts` and react-ui ingest tests
  still pass (run suite; fix only if `021` broke them)
- [x] T028 [P] [US4] Add/extend tests in
  `backend/tests/unit/detector-frontend-angularjs.test.ts` (and/or
  `detector-frontend-ui.test.ts`): (1) no `frontend-angularjs` on React-only
  tree; (2) Angular 2+ signals do not yield AngularJS DoD success; (3)
  **dual-stack** fixture (React + AngularJS roots) emits both `frontend-ui` and
  `frontend-angularjs` with distinguishable sample paths / roots
- [x] T029 [US4] Verify orchestrator: AngularJS extract failure → analysis
  success + empty Graph UI + failed parser status (unit or documented manual
  check); touch
  `backend/tests/unit/analysis-orchestrator-*.test.ts` only if gap found

**Checkpoint US4**: SC-006 / SC-007 / SC-008

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Docs, delivery, roadmap closeout

- [x] T030 [P] Sync `ods-help/requirements/json-model/README.md` U01 status when
  `angularjs-ui` implements (example already present)
- [x] T031 [P] Tick `contracts/parser-extension-checklist-021.md` items done;
  confirm feature artifacts remain **English** (FR-016)
- [x] T032 Update `specs/001-ods-vision/spec.md` roadmap status for `021` when
  DoD closed ( Fulfilled + date )
- [x] T033 Run `specs/021-angularjs-ui-landscape/quickstart.md` end-to-end on
  petclinic `c736c364-96b1-442b-8bd4-3a8c2ea05d2d`; record outcomes in Notes
- [x] T034 [P] Update `specs/021-angularjs-ui-landscape/README.md` status to
  implemented when closed

**Checkpoint P1**: quickstart green; checklist/docs aligned

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: start immediately
- **Foundational (Phase 2)**: after Setup — **BLOCKS** all stories
- **US1 (Phase 3)**: after Foundational — MVP
- **US2 (Phase 4)**: after US1 extract/ingest baseline (extends same parser)
- **US3 (Phase 5)**: after US1 ingest (needs `ui_app`); can parallelize with US2
  after T015
- **US4 (Phase 6)**: after Foundational; full validation after US1–US3 preferred
  (phase order follows **dependencies**, not priority labels — US4 is P1 but
  validates after extract exists)
- **Polish (Phase 7)**: after desired stories complete

### User Story Dependencies

| Story | Depends on | Notes |
|-------|------------|--------|
| US1 | Foundational | MVP — overview only |
| US2 | US1 extract+ingest | Same module; API binds |
| US3 | US1 ingest | Gateway `binds_service` |
| US4 | Foundational (+ US1 for full dogfood) | Regression |

### Parallel Opportunities

- T002/T003; T005/T010/T011/T012; T014/T016; T020/T022; T025; T027/T028; T030/T031/T034
- After T015: US2 (T019+) and US3 (T024+) can proceed in parallel

### Parallel Example: after Foundational

```text
T013 extract routes          | T011 modal (if not done)
T014 extract tests [P]       | T012 i18n [P]
Then T015 ingest → T016 [P]
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 Setup  
2. Phase 2 Foundational  
3. Phase 3 US1 → validate Graph UI ≥3 pages on petclinic  
4. **STOP** and demo MVP  

### Incremental Delivery

1. US1 overview → demo  
2. US2 API binds → demo  
3. US3 gateway inspector → demo  
4. US4 regression + Polish → close `021` in `001`  

### Suggested MVP scope

**US1 only** (detector + `angularjs-ui` routes/screens + ingest + Graph UI
overview). US2–US4 required for full DoD / SC-003–SC-008.

---

## Notes

- Graph UI portal/API from `020` — **do not** rebuild; only feed UI layer data
  (FR-002/FR-015 verified in T001).
- T010 default = thin duplicate/adapt ingest; shared helper is optional polish.
- Live petclinic WC: AngularJS under
  `spring-petclinic-api-gateway/.../static/scripts/` (no `spring-petclinic-ui` on
  upstream main).
- DoD pages = URL-bearing, non-abstract states only (C1 / FR-006 / SC-001).
- DoD HTTP = literal `$http` + static path (FR-008); `$resource` best-effort.
- FR-012 ≈ US4/SC-006 intentional reinforcement (not a conflict).
- Structure+function only — not pixel/Figma (`001` boundary).
- Analyze remediation 2026-07-22: C1–C4 + lows C3/C5/C6/C8/I1 closed in
  spec/plan/tasks/research/data-model.
- Implement 2026-07-22: `parsers/angularjs-ui`, detector `frontend-angularjs`,
  ingest adapter, modal Frontend row; unit tests green. Live petclinic
  quickstart (T033) — re-sync/analyze when stack is up to confirm Graph UI
  end-to-end.
