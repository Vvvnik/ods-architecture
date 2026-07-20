# Tasks: MVP data model (backend)

**Input**: `specs/002-domain-model/` — plan.md, spec.md, data-model.md, contracts/, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: Not requested in spec; receive  via quickstart.md (curl) and SC-001SC-006.

**Organization**: By user stories spec.md; blocker for `003-portal-mvp`.

**Increment 2026-07-08**: US5  Project removal (FR-013). MVP (T001T043) is completed.

**Coordination with `003`**: see section [Coordination with portal](#Coordination-with-portal-mvp) and checkpoint's **B1B4**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: You can do it in parallel (different files, no dependencies on unfinished tasks)
- **[Story]**: US1US5 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initiating the `backend/` package and the general settings

- [x] T001 Create a structure of the directories `backend/` according to plan.md (`src/`, `tests/`, `package.json`, `tsconfig.json`)
- [x] T002 Initiate `backend/package.json`: Fastify 4, `@elastic/elasticsearch` 8, `simple-git`, `uuid`, `zod`, `pino`, TypeScript 5, Vitest
- [x] T003 [P] Set `backend/tsconfig.json` (strict, ES2022, outDir `dist`)
- [x] T004 [P] Add the scripts to `backend/package.json`: `dev`, `build`, `start`, `test`, `lint`
- [x] T005 [P] Create `backend/.gitignore` (node_modules, dist, .env)
- [x] T006 [P] Add `data/` to the root `.gitignore` (working-copies)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: API, ES, error frame  blocks all user stories

**⚠️ CRITICAL**: User story work doesn 't start until this phase is over

- [x] T007 Implement `backend/src/config.ts` (PORT, ELASTICSEARCH_URL, DATA_ROOT, LOCAL_REPOS_MOUNT, GIT_CLONE_DEPTH, zod-validation)
- [x] T008 Implement `backend/src/domain/errors.ts`  codes ApiError (`source_unreachable`, `sync_in_progress`, `encoding_unsupported`, `file_not_available`, `not_found`, `validation_error`)
- [x] T009 Implement the `backend/src/domain/project.ts` and `backend/src/domain/element.ts`  types of Project, ProjectElement, ElementStatus, sync_status
- [x] T010 Implement `backend/src/infra/elasticsearch.ts`  ES client, bootstrap of `ods-projects` and `ods-elements` on `contracts/elasticsearch-indices.md`
- [x] T011 Implement `backend/src/api/plugins/error-handler.ts`  mapping errors to localized messages + HTTP codes (FR-012)
- [x] T012 Implement `backend/src/index.ts`  bootstrap Fastify, registering plugins and routes, `GET /health`
- [x] T013 [P] Implement the `backend/src/repositories/project.repository.ts`  CRUD project, search by `source_type`+`source_value`
- [x] T014 [P] Implement `backend/src/repositories/element.repository.ts`  upsert on `(project_id, path)`, list children with pagination, soft-delete batch

**Checkpoint F1**: `npm run dev` + ES → `curl localhost:3000/health` → 200

---

## Phase 3: User Story 1  Project registration (Priority: P1)  MVP

**Goal**: POST of registration creates the project and runs the initial sync; source idpotent

**Independent Test**: `quickstart.md`  registering Git URL → project in `GET /api/v1/projects`; repeat → same `id`

### Implementation for User Story 1

- [x] T015 [US1] Implement `backend/src/services/workspace.service.ts`  git clone (shallow) and local_path validation
- [x] T016 [US1] Implement `backend/src/services/sync.service.ts`  async sync frame, lock per project (`sync_in_progress`)
- [x] T017 [US1] Implement the `backend/src/services/project.service.ts`  register (power of attainment), start the initial sync
- [x] T018 [US1] Implement `backend/src/api/routes/projects.ts`  `GET /api/v1/projects`, `POST /api/v1/projects`, `GET /api/v1/projects/:projectId`
- [x] T019 [US1] Add the validation of the registration body (zod) to `backend/src/api/routes/projects.ts`

**Checkpoint B1** *(unlocks 003 US1) *: registration + list of projects working; sync may be in `running` status

---

## Phase 4: User Story 2  Sync and tree (Priority: P1)

**Goal**: Sync builds a tree; children of folders with pagination; soft-delete; without `.git`

**Independent Test**: After sync `GET .../elements?parent_path=` returns the tree; the deleted file → `is_active=false`

### Implementation for User Story 2

- [x] T020 [US2] Add `backend/src/services/sync.service.ts`  bypass WC, upsert elements, soft-delete, status success/failed/partial
- [x] T021 [US2] Implement `backend/src/api/routes/projects.ts`  `POST /api/v1/projects/:projectId/sync` (409 at `sync_in_progress`)
- [x] T022 [US2] Implement `backend/src/api/routes/elements.ts`  `GET /api/v1/projects/:projectId/elements` (parent_path, limit≤100, offset)
- [x] T023 [US2] Recovery at start: projects in `running` → `failed` in `backend/src/index.ts` or separate bootstrap hook

**Checkpoint B2** *(unlocks 003 US2US3) *: sync + tree with paging; SC-001 backend

---

## Phase 5: User Story 3  View the contents of the file (Priority: P1)

**Goal**: Read-only reading UTF-8; `not_text`; coding errors and inactive file

**Independent Test**: `GET .../elements/:id/content` — text / not_text / error

### Implementation for User Story 3

- [x] T024 [US3] Implement `backend/src/services/file-content.service.ts`  reading from disk, binary detector, UTF-8, `file_not_available` for `is_active=false`
- [x] T025 [US3] Implement `backend/src/api/routes/elements.ts`  `GET /api/v1/projects/:projectId/elements/:elementId/content`
- [x] T026 [US3] Implement `backend/src/api/routes/elements.ts`  `GET /api/v1/projects/:projectId/elements/:elementId` (metadata nodes)

**Checkpoint B3** *(unlocks 003 FileViewer) *: full chain tree → file content

---

## Phase 6: User Story 4  Status of the element (Priority: P2)

**Goal**: PATCH status; maintaining `status_manually_set`; default `auto_found`

**Independent Test**: PATCH status → read over the element → status saved after restart

### Implementation for User Story 4

- [x] T027 [US4] Add `backend/src/repositories/element.repository.ts`  update status + `status_manually_set`
- [x] T028 [US4] Implement `backend/src/api/routes/elements.ts`  `PATCH /api/v1/projects/:projectId/elements/:elementId` (body: status)
- [x] T029 [US4] Reactivate rule in `backend/src/services/sync.service.ts`  to keep the manual status when the file appears again

**Checkpoint B4** *(unlocks 003 US5) *: change of status through API

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Docker, contract, take on the show.

- [x] T030 [P] Create a `backend/Dockerfile` (multi-stage, Node 20 alpine)
- [x] T031 [P] Check the service `backend` in `docker/docker-compose.dev.yml` (profile `full`, env, volumes, depends_on ES)
- [x] T032 To check `specs/002-domain-model/contracts/openapi.yaml` with the routes that have been implemented; update when there is a discrepancy
- [x] T033 [P] Notify the owner `003`: update `specs/003-portal-mvp/contracts/api-consumer.yaml` after T032
- [x] T034 Throw out the scenarios `specs/002-domain-model/quickstart.md` (curl, SC-001SC-005)
- [x] T035 [P] Unit-tests Vitest: `backend/tests/unit/sync.service.test.ts`, `backend/tests/unit/file-content.service.test.ts`
- [x] T036 [P] Integration-test API: `backend/tests/integration/projects.test.ts` (register, sync, tree, content)
- [x] T037 [P] Processing of sync links in `backend/src/services/sync.service.ts`  bypass; bit sync → `partial` + report, sync does not fall entirely
- [x] T038 [P] Benchmark SC-004: `backend/tests/integration/children-pagination.perf.test.ts`  folder of 500+ elements, first page (≤100) < 2 s on the pilot rail
- [x] T039 [P] Smoke of large repository: `backend/tests/integration/large-repo.test.ts`  1000+ files, sync is completed success/partial < 60 s
- [x] T040 Documenting the fixtures: `docker/fixtures/repos/README.md`  how to add a test repository for quickstart

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **User Stories (Phase 3–6)** → **Polish (Phase 7)** → **US5 (Phase 9)**
- US2 depends on US1 (the project must exist)
- US3 depends on US2 (elements in the tree)
- US4 depends on US2 (active elements)
- US5 depends on US1US2 (project, sync lock, elements in ES)

### User Story Dependencies

| Story | Depends on what | Checkpoint for 003 |
|-------|------------|-------------------|
| US1 | Phase 2 | **B1**  Import + list |
| US2 | US1 | **B2** — Sync + FileTree |
| US3 | US2 | **B3** — FileViewer |
| US4 | US2 | **B4**  change of status |
| US5 | US1, US2 | **B5**  DELETE the project |

### Parallel Opportunities

- Phase 1: T003T006 parallel to T002
- Phase 2: T013, T014 in parallel to T010
- Phase 7: T030, T031, T033, T035, T036, T037, T038, T039 in parallel
- Phase 9: T044, T045 in parallel; T051 in parallel after T049

### Parallel Example: Phase 2

```bash
# After T010:
Task T013: project.repository.ts
Task T014: element.repository.ts
```

---

## Agreement with the portal (`003-portal-mvp`)

| Checkpoint | The tasks of 002 | What could start 003 ? |
|------------|------------|----------------------|
| **B1** | T015–T019 | The following is a list of the topics covered: |
| **B2** | T020–T023 | WorkspacePage, Sync, FileTree |
| **B3** | T024–T026 | FileViewer, ElementProperties (read) |
| **B4** | T027–T029 | Status set in the right panel |
| **B5** | T044–T051 | the  Remove button in `003` (separate UI increment) |
| **Full** | T030–T040 + 003 docker | `docker compose --profile full`, SC-006 |

**MVP:** to complete **B2** before active work on FileTree at 003; **B3** until FileViewer.

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Phase 1–2 → Foundation
2. US1 → B1 (portal: import/lists)
3. US2 → B2 (portal: workplace + tree)
4. US3 → B3 (end-to-end file view)
5. US4 + 003 US5 → full UX status
6. Polish + 003 Polish → compose full stack
7. **US5 (Phase 9) ** → B5 → UI removal in `003`

### Incremental Delivery

Each checkpoint provides a working API cut for parallel frontend development.

**Increment of DELETE (2026-07-08):**

| The increment | The tasks | The result |
|-----------|--------|-----------|
| Backend DELETE | T044–T051 | API `DELETE /projects/{id}`, SC-006 curl |
| Portal UI | `003` specify/tasks/implement | The Delete button is on `/projects` |

---

## Notes

- API canon: `specs/002-domain-model/contracts/openapi.yaml`
- The portal consumes the same contract; when changing  synchronize `003/contracts/api-consumer.yaml`
- SC-005 `002` = SC-006 `003` (chain only through UI)
- Phase 9: openapi DELETE is already in the contract; T051  match after code

## Phase 8: Convergence

- [x] T041 Correct lock/status coordination for `POST /projects/{id}/sync` in `sync.service.ts` and `project.service.ts` per US2/AC2 and spec edge case sync_in_progress (partial): in `triggerSync` reject the request at `sync_status=running` in ES; capture in-memory lock synchronously to `scheduleSync`; postpone the duplicate-lock check in `runSync` inside `try/finally` so that the lock is always removed and 409 does
- [x] T042 Add the integration-test of the repeat `POST .../sync` after `sync_status=success` → HTTP 202 per US2/AC2 and quickstart SC-003 (missing): `backend/tests/integration/projects.test.ts`  wait for the completion of the sync, POST sync, polling before success; second POST after success → 202
- [x] T043 Fix flaky-test `accepts manual sync and rejects parallel sync with 409` per US2/AC2 (partial): before the first POST sync wait `sync_status` ∈ {success, partial, failed} and release lock; divide the scenarios repeat sync after success and parallel sync → 409

---

## Phase 9: User Story 5  Deleting the project (Priority: P2)

**Goal**: `DELETE /api/v1/projects/{id}`  hard-delete metadata in ES (cascading of elements),
cleaning the WC for `git_url`; re-registration of the same source with new `id` (SC-006).

**Independent Test**: `quickstart.md` §10  DELETE → 204; the project is not on the list; POST with the same
`source_value` → new `id` and name; DELETE at `running` → 409.

**Depends on**: Phase 37 (MVP backend); the DELETE contract is already in `contracts/openapi.yaml` (plan).

### Implementation for User Story 5

- [x] T044 [P] [US5] Add `deleteByProjectId(projectId)` to `backend/src/repositories/element.repository.ts`  ES `delete_by_query` by `project_id`
- [x] T045 [P] [US5] Add `deleteById(projectId)` to `backend/src/repositories/project.repository.ts`  delete the document from `ods-projects`
- [x] T046 [US5] Add `removeWorkingCopy(project)` to `backend/src/services/workspace.service.ts`  recursive removal `working_copy_root` only for `git_url`
- [x] T047 [US5] Add `releaseSyncLock(projectId)` to `backend/src/services/sync.service.ts`  removing in-memory lock when deleted (after checking `sync_status` ≠ `running`)
- [x] T048 [US5] Implement `delete(projectId)` in `backend/src/services/project.service.ts`  `not_found`, `sync_in_progress`, cascade ES, WC, lock (FR-013)
- [x] T049 [US5] Register `DELETE /api/v1/projects/:projectId` in `backend/src/api/routes/projects.ts` → HTTP 204 without body
- [x] T050 [US5] Add the integration-test SC-006 to `backend/tests/integration/projects.test.ts`  delete, list without the project, re-register new `id`, 409 at `running`
- [x] T051 [P] To check the implementation with `specs/002-domain-model/contracts/openapi.yaml` (DELETE 204/404/409); to update the `specs/003-portal-mvp/contracts/api-consumer.yaml` mirror of DELETE

**Checkpoint B5** *(unlocks 003 UI Delete) *: DELETE backend is ready; the portal can call the API.

---

## Phase 10: Convergence

- [x] T052 Add integration-test to delete `git_url` project: after DELETE the `working_copy_root` directory is missing on the per SC-006/US5/AC2 (partial) disk in `backend/tests/integration/projects.test.ts`
- [x] T053 Correct registration when source is unavailable: not to leave the project with `sync_status=idle` in ES after error `prepareProject` (validate-before-create or rollback) per spec edge case / US1 (partial) in `backend/src/services/project.service.ts`
