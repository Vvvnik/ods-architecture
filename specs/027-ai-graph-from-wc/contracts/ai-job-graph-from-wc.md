# Contract: AiJob `graph_from_wc` (027)

**Index**: `ods-ai-jobs` (same as `015`)  
**Kind**: `graph_from_wc`  
**Companion**: [ai-job.md](../../015-project-docs/contracts/ai-job.md) for
shared status enum and docs kind rules

## Status values (MVP)

`running` | `succeeded` | `failed` | `cancelled`  
No `queued` — code-download creates `running` immediately.

## Supersede (per kind)

1. At most one `running` `graph_from_wc` per project.
2. New code-download → prior `running` graph job → `cancelled`; new job
   `running` with new `analysis_run_id`.
3. Ingest / complete for cancelled or non-current job → **409**.
4. Does **not** cancel a concurrent `docs_from_es` job.

## Complete + publish gates

Agent may POST `complete` with `succeeded` or `failed`.

For `succeeded`, ODS MUST:

1. Verify job is current `running` `graph_from_wc`.
2. If ingest errors exist **or** Canon node count for `analysis_run_id` is
   0 → persist status **`failed`**, set summary, **do not**
   replace-after-success.
3. Else persist **`succeeded`**, mark analysis run graph-ready, run
   replace-after-success for older runs.

For `failed` / cancel path: no replace.

## UI mapping

Documentation / prompt panel MAY poll
`GET .../ai-jobs/current?kind=graph_from_wc` for code-job properties
(optional MVP; docs panel already polls docs kind). Graph View badge uses
**AnalysisRun.graph_builder**, not AiJob status alone (job may be old).

## Placeholders in `AGENT-CODE.md`

| Placeholder | Source |
|-------------|--------|
| `ODS_BASE_URL` | Config / request host convention (same as docs) |
| `PROJECT_ID` | Project id |
| `ANALYSIS_RUN_ID` | New AI analysis run |
| `CODE_JOB_ID` | AiJob id |
