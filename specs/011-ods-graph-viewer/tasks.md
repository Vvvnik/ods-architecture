# Tasks: Viewing the system graph (011)

**Input**: `specs/011-ods-graph-viewer/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-15); `006`–`010` implemented

**Tests**: unit slice-builder; contract/integration `GET .../graph/view`; frontend selection≠focus / empty / truncate; regression menu "Graph analysis" (plan Testing + SC)

**Organization** (for priority): US1 menu P1 → US2 map System P1 → US3 entrance/focus P1 → US6 truncation/empty P1 → US4 breadcrumbs P2 → US5 bundle analysis↔viewing P2 → Polish

**DoD MVP**: only system-navigation. Follow-up "bottoms up" code — tracking in Polish (SC-008), not implement.

**Language of**: Russian (Constitution)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: you can simultaneously (in different files, there is no dependence on incomplete)
- **[Story]**: US1–US6 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: According frontend frame directory, reconciliation of contracts

- [X] T001 Add `@xyflow/react` and **`@dagrejs/dagre`** (default layout; ELK only if dagre will not work) in `frontend/package.json` + lockfile
- [X] T002 [P] Create a frame `frontend/src/components/graph-view/` (placeholder README or empty index) and `frontend/src/pages/GraphViewPage.tsx` stub
- [X] T003 [P] Check `specs/011-ods-graph-viewer/quickstart.md` with `contracts/openapi-graph-view.yaml` and `contracts/graph-view-ui.md` (routes, caps 200/500)

**Checkpoint S1**: deps established; stub page exist

---

## Phase 2: Foundational — types + GraphViewService + wiring (BLOCKER)

**Purpose**: Server cut API shell to UI-stories

**⚠️ CRITICAL**: User story work (except pure UI-rename US1 menu) closes SC card without **F1**

- [X] T004 Types/DTO slice (`GraphViewSlice`, `ViewNode.role`, limits, `resolve_status`, `empty_reason`) in `backend/src/services/graph-view.types.ts` (or near) at `data-model.md`
- [X] T005 [P] Zod-scheme query/response view in `backend/src/api/schemas/graph.schemas.ts` at `contracts/openapi-graph-view.yaml`
- [X] T006 [P] Mirror client types in `frontend/src/api/graph-types.ts` (+ optionally `frontend/src/api/analysis-types` do not touch)
- [X] T007 Implement `GraphViewService.buildSlice` in `backend/src/services/graph-view.service.ts` — focus=null peer kinds (R6), focus inside/external, caps 200/500, priority service→infra (R3); without N+1 on the entire graph
- [X] T008 Unit `backend/tests/unit/graph-view.service.test.ts` System peers; broker→topics; database no fake hierarchy; truncation priority; resolve_from code→service / system_fallback (R5)
- [X] T009 To connect `GET /projects/:projectId/graph/view` in `backend/src/api/routes/graph.ts` + delegation from `GraphService` or direct inject `GraphViewService` in `backend/src/index.ts`
- [X] T010 [P] i18n keys safe in `frontend/src/i18n/ru.ts` — menu empty system, truncate, resolve_fallback, "Enter", "To", "In analysis" `contracts/graph-view-ui.md`
- [X] T011 [P] Client `getGraphView` in `frontend/src/api/graph.ts`

**Checkpoint F1**: `GET .../graph/view` + unit slice green; client API helper ready

---

## Phase 3: User Story 1 Two menu items (Priority: P1) 🎯 MVP start

**Goal**: "Graph analysis" + "Graph view" on the menu; analysis = former GraphPage (FR-001/002, SC-004)

**Independent Test** menu shows both; `/graph` — tree search as before

**Depends on**: S1 (F1 desirable for meaningful `/graph-view`, but stub sufficient for the test menu)

### Tests

- [X] T012 [P] [US1] Frontend test `frontend/src/components/MainMenu.test.tsx` (or expand existing) — signature "Graph analysis" / "Graph view" and href on `/graph` / `/graph-view`

### Implementation

- [X] T013 [US1] To rename a menu item and links `frontend/src/components/MainMenu.tsx` at `contracts/graph-view-ui.md`
- [X] T014 [US1] to Register the route `/projects/:projectId/graph-view` in `frontend/src/app/router.tsx` and `frontend/src/app/GraphRoutes.tsx` → `GraphViewPage`
- [X] T015 [P] [US1] Headers/i18n list screen: "Graph analysis" in `frontend/src/pages/GraphPage.tsx` / `frontend/src/i18n/ru.ts` without changing the behavior tree

**Checkpoint A1** menu, and routes; regression analysis visually OK

---

## Phase 4: User Story 2 Card system when you open (Priority: P1)

**Goal** Start viewing = tier "System" without class/method (FR-003/004/005, SC-001)

**Independent Test**: quickstart §2 on system-landscape-demo; topics no obligation peer in the presence broker

**Depends on**: **F1**, A1

### Tests

- [X] T016 [P] [US2] Integration/API test `backend/tests/integration/graph-view-system.test.ts` — view no focus on the fixture/min ES seed: service+infra no class as mandatory content

### Implementation

- [X] T017 [US2] `GraphViewPage` loads slice `focus` omit and processes loading/error in `frontend/src/pages/GraphViewPage.tsx`
- [X] T018 [US2] Canvas React Flow: nodes/edges of the cut, kind-node styles fit-view; signature **fin style** at hover and/or selection (i18n, FR-020) in `frontend/src/components/graph-view/GraphCanvas.tsx` (or equivalent)
- [X] T019 [P] [US2] Auto-layout after downloading the cut (dagre/ELK) in `frontend/src/components/graph-view/layoutGraph.ts`
- [X] T020 [US2] Pan/zoom viewport (FR-014) — built-in controls React Flow + check that the zoom is not perezapisyvat complete graph

**Checkpoint A2**: map System is readable on a demo &lt; 10 C (SC-001)

---

## Phase 5: User Story 3 — the entrance to the party (Priority: P1)

**Goal**: selection≠focus; the "Log in"/double-click; inside+only external; service/broker/database (FR-006...011, SC-002/006)

**Independent Test**: click → inspector without changing the focus; to Enter into service → unbound disappeared DB without schemes

**Depends on**: A2

### Tests

- [X] T021 [P] [US3] Frontend test `frontend/src/pages/GraphViewPage.focus.test.tsx` (or components) — click selects; enter changes focus; external stub style
- [X] T022 [P] [US3] Unit additions to `backend/tests/unit/graph-view.service.test.ts` — focus service externals; broker topics inside; database empty inside

### Implementation

- [X] T023 [US3] Inspector selected node in `frontend/src/components/graph-view/GraphInspector.tsx` — name kind, short communication, the "Log in"button
- [X] T024 [US3] Condition selection vs focus + double-click/"Log in" → `?focus=` and restart slice in `frontend/src/pages/GraphViewPage.tsx`
- [X] T025 [US3] Visual `role=external` (stub) in `frontend/src/components/graph-view/GraphCanvas.tsx` / custom node
- [X] T026 [US3] Make sure backend inside rules (R6) close FR-008/009/010 in `backend/src/services/graph-view.service.ts` (finished gaps after T007)

**Checkpoint A3**: SC-002/006 demo; no auto-login by a single click

---

## Phase 6: User Story 6 — Major count / empty system (Priority: P1)

**Goal**: caps + banner truncation; empty_reason no_system; no dump entire index (FR-013/019, SC-003)

**Independent Test**: `max_nodes`↓ → truncated banner; code-only → empty + link analysis

**Depends on**: A2 (UI), F1 (API)

### Tests

- [X] T027 [P] [US6] Unit truncation in `backend/tests/unit/graph-view.service.test.ts` — with a small cap remain service before the "tail" in the name
- [X] T028 [P] [US6] Frontend test empty/truncate banners in `frontend/src/pages/GraphViewPage.empty.test.tsx` (or component)

### Implementation

- [X] T029 [US6] Banner `truncated` + text from i18n in `frontend/src/pages/GraphViewPage.tsx`
- [X] T030 [US6] Empty state `empty_reason=no_system_participants` + link "Graph analysis" in `frontend/src/components/graph-view/GraphViewEmpty.tsx` (or GraphEmptyState reuse)
- [X] T031 [US6] Status graph_not_found / no project is to coordinate analysis (`GraphEmptyState`) in `frontend/src/pages/GraphViewPage.tsx`

**Checkpoint A6**: SC-003; empty system not showing code-roots

---

## Phase 7: User Story 4 — Crumbs and top (Priority: P2)

**Goal**: breadcrumbs / "Up" / "the system" (FR-011 part SC-007)

**Independent Test**: System → service → neighbor → baby/"To the system"

**Depends on**: A3

### Implementation

- [X] T032 [US4] The breadcrumbs component + the focus stack in `frontend/src/components/graph-view/GraphBreadbreadcrumbs.tsx`
- [X] T033 [US4] Sync URL `focus` with breadcrumbs in `frontend/src/pages/GraphViewPage.tsx`
- [X] T034 [P] [US4] Frontend test navigation babies `frontend/src/components/graph-view/GraphBreadbreadcrumbs.test.tsx`

**Checkpoint A4**: SC-007 chain no deadlock

---

## Phase 8: User Story 5 — Bundle analysis ↔ view (Priority: P2)

**Goal**: "Open to the scheme" / "Show analysis"; resolve code→service (FR-012)

**Independent Test**: quickstart §6

**Depends on**: A3, A1

### Tests

- [X] T035 [P] [US5] Unit resolve_from in `backend/tests/unit/graph-view.service.test.ts` (if not completely T008) — system exact; code→service; fallback

### Implementation

- [X] T036 [US5] "Button to Open the diagram" from the select a node in `frontend/src/pages/GraphPage.tsx` / search/tree → `/graph-view?resolve_from=` or `focus=`
- [X] T037 [US5] Processing `resolve_from` / `resolve_status` + banner system_fallback in `frontend/src/pages/GraphViewPage.tsx`
- [X] T038 [US5] "the analysis" of inspector → `/projects/:id/graph?select=<nodeId>` in `frontend/src/components/graph-view/GraphInspector.tsx`; accept deep-link in `frontend/src/pages/GraphPage.tsx` at `contracts/graph-view-ui.md` §"the analysis"

**Checkpoint A5**: a two-way bundle on demo

---

## Phase 9: Polish & Cross-Cutting

**Purpose**: DoD, documentation, ban edit, follow-up tracking

- [X] T039 Run `specs/011-ods-graph-viewer/quickstart.md` §§1–7 on system-landscape-demo; record the result in `specs/011-ods-graph-viewer/research.md` (section `## R10. Quickstart run`)
- [X] T040 [P] DoD-check UI viewing and recording in `specs/011-ods-graph-viewer/research.md` §R10: (a) SC-005 no edit/delete in `frontend/src/pages/GraphViewPage.tsx` + `frontend/src/components/graph-view/`; (b) FR-018 no field/the search button in the view; (c) FR-017 no record of the coordinates of the nodes in ES (only MAY sessionStorage client)
- [X] T041 [P] Confirm tracking follow-up "bottoms up" code + hierarchy DB `specs/011-ods-graph-viewer/plan.md` and `specs/011-ods-graph-viewer/spec.md` "Pending" (SC-008; no code to write)
- [X] T042 [P] If necessary, the link 011 view in `specs/006-project-graph/contracts/openapi-graph.yaml` (without breaking FR `006`)
- [X] T043 Regression SC-004: smoke wood+search `frontend/src/pages/GraphPage.tsx` on the same project after rename; deep-link `?select=` from T038
- [X] T044 Reconciliation scope: `git`/diff no edits `parsers/**` and ingest `009`; caps only `backend/src/services/graph-view.service.ts`

**Checkpoint DoD**: SC-001...008 closed or clearly documented; MVP system-only

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational F1 (2)** → stories
- **US1** can be triggered after S1 (menu); full value with F1+US2
- **US2** after F1+A1
- **US3** after A2
- **US6** after F1+A2 (parallel with US3 part)
- **US4** after A3
- **US5** after A3 (+ A1)
- **Polish** after the desired story checkpoints

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

- T002/T003; T005/T006/T010/T011 after T004
- T012 ‖ T015; T018/T019 part; T021/T022; T027/T028; T034; T035; T040–T042

---

## Parallel Example: Foundational + US2

```bash
# After T004:
Task: "Zod schemas graph.schemas.ts"
Task: "Frontend graph-types.ts"
Task: "i18n ru.ts view keys"

# After F1 + A1:
Task: "GraphCanvas.tsx React Flow"
Task: "layoutGraph.ts dagre"
Task: "integration graph-view-system.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup  
2. Phase 2 F1 (`GET .../view` + unit)  
3. US1 menu + US2 card System → **demo review**  
4. STOP / validate SC-001  

### Incremental

5. US3 input/inspector → SC-002/006  
6. US6 truncate/empty → SC-003  
7. US4 breadcrumbs → SC-007  
8. US5 bundle
9. Polish DoD + SC-008 tracking  

### Notes

- Do not implement code-drill "to the bottom" and the database hierarchy in these tasks  
- Do not write node coordinates in ES  
- Client N+1 is `graph/view` — not DoD

### Post-DoD (2026-07-27) — overview edges

- [x] T045 Peer-first node load so root System view keeps `depends_on` between
  services (`graph-view.service.ts`) — see research R11
- [x] T046 Focus inside cap / endpoint de-priority (`graph-view-slice.ts`) so
  large services stay within FR-013 caps without dropping peer links
- [x] T047 Inspector relationships: initial 8 + «N more» expand (hub brokers)
- [x] T048 Client cache for Graph view slice (react-query, 5 min stale) so
  remount does not full-screen reload for 3–4s; invalidate after analysis
- [x] T049 Persist RF viewport (pan/zoom) per surface/focus in sessionStorage
  (shared `graphViewportCache`); Graph view + Graph UI restore last zoom
  instead of always fitView — Graph UI mirrored in `020` T048–T049
