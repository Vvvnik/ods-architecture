# Contract: AiJob `docs_from_es` (015)

**Index**: `ods-ai-jobs` (see [data-model.md](../data-model.md))  
**Kind**: `docs_from_es` (first client; reserve `graph_from_wc` for S1)

**Note:** AiJob status values are **not** the AnalysisRun status enum
(AnalysisRun uses `success` / `partial`; AiJob uses `succeeded` / `failed`).

## REST

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/projects/:projectId/ai-jobs/current?kind=docs_from_es` | Current/latest job for UI properties |
| `GET` | `/projects/:projectId/ai-jobs/:jobId` | Get by id |
| `POST` | `/projects/:projectId/ai-jobs/:jobId/progress` | Body: progress fields; only if `running` + current |
| `POST` | `/projects/:projectId/ai-jobs/:jobId/complete` | Body: `{ status: "succeeded"\|"failed", summary?: string, provenance?: {...} }` — trust agent; reject if not current `running` |

Download-prompt creates/supersedes jobs (see [rest-docs-ai.md](./rest-docs-ai.md)); dedicated `POST .../ai-jobs` create is optional if Download always owns creation.

## Status values (MVP)

`running` | `succeeded` | `failed` | `cancelled`

No `queued` in MVP — Download prompt creates a `running` job immediately.

## Supersede rules

1. At most one `running` docs job per project.
2. New Download → prior `running` → `cancelled`; new job `running`.
3. `complete` / docs **writes** for cancelled or non-current job → **409**.
4. No server-side validation of docs tree quality before `succeeded`.

## UI mapping

Documentation right panel reads `GET .../ai-jobs/current` (poll or refresh on focus):
status, `analysis_run_id`, language, file counts (from docs list), summary,
timestamps.
