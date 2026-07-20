# Tasks: Graph to the bottom (012)

**Input**: `specs/012-code-graph-bottom/` — plan.md, spec.md, data-model.md,
contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-18); `011` system
canvas implemented

**Tests**: unit affiliation + code slice; API `layer=code` / `exact_code`;
frontend "code" / empty / drill; regression system (plan Testing + SC)

**Organization** (for priority): US1 entrance code P1 → US2 to the bottom P1 → US3
communication/neighbors P2 → US4 open-from-analysis P2 → US5 regression system P2 → Polish

**DoD**: code-drill plot without parsers; system-first entry saved;
entry affiliation in the Canon — **not** these tasks

**Language of**: Russian (Constitution)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: you can simultaneously (in different files, there is no dependence on incomplete)
- **[Story]**: US1–US5 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verification of contracts and framework affiliation-module

- [X] T001 Compare `specs/012-code-graph-bottom/quickstart.md` with
  `contracts/openapi-graph-view-code.yaml` and `contracts/graph-view-code-ui.md`
  (query `layer`, `exact_code`, `no_related_code`, "code")
- [X] T002 [P] Create a frame `backend/src/services/graph-view-affiliation.ts`
  (export stub `matchCodeToService` / type) at `research.md` R1 and
  `data-model.md`
- [X] T003 [P] Add i18n-billet `frontend/src/i18n/ru.ts` —
  `graphView.enterCode`, `graphView.emptyNoRelatedCode` by
  `contracts/graph-view-code-ui.md`

**Checkpoint S1**: contracts reconciled; stub affiliation + i18n keys are

---

## Phase 2: Foundational — affiliation + layer API (BLOCKER)

**Purpose**: the Server is able `layer=code` and view-only binding to UI-stories

**⚠️ CRITICAL**: US1–US4 not close SC no F1

- [X] T004 Expand DTO/`GraphViewSlice` fields `layer`, `affiliation`,
  `empty_reason=no_related_code`, `resolve_status=exact_code` in
  `backend/src/services/graph-view.types.ts` at `data-model.md`
- [X] T005 [P] Zod query/response: parameter `layer` (`system`|`code`) in
  `backend/src/api/schemas/graph.schemas.ts` by
  `contracts/openapi-graph-view-code.yaml`
- [X] T006 [P] Mirror client types (`layer`, affiliation, empty/resolve) in
  `frontend/src/api/graph-types.ts`
- [X] T007 Implement view-only affiliation (the name of the service ↔ path segment;
  explicit parent/edges first) in
  `backend/src/services/graph-view-affiliation.ts` (R1)
- [X] T008 Unit `backend/tests/unit/graph-view-affiliation.test.ts` —
  `backend`↔`backend/...`, `frontend`↔`frontend/...`, compose-path not matchit
  code; elasticsearch → empty; determinism in case of a draw
- [X] T009 Expand loader in `backend/src/services/graph-view.service.ts` —
  load code kinds for `layer=code` / focus code no full dump
  project (R5). **Choose one** strategy: (A) ES query at path-prefix
  service name **or** (B) limited in-memory scroll code-layer with cap;
  fix the selection with a comment in the file + a line in Notes `tasks.md`.
  Caps answer 200/500.
- [X] T010 Expand `buildViewSlicePure` /
  `backend/src/services/graph-view-slice.ts` — `layer=system` without recourse
  `011`; `layer=code` + focus service → affiliated roots; focus code →
  children at `parent_id` + externals; `no_related_code`
- [X] T011 Unit additions to `backend/tests/unit/graph-view.service.test.ts`
  (or `graph-view-slice.test.ts`) — service+layer=code roots; empty
  no_related_code; system layer regression peers/inside
- [X] T012 [P] Client `getGraphView` takes `layer` in
  `frontend/src/api/graph.ts`

**Checkpoint F1**: `GET .../graph/view?focus=<service>&layer=code` + unit
affiliation/slice green; system no `layer` as `011`

---

## Phase 3: User Story 1 — Input code from system-component (Priority: P1) 🎯 MVP

**Goal**: After system-interior service clear step "In code" opens the first
code-level affiliated nodes (FR-001/006/012/013, SC-001 partially SC-003,
SC-006)

**Independent Test**: quickstart §2 on ods-arch — backend "code" → modules;
elasticsearch → empty; frontend≠backend slices

**Depends on**: **F1**, S1

### Tests

- [X] T013 [P] [US1] Frontend test `frontend/src/pages/GraphViewPage.code-entry.test.tsx`
  (or components) — on system-focus service visible "In code"; double-click
  service puts `layer=code`
- [X] T014 [P] [US1] Integration/API
  `backend/tests/integration/graph-view-code-layer.test.ts` — layer=code for
  service path-match; no_related_code for infra-service

### Implementation

- [X] T015 [US1] Inspector: button "To code" when you focus service + `layer=system`
  in `frontend/src/components/graph-view/GraphInspector.tsx`
- [X] T016 [US1] `GraphViewPage` sinhroniziruete `?layer=code|system` with request
  slice; "IN code" → `layer=code` without changing focus id in
  `frontend/src/pages/GraphViewPage.tsx`
- [X] T017 [US1] Empty state `no_related_code` (Russian text) in
  `frontend/src/pages/GraphViewPage.tsx` / banner component
- [X] T018 [P] [US1] Styles/signature code kinds on canvas (module/class/method)
  in the existing `frontend/src/components/graph-view/SystemNode.tsx` (or
  the same custom node that system) — distinguishable from system; **new**
  `CodeNode.tsx` optional

**Checkpoint A1**: SC-003/SC-006 on ods-arch; system enter ≠ code enter

---

## Phase 4: User Story 2 — Deepening to the leaves of the Canon (Priority: P1)

**Goal**: Drill module → type → method Canon; breadcrumbs / up (FR-003/005,
SC-001)

**Independent Test**: quickstart §3 — chain, sheet and back

**Depends on**: A1

### Tests

- [X] T019 [P] [US2] Unit in `backend/tests/unit/graph-view.service.test.ts` —
  focus module → class children; focus class → methods; no fake level
  without nodes
- [X] T020 [P] [US2] Frontend test breadcrumbs
  `frontend/src/components/graph-view/GraphBreadbreadcrumbs.test.tsx` (or page) —
  the way the System "service " code...; "Up" / "the system" resets layer

### Implementation

- [X] T021 [US2] In `backend/src/services/graph-view-slice.ts` for focus
  code-site: `inside` = direct children `parent_id` with code-kind; if children
  is not present — empty inside (bottom), without synthetic nodes. Close gap after T010;
  covered asserts T019

- [X] T022 [US2] "Log in"/double-click on code-node → `focus=<id>` (layer
  output) in `frontend/src/pages/GraphViewPage.tsx`
- [X] T023 [US2] Chips include code-levels; in system → focus null +
  `layer=system` in `frontend/src/components/graph-view/GraphBreadbreadcrumbs.tsx` +
  page

**Checkpoint A2**: SC-001 full path on backend/frontend no deadlock

---

## Phase 5: User Story 3 Connection code in the cut (Priority: P2)

**Goal**: Edges of the canon in the slice; click≠entry; free entry into the outer neighbor
(FR-002/004/014, SC-002)

**Independent Test**: calls/injects seen as externals; to Enter in a foreign roommate
changes focus

**Depends on**: A2

### Tests

- [X] T024 [P] [US3] Unit `backend/tests/unit/graph-view.service.test.ts` —
  incident `calls`/`injects` → external stub; truncate pulls the entire graph
- [X] T025 [P] [US3] Frontend test — click external = inspector only; enter
  external changes focus (including the "foreign" component) to
  `frontend/src/pages/GraphViewPage.focus.test.tsx` (expand)

### Implementation

- [X] T026 [US3] The slice includes incident edges focus∪inside for code-layer in
  `backend/src/services/graph-view-slice.ts`
- [X] T027 [US3] Signatures of edge types on hover/selection for code-relations (i18n)
  in `frontend/src/components/graph-view/GraphCanvas.tsx` /
  `frontend/src/i18n/ru.ts`
- [X] T028 [US3] Banner `truncated` on code-slice (Russian) in
  `frontend/src/pages/GraphViewPage.tsx`

**Checkpoint A3**: SC-002; FR-014 on code

---

## Phase 6: User Story 4 — Open code on the diagram of the analysis (Priority: P2)

**Goal**: From the "Graph analysis" code-site opens with focus on it
(`exact_code`); fallback `011` (FR-015, SC-007)

**Independent Test**: quickstart §6

**Depends on**: F1 (preferably A2 for meaningful slice)

### Tests

- [X] T029 [P] [US4] Unit resolve_from code → `exact_code` in
  `backend/tests/unit/graph-view.service.test.ts`; unknown id → 404 or
  system_fallback under contract
- [X] T030 [P] [US4] Frontend test `frontend/src/pages/GraphPage.open-view.test.tsx`
  (or expand) — code "Open on the scheme" → `/graph-view?resolve_from=`

### Implementation

- [X] T031 [US4] `resolve_from` / resolve path: code → focus code +
  `resolve_status=exact_code` in `backend/src/services/graph-view-slice.ts` /
  `graph-view.service.ts` (R4); otherwise R5 `011`
- [X] T032 [US4] GraphPage "Open in the diagram" for code reports
  `resolve_from` (not only service collapse) in
  `frontend/src/pages/GraphPage.tsx`
- [X] T033 [US4] GraphViewPage: when `exact_code` no banner "code no
  show"; when system_fallback — banner `011` in
  `frontend/src/pages/GraphViewPage.tsx` + i18n
- [X] T034 [P] [US4] "IN analysis" with code-focus → `/graph?select=` regression
  `frontend/src/components/graph-view/GraphInspector.tsx`

**Checkpoint A4**: SC-007

---

## Phase 7: User Story 5 — Regression system-view (Priority: P2)

**Goal**: Map system and system-drill `011` not broken (FR-008, SC-004/005)

**Independent Test**: quickstart §1; system-landscape-demo or ods-arch system-only

**Depends on**: F1; preferably after A1 to catch regressions layer

### Tests

- [X] T035 [P] [US5] Regression unit/integration: view no `layer` / `layer=system`
  — peers, broker topics, database empty inside in
  `backend/tests/unit/graph-view.service.test.ts` and/or
  `backend/tests/integration/graph-view-system.test.ts`
- [X] T036 [P] [US5] Frontend smoke — double-click service remains system
  interior; on the "Graph view" **no** UI removing/adding nodes or
  edges of the canon (FR-009 / SC-005)

### Implementation

- [X] T037 [US5] Fix default `layer=system` and the lack of car jump
  in code when enter service in `frontend/src/pages/GraphViewPage.tsx`
- [X] T038 [US5] Go through the manual checklist quickstart §1 on the raised stack; gaps
  backend/UI close point - by-point

**Checkpoint A5**: SC-004/SC-005

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: DoD, documentation status, ban parsers/ingest

- [X] T039 [P] Run `specs/012-code-graph-bottom/quickstart.md` on ods-arch
  (SC-001...SC-007) and a brief note in Notes below
- [X] T040 [P] Update the status in `specs/001-ods-vision/spec.md` /
  `.specify/memory/constitution.md` after closing implement (not before)
- [X] T041 Confirm Notes: affiliation **not** written in ES; parsers not
  varied; follow-up "fin code↔service in the Canon of the" deferred
- [X] T042 [P] Remove/update outdated UI-texts `011` about "code on the diagram
  is not shown" where it contradicts `exact_code`, in
  `frontend/src/i18n/ru.ts`

**Checkpoint P1**: DoD `012` ready for close

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (S1)**: immediately
- **Foundational (F1)**: after S1 — **blocks** US1–US4
- **US1 (A1)**: after F1 — MVP
- **US2 (A2)**: after A1
- **US3 (A3)**: after A2
- **US4 (A4)**: after F1 (parallel A2/A3 with caution to the same file)
- **US5 (A5)**: after F1; final check after A1+
- **Polish**: after A2 minimum; ideally after A4+A5

### User Story Dependencies

| Story | Depends on |
|-------|------------|
| US1 | F1 |
| US2 | US1 |
| US3 | US2 |
| US4 | F1 (UI easier after US2) |
| US5 | F1 |

### Parallel Opportunities

```text
S1:  T002, T003 || T001
F1:  T005, T006 || after T004; T008 || after T007; T012 || after T005
US1: T013, T014 || ; T018 || After T016
US2: T019, T020 ||
US3: T024, T025 ||
US4: T029, T030 || ; T034 || After T032
US5: T035, T036 ||
Polish: T039, T040, T042 ||
```

### Parallel Example: Foundational

```bash
Task: "T005 Zod layer in backend/src/api/schemas/graph.schemas.ts"
Task: "T006 Client types in frontend/src/api/graph-types.ts"
# after T004
Task: "T007 affiliation in backend/src/services/graph-view-affiliation.ts"
Task: "T008 unit graph-view-affiliation.test.ts" # after T007
```

---

## Implementation Strategy

### MVP First (US1)

1. S1 → F1 → US1 (A1)
2. **STOP**: on ods-arch "code" for backend + empty for elasticsearch
3. Then US2 (bottom) → US3 → US4 → US5 → Polish

### Incremental Delivery

1. F1 → API layer=code ready
2. US1 → demo "In code"
3. US2 → before the method
4. US3 → edges/neighbors
5. US4 → from the analysis
6. US5 + Polish → close

---

## Notes

- [P] = different files / no dependency on unclosed ones
- Not to change `parsers/**` and ingest
- Do not write affiliation to ES
- Reference: `docker/fixtures/repos/ods-arch/`
- Regression system: `system-landscape-demo` + ods-arch system path
- OpenAPI `servers.url` localhost — not to touch these tasks (consciously)
- **Loader strategy (R5 / T009):** **(A)** ES `listByPathSegment` named service + CODE_KINDS
- After implement: `/specit-implement` with the checklist above
- Analyze remediation 2026-07-18: I1/A1/A2/U1/U2 + FR order + terminology
