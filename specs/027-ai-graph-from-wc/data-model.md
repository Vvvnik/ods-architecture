# Data model: S1 — AI graph from working copy (027)

**Spec**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)

## Storage map

| Store | Role |
|-------|------|
| `DATA_ROOT/docs/{projectId}/` | `AGENT-DOC.md`, optional `AGENT-CODE.md`, Markdown docs |
| `DATA_ROOT/working-copies/...` | WC **read** for `graph_from_wc` via ODS only |
| `ods-ai-jobs` (ES) | AiJob `docs_from_es` **and** `graph_from_wc` |
| Analysis runs (ES) | Parser + AI runs; `graph_builder` provenance |
| Graph nodes/edges (ES) | Same Canon indices; scoped by `analysis_run_id` |

## Project docs root (filesystem)

```text
docs/{projectId}/
  AGENT-DOC.md              # ODS-owned; seed on import; rename from AGENT.md
  AGENT-CODE.md             # ODS-owned; created on code-download only
  spec-*.md …               # docs agent (015) — unchanged rules
  _generations/…            # versioned docs mode (015)
```

### Rules

- Paths relative to docs root; reject traversal.
- Agents MUST NOT overwrite `AGENT-DOC.md` or `AGENT-CODE.md`.
- Legacy: if `AGENT.md` present and `AGENT-DOC.md` absent → rename on first
  docs access/download.
- `AGENT-CODE.md` absent until first successful code-download after
  parser graph-ready analysis.

## AnalysisRun (extension)

Existing `AnalysisRunDocument` plus:

| Field | Type | Notes |
|-------|------|-------|
| `graph_builder` | `"parsers"` \| `"ai"` | Required for new runs; default `"parsers"` for backfill/old docs |

Parser analysis sets `parsers`. Code-download creates run with `ai` before
agent ingest. Badge and Graph View read this on the **current** graph-ready
run.

### AI run lifecycle

```text
code-download → AnalysisRun(graph_builder=ai, status=running)
             → AiJob(graph_from_wc, running, analysis_run_id)
agent ingest batches → nodes/edges for that analysis_run_id
complete(succeeded) + gates OK → run success + replace-after-success
complete(succeeded) + gates fail → job failed; run failed; no replace
complete(failed) / cancel → no replace; prior graph-ready unchanged
```

## AiJob (`ods-ai-jobs`) — `graph_from_wc`

Reuse document shape from `015`; kind-specific usage:

```text
AiJob {
  id: uuid                         # CODE_JOB_ID in AGENT-CODE.md
  project_id: uuid
  kind: "graph_from_wc"
  status: running | succeeded | failed | cancelled
  analysis_run_id: uuid            # AI rebuild run being built
  docs_language: en|ru             # unused for graph; may default en
  docs_write_mode / docs_generation_id: unused for graph (null/default)
  progress: { stage?, percent?, message? }
  summary: string | null
  provenance: { model_or_agent?, started_at, finished_at? }
  created_at, updated_at
}
```

### Config (WC reads)

| Knob | Default | Notes |
|------|---------|-------|
| `AI_GRAPH_WC_MAX_FILE_BYTES` | `1048576` (1 MiB) | Per-file cap for job-scoped WC content reads |

### Concurrency

| Rule | Behavior |
|------|----------|
| Per kind | At most one `running` job of that kind per project |
| Cross kind | `docs_from_es` and `graph_from_wc` MAY both be `running` |
| Supersede | New download of same kind → prior `running` → `cancelled` |
| Write bind | Graph ingest/complete require current running `graph_from_wc` job id |

### Publish gates (server)

Before accepting `complete(succeeded)` as published success:

1. No invalid/unknown Canon accepted for this job/run (fail-fast on bad
   ingest batch counts as failure).
2. Node count for `analysis_run_id` ≥ **1**.
3. Then mark succeeded + replace-after-success.

Otherwise job → `failed` (even if agent sent `succeeded`).

## Canon graph (unchanged frame)

AI writes the same six contracts as parsers (see
`ods-help/requirements/json-model/`):

- Code / System / UI × node + edge  
- Unknown `kind` or schema violation → reject (job fails; no publish)  
- Provenance on nodes/edges: AI marker as required by ingest conventions
  (`provenance=ai` or equivalent field already used by product)

## ProjectElement Status (scope)

| Status | Analysis / AI WC include? | UI picker |
|--------|---------------------------|-----------|
| `auto_found` | Yes | Yes |
| `needed` | Yes | Yes |
| `not_needed` | No (+ descendants per inherit rules) | Yes |
| `found` / `unused` | Treat as readable legacy; **not** offered for new picks; include/exclude rule: treat like out of three — prefer exclude from new analysis unless mapped later (MVP: if still present, treat **`found` as in**, **`unused` as out** to avoid surprise data loss — document in implement tests) |

**MVP clarification for legacy rows:** If a legacy `found` row exists, include
it in analysis scope (closest to `auto_found`). If `unused`, exclude (closest
to `not_needed`). No ES remap required.

## Relationships

```text
Project 1──* AnalysisRun (graph_builder parsers|ai)
AnalysisRun 1──* Graph nodes/edges (by analysis_run_id)
Project 1──* AiJob (kinds docs_from_es | graph_from_wc)
AiJob(graph_from_wc) *──1 AnalysisRun (build target)
AiJob(docs_from_es) *──1 AnalysisRun (read snapshot at download)
docs/{projectId}/ AGENT-DOC.md / AGENT-CODE.md (FS)
```
