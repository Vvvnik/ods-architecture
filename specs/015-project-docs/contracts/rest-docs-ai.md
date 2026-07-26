# Contract: REST — docs + agent reads (015)

**Base**: `/api/v1`  
**Auth**: none in MVP (same as portal; `017` later)

## Docs filesystem

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/projects/:projectId/docs` | List tree (relative paths, types file/dir) |
| `GET` | `/projects/:projectId/docs/content?path=` | Read file text; path under docs root |
| `PUT` | `/projects/:projectId/docs/content` | Body: `{ path, content, job_id }` — write/overwrite; **reject** if `job_id` not current running docs job; **reject** path `AGENT.md` |
| `DELETE` | `/projects/:projectId/docs/content?path=&job_id=` | Delete file; same job bind; **reject** `AGENT.md` |

List/read MAY omit `job_id` (portal viewer). Writes/deletes MUST include `job_id`.

## Prompt download

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/projects/:projectId/docs/download-prompt` | Body: `{ language: "en"\|"ru", write_mode?: "overwrite"\|"versioned", generation_id?: string }` — requires graph-ready analysis; supersedes running docs job; re-renders `AGENT.md`; response = file download (`text/markdown` or attachment) + job id in header or JSON sidecar as implemented |

## Entity fetch (es-ref)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/projects/:projectId/graph/nodes/:nodeId` | Prefer existing graph node GET if present; else add thin wrapper. Query MAY include `analysis_run_id`. Used as Fetch URL in docs while in ODS |
| `GET` | `/projects/:projectId/entities` | Optional: `?index=&id=` for generic ES-backed entity fetch through ODS (if node path insufficient) |

Exact existing graph paths MUST be reused when already available (`api/routes/graph.ts`).

## Agent read surface (reuse)

Agents SHOULD use existing:

- Project summary / get project
- Latest / listed analysis runs; language report
- Graph summary, paged nodes/edges, system/code/UI views as already exposed

MUST NOT use WC/workspace file APIs for docs generation (FR-007).

## Write modes (FR-016)

Download prompt body may set `write_mode` + `generation_id`. Job stores them.
`PUT`/`DELETE` docs content MUST enforce:

| Mode | Allowed paths |
|------|----------------|
| `overwrite` (default) | Under `docs/{projectId}/`, not as versioned generation tree writes |
| `versioned` | Only under `docs/{projectId}/_generations/{generation_id}/` |

Missing `generation_id` when `versioned` → **400**.

## Errors

| Case | Status |
|------|--------|
| Path outside docs root / traversal | 400 |
| Write `AGENT.md` by agent | 403 |
| `job_id` not current running | 409 |
| No graph-ready analysis on Download | 409 or 400 |
| Project missing | 404 |

## Out of first increment

- Export-pack zip endpoint — later
- MCP tools — later
