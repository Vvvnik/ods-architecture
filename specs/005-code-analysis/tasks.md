# Tasks: Code analysis  detector, orchestrator, parser

**Input**: `specs/005-code-analysis/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅; MVP `002` + `003` are implemented (sync, portal)

**Tests**: Not requested in spec; receipt  `quickstart.md` (SC-001SC-005); Vitest unit  in Polish (optional)

**Organization**: By user stories spec.md; backend + `parsers/` + extension `frontend/`

**Agreement**: `002`  sync/WC/DELETE; `003`  post-sync UX; `006`  ingest (not in scope)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: You can do it in parallel.
- **[Story]**: US1US5 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Parser catalog, setup, Docker

- [x] T001 Create a structure of `parsers/` on `contracts/parser-manifest.md` (`typescript/`, README at the root of `parsers/README.md`)
- [x] T002 Extend `backend/src/config.ts`  `PARSERS_ROOT`, `ANALYSIS_PARSER_TIMEOUT_MS`, `ANALYSIS_MAX_PARALLEL_PARSERS` (default 2), denylist of the detector directories
- [x] T003 [P] Update `docker/docker-compose.dev.yml`  volume mount `./parsers` → `/app/parsers` for the backend service (profile `full`)
- [x] T004 [P] Upgrade `backend/Dockerfile`  `COPY parsers/` to image (production path)
- [x] T005 [P] Add the variables in `docker/.env.example` `PARSERS_ROOT`, `ANALYSIS_PARSER_TIMEOUT_MS`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain, ES-index, repository, registry, errors  blocks all user stories

**⚠️ CRITICAL**: User story work doesn't start until checkpoint **F1**

- [x] T006 Implement the `backend/src/domain/language-report.ts`  types of LanguageReport, LanguageEntry, parser_status
- [x] T007 [P] Implement `backend/src/domain/analysis-run.ts`  AnalysisRun, ChangeSet, ParserResultSummary, status
- [x] T008 [P] Implement `backend/src/domain/parser-envelope.ts`  ParserEnvelope (wrap, without validation `model`)
- [x] T009 Add codes to `backend/src/domain/errors.ts`  `analysis_in_progress`, `language_report_not_found`, `analysis_run_not_found`
- [x] T010 Extend `backend/src/infra/elasticsearch.ts`  bootstrap of indexes `ods-language-reports`, `ods-analysis-runs`, `ods-parser-envelopes`, `ods-sync-snapshots` on `contracts/elasticsearch-indices.md`
- [x] T011 [P] Implement `backend/src/repositories/language-report.repository.ts`  save, getLatestByProjectId, listByProjectId
- [x] T012 [P] Implement `backend/src/repositories/analysis-run.repository.ts`  create, update, getById, listByProjectId
- [x] T013 [P] Implement `backend/src/repositories/parser-envelope.repository.ts`  save, listByRunId
- [x] T014 [P] Implement `backend/src/repositories/sync-snapshot.repository.ts`  upsert/get by `project_id`
- [x] T015 Implementing `backend/src/services/parser-registry.service.ts`  scanning `parsers/*/manifest.json`, zod-validation, map language→parser_id
- [x] T016 Create a frame `backend/src/api/routes/analysis.ts` and register it in `backend/src/index.ts` with the prefix `/api/v1/projects/:projectId/analysis`
- [x] T017 [P] Add the zod-schemes of the analysis requests/answers to `backend/src/api/schemas/analysis.schemas.ts` by `contracts/openapi-analysis.yaml`
- [x] T018 [P] Extend `specs/002-domain-model/contracts/openapi.yaml`  merge paths/components from `specs/005-code-analysis/contracts/openapi-analysis.yaml` (version 1.1.0 → 1.2.0)

**Checkpoint F1**: ES is raising 4 new indexes; `ParserRegistryService` reads manifest (empty catalog  ok)

---

## Phase 3: User Story 1  Auto-definition of languages after sync (Priority: P1)  MVP

**Goal**: After sync  language report in ES; parser does not start automatically

**Independent Test**: `quickstart.md` §2  GET `language-report/latest`; languages by `file_count` ↓; Go → `missing`

**Increment of the plan**: **A** (backend)

### Implementation for User Story 1

- [x] T019 [US1] Implement `backend/src/services/language-detector.service.ts`  bypass WC, expansion table, shebang, markers `package.json`/`*.csproj`, denylist, sorting FR-004; edge: empty repo / only binaries → empty or minimum report; target SC-001  <30 s per 10k files
- [x] T020 [US1] Integrate the detector with `ParserRegistryService`  `parser_id`, `parser_status` (`available`/`missing`); transfer `failed` from the last `analysis_run` by language (FR-003)
- [x] T021 [US1] Add a post-sync hook to `backend/src/services/sync.service.ts`  after `success`/`partial` call the detector and save the report; update the sync-snapshot (for US4)
- [x] T022 [US1] Implement `GET /api/v1/projects/:projectId/analysis/language-report/latest` in `backend/src/api/routes/analysis.ts`  including `parser_status: failed` with a failed past run
- [x] T023 [P] [US1] Unit tests of the detector in `backend/tests/unit/language-detector.service.test.ts`  sorting, extension, missing parser

**Checkpoint A1**: curl language-report after sync; no UI

---

## Phase 4: User Story 2  Confirmation of the analysis in the UI (Priority: P1)

**Goal**: Two modal windows after sync; cancelling does not start the parser

**Independent Test**: `contracts/analysis-ui.md`  sync → window 1 → window 2 → cancellation at step 1/2 does not cause POST runs

**Depends on**: **A1** (report); change-set API (T024T025) for window 2

**Increment of the plan**: **A** (UI window 1) + **B** (window 2)

### Implementation for User Story 2

- [x] T024 [US2] Implement `backend/src/services/change-set.service.ts`  diff snapshot vs current file tree; `added`/`modified`/`deleted`; flag `incremental`
- [x] T025 [US2] Implement `GET /api/v1/projects/:projectId/analysis/change-set` in `backend/src/api/routes/analysis.ts`
- [x] T026 [P] [US2] Generate/add type in `frontend/src/api/types.ts` from the updated OpenAPI (analysis endpoints)
- [x] T027 [P] [US2] Implement `frontend/src/api/analysis.ts`  `getLatestLanguageReport`, `getChangeSet`
- [x] T028 [US2] Implement `frontend/src/hooks/useAnalysis.ts`  mode chain state, download report/changeSet
- [x] T029 [US2] Implement `frontend/src/components/analysis/LanguagesConfirmModal.tsx` on `contracts/analysis-ui.md`  list, badges, lighting up of new languages; Cancel closes without further steps (FR-015)
- [x] T030 [US2] Implement `frontend/src/components/analysis/ChangesConfirmModal.tsx`  section added/modified/deleted; Opting   without POST runs, previous analysis is not affected (FR-015)
- [x] T031 [US2] Integrate a chain of modules into `frontend/src/hooks/useSync.ts` or `frontend/src/pages/WorkspacePage.tsx`  trigger after `sync_status` → success|partial; when empty `languages[]`  toast, models not shown
- [x] T032 [US2] Add the Russian lines of analysis to `frontend/src/i18n/ru.ts` by `contracts/analysis-ui.md`

**Checkpoint A2**: After sync, window 1 appears; Opt  without POST runs

**Checkpoint B1**: window 2 with change set; Optmen on step 2 keeps the previous analysis

---

## Phase 5: User Story 3  Modular parser and orchestration (Priority: P1)

**Goal**: Spawn the modules in order `file_count`; envelope in ES; missing does not run the drive

**Independent Test**: `quickstart.md` §4§5  POST runs → envelopes; order spawn by report (§6)

**Depends on**: **B1** (UI confirm); stub or real parser

**Increment of the plan**: **B** (orchestrator) + **C** (real TS-module  see US5 T043+)

### Implementation for User Story 3

- [x] T033 [US3] Implement `backend/src/services/analysis-orchestrator.service.ts`  lock per project (`analysis_in_progress`), create AnalysisRun with snapshot `change_set` (`added`/`modified`/`deleted`) and flag `incremental` from `change-set.service.ts` at `POST runs`, the language line from the report
- [x] T034 [US3] Add the spawn subprocess to `analysis-orchestrator.service.ts`  argv from manifest, taimaut, exit code/stderr collection
- [x] T035 [US3] Validation of envelope (wrapping only) by `contracts/envelope-schema.json` and storage in `parser-envelope.repository.ts`
- [x] T036 [US3] Update `parser_results` and final status of run (`success`/`partial`/`failed`) in `analysis-orchestrator.service.ts`
- [x] T037 [US3] Implement `POST /api/v1/projects/:projectId/analysis/runs` and `GET .../runs/:runId` in `backend/src/api/routes/analysis.ts` (409 when sync/analysis running)
- [x] T038 [US3] Implement `GET .../runs/:runId/envelopes` in `backend/src/api/routes/analysis.ts`
- [x] T039 [US3] Connect `POST runs` in `frontend/src/hooks/useAnalysis.ts` **only** after Continu window 2 (not at Ottene); polling status every 2 seconds
- [x] T040 [P] [US3] Create a stub `parsers/stub/manifest.json` + `parsers/stub/run.mjs` for the integration tests of the orchestrator (temporarily, up to T047)
- [x] T041 [P] [US3] Integration-test of the orchestrator in `backend/tests/integration/analysis-orchestrator.test.ts`  stub parser, order by file_count

**Checkpoint B2**: POST runs + stub → envelope in ES

---

## Phase 6: User Story 4  Incremental analysis (Priority: P2)

**Goal**: Repeat sync → Parser only receives the changed files of their language

**Independent Test**: `quickstart.md` §8  edit one file → only it is transmitted to spawn

**Depends on**: **B2** (orchestrator)

### Implementation for User Story 4

- [X] T042 [US4] Rework `change-set.service.ts`  path classification by detector language for parser transmission
- [X] T043 [US4] To complete `analysis-orchestrator.service.ts`  at `incremental=true` only the crossover of the change set and the language files to the module; at the first analysis  complete set
- [X] T044 [US4] Processing `deleted` in change set  logging in `005`; removing nodes/bars of the column  ingest `006` (`006` T045T046, hook `006` T021). **Closing criteria:** implemented `006` T021 + US4 ingest
- [X] T045 [P] [US4] Unit test of the increment in `backend/tests/unit/change-set.service.test.ts`

**Checkpoint I1**: Incremental propulsion faster than full on the pilot relay (SC-003)

---

## Phase 7: User Story 5  Stage delivery of the parser-modules (Priority: P2)

**Goal**: Typescript → csharp → python → cpp; runtime-order from the report

**Independent Test**: Each module  envelope with empty `model`; repo with Python → python spawn dominant first (US5 scenario 3)

**Increment of the plan**: **C** (TS), **D** (C#), **E** (Python), **F** (C++)

### Implementation  module `typescript` (increement C)

- [X] T046 [US5] Create `parsers/typescript/manifest.json` by `contracts/parser-manifest.md`
- [X] T047 [US5] Implement `parsers/typescript/run.mjs`  TS Compiler API, CLI args, record envelope, native `model` v1
- [X] T048 [US5] Add `parsers/typescript/README.md`  local start and example output
- [X] T049 [P] [US5] Remove or disable `parsers/stub/` after passing tests with `parsers/typescript` (T047)

**Checkpoint C1**: The repository is a repository with `.ts` → envelope `parser_id=typescript`

### Implementation  module `csharp` (increment D)

- [X] T050 [US5] Create `parsers/csharp/manifest.json` and `parsers/csharp/run.sh` (Roslyn CLI)
- [X] T051 [US5] Implement Roslyn extract in `parsers/csharp/`  envelope + `model` v1
- [X] T052 [P] [US5] Update `backend/Dockerfile`  install .NET runtime for subprocess (or document sidecar in `parsers/csharp/README.md`)

**Checkpoint D1**: `.cs` files → envelope `parser_id=csharp`

### Implementation  module `python` (increment E)

- [X] T053 [US5] Create `parsers/python/manifest.json` and `parsers/python/run.sh`
- [X] T054 [US5] Implement Python extract (ast/libcst) in `parsers/python/`  envelope + `model` v1

**Checkpoint E1**: `.py` files → envelope `parser_id=python`

### Implementation  module `cpp` (increement F)

- [X] T055 [US5] Create `parsers/cpp/manifest.json` and `parsers/cpp/run.sh`
- [X] T056 [US5] Implement the C++ extract (libclang/tree-sitter  selection in README) in `parsers/cpp/`

**Checkpoint F1**: `.cpp` files → envelope `parser_id=cpp`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: The first is the "Delete" cascade, Docker e2e, documentation, receipt.

- [X] T057 Extend `backend/src/services/project.service.ts` DELETE  delete_by_query by 005 (`ods-language-reports`, `ods-analysis-runs`, `ods-parser-envelopes`, `ods-sync-snapshots`); coordinate with the cascade of the column `006` T053; see `specs/005-code-analysis/data-model.md` §DELETE
- [x] T058 [P] Add to `specs/002-domain-model/data-model.md` (§ Delete the project) cross-ref to the cascade of indexes `005`  performed (analyze 2026-07-09)
- [X] T059 [P] Update `specs/003-portal-mvp/contracts/api-consumer.yaml`  mirror analysis endpoints from OpenAPI `002` after merge
- [X] T060 Run the scenarios `specs/005-code-analysis/quickstart.md` on `docker compose --profile full`  record the result in `ods-help/user-guide/implement-feedback-guide.md` when you find
- [X] T061 [P] Optionally: e2e Playwright `frontend/tests/e2e/analysis-flow.spec.ts`  sync → 2 modules → success toast (SC-004)
- [X] T062 [P] Optionally: benchmark detector in `backend/tests/performance/language-detector.bench.ts`  SC-001 (10k files, <30 s)
- [X] T063 [P] Update `ods-help/user-guide/commands.md`  step `speckit-implement specs/005-code-analysis`

---

## Phase 9: Convergence

- [X] T064 Update status in `specs/005-code-analysis/spec.md`  reflect the scope implemented (US1US4, TS+C#; Python/C++ and Phase 8 polish in action) per spec header (partial)
- [X] T065 [P] Add integration-test to `backend/tests/integration/project-delete-analysis.test.ts`  after DELETE count=0 in `ods-language-reports`, `ods-analysis-runs`, `ods-parser-envelopes`, `ods-sync-snapshots` per `data-model.md` §DELETE (missing; depends on T057)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US2 (4)** → **US3 (5)** → **US4 (6)** → **US5 (7)** → **Polish (8)**
- US2 window 2 depends on T024 (change-set) in the same phase  perform T024T025 before T030

### User Story Dependencies

| Story | Depends on what | Checkpoint |
|-------|------------|------------|
| US1 | F1 | A1 |
| US2 | A1, T024–T025 | A2, B1 |
| US3 | B1 | B2 |
| US4 | B2 | I1 |
| US5 | B2 (orchestrator); the modules are independent of each other | C1–F1 |

### Parallel Opportunities

- Phase 1: T003, T004, T005 in parallel
- Phase 2: T007T008, T011T014, T017T018 in parallel to the T006/T009
- US1: T023 parallel to T022
- US2: T026T027 in parallel; T029T030 in parallel after T028
- US3: T040T041 parallel to T037
- US5: D/E/F increments are parallel **after C1** by different developers

### Parallel Example: Foundational

```bash
# Parallel to T006:
T007 domain/analysis-run.ts
T008 domain/parser-envelope.ts
T011 language-report.repository.ts
T012 analysis-run.repository.ts
```

### Parallel Example: US5 modules (after C1)

```bash
# Different developers:
T050–T052 csharp
T053–T054 python
T055–T056 cpp
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1–2 → F1
2. Phase 3 (US1) → **A1**
3. **STOP**: API of report after sync without UI analysis

### A increment (language detector + window)

1. F1 → US1 → US2 (T024–T029, T031–T032) → **A2**

### Increase B (confirmation + orchestrator)

1. US2 (T030, T025) → US3 → **B2** with stub parser

### CF increments (parseers)

1. US4 (increement) → US5 typescript (**C1**) → csharp/python/cpp by business priority

### Full reception

1. All checkpoints are C1F1 + quickstart.md + SC-001SC-005

---

## Notes

- **Order of start** of the parser  from the report (`file_count`), not order of delivery of the modules
- **006** ingest  `006` T021 (not to be confused with **005** T021 = detector post-sync hook); T044 closes when merge `006` US1+US4
- Stub parser (T040)  only until ready `parsers/typescript` (T047, removing stub  T049)
- Errors and Russian messages  in `error-handler.ts` + `i18n/ru.ts`
- `[P]`  different files, no dependence on unfinished tasks in the same group
