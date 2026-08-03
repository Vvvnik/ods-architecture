# Research: S1 — AI graph from working copy (027)

**Feature**: `027-ai-graph-from-wc`  
**Date**: 2026-08-02  
**Spec**: [spec.md](./spec.md)

## R1. Prompt filenames and legacy migrate

**Decision:** Canonical docs prompt file is **`AGENT-DOC.md`**. New imports
seed `AGENT-DOC.md`. On first docs list/read/download, if `AGENT.md` exists
and `AGENT-DOC.md` does not, **rename** `AGENT.md` → `AGENT-DOC.md`.
Reserved agent-write blocklist updates to both names during transition, then
`AGENT-DOC.md` (+ `AGENT-CODE.md`). **`AGENT-CODE.md`** is **seeded after
the first successful parser graph-ready analysis** (empty `CODE_JOB_ID`
until download); code-download **re-renders** it with a live job id. It is
**not** seeded on cold import.

**Rationale:** Clarify Q3/Q4; minimizes operator breakage for existing `015`
projects; keeps docs tree clear until a parser graph is ready for optional
AI entry.

**Alternatives considered:** Dual-read forever (`AGENT.md` + `AGENT-DOC.md`)
— rejected (B in clarify). Batch migrate all projects at deploy — rejected
(C; heavier ops). Seed `AGENT-CODE` on import — rejected (clarify A).

**Touchpoints:** `docs.service.ts`, DocumentationPage, user-guide,
`docs_agent_file_reserved` error text, tests expecting `AGENT.md`.

## R2. Dual download endpoints

**Decision:** Split download into two explicit operations (two UI buttons):

| Action | Creates/supersedes | Renders |
|--------|--------------------|---------|
| Docs download | `docs_from_es` | `AGENT-DOC.md` |
| Code download | `graph_from_wc` | `AGENT-CODE.md` |

Prefer dedicated routes (or one route with required `prompt_kind`) so
supersede stays per-kind. Docs download behavior otherwise matches `015`
(language, write_mode, graph-ready prerequisite). Code download requires
successful **parser** graph-ready analysis at least once for the project
(first AI entry); subsequent code-downloads allowed when any graph-ready
run exists so operators can re-run AI after an AI graph is current.

**Rationale:** Clarify dual buttons; FR-004–006; avoids accidental
cross-kind supersede.

**Alternatives considered:** Single download with file picker — rejected.
Download-both zip — rejected.

**Touchpoints:** `docs` routes + new code-download handler; frontend
Documentation panel.

## R3. Analysis run for AI rebuild + provenance

**Decision:** Code-download allocates a **new** `analysis_run_id` in
`pending`/`running` with **`graph_builder: "ai"`** (new field on
`AnalysisRunDocument`; parser runs set `"parsers"`). AiJob
`graph_from_wc` stores that `analysis_run_id`. Agent writes Canon only
into that run. On successful finalize: mark run `success` (or
`partial` only if product later needs it — MVP prefer `success` when
gates pass), run existing **replace-after-success** cleanup for older
runs. On fail/cancel: leave run failed/cancelled; **do not** replace
published graph; resolvers keep prior graph-ready run.

**Code-download prerequisite (analyze I1):** First code-download for a
project requires that a **parser** graph-ready run succeeded at least
once. Later code-downloads require any graph-ready run (parser or AI).

**Rationale:** Spec rebuild policy + badge source; mirrors parser “new run
id” model from `015` R2 without inventing a parallel graph store.

**Alternatives considered:** Overwrite nodes in-place on current run —
rejected (unsafe; breaks replace-after-success). Provenance only on AiJob
— rejected (Graph View needs run-level badge after job ends). Always
require “current” run to be parsers before each AI download — rejected
(blocks re-run after AI is current).

**Touchpoints:** `analysis-run` domain/repo; graph-run-resolver (unchanged
“latest graph-ready”); Graph View header reads `graph_builder`.

## R4. Agent Canon write path (job-bound ingest)

**Decision:** External agent does **not** spawn parsers. It POSTs
validated Canon **batches** (nodes and/or edges) to a job-bound API:

`POST /projects/:projectId/ai-jobs/:jobId/graph/ingest`

Body: envelope with `analysis_run_id`, `job_id`, items conforming to the
six Canon schemas (Code/System/UI × node/edge). Server:

1. Asserts job is current `running` `graph_from_wc` and run ids match.
2. Validates every item (unknown `kind` / schema fail → **400** and
   mark ingest error; clarify A: any invalid item fails the **job** on
   complete — prefer **fail-fast**: reject batch and set job toward
   failed, or accumulate and fail finalize; MVP = **reject batch +
   fail job** so partial ES writes from a bad batch do not publish).
3. Writes nodes/edges with `analysis_run_id` and AI provenance metadata
   as required by ingest/canon conventions.

On `POST .../complete` with `succeeded`:

- If any ingest errors recorded **or** node count for run is **0** →
  force **failed**, no replace.
- Else mark run graph-ready and replace-after-success.

Agent `complete(failed)` / cancel: no replace.

**Rationale:** Clarify A/B gates; reuse ES graph docs; bind writes like
docs `job_id` (015 R5).

**Alternatives considered:** Trust agent `succeeded` like docs Markdown —
rejected for graph (clarify). Drop invalid items and publish subset —
rejected (clarify A). Parser CLI wrapper for AI — rejected (wrong
tooling).

**Touchpoints:** new service beside ingest; schema validators from
`ods-help/requirements/json-model/` or existing ingest adapters’ kind
sets; AiJob complete hook.

## R5. WC read allowlist for code agent

**Decision:** Code agent reads WC **only** through ODS APIs scoped to the
current `graph_from_wc` job:

- List in-scope paths (Status ∈ {`auto_found`,`needed`}, denylist as sync).
- Read file content by path/element with **hard size cap**
  `AI_GRAPH_WC_MAX_FILE_BYTES` (config; default **1048576** = 1 MiB).
  Oversize → reject (413/400 with clear code); do not return truncated
  silent content for MVP.
- Reuse UTF-8 / binary detection habits from `FileContentService` where
  practical.

Do **not** expose raw host paths. Docs agent MUST continue to be blocked
from WC. Portal `GET element` file content may remain uncapped as today;
AI job-scoped reads enforce the cap.

**Rationale:** FR-008; constitution WC via ODS; Status scope FR-012;
analyze U1 (no prior global file-size env — add AI-specific knob).

**Alternatives considered:** Agent reads host FS — rejected. Unlimited
file size — rejected (pilot norms). Silent truncate — rejected (misleading
for agents). Reuse uncapped `FileContentService` as-is — rejected for AI
path (U1).

**Touchpoints:** routes under ai-jobs or projects; `FileContentService`
reuse; Status filter shared with R6.

## R6. Status scope for parsers and AI

**Decision:** When building analysis file inventory (parsers) and when
listing WC for AI, **exclude** elements with status `not_needed` (and
descendants inheriting that status per existing sync rules). Include
`auto_found` and `needed`. Sync still indexes all paths. UI picker offers
only three statuses; legacy `found`/`unused` remain readable in API/ES
but are omitted from new PATCH options / select options.

**Rationale:** Spec US3; clarify locked Status rules; today orchestrator
does not filter by status — this feature adds the filter.

**Alternatives considered:** Filter only AI, not parsers — rejected (spec
same scope). Mandatory remap of legacy statuses — rejected (clarify).

**Touchpoints:** `file-inventory` / analysis start path; element status
schema UI; optional note amend in `002`/`005` comments during implement.

## R7. Concurrent docs + graph jobs

**Decision:** Allow one `running` job **per kind** concurrently. Supersede
only within kind. Docs keep `analysis_run_id` frozen at docs-download;
starting `graph_from_wc` does not cancel docs.

**Rationale:** Clarify Q5; AiJob repo already keys running by kind.

**Alternatives considered:** Mutual exclusion — rejected. Warn-only UI —
optional later, not MVP required.

## R8. Code-agent prompt playbook

**Decision:** Expand `prompts/code-agent-prompt.md` into the S1 playbook:
placeholders (`ODS_BASE_URL`, `PROJECT_ID`, `ANALYSIS_RUN_ID`,
`CODE_JOB_ID`), WC read endpoints, graph ingest + progress + complete
contracts, hard constraints (no docs writes, Status scope, fail on
invalid/empty, replace-after-success). Remove obsolete “import toggle
Parsers/AI” wording. Render into `AGENT-CODE.md` on code-download.

**Rationale:** Spec FR-006; stub is stale vs locked operator flow.

**Alternatives considered:** In-process LLM — rejected (clarify / FR-016).

## R9. Provenance badge UI

**Decision:** **Graph View header** MUST show i18n string from
`graph_builder`: parsers vs AI. Other analysis-run chrome MAY reuse the
same field when already present — not a separate DoD. Do not change
element Status labels.

**Rationale:** Clarify Q7 / FR-014–015; analyze I2.

**Alternatives considered:** Overload `auto_found` — rejected. Require
badge on every analysis page — deferred.

## R10. Dogfood fixture

**Decision:** Use an ODS-owned fixture / demo WC already used for graph
smoke. Tracked artifacts use generic labels only. Optional large local
tree is operator-local confidence only.

**Rationale:** Spec dogfood + no-foreign-repo-names.
