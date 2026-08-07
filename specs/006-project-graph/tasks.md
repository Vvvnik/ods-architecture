# Tasks: Project graph  canon, ingest, API, UI

**Input**: `specs/006-project-graph/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅; MVP `002` + `003` implemented; **`005` checkpoint B2+** (envelope in `ods-parser-envelopes`, the orchestrator keeps the envelope)

**Tests**: Not requested in spec; reception  `quickstart.md` (SC-001SC-005); Vitest unit/integration  in the respective phases and Polish

**Organization**: By user stories spec.md; backend ingest/API + extension `frontend/`

**Agreement**: `005`  envelope and hook-point (**006** T021 closes **005** T044); `002`  DELETE cascade; `003`  replacement `GraphStubPage`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: You can do it in parallel.
- **[Story]**: US1US6 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Catalogue of ingest, test fixtures

- [X] T001 Create a structure `backend/src/services/ingest/` and `backend/src/services/ingest/adapters/` by `plan.md`
- [X] T002 [P] Add to the native model fixture `backend/tests/fixtures/ingest/typescript-model-v1.json` (minimum set of symbols + refs for the adapter)
- [X] T003 [P] Add to the envelope fixture `backend/tests/fixtures/ingest/envelope-typescript-v1.json` by `specs/005-code-analysis/contracts/envelope-schema.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain, ES index, repository, ingest/API frame  blocks all user stories

**⚠️ CRITICAL**: User story work doesn't start until checkpoint **F1**

- [X] T004 Implement `backend/src/domain/graph-node.ts`  types of GraphNode, NodeKind, Location by `data-model.md`
- [X] T005 [P] Implement `backend/src/domain/graph-edge.ts`  types of GraphEdge, EdgeType
- [X] T006 Add the codes to `backend/src/domain/errors.ts`  `graph_not_found`, `graph_node_not_found`, `ingest_adapter_missing`
- [X] T007 Extend `backend/src/infra/elasticsearch.ts`  bootstrap of indexes `ods-graph-nodes`, `ods-graph-edges` on `contracts/elasticsearch-indices.md`
- [X] T008 [P] Implement `backend/src/repositories/graph-node.repository.ts`  bulkUpsert, listByProjectAndRun, deleteByQuery (project_id + run + parser_id + paths)
- [X] T009 [P] Implement `backend/src/repositories/graph-edge.repository.ts`  bulkUpsert, listByNode, deleteByQuery
- [X] T010 Implement `backend/src/services/ingest/types.ts`  IngestAdapter, IngestContext, GraphNodeInput, GraphEdgeInput by `contracts/ingest-pipeline.md`
- [X] T011 Implement `backend/src/services/ingest/ingest-registry.service.ts`  register/get by `parser_id`
- [X] T012 Implement the frame `backend/src/services/graph.service.ts`  resolveLatestAnalysisRunId: `status` ∈ {success, partial} **and** `ingest_status` ∈ {success, partial} (see `data-model.md` §Latest run)
- [X] T013 Create `backend/src/api/routes/graph.ts` and register in `backend/src/index.ts` under `/api/v1/projects/:projectId/graph`
- [X] T014 [P] Add the zod-schemes to `backend/src/api/schemas/graph.schemas.ts` by `contracts/openapi-graph.yaml`
- [X] T015 [P] Expand the  `backend/src/repositories/analysis-run.repository.ts` — `patchIngestMetadata(runId, { ingest_status, ingest_completed_at, ingest_errors })`

**Checkpoint F1**: ES raises `ods-graph-*`; the ingest register is empty; the graph route is registered

---

## Phase 3: User Story 1  Ingest in the canonical graph (Priority: P1)  MVP

**Goal**: Envelope (`005`) → adapter → nodes/reps in ES; hook after save envelope; orchestrator does not parse `model`

**Independent Test**: `quickstart.md` §1  after analysis of the documents in `ods-graph-nodes`/`ods-graph-edges` with the correct `project_id`, `parser_id`

**Increment of the plan**: **A** (index + ingest TS + hook)

**Depends on**: **F1**; data envelope from `005` (stub or `parsers/typescript`)

### Implementation for User Story 1

- [X] T016 [US1] Implement `backend/src/services/ingest/node-id.ts`  stable id `{parser_id}:{path}:{kind}:{qualified_name}` + suffix `:line:{start}` at the time of collision (research R3); **also** `fitLogicalIdForEs` when ES `_id` would exceed 512 bytes (R3 scale note)
- [X] T017 [US1] Implement `backend/src/services/ingest/ingest.service.ts`  `ingestEnvelope(envelopeId)` by the algorithm `contracts/ingest-pipeline.md` §IngestService
- [X] T018 [US1] Add resolve `element_id` in `ingest.service.ts`  lookup `ods-elements` on `(project_id, path)` (research R7, best-effort)
- [X] T019 [US1] Implement `backend/src/services/ingest/adapters/typescript.ingest.ts`  `transform(model, ctx)` for `schema_version=1`
- [X] T020 [US1] Register the typescript adapter in `ingest-registry.service.ts` when starting the backend (`backend/src/index.ts` or DI-module)
- [X] T021 [US1] Hook `ingestService.ingestEnvelope` in `backend/src/services/analysis-orchestrator.service.ts` after `saveParserEnvelope` (closes **005** T044); the orchestrator only transmits the id/envelope DTO
- [X] T022 [US1] Update `ingest_status`, `ingest_errors`, `ingest_completed_at` on `ods-analysis-runs` in `ingest.service.ts` (partial when adapter errors, not throw)
- [X] T023 [P] [US1] Unit-test adapter in `backend/tests/unit/ingest/typescript.ingest.test.ts`  fixture `typescript-model-v1.json` → expected nodes/edges
- [X] T024 [P] [US1] Integration-test in `backend/tests/integration/graph-ingest.test.ts`  envelope doc in ES → ingest → assert counts in `ods-graph-*`

**Checkpoint A1**: curl ES or integration test  nodes after the analysis is carried out with TS envelope

---

## Phase 4: User Story 2  View the file dependencies through API (Priority: P1)

**Goal**: REST reading of column: summary, nodes, edges, file dependencies; latest `analysis_run_id` by default

**Independent Test**: `quickstart.md` §2§4  GET summary, file dependencies, node edges; empty answer without 500

**Increment of the plan**: **B** (API)

**Depends on**: **A1** (data in ES)

### Implementation for User Story 2

- [X] T025 [US2] Implement `GraphService.getSummary` in `graph.service.ts`  node_count, edge_count, languages
- [X] T026 [US2] Implement the `GraphService.listNodes`  filter path/kind, paginaation limit≤100 (research R9)
- [X] T027 [US2] Implement `GraphService.getNodeById` and `getNodeEdges`  direction outgoing|incoming|both, 1 hop
- [X] T028 [US2] Implement `GraphService.getFileDependencies`  nodes + edges for path
- [X] T029 [US2] Implement `GET /api/v1/projects/:projectId/graph/summary` in `graph.ts`  ApiError (`code` + EN message)
- [X] T030 [US2] Implement `GET .../graph/nodes` and `GET .../graph/nodes/:nodeId` in `graph.ts`
- [X] T031 [US2] Implement `GET .../graph/nodes/:nodeId/edges` in `graph.ts`
- [X] T032 [US2] Implement `GET .../graph/files/:filePath/dependencies` in `graph.ts`  decode URI path, query `analysis_run_id` optional

**Checkpoint B1**: curl file dependencies for known `.ts` file after A1

---

## Phase 5: User Story 3  Minimum UI Graph (Priority: P1)

**Goal**: Replacing `GraphStubPage`  list of nodes + edge table; localized empty state

**Independent Test**: `contracts/graph-ui.md`  `/graph` with analysis shows the nodes; without analysis  hint sync+analysis

**Increment of the plan**: **C** (UI)

**Depends on**: **B1** (API)

### Implementation for User Story 3

- [X] T033 [P] [US3] Implement `frontend/src/api/graph.ts`  getSummary, listNodes, getNodeEdges, getFileDependencies
- [X] T034 [P] [US3] Add `frontend/src/api/types.ts` to the graph endpoints type (after merge OpenAPI or manually by `openapi-graph.yaml`)
- [X] T035 [US3] Implement `frontend/src/hooks/useGraph.ts`  download summary/nodes, node selection, offset page
- [X] T036 [US3] Implement `frontend/src/components/graph/GraphEmptyState.tsx`  texts by `contracts/graph-ui.md`
- [X] T037 [P] [US3] Implement `frontend/src/components/graph/NodeList.tsx`  click → select the node
- [X] T038 [P] [US3] Implement `frontend/src/components/graph/EdgeTable.tsx`  columns from → to, type, path
- [X] T039 [US3] Implement the `frontend/src/pages/GraphPage.tsx`  layout on `contracts/graph-ui.md` (without React Flow)
- [X] T040 [US3] Substitute `GraphStubPage` to `GraphPage` in `frontend/src/app/router.tsx`
- [X] T041 [US3] Add graph-column i18n strings to `frontend/src/i18n/ru.ts` by `contracts/graph-ui.md` (FR-014)
- [X] T042 [P] [US3] Remove `graph_stub` from `frontend/src/context/SessionContext.tsx` if not used anymore

**Checkpoint C1**: SC-001  `/graph` empty list of nodes within 10 seconds after ingest (pilot)

---

## Phase 6: User Story 4  Increased ingest (Priority: P2)

**Goal**: Update/remove the canon only for affected paths; without complete reassembly

**Independent Test**: `quickstart.md` § 6  edit one file → changes only for its path

**Increment of the plan**: **D**

**Depends on**: **A1**; change set from `005` (`analysis_run` / change-set service)

### Implementation for User Story 4

- [X] T043 [US4] Building `IngestContext.affected_paths` and `deleted_paths` in `ingest.service.ts` from the change set of the driveway (`005`)
- [X] T044 [US4] Implement `deleteByPaths` in `graph-node.repository.ts` and `graph-edge.repository.ts`  filter project_id + analysis_run_id + parser_id + path ∈ paths
- [X] T045 [US4] Install delete-before-upsert in `ingest.service.ts` for incremental (steps 5a5c `ingest-pipeline.md`)
- [X] T046 [US4] For `deleted_paths`  just delete, skip `adapter.transform` in `ingest.service.ts`
- [X] T047 [P] [US4] Integration-test in `backend/tests/integration/graph-incremental-ingest.test.ts`  two progons, one path changed

**Checkpoint D1**: SC-003  increments ≥2× faster than complete reassembly at ≤5% of files (pilot)

---

## Phase 7: User Story 5  Connecting a graph to a file tree (Priority: P2)

**Goal**: Switching nodes → files to workspace; optional panel Graph for file

**Independent Test**: Link with `path=src/app.ts` → click Open file → same path in workspace

**Depends on**: **C1** (UI), **B1** (file dependencies API)

### Implementation for User Story 5

- [X] T048 [US5] Add the action Open the file in `NodeList.tsx` / `GraphPage.tsx`  navigate `/projects/:id?highlightPath=...`
- [X] T049 [US5] Extend `frontend/src/pages/WorkspacePage.tsx` (or hook tree)  allocating the element by `highlightPath` query param
- [X] T050 [P] [US5] Implement `frontend/src/components/graph/FileGraphPanel.tsx`  `getFileDependencies`
- [X] T051 [US5] Connect `FileGraphPanel` to `WorkspacePage.tsx` when selecting a file (side panel or tab)
- [X] T052 [US5] Document the behavior of stale `element_id` in the comments `ingest.service.ts`; toast-warning in `GraphPage.tsx` if `element_id` is not found in the tree

**Checkpoint E1**: navigation of the graph  workspace by path

---

## Phase 8: User Story 6  Clean up when you delete a project (Priority: P2)

**Goal**: DELETE of the project deletes all documents `ods-graph-nodes` and `ods-graph-edges`

**Independent Test**: `quickstart.md` §7  count on `project_id` = 0 after DELETE

**Depends on**: **F1** (delete_by_query repositories); coordinated with `005` T057

### Implementation for User Story 6

- [X] T053 [US6] Extend `backend/src/services/project.service.ts` DELETE  delete_by_query `ods-graph-nodes` and `ods-graph-edges` by `project_id` (together with the cascade **005** T057)
- [X] T054 [P] [US6] Integration-test in `backend/tests/integration/project-delete-graph.test.ts`  ingest → DELETE → count 0
- [X] T055 [P] [US6] Add a cross-ref to `specs/002-domain-model/data-model.md` (§Delete the project) to the `006` `ods-graph-*`

**Checkpoint F-delete**: SC-005  0 documents of the column after DELETE

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: C#/Python/C++, OpenAPI merge, receiving, documentation

**Increments of the plan**: **EG** (adapters synchronous with the parser `005`)

- [X] T056 [P] Implement `backend/src/services/ingest/adapters/csharp.ingest.ts`  `model` v1 (after `005` checkpoint D1)
- [X] T057 [P] Implement `backend/src/services/ingest/adapters/python.ingest.ts`  `model` v1 (after `005` E1)
- [X] T058 [P] Implement `backend/src/services/ingest/adapters/cpp.ingest.ts`  `model` v1 (after `005` F1)
- [X] T059 Register csharp/python/cpp adapters in `ingest-registry.service.ts`
- [X] T060 Extend `specs/002-domain-model/contracts/openapi.yaml`  merge paths/components from `specs/006-project-graph/contracts/openapi-graph.yaml` (version → 1.3.0)
- [X] T061 [P] Update `specs/003-portal-mvp/contracts/api-consumer.yaml`  mirror graph endpoints
- [X] T062 Run the scenarios `specs/006-project-graph/quickstart.md` on `docker compose --profile full` (including §7 DELETE  cascade `005`+`006`)  record the findings in `ods-help/user-guide/implement-feedback-guide.md` if necessary
- [ ] T063 [P] Optionally: e2e Playwright `frontend/tests/e2e/graph-page.spec.ts`  analysis → `/graph` → node selection (SC-004)
- [ ] T064 [P] Optionally: benchmark in `backend/tests/performance/ingest-incremental.bench.ts`  SC-003
- [X] T065 [P] Update `ods-help/user-guide/commands.md`  step `speckit-implement specs/006-project-graph`
- [X] T067 [P] Add fixture `backend/tests/fixtures/graph/expected-file-dependencies.json` and integration-test SC-002 in `backend/tests/integration/graph-file-dependencies.test.ts`  100% of the expected edges of the fixture
- [X] T066 Update the status in `specs/006-project-graph/spec.md`  Turn it up (spec/plan/tasks ready)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US2 (4)** → **US3 (5)** → **US4 (6)** → **US5 (7)** → **US6 (8)** → **Polish (9)**
- US2US3 requires data from US1; US4 expands US1; US5 requires US2+US3; US6 can be started after F1 parallel to US2US3 (but integration test T054  after A1)

### User Story Dependencies

| Story | Depends on what | Checkpoint |
|-------|------------|------------|
| US1 | F1, envelope `005` | A1 |
| US2 | A1 | B1 |
| US3 | B1 | C1 |
| US4 | A1, change set `005` | D1 |
| US5 | B1, C1 | E1 |
| US6 | F1 (repository); test after A1 | F-delete |

### Parallel Opportunities

- Phase 1: T002, T003 in parallel
- Phase 2: T005, T008T009, T014T015 in parallel to T004/T006/T007
- US1: T023, T024 in parallel to T022
- US2: T025T028 sequentially in service; T029T032 can be broken down by route handlers [P] files after service
- US3: T033T034, T037T038, T042 in parallel; T039 after the components
- US4: T047 parallel to T046
- US5: T050 parallel to T048T049
- US6: T054, T055 parallel to T053
- Polish: T056T058 parallel after the corresponding parseers `005`; T061, T063T065 parallel

### Parallel Example: US1

```bash
# After T022:
T023 unit/typescript.ingest.test.ts
T024 integration/graph-ingest.test.ts
```

### Parallel Example: Polish adapters (after the 005 parser)

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
3. **STOP**: ingest in ES after analysis; checking through integration test / ES

### Increase A (ingest TS)

1. F1 → US1 → **A1**

### B- increment (API)

1. A1 → US2 → **B1**

### The C (UI)

1. B1 → US3 → **C1**  full chain 005 → 006 for the user (SC-001)

### The D-Increment

1. C1 → US4 → **D1**

### E-Increment (navigation + DELETE)

1. US5 → **E1**; US6 → **F-delete** (can be parallel to US5)

### Full reception

1. Polish T056–T062 + quickstart + SC-001–SC-005

---

## Notes

- **006 limit: only `IngestService` and adapters interpret `model`; hook in the orchestrator  **006** T021 (not to be confused with **005** T021 = detector after sync)
- **`_id` ES**: `{analysis_run_id}:{id}` for nodes/edges (see `contracts/elasticsearch-indices.md`). Elasticsearch max `_id` length is **512 bytes**; oversized logical ids are shortened with `fitLogicalIdForEs` (research R3)
- C#/Python/C++ adapters (T056T059)  **after** the corresponding parser `005`; MVP = typescript only
- `FileGraphPanel` (T050T051)  post-MVP in `graph-ui.md`, but included in tasks like P2 US5
- Localized messages  `errors.ts` + `i18n/ru.ts` + ApiError in routes
- `[P]`  different files, no dependence on unfinished tasks in the same group
