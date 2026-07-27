# Data model: Backend MVP

**Spec**: [spec.md]

## A look at the storage

| The layer | The technology | The content |
|------|------------|------------|
| The metadata | Elasticsearch | Project, ProjectElement |
| The files | Filesystem | A working copy of the git repository |

`working_copy_root` in the Project document  the absolute path on the backend disk.

## Index `ods-projects`

The document is one project.

| The field | Type of ES | The description |
|------|--------|----------|
| `id` | keyword | UUID, document `_id` |
| `name` | text + keyword | The name is displayed |
| `source_type` | keyword | `git_url` \| `local_path` |
| `source_value` | keyword | URL or path |
| `working_copy_root` | keyword | The WC path on the disk |
| `created_at` | date | ISO-8601 |
| `last_sync_at` | date \| null | |
| `sync_status` | keyword | idle, running, success, failed, partial |
| `last_error_message` | text | nullable |

** Uniqueness:** `source_type` + `source_value`  one project (FR idepotency
The search before the insert.

## Index `ods-elements`

Document = file or folder.

| The field | Type of ES | The description |
|------|--------|----------|
| `id` | keyword | UUID, `_id` |
| `project_id` | keyword | FK → Project |
| `path` | keyword | Relative path of POSIX (`src/index.ts`) |
| `parent_path` | keyword | `""` for the root; otherwise the parent's path |
| `type` | keyword | `file` \| `directory` |
| `status` | keyword | ElementStatus |
| `is_active` | boolean | false = soft-delete after sync |
| `status_manually_set` | boolean | true if the user changed status |

`status_manually_set` — The internal field for the rule reactivate (Keep the status).

### ElementStatus

`auto_found` | `needed` | `not_needed` | `found` | `unused`

## The Request

### List of projects

Sort: `last_sync_at` desc (missing last).

### Children of the folder (pagina)

```text
project_id = :id
AND parent_path = :parent
AND is_active = true
```

Sort: `type` asc (directories first), `path.keyword` asc.
From/size: `offset`, `limit` (max 100).

### Unique path in the project

When sync: upsert on `(project_id, path)`; do not create a second active document.

## Deleting the project (hard-delete)

`DELETE /api/v1/projects/{id}` (FR-013). Difference from soft-delete elements
with sync (`is_active=false`):

| Step by step | The action |
|-----|----------|
| 1 | Check: the project is in place; `sync_status` ≠ `running` |
| 2 | ES `ods-elements`: delete_by_query `project_id = :id` (all records, including `is_active=false`) |
| 3 | ES `ods-graph-nodes`: delete_by_query `project_id = :id`  **006** T053, the indexes [`006/elasticsearch-indices.md`](../../006-project-graph/contracts/elasticsearch-indices.md) |
| 4 | ES `ods-graph-edges`: delete_by_query `project_id = :id` — **006** T053 |
| 5 | ES `ods-projects`: delete document `_id = :id` |
| 6 | FS: if `source_type=git_url`  delete `working_copy_root` recursively |
| 7 | FS: if `source_type=local_path`  do not change `source_value` (mount) |

After deleting the `(source_type, source_value)` is free again for `POST /projects`.

**Does not affect:** other projects, volume `es-data` whole, mount `/repos`.

**Post-MVP (`005-code-analysis`, `006-project-graph`):** with DELETE additional cascade:

| The heat | The index |
|-------|---------|
| `005` | `ods-language-reports`, `ods-analysis-runs`, `ods-parser-envelopes`, `ods-sync-snapshots` |
| `006` | `ods-graph-nodes`, `ods-graph-edges` |

Details  [`005/data-model.md`](../../005-code-analysis/data-model.md) (§DELETE) and
[`006/data-model.md`](../../006-project-graph/data-model.md) (§DELETE).
Implementation of the cascade of column  ** 006** T053 (`ods-graph-nodes` , `ods-graph-edges`);
The artifacts of the analysis are  **005** T057.

## Sync  algorithm (logical)

```text
1. Set up the project.sync_status = running
2. Updating the WC:
   - git_url: clone (first time) or pull
   - local_path: Use source_value as the root of the scan
3. Bypass the file tree (excluding .git)
4. For each path:
   - is in ES → update type, is_active=true
   - No → insert, status=auto_found
5. For ES elements of the project not found in the scan → is_active=false
6. project.sync_status = success | partial | failed
7. project.last_sync_at = now
```

**partial:** errors on separate paths (symlinked), but the main tree is built.

## FileContent (not in ES)

API response, not persisted:

| kind | The condition |
|------|---------|
| `text` | UTF-8 text |
| `not_text` | binary |
| `error` | `error_code`: `encoding_unsupported`, `file_not_available` |

## Sync_status transitions

```text
idle → running (register or POST sync)
running → success | failed | partial
* → running (new sync if not running)
running + crash → failed at the start of the service (recovery job)
```

## The changing environment

| Variable | Example | The assignment |
|------------|--------|------------|
| `PORT` | 3000 | HTTP |
| `ELASTICSEARCH_URL` | http://localhost:9200 | ES |
| `DATA_ROOT` | /data/ods | WC for git clone |
| `LOCAL_REPOS_MOUNT` | /repos | Container mount for local_path trees |
| `LOCAL_REPOS_HOST_PATH` | (compose) | Absolute host dir of that mount; enables host-path Import |
| `LOCAL_PATH_MAP` | (empty) | Extra `host:container` aliases (comma-separated). Split on `:/` (Windows drive-safe); `\` → `/`. |
| `GIT_CLONE_DEPTH` | 1 | shallow clone (optional) |

## Connecting to the DTO API

Public DTOs  [openapi.yaml](./contracts/openapi.yaml) Internal fields
(`working_copy_root`, `status_manually_set`) in the API ** do not give**.
