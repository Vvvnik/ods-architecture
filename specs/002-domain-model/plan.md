# The implementation plan: MVP data model (backend)

**Vetka**: `002-domain-model` | **Date**: 2026-07-08 | **Spec**: [spec.md]

**Input**: `specs/002-domain-model/spec.md` (increement: project deletion, FR-013)

**Dependencies**: `specs/001-ods-vision/spec.md`
**User of the API**: `specs/003-portal-mvp/spec.md`

## Summary

The ODS MVP backend service on **TypeScript (Node.js 20 + Fastify) ** stores the metadata
Projects and tree files in Elasticsearch (JSON documents), working copies
It runs the REST API `/api/v1` for registration,
sync, page tree, read-only file readings, status changes and **delete
project** (hard-delete metadata + cascade of elements; cleaning WC for `git_url`).
Sync  asynchronous (the background task in the process), without parallel sync of one
The project.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS

**Primary Dependencies**: Fastify 4, `@elastic/elasticsearch` 8, `simple-git`,
`uuid`, `zod` (validation), `pino` (logs)

**Storage**: Elasticsearch 8.x (indexes `ods-projects`, `ods-elements`);
filesystem `DATA_ROOT/working-copies/{projectId}/`

**Testing**: Vitest (unit), supertest + Fastify inject (API integration);
testcontainers or ES docker for integration tests (optional in tasks)

**Target Platform**: Linux/macOS container Docker; locally  `npm run dev`

**Project Type**: HTTP API backend (`backend/`)

**Performance Goals**: SC-004  first page of children of the folder (≤100) < 2 s;
sync repository up to 1000 files  acceptable for the pilot (< 60 s)

**Constraints**: Without auth; API errors EN + `code` (UI i18n by code); read-only files;
`.git` is removed from the tree; idempotency sync; DELETE of the project is rejected when
`sync_status=running`

**Scale/Scope**: Pilot team, dozens of projects, up to ~10k files per project

## Constitution Check

*GATE: before Phase 0 and after Phase 1.*

| The requirement | The status |
|------------|--------|
| TypeScript backend MVP | ✅ |
| JSON metadata in ES | ✅ |
| Filesystem for WC | ✅ |
| No parseers/graphs/RAG | ✅ |
| No UI | ✅ |
| Agreement with `003` API | ✅ `contracts/openapi.yaml` = canon |
| The DELETE increments (FR-013) | ✅ US5, openapi, data-model |
| Code after plan/tasks | ✅ |

**Post-design:** OpenAPI and ES-schemes are recorded; `003/api-consumer.yaml`
must match (priority at `002`).

## Project Structure

### Documentation (this feature)

```text
specs/002-domain-model/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│ ── openapi.yaml # canonical REST API
│   └── elasticsearch-indices.md
└── tasks.md                  # /speckit-tasks
```

### Source Code

```text
backend/
├── src/
│   ├── index.ts              # bootstrap Fastify
│   ├── config.ts             # env: ES_URL, DATA_ROOT, PORT
│   ├── domain/
│   │   ├── project.ts
│   │   ├── element.ts
│ │ ── errors.ts # codes ApiError
│   ├── repositories/
│   │   ├── project.repository.ts
│   │   └── element.repository.ts
│   ├── services/
│   │   ├── project.service.ts      # register, delete
│ │ ── sync.service.ts # cancel lock on delete (if running  refusal)
│   │   ├── workspace.service.ts   # git clone / local scan
│   │   └── file-content.service.ts
│   ├── api/
│   │   ├── routes/
│   │   │   ├── projects.ts
│   │   │   └── elements.ts
│   │   └── plugins/error-handler.ts
│   └── infra/
│       └── elasticsearch.ts  # client + index bootstrap
├── tests/
│   ├── unit/
│   └── integration/
├── Dockerfile
├── package.json
└── tsconfig.json

docker/
── docker-compose.dev.yml # ES (default); full profile  backend + frontend
├── .env.example
── fixtures/repos/ # test git repositories for the pilot

data/                         # gitignored: WC + ES volumes (local)
└── working-copies/
```

**Structure Decision**: One pack `backend/`; ES and WC through the repository.
Pilot **full stack** (ES + backend + frontend)  `docker/docker-compose.dev.yml`
(The profile `full`). The heat `004-mvp-runtime` formally smoke/CI And the reception. runtime;
does not block the implementation of `002`/`003`.

## Complexity Tracking

There's no violation.

## Phase 0: Research

See [research.md]

## Phase 1: Design

| The artifact | The content |
|----------|------------|
| [data-model.md](./data-model.md) | ES documents, fields, indexes, sync state |
| [contracts/openapi.yaml](./contracts/openapi.yaml) | The canonical REST API |
| [contracts/elasticsearch-indices.md](./contracts/elasticsearch-indices.md) | Mapping of the index |
| [quickstart.md](./quickstart.md) | Curl scenarios, local run |

## Phase 2: Tasks (preview)

Groups for `/speckit-tasks` (MVP  completed; **INCREMENT DELETE**  new tasks):

1. ~~Carcass Fastify, config, health `GET /health`~~
2. ~~Elasticsearch client + creating indexes when starting~~
3. ~~Project repository + register (power of attorney)~~
4. ~~Workspace: git clone/pull + local path scan~~
5. ~~Sync service (async, lock per project, soft-delete)~~
6. ~~Element repository + list children (pagination)~~
7. ~~File content (UTF-8, not_text, encoding error)~~
8. ~~PATCH status + ApiError (`code` + EN message)~~
9. ~~OpenAPI contract tests vs `003`~~
10. ~~`docker-compose.dev.yml` (backend + ES)~~
11. ~~Integration tests SC-001–SC-005~~

**Increment: removal of the project (US5, FR-013, SC-006)**

12. `DELETE /api/v1/projects/{projectId}` in `openapi.yaml` (204 / 404 / 409)
13. `element.repository`: `deleteByProjectId` (ES delete_by_query)
14. `project.repository`: `deleteById`
15. `workspace.service`: `removeWorkingCopy(project)`  `rm -rf` for `git_url` WC
16. `project.service.delete`: Check the `sync_status`, cascade ES, WC, remove the in-memory lock
17. Integration test: delete → list without project → re-register new `id` (SC-006)
18. Synchronize `003/contracts/api-consumer.yaml` (DELETE mirror)

## Sync with `003-portal-mvp`

- The canonical contract is `002/contracts/openapi.yaml`.
- `003/contracts/api-consumer.yaml`  mirror; when the consumer is governed by a difference
  Or update both with a change log plan.
- SC-005 `002` = SC-006 `003` through one API.
- **DELETE project:** `003` consumes the same endpoint; UI  separate increment `003`.
