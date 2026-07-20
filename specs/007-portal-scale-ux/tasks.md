# Tasks: The UX scale of the portal (007)

**Input**: `specs/007-portal-scale-ux/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅ (clarify 2026-07-13); `002`/`003`/`006` are implemented in the code

**Tests**: In spec no TDD is requested; on `plan.md`  point Vitest unit/integration for cascade, hierarchy/search and splitters; smok  `quickstart.md`

**Organization**: By user stories spec.md (US1 cascade P1 → US2 hierarchy P1 → US3 search P2 → US4 panel P2)

**Code agreement**: Phase 2  compulsory audit of the existing `backend/`/`frontend/` (without duplicates, reuse of patterns `002`/`006`/`003`, libraries from current `package.json`)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: You can run it in parallel (different files, no dependence on unfinished files)
- **[Story]**: US1US4 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Set the expansion points without a new packet/repo

- [X] T001 Set up the map of the affected files in the section `## R9. Code reuse audit` The file `specs/007-portal-scale-ux/research.md` (links to `backend/src/repositories/element.repository.ts`, `backend/src/services/sync.service.ts`, `backend/src/api/routes/graph.ts`, `frontend/src/pages/GraphPage.tsx`, `frontend/src/layouts/WorkspaceLayout.tsx`) — No new file in `contracts/` And without new ones. top-level The catalogs
- [X] T002 [P] Check `backend/package.json` and `frontend/package.json`: **not** add dependencies without obvious need from the plan (splitters  CSS/pointer events; ES  already `@elastic/elasticsearch`); if necessary library  justify in comments to the task implement

---

## Phase 2: Foundational  audit and expansion points

**Purpose**: To reconcile `007` with the code of past specs; prepare common API/error to user stories

**⚠️ CRITICAL**: User story work doesn't start until checkpoint **F1**

- [X] T003 **Audit of code consistency** — pass current implementation `002`/`003`/`006` and fill in `specs/007-portal-scale-ux/research.md` section `## R9. Code reuse audit`: (1) What ? **to reuse** as-is (`ElementRepository.updateStatus` As a base., `GraphService.listNodes`, `EdgeTable`, zod/AppError/The death of a child limit≤100); (2) What ? **to expand** in-place without a service copy paste; (3) **`NodeList` Not to be used on `GraphPage`** (We're going to get rid of the flat list.; `NodeList` I can only stay if I need to. FileGraphPanel/compat-The tests); (4) already used libraries (Fastify, zod, Vitest, React) vs The ban on new UI-kit No need to .; (5) patterns ES `update_by_query` / `deleteByQuery` from the repositories `005`/`006` for the cascade; (6) Map of files from T001
- [X] T004 [P] Add error codes to `backend/src/domain/errors.ts`  `cascade_too_large`, `cascade_failed` (+ Russian messages in place of throw/`AppError`) by `contracts/status-cascade.md`
- [X] T005 [P] Extend the zod to `backend/src/api/schemas/graph.schemas.ts`  query `parent_id`, `q` (min 2), reply search/ancestors on `contracts/openapi-portal-scale.yaml` (reuse of existing GraphNode/GraphEdge schemas)
- [X] T006 Make sure that routes `elements` and `graph` are already registered in `backend/src/index.ts`  only plugins/extensions, without a second router-file-duplication

**Checkpoint F1**: R9 audit is recorded; error codes and schemes are ready; clear which files to expand vs. not touch

---

## Phase 3: User Story 1  Cascading status of the folder (Priority: P1)  MVP

**Goal**: PATCH directory → atomic cascade; lift from `not_needed` without children; sync inherits `not_needed`

**Independent Test**: `quickstart.md` §1; SC-003 (≥ 50 offspring or complete refusal)

**Depends on**: **F1**

### Implementation for User Story 1

- [X] T007 [US1] Extend `backend/src/repositories/element.repository.ts`  `countActiveDescendants(projectId, folderPath)`, `updateStatusCascadeByPath(...)` through one `update_by_query` (folder + prefix), soft-limit **5000** by `contracts/status-cascade.md` / research R1; reuse existing client/index `ods-elements`
- [X] T008 [US1] Add the lookup of ancestors to `backend/src/repositories/element.repository.ts`  `findActiveAncestorsByPath` / walk on `parent_path` for sync inheritance (not to duplicate the tree on the client)
- [X] T009 [US1] Create an orchestrator in `backend/src/services/element.service.ts` (or expand the thin layer at routes, **without** second copy `updateStatus`)  rules FR-010013: file-only; directory cascade; lift from `not_needed` only folder; reply from `cascade.updated_count`
- [X] T010 [US1] Connect the cascade to `backend/src/api/routes/elements.ts`  replace the direct `elementRepository.updateStatus` with `element.service` / cascade path
- [X] T011 [US1] Update `backend/src/services/sync.service.ts` `resolveStatusOnSync`  inheritance `not_needed` from an ancestor with `status_manually_set`; from the heir `status_manually_set=false` (research R3)
- [X] T012 [P] [US1] Unit tests in `backend/tests/unit/status-cascade.test.ts`  cascade / lift / overwrite child; sync inheritance
- [X] T013 [P] [US1] Integration-test in `backend/tests/integration/status-cascade.test.ts`  PATCH directory with descendants in ES; 422 with too_large (mock/calculator)

**Checkpoint A1**: curl/UI  change of folder status cascades; lift does not touch children; sync inherits `not_needed`

---

## Phase 4: User Story 2  Hierarchy of the nodes of the graph (Priority: P1)

**Goal**: `/graph` only tree by `parent_id`; lazy load; flat list of nodes removed

**Independent Test**: `quickstart.md` §2; SC-001

**Depends on**: **F1** (data of the column from `006`); may go parallel to US1 after F1

### Implementation for User Story 2

- [X] T014 [US2] Expand `backend/src/repositories/graph-node.repository.ts` — `listByParentId(projectId, runId, parentId|root, limit, offset)` + Optionally `has_children`; **Reuse** existing filters `project_id`/`analysis_run_id`
- [X] T015 [US2] Extend `backend/src/services/graph.service.ts`  `listNodes` takes `parent_id`; add `getNodeAncestors` for path-disclosure (under US3, but API here)
- [X] T016 [US2] Extend `backend/src/api/routes/graph.ts`  query `parent_id` to `GET .../nodes`; `GET .../nodes/:nodeId/ancestors` on openapi `007`
- [X] T017 [US2] Create `frontend/src/components/graph/GraphNodeTree.tsx`  lazy expand, child pagination; styles next to existing `frontend/src/components/graph/*.module.css` (do not copy `FileTree` wholesale  if you wish only pattern loading)
- [X] T018 [US2] Update `frontend/src/api/graph.ts` and `frontend/src/api/graph-types.ts`  `listGraphNodes({ parentId, limit, offset })`, `getNodeAncestors`
- [X] T019 [US2] Rewrite `frontend/src/pages/GraphPage.tsx`  replace the flat `NodeList` with `GraphNodeTree`; **not** leave the flat list mode; keep `EdgeTable` / empty states from `006`
- [X] T020 [P] [US2] Unit/smoke `frontend/src/components/graph/GraphNodeTree.test.tsx`  expand is called by the API with `parent_id`

**Checkpoint B1**: `/graph` shows a tree; there is no flat list

---

## Phase 5: User Story 3  Search by nodes and edges (Priority: P2)

**Goal**: One `q` → nodes+edges; click node → path; click edge → edges + `from`

**Independent Test**: `quickstart.md` §3; SC-002

**Depends on**: **B1** (hierarchy + ancestors)

### Implementation for User Story 3

- [X] T021 [US3] Expand `backend/src/repositories/graph-node.repository.ts` and `backend/src/repositories/graph-edge.repository.ts`  `search(q, limit, offset)` multi-match; ignore reserved `filter_*` at the route level (do not implement facets)
- [X] T022 [US3] Add `GraphService.search` to `backend/src/services/graph.service.ts`  parallel search for nodes+edges → `{ q, nodes, edges }`
- [X] T023 [US3] Add `GET .../graph/search` in `backend/src/api/routes/graph.ts`  validation `q` ≥2, Russian 400
- [X] T024 [US3] Create a `frontend/src/components/graph/GraphSearch.tsx`  field, button Night, nodes/Rebs tabs, page layout
  <!-- 2026-07-14: UI Back/Next + offset (was marked [X] without page-in-UI) -->
- [X] T025 [US3] Link the search to `frontend/src/pages/GraphPage.tsx`  click the node: ancestors + expand/scroll/select; click the edge: `EdgeTable` + select `from` (`contracts/graph-ui-scale.md`)
- [X] T026 [P] [US3] Integration-test `backend/tests/integration/graph-search.test.ts`  known name from the fixtures on the first page
  <!-- 2026-07-14: Real integration (ES+fixture) is added; unit smoke remains in tests/unit/ -->

**Checkpoint C1**: Search finds a node; navigation from the results works

---

## Phase 6: User Story 4  Adjustable width of panels (Priority: P2)

**Goal**: Splitters + `localStorage`; minimum; without server API

**Independent Test**: `quickstart.md` §4; SC-004

**Depends on**: **F1**; independent of US1US3 (can be followed by F1 in parallel with caution on the same layout-files)

### Implementation for User Story 4

- [X] T027 [US4] Create `frontend/src/hooks/usePanelWidths.ts`  key `ods.workspace.panelWidths.v1`, defaults/minima from `contracts/workspace-panels.md`; without new npm-dependencies
- [X] T028 [US4] Install the splitters only in `frontend/src/layouts/WorkspaceLayout.tsx` + styles in `frontend/src/styles/workspace.css`  clamp, `role="separator"`; **not** to duplicate the splitters in `WorkspacePage.tsx`
- [X] T029 [P] [US4] Unit-test `frontend/src/hooks/usePanelWidths.test.ts`  restore from mock `localStorage`, clamp to a minimum

**Checkpoint D1**: reload workspace keeps the width ≤5% of the error

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Consistency, regression, fast reception

- [X] T030 Re-comparison with R9 audit: no duplicate services/repositories; `NodeList` not on `GraphPage`; cascade/search not bypass AppError/zod; no new deps in the lockfile without justification; **DoD:** no migration job for the cascade; no canvas / edit-delete nodes and edges in UI  note in `specs/007-portal-scale-ux/research.md` R9 done
- [X] T031 [P] Throw out the relevant Vitest: `backend` cascade/search + `frontend` tree/panels; regressions `006` GraphPage  `GraphNodeTree.test.tsx` / FileGraphPanel (flat `NodeList.test.tsx` deleted)
- [X] T032 [P] Smoke on `specs/007-portal-scale-ux/quickstart.md` on compose `full`  cascade, tree, search, panel; SC-001 at ≥1000  optional manually (not gate CI)
- [X] T033 Canon scale API: **extension** `contracts/openapi-portal-scale.yaml` (+ R8); full merge in `002` OpenAPI is not mandatory (as graph YAML at `006`)

---

## Dependencies & Execution Order

### Story order

```text
Phase 1–2 (Setup + F1 audit)
    ── US1 stuntman (P1)  MVP
    ── US2 hierarchy (P1)  after F1 can be parallel to US1
    ── US4 panel (P2)  (avoid editing GraphPage at the same time)
    ── US3 search (P2)  after B1 (necessary tree + ancestors)
Polish  after selected stories
```

### Parallel opportunities

- After **F1**: US1  US2  US4 (different file owners are preferred)
- Inside US1: T012  T013 after T011
- Inside US2: T020 after T017
- US3 only after checkpoint **B1**

### MVP scope

**Minimum for value:** Phase 12 + **US1 (cascading) ** → then US2 → US3 → US4.

---

## Implementation Strategy

1. Do **T003 audit** before writing the logic  do not fertilize `ElementRepository2` / second Graph client.
2. Cascade in-place in `element.repository` + thin service; sync  point patch `resolveStatusOnSync`.
3. Graph: extend `graph.service`/`graph.ts`/`graph-node.repository`; UI  new `GraphNodeTree` + `GraphSearch`, delete the flat list from `GraphPage`.
4. Panels  hook + layout, without npm resizable-kit, if pointer events are sufficient.
5. Polish: R9 re-check + Vitest + quickstart.

## Task count summary

| Phase | Tasks | Notes |
|-------|-------|-------|
| Setup | T001–T002 | 2 |
| Foundational | T003–T006 | 4 (T003 = code audit) |
| US1 cascade | T007–T013 | 7 |
| US2 hierarchy | T014–T020 | 7 |
| US3 search | T021–T026 | 6 |
| US4 panel | T027–T029 | 3 |
| Polish | T030–T033 | 4 |
| **Total** | **T001–T033** | **33** |

**Format validation**: All tasks  `- [ ]`, ID, file paths; story-labels on US-phases; Setup/Foundational/Polish without `[USx]`.
