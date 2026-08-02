# Contract: REST — graph_from_wc + dual prompts (027)

**Base**: `/api/v1`  
**Auth**: none in MVP (same as portal; `017` later)  
**Extends**: `specs/015-project-docs/contracts/rest-docs-ai.md` (docs paths
updated for `AGENT-DOC.md`)

## Prompt files (docs root)

| File | Owner | Created |
|------|-------|---------|
| `AGENT-DOC.md` | ODS | Import seed; docs-download re-render; auto-rename from `AGENT.md` |
| `AGENT-CODE.md` | ODS | Code-download only |

Agent writes MUST reject both reserved names (403).

## Dual download

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/projects/:projectId/docs/download-prompt` | **Docs** — body `{ language, write_mode?, generation_id? }`; supersedes `docs_from_es`; ensures `AGENT-DOC.md` (migrate `AGENT.md` if needed); requires graph-ready analysis |
| `POST` | `/projects/:projectId/docs/download-code-prompt` | **Code** — body optional `{ language? }`; requires prior successful **parser** graph-ready analysis for first entry (subsequent: any graph-ready OK); supersedes `graph_from_wc`; creates AI `AnalysisRun` (`graph_builder=ai`); renders `AGENT-CODE.md`; returns markdown download + job id |

Response shape may mirror docs download (attachment or text + job id header).

## AiJob (shared)

Reuse `015` AiJob routes with `kind` query/body:

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/projects/:projectId/ai-jobs/current?kind=graph_from_wc` | Current graph job |
| `GET` | `/projects/:projectId/ai-jobs/current?kind=docs_from_es` | Current docs job |
| `GET` | `/projects/:projectId/ai-jobs/:jobId` | By id |
| `POST` | `/projects/:projectId/ai-jobs/:jobId/progress` | Progress; current running only |
| `POST` | `/projects/:projectId/ai-jobs/:jobId/complete` | `{ status: succeeded\|failed, summary?, provenance? }` — see gates for graph kind |

## WC reads (code agent only)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/projects/:projectId/ai-jobs/:jobId/wc/paths` | List relative paths in Status scope for this running `graph_from_wc` job; pagination optional |
| `GET` | `/projects/:projectId/ai-jobs/:jobId/wc/content?path=` | Read file text; path must be in-scope; enforce `AI_GRAPH_WC_MAX_FILE_BYTES` (default **1048576**); oversize → 413/400; 404/403 if out of scope |

Alternative acceptable implement: reuse existing element file APIs **if** they
enforce the same job bind + Status scope + size caps (document chosen
mapping in tasks). Prefer explicit job-scoped routes to avoid docs agents
abusing WC.

## Graph ingest (code agent)

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/projects/:projectId/ai-jobs/:jobId/graph/ingest` | Body: `{ analysis_run_id, items: [...] }` where items are Canon nodes/edges (typed). Job must be current running `graph_from_wc`; `analysis_run_id` must match job. Invalid/unknown kind → **400** and job marked failed (or ingest_error leading to failed complete). |

Exact item schema: align with existing graph node/edge public shapes /
json-model kinds. Batches SHOULD be reasonably sized (implement default
cap documented in tasks).

## Docs content routes (015 amend)

| Change | Detail |
|--------|--------|
| Reserved path | `AGENT-DOC.md` (and reject legacy `AGENT.md` writes) |
| List/read | Trigger migrate `AGENT.md` → `AGENT-DOC.md` when applicable |
| Export zip | Include `AGENT-DOC.md` (not `AGENT.md`) |

## Errors (additive)

| Case | Status |
|------|--------|
| Code-download without parser-success-in-history (first entry) or without any graph-ready (subsequent) | 409 / 400 |
| WC content oversize (`AI_GRAPH_WC_MAX_FILE_BYTES`) | 413 / 400 |
| WC content out of Status scope / denylist | 403 / 404 |
| Graph ingest job not current running | 409 |
| Graph ingest analysis_run_id mismatch | 409 / 400 |
| Invalid Canon item | 400 (+ fail job) |
| `complete(succeeded)` but zero nodes or ingest errors | Accept complete as **failed** (or 409 then persist failed) — published graph unchanged |
| Write reserved `AGENT-CODE.md` / `AGENT-DOC.md` | 403 |
