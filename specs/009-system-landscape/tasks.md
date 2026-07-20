# Tasks: System landscape (009)

**Input**: `specs/009-system-landscape/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅ (clarify 2026-07-14); `005`/`006`/`007`/`008` implemented

**Tests**: SC-001...005, quickstart.md — unit ingest + integration parser→ingest + regression code-only; Vitest

**Organization**: US1 compose P1 → US2 openapi P1 → US3 appsettings P1 → US6 layer filter P1 → US4 dotnet P2 → US5 bus P2

**Harmonization code**: Phase 2 — `artifacts[]`, Canon system types, ingest `layer=system`; no new indexes count

## Format: `[ID] [P?] [Story] Description`

- **[P]**: you can simultaneously (in different files, there is no dependence on incomplete)
- **[Story]**: US1–US6 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Expansion points, detector rules, parser skeletons

- [x] T001 Fix map of affected files in `specs/009-system-landscape/research.md` section `## R13. Code reuse audit` — `language-detector.service.ts`, `analysis-orchestrator.service.ts`, `language-report.ts`, `graph-node.ts`, `graph-edge.ts`, `ingest-registry.service.ts`, `parsers/{compose,appsettings,openapi,dotnet-project,bus-rabbit,bus-kafka}/`, `frontend/src/pages/GraphPage.tsx`
- [x] T002 [P] Create `backend/src/config/detector-rules.json` at `contracts/detector-rules.md` (artifact globs + bus signal hints)
- [x] T003 [P] Skeletons directory `parsers/compose/`, `parsers/appsettings/`, `parsers/openapi/`, `parsers/dotnet-project/`, `parsers/bus-rabbit/`, `parsers/bus-kafka/` — `manifest.json` (schema_version `1`), `README.md` stub; register `parsers/README.md`

---

## Phase 2: Foundational — artifacts[] + Canon system (BLOCKER)

**Purpose**: Detector/Orchestrator system-parsers; extension NodeKind/EdgeType; ingest helper `layer=system`

**⚠️ CRITICAL**: User story work does not begin until checkpoint **F1**

- [x] T004 Add `ArtifactEntry` and field `artifacts[]` in `backend/src/domain/language-report.ts` at `data-model.md` §1
- [x] T005 Expand bootstrap mapping `ods-language-reports` nested `artifacts` in `backend/src/infra/elasticsearch.ts`; update the description `specs/005-code-analysis/contracts/elasticsearch-indices.md`
- [x] T006 Implement artifact scan + bus resolver (tie-break → `bus-rabbit`) in `backend/src/services/language-detector.service.ts` — read `backend/src/config/detector-rules.json`; not to break `languages[]`
- [x] T007 [P] Unit `backend/tests/unit/language-detector-artifacts.test.ts` — compose/appsettings globs; bus Rabbit-only, Kafka-only, both→Rabbit; denylist
- [x] T008 Expand `LanguageDetectorService.enrichWithParserStatus` — `parser_status` for `artifacts[]` (as languages)
- [x] T009 Save `artifacts[]` in post-sync flow (`backend/src/services/sync.service.ts` or a path report) — report MUST contain both arrays
- [x] T010 Expand `backend/src/services/analysis-orchestrator.service.ts` — after spawn `languages[]` cycle `report.artifacts` with the same `spawnedParserIds`; to pass `artifacts` in `executeRun`
- [x] T011 Expand `backend/src/services/change-set.service.ts` — `resolveArtifactChangeSet` / classification ways artifact globs for incremental
- [x] T012 [P] API `GET .../language-report/latest` — give `artifacts` in `backend/src/api/routes/analysis.ts` (OpenAPI mirror if available)
- [x] T013 [P] to Expand `NodeKind` system kinds in `backend/src/domain/graph-node.ts` at `contracts/canonical-node-system.schema.json`
- [x] T014 [P] to Expand `EdgeType` + `isEdgeType` in `backend/src/domain/graph-edge.ts` and `backend/src/services/ingest/types.ts` at `contracts/canonical-edge-types-system.md`
- [x] T015 [P] Helper `withSystemLayer(metadata)` in `backend/src/services/ingest/system-layer.ts` (or near types) — MUST `layer: system`
- [x] T016 [P] Synchronize `specs/006-project-graph/contracts/canonical-schemas.json` and `ods-help/requirements/json-model/canonical-*-system.schema.json` — enum kinds/types (note 009)
- [x] T017 Add `ArtifactEntry` and field `artifacts` in `frontend/src/api/analysis-types.ts` at `contracts/detector-artifacts.md`
- [x] T018 [P] The signature of the types of artifacts and bus-profile `frontend/src/i18n/ru.ts` — `compose`, `appsettings`, `openapi`, `dotnet-project`, `bus`; `bus-rabbit`→RabbitMQ, `bus-kafka`→Kafka
- [x] T019 Expand `frontend/src/components/analysis/LanguagesConfirmModal.tsx` — section "System artifacts" under languages: summary `artifacts[]` (type, file_count, sample_path, badge); bus — one row for `parser_id`
- [x] T020 `frontend/src/context/AnalysisProvider.tsx` + `frontend/src/hooks/useAnalysis.ts` — pass `artifacts`, highlighting new artifact types; window 1 if `languages.length > 0 || artifacts.length > 0`; update `specs/005-code-analysis/contracts/analysis-ui.md` §window 1
- [x] T021 [P] Unit `frontend/src/components/analysis/LanguagesConfirmModal.test.tsx` — languages + artifacts summary (including bus one line)

**Checkpoint F1**: artifacts in ES/report; detector+Orchestrator spawn artifact parsers; system EdgeType/NodeKind domain; window 1 shows a summary artifacts

---

## Phase 3: User Story 1 — Graph of services from compose (Priority: P1) 🎯 MVP

**Goal**: `docker-compose.yml` → nodes `service` + rib `depends_on`

**Independent Test**: `quickstart.md` §2; US1 acceptance; fixture compose

**Depends on**: **F1**

### Implementation for User Story 1

- [x] T022 [US1] Implement `parsers/compose/run.mjs` — parse yaml, native model at `contracts/native-compose.schema.json`; envelope `schema_version: "1"`
- [x] T023 [P] [US1] `parsers/compose/manifest.json` + `parsers/compose/README.md` — CLI contract as `005` parser-manifest
- [x] T024 [US1] `backend/src/services/ingest/adapters/compose.ingest.ts` — services→`service`, depends_on→`depends_on`, `withSystemLayer`, id `{parser_id}:{kind}:{stable_key}`
- [x] T025 [US1] Register adapter `backend/src/services/ingest/ingest-registry.service.ts`
- [x] T026 [P] [US1] Fixture `backend/tests/fixtures/ingest/compose-model-v1.json` + unit `backend/tests/unit/ingest/compose.ingest.test.ts`
- [x] T027 [US1] Integration `backend/tests/integration/compose-parser.test.ts` — CLI → envelope → ingest → assert nodes/edges `depends_on` in the Canon

**Checkpoint A1**: compose end-to-end on fixture

---

## Phase 4: User Story 2 — HTTP-contracts from OpenAPI (Priority: P1)

**Goal**: OpenAPI yaml → `http_endpoint`, `documents`, `exposes` (if match service)

**Independent Test**: `quickstart.md` §3; US2 acceptance

**Depends on**: **F1** (preferably A1 for `exposes` cross-link)

### Implementation for User Story 2

- [x] T028 [US2] Implement `parsers/openapi/run.mjs` — paths/operations; invalid yaml → exit partial/error without falling Orchestrator
- [x] T029 [P] [US2] `parsers/openapi/manifest.json` + README
- [x] T030 [US2] `backend/src/services/ingest/adapters/openapi.ingest.ts` — operations→`http_endpoint`, `documents`; heuristic `exposes` to `service` (research R6)
- [x] T031 [US2] Check ingest + unit `backend/tests/unit/ingest/openapi.ingest.test.ts` + fixture `backend/tests/fixtures/ingest/openapi-model-v1.json`
- [x] T032 [US2] Integration `backend/tests/integration/openapi-parser.test.ts` — ingest assert `http_endpoint` + `documents`

**Checkpoint A2**: openapi end-to-end

---

## Phase 5: User Story 3 — connect to the database from the configuration (Priority: P1)

**Goal**: appsettings → `database` + `connects_to`; N connection strings → N nodes

**Independent Test**: `quickstart.md` §3; US3; FR-013

**Depends on**: **F1** (A1 for `connects_to`→service)

### Implementation for User Story 3

- [x] T033 [US3] Implement `parsers/appsettings/run.mjs` — JSON + `.env`; bindings `database`/`broker` at `contracts/native-appsettings.schema.json`
- [x] T034 [P] [US3] `parsers/appsettings/manifest.json` + README
- [x] T035 [US3] `backend/src/services/ingest/adapters/appsettings.ingest.ts` — bindings `database` → node `database` + `connects_to` (each CS, `metadata.engine`, dedup); bindings `broker` → node `broker` + `connects_to`; skip placeholder
- [x] T036 [US3] Registration + unit `backend/tests/unit/ingest/appsettings.ingest.test.ts` (multi CS fixture)
- [x] T037 [US3] Integration `backend/tests/integration/appsettings-parser.test.ts`

**Checkpoint A3**: appsettings/DB end-to-end

---

## Phase 6: User Story 6 — layer Filter on the screen "the Count" (Priority: P1)

**Goal**: UI `code` | `system` | `all`; rules of ribs FR-008

**Independent Test**: `quickstart.md` §5; SC-002; US6 acceptance

**Depends on**: **F1** + data system (better after A1–A3)

### Implementation for User Story 6

- [x] T038 [US6] Add `SYSTEM_EDGE_TYPE_LABELS` and `graphEdgeTypeLabel` extension in `frontend/src/i18n/ru.ts` at `contracts/canonical-edge-types-system.md`
- [x] T039 [US6] Control filter layer on `frontend/src/pages/GraphPage.tsx` — `code`/`system`/`all`; persist session/local state
- [x] T040 [US6] the Filtering of nodes/edges in `frontend/src/components/graph/GraphSearch.tsx`, `EdgeTable.tsx`, `FileGraphPanel.tsx` (if applicable) — system↔system / code↔code / all
- [x] T041 [P] [US6] Unit `frontend/src/components/graph/GraphLayerFilter.test.tsx` (or extend an existing graph test) — mock nodes both layers
- [x] T042 [US6] to Lock in `specs/009-system-landscape/plan.md` §Constraints: filter layer MVP — **client-only** (without query `layer` in `backend/src/api/routes/graph.ts`); server-side filter — follow-up post-MVP

**Checkpoint A4**: filter layer works on the project code+system

---

## Phase 7: User Story 4 Links between .NET-projects (Priority: P2)

**Goal**: `.csproj`/`.sln` → `dotnet_project` + `project_reference`

**Independent Test**: US4 acceptance; integration dotnet-project

**Depends on**: **F1**

### Implementation for User Story 4

- [x] T043 [US4] Implement `parsers/dotnet-project/` - .NET CLI or `run.sh` + csproj/sln parse; native `contracts/native-dotnet-project.schema.json`
- [x] T044 [P] [US4] `manifest.json` + README for `dotnet-project`
- [x] T045 [US4] `backend/src/services/ingest/adapters/dotnet-project.ingest.ts` + registry + unit test + fixture
- [x] T046 [US4] Integration `backend/tests/integration/dotnet-project-parser.test.ts`

**Checkpoint A5**: project_reference in the Canon

---

## Phase 8: User Story 5 Messages on the bus (Priority: P2)

**Goal**: bus-rabbit **or** bus-kafka (detector); `consumes`/`publishes`

**Independent Test**: `quickstart.md` §4; US5 scenario 3 tie-break

**Depends on**: **F1** + T006 bus resolver

### Implementation for User Story 5

- [x] T047 [US5] Implement `parsers/bus-rabbit/` — Roslyn handlers/listeners; native `contracts/native-bus-rabbit.schema.json`
- [x] T048 [P] [US5] Implement `parsers/bus-kafka/` — consumers/topics; native `contracts/native-bus-kafka.schema.json`
- [x] T049 [P] [US5] manifests + README for both bus parsers
- [x] T050 [US5] `backend/src/services/ingest/adapters/bus-rabbit.ingest.ts` and `bus-kafka.ingest.ts` + registry
- [x] T051 [US5] Unit ingest tests for bus adapters + fixtures
- [x] T052 [US5] Integration `backend/tests/integration/bus-rabbit-parser.test.ts` (and optionally kafka-only fixture)
- [x] T053 [P] [US5] Unit/assert in `language-detector-artifacts.test.ts` — mixed signals → only `bus-rabbit` artifact entry

**Checkpoint A6**: bus end-to-end; one spawn per run

---

## Phase 9: Polish & Cross-Cutting

**Purpose**: Demo fixture, e2e SC-001/003/004, json-model, docs

- [x] T054 [P] Create `docker/fixtures/repos/system-landscape-demo/` — compose + appsettings + openapi + csproj + Rabbit listener; README; golden manifest `backend/tests/fixtures/system-landscape/expected-links.json` (marked regard for SC-004); connect in `docker/fixtures/repos/setup-fixtures.sh`
- [x] T055 Integration `backend/tests/integration/system-landscape-e2e.test.ts` — full run demo → ≥10 system nodes, ≥8 edges (SC-001); assert SC-004: ≥90% from `expected-links.json` present in the Canon after ingest
- [x] T056 [P] Regression SC-003: `backend/tests/integration/system-landscape-code-regression.test.ts` on `code-graph-depth-demo` — code graph no change
- [x] T057 [P] Update `ods-help/requirements/json-model/README.md` and `implementation_status: done` for C02, C04, P01–P07 after green tests
- [x] T058 [P] Synchronize `specs/006-project-graph/contracts/ingest-pipeline.md` — system adapters, `layer=system`
- [x] T059 To banish `specs/009-system-landscape/quickstart.md` §1–§8; note checklists deviations
- [x] T060 [P] Update `specs/001-ods-vision/spec.md` status stage 8 → implemented (after green e2e in polish)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup** → immediately
- **Phase 2 Foundational** → after Setup; **blocks** US1–US6
- **US1 → US2 → US3** → after F1 (US2/US3 better after US1 for cross-link, but tested with a minimum fixture)
- **US6** → after F1; **recommended** after A1–A3 (there is system data)
- **US4, US5** → after F1; in parallel with each other after A3
- **Polish** → after A1–A6

### User Story Dependencies

| Story | Depends |
|-------|---------|
| US1 compose | F1 |
| US2 openapi | F1 (A1 for exposes) |
| US3 appsettings | F1 (A1 for connects_to→service) |
| US6 layer filter | F1; data A1–A3 |
| US4 dotnet-project | F1 |
| US5 bus | F1 |

### Parallel Opportunities

```text
After F1:
  Dev A: US1 (T022–T027)
  Dev B: US3 appsettings parser skeleton (T033–T034) — ingest after A1 optional
  Dev C: modal artifacts UI (T017–T021) in parallel with the parser after T012
After A1–A3:
  Dev D: US6 (T038–T042)
  Dev E: US4 (T043–T046)
  Dev F: US5 (T047–T053)
Polish [P]: T054, T056, T057, T058, T060 parallel
```

### Parallel Example: after F1

```bash
# Parallel:
Task: "T022 parsers/compose/run.mjs"
Task: "T028 parsers/openapi/run.mjs"
Task: "T033 parsers/appsettings/run.mjs"
```

---

## Implementation Strategy

### MVP First (F1 + US1 + US3 + US6)

1. Phase 1–2 (F1)
2. Phase 3 US1 (compose)
3. Phase 5 US3 (appsettings) — quick value database
4. Phase 6 US6 (filter)
5. **STOP**: validate quickstart §2, §3, §5 on demo subset

### Incremental Delivery

1. F1 → artifacts pipeline
2. US1 → compose topology
3. US2 → API contracts
4. US3 → databases
5. US6 → usable UI
6. US4 → dotnet graph
7. US5 → bus
8. Polish → full demo SC-001

---

## Notes

- Canvas (`010`) — **not** to do
- `dotnet-api-routes`, `path prefix` — **not** in tasks MVP
- Detector **not** lists DB engines (FR-013); modal — summary artifacts (option A)
- The filter layer MVP — **client-only** (T042); golden SC-004 — `expected-links.json` (T054–T055)
- Both bus in registry; spawn **one** per run
- All tasks in the format `- [x] Txxx ...` with file paths
