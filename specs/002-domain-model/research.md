# Research: Backend  MVP data model

**Date**: 2026-07-08

## R1. HTTP framework

**Decision:** Fastify 4.

**Rationale:** TypeScript-first, fast, built-in schematic/validation, convenient
For OpenAPI-like routes.

**Alternatives:** Express  is more than boiler pay; NestJS  is too much for MVP API.

## R2. The Elasticsearch client

**Decision:** `@elastic/elasticsearch` v8, official JS client.

**Rationale:** Agreed with spec (`001`, `002`); JSON documents without ORM.

**Alternatives:** PostgreSQL  is rejected in `001` for MVP metadata.

## R3. ES indexation

**Decision:** Two indexes `ods-projects`, `ods-elements`; elements with field
`project_id` + keyword `path`; uniqueness `(project_id, path)` at the level
The following is a sync (FR-007)

**Rationale:** Simple model; child paging through bool filter +
`parent_path.keyword`.

**Alternatives:** One index nested  more difficult than tree queries.

## R4. Git sync

**Decision:** `simple-git`  clone at the first URL sync, `pull` at the second.

**Rationale:** Enough for MVP pilot; no push/merge (outside scope).

**Alternatives:**Native `git` subprocess  is less error control.

## R5. Local path sync

**Decision:** `source_type=local_path`  read the direct directory (without copying)
or one-time copying to `working_copy_root` at first registration;
Re-sync  re-scanning the source.

**Rationale:** Pilot: the path is mounted in the backend container (`LOCAL_REPOS_MOUNT`).

**Default for MVP:** scanning **source** `source_value` if available;
The metadata of WC in `DATA_ROOT` is only for `git_url` clone.

## R6. Asynchronous sync

**Decision:** POST sync → `sync_status=running` → background task in the same process
(in-memory lock `Map<projectId, boolean>`); when restarting  `running` → `failed`
with the sync message disconnected.

**Rationale:** FR sync_in_progress; without Redis/shift in MVP.

**Alternatives:** BullMQ  post-MVP when scaling.

## R7. Definition of binary files

**Decision:** Verify null-byte in the first 8KB or `file`-magic; otherwise attempt
UTF-8 decode; if there is an error  `encoding_unsupported`.

**Rationale:** FR-010, edge cases spec.

## R8. Identifiers

**Decision:** UUID v4 for `id` project and element; `element.id` stable at
I'm going to reactivate the same `path`.

**Rationale:** PATCH on `elementId`; reactivate updates `is_active`, does not create
new id if the path matches.

## R9. Docker dev stack

**Decision:** `docker/docker-compose.dev.yml`  default profile: only
`elasticsearch`; profile `full`: `elasticsearch` + `backend` + `frontend` (nginx).
The fixed  `docker/fixtures/repos/`. Spec `004-mvp-runtime` formalises the
smoke/CI; does not block the development of `002`/`003`.

**Rationale:** Unified catalog `docker/` for both specs of MVP; `004`  runtime reception.

## R10. Accord OpenAPI with `003`

**Decision:** Canonical file in `002/contracts/openapi.yaml`; copy of the consumer
in `003` refers to it; CI/check  hash comparison or manual `/speckit-analyze`.

**Rationale:** One source of truth for the contract.

## R11. Deleting the project (increase 2026-07-08)

**Decision:** `DELETE /api/v1/projects/{projectId}` → HTTP 204 without the body.

**Order of operations:**

1. Download the project; if not  `not_found` (404).
2. If `sync_status=running`  `sync_in_progress` (409).
3. Remove the in-memory sync lock for `projectId` (if any).
4. ES: `delete_by_query` all `ods-elements` with `project_id`; delete the document
   `ods-projects`.
5. Filesystem: for `git_url`  recursively delete `working_copy_root`
   (`DATA_ROOT/working-copies/{id}`); for `local_path`  **nothing** (mount RO).

**Rationale:** FR-013, US5; releases `(source_type, source_value)` for the new
The booking process is completely free of charge.

**Alternatives:**

- Soft-delete project (`is_deleted`)  is deferred; complicates the list and the endpotency.
- Removal at `running`  is rejected (race risk with background sync).
