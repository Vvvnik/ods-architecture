# Research: Project documentation from ES via AI (015)

**Feature**: `015-project-docs`  
**Date**: 2026-07-26  
**Spec**: [spec.md](./spec.md)

## R1. Always-full analysis (`005` prerequisite)

**Decision:** Every new analysis run is **full** (`incremental: false`). Remove
(or no-op) the default incremental change-set path and the need for
`force_full` as an escape hatch — UI/API may keep a deprecated `force_full`
field accepted as always-true for compatibility, or drop it in the same wave.

**Rationale:** Docs bind to one coherent successful graph; incremental snapshots
complicate “current analysis” and replace-after-success. Spec FR-019 + clarify
session (same implement wave, tasks first).

**Alternatives considered:** Keep incremental + force_full — rejected (spec
prerequisite). Separate feature only for always-full — rejected (clarify B =
same `015` wave).

**Implementation touchpoints:** `ChangeSetService` / `AnalysisOrchestratorService`
/ `AnalysisService.startRun` / analysis schemas / `useAnalysis` (stop offering
incremental as default).

## R2. Replace-after-success graph (`006` prerequisite)

**Decision:** Keep writing the new run under a new `analysis_run_id`. **After**
the new run reaches graph-ready (`analysis` + `ingest` success|partial per
`graph-run-resolver`), **delete** graph nodes/edges (and related run-scoped
graph artifacts as needed) for **older** `analysis_run_id`s of that project.
Do **not** delete the previous graph before the new run succeeds (failed run
leaves prior graph intact for resolvers/docs).

**Rationale:** Spec “drop previous successful graph only after new success”.
Today nodes accumulate per run id; cleanup makes “current” unambiguous and
reduces ES growth. Docs/`AGENT.md` always reference
`resolveLatestGraphRunId`.

**Alternatives considered:** Never delete old runs — rejected for 015 DoD
clarity. Delete previous graph at start of new run — rejected (unsafe on
failure). Soft-delete flag only — optional later; hard delete of older run
graph docs is enough for MVP.

**Implementation touchpoints:** ingest completion / analysis finalize hook;
`graphNodeRepository` / `graphEdgeRepository` delete-by-project excluding
current run id (or delete listed older run ids).

## R3. Docs filesystem layout

**Decision:** `DATA_ROOT/docs/{projectId}/` sibling to `working-copies/`, never
inside WC. Seed `AGENT.md` on project create/import. Relative paths only under
that root; reject `..` and absolute escapes.

**Rationale:** Spec FR-001/002; matches draft and prompt template.

**Alternatives considered:** Docs inside WC — rejected (git sync interference).
Separate volume — unnecessary; same `ods-data` volume.

## R4. AiJob storage and supersede

**Decision:** New ES index `ods-ai-jobs` (document per job). Fields: `id`,
`project_id`, `kind` (`docs_from_es` first), `status`
(`running|succeeded|failed|cancelled` — **no `queued` in MVP**),
`analysis_run_id`, `docs_language`, `docs_write_mode`, `docs_generation_id`,
`progress`, `summary`, timestamps, provenance. Project has at most one
**current** docs job (`running`); Download prompt cancels prior `running` →
`cancelled`, then creates new `running` and re-renders `AGENT.md` with new
`DOCS_JOB_ID`.

**Rationale:** Clarify Q1/Q5; analysis-run pattern already in ES; no AiJob in
code today (greenfield).

**Alternatives considered:** Filesystem-only job status — weaker for polling.
Reuse `AnalysisRun` — wrong domain. In-memory only — lost on restart.

## R5. Docs write binding

**Decision:** Write/upsert/delete of docs files (except ODS-owned `AGENT.md`)
requires header/query/body **job id** equal to the project’s **current**
non-cancelled docs job. Reject cancelled/non-current. Completing a cancelled job
is rejected (clarify).

**Rationale:** Prevents superseded agents from corrupting the tree.

**Alternatives considered:** Bind only complete — rejected (clarify B). No bind —
rejected (race risk).

## R6. Agent data access surface

**Decision:** Agent uses existing graph/analysis/report read APIs where possible
plus thin additions if needed (entity-by-id for Fetch links). **No** WC file
APIs for the docs agent. Docs list/read/write under
`/api/v1/projects/:projectId/docs/...`. AiJob under
`/api/v1/projects/:projectId/ai-jobs/...` (or `/docs/jobs/...` — see contracts).

**Rationale:** Spec FR-007/008; reuse Fastify style from `analysis.ts` /
`graph.ts`.

**Alternatives considered:** Dump ES into prompt — rejected (draft/spec). MCP in
MVP — rejected (later).

## R7. AGENT.md render + Download prompt

**Decision:** Product template at `prompts/docs-agent-prompt.md` (repo). On
import: copy/render minimal seed into `docs/{id}/AGENT.md`. On Download prompt:
re-render placeholders (`ODS_BASE_URL`, `PROJECT_ID`, `ANALYSIS_RUN_ID` from
`resolveLatestGraphRunId`, `DOCS_LANGUAGE`, `DOCS_WRITE_MODE`,
`DOCS_GENERATION_ID`, `DOCS_JOB_ID`) and return file download. Default write mode
`overwrite`. `PUBLIC_API_BASE_URL` or request-derived origin for local
`http://localhost:8080/api/v1`.

**Rationale:** Spec FR-004/005; draft §7.5.

**Alternatives considered:** In-ODS LLM button — rejected (MVP external agent).
Separate `DATA_ROOT/prompts/` — rejected (prompt lives in docs/).

## R8. Documentation UI

**Decision:** Route `/projects/:projectId/docs`; MainMenu entry; reuse
Workspace-like three-column chrome (tree | Markdown viewer | properties). Right
panel: job stats, language toggle, Download prompt, Export (after US4, enabled
only on docs `succeeded`). Tree is hierarchical folders (same chrome as Files).
Mermaid: fenced code visible; live Mermaid render optional best-effort (spec:
content presence is MVP bar).

**Rationale:** Spec US1/US2/US4; clarify Export A = hide until export increment.

**Alternatives considered:** Docs as Workspace tab only — weaker discoverability.
Disabled Export stub — rejected (clarify).

## R9. Succeeded without quality gate

**Decision:** `POST .../ai-jobs/:id/complete` with `succeeded|failed` + summary
updates status if job is current and `running`; no check for Schema/es-ref/file
presence.

**Rationale:** Clarify Q2 = A.

## R10. Export-pack

**Decision:** Implemented in US4 after docs loop stabilized. Single zip
(`docs/` + `es-data/` NDJSON + README with `BASE_ES_URL` guidance). UI Export
control enabled only when current `docs_from_es` job is `succeeded`; otherwise
hidden-disabled / API `409 docs_export_not_ready`. First increment hid Export
entirely (clarify Q3).

**Rationale:** Spec FR-018 + SC-007.

**Alternatives considered:** Disabled Export stub in first increment — rejected
(clarify); claim rebuild from pack — rejected.

## R11. Entity Fetch URL (es-ref)

**Decision:** Prefer ODS API URLs in generated docs while in ODS, e.g. graph node
fetch by project + analysis run + node id (existing or thin wrapper). Export
later rewrites/`BASE_ES_URL` — not first increment.

**Rationale:** Spec FR-015; exact path in [contracts/rest-docs-ai.md](./contracts/rest-docs-ai.md).

**Alternatives considered:** Raw ES `_doc` URLs in ODS — rejected (bypass ODS
control plane).
