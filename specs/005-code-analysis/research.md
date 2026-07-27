# Research: Code analysis (005)

**Date**: 2026-07-09

## R1. Classification of languages (Language Detector)

**Decision:** Table of extensions → language + optional heuristics: shebang (first 2 lines),
the existence of `package.json` (JS/TS ecosystem), `*.csproj` / `*.sln` (C#), `pyproject.toml`,
`requirements.txt` (Python), `CMakeLists.txt` (C++). Files from `ods-elements` with `type=file`,
`is_active=true`; bypass WC, excluding `.git`, `node_modules`, `dist`, `build` (denylist in config).

**Rationale:** FR-002, FR-018  without AST; sufficient for the pilot; agreed with drawing §5.

**Alternatives:** GitHub Linguist as lib  is a heavy addiction; full AST  is out of the scope of the detector.

## R2. Sorting and start order

**Decision:** `languages[]` sorted by `file_count` desc, tie-break  `language` asc.
The orchestrator and UI use the same sorted array.
**no** is a priority.

**Rationale:** Agreed spec Assumptions; US3, FR-008.

**Alternatives:** First the backend language   is rejected.

## R3. Incremental change set

**Decision:** After each successful sync save **snapshot** `{ path, mtime, size }`
for project files (ES document `ods-sync-snapshots` or field in `ods-language-reports`
metadata  preferably a separate lightweight snapshot in memory/ES by `project_id` +
`last_sync_at`). With the following sync: snapshot → lists `added`, `modified`,
`deleted`. For `git_url` WC you can also use `git diff --name-status`
between `HEAD@{1}` and `HEAD` if git is available (fallback  mtime snapshot).

**Rationale:** FR-011; Draft §3 D-005-8; does not require full re-scan for UI window 2.

**Alternatives:** Always complete analysis  rejected (SC-003); keep diff only in git
Not enough  for `local_path` without history.

## R4. Orchestratortor and locks

**Decision:** Pattern `SyncService`: in-memory `Set<projectId>` for `analysis_in_progress`;
POST confirm → `analysis_status=running` in `ods-analysis-runs`; rejection 409 when parallel
Running the parser  `child_process.spawn` on `manifest.command`; timeout configurable
(default 10 min / module pilot). Parallel: ** up to 2** modules at the same time (pilot);
The order of the start of the line is as per the report.

**Rationale:** FR-008; without Redis in MVP; agreed with R6 from `002/research.md`.

**Alternatives:** Full parallel of all modules  risk of OOM on Roslyn/clang; strict
The sequence is slower without a winner for the pilot.

## R5. The Parser Register

**Decision:** Catalogue `parsers/<parser_id>/manifest.json`; when the backend is started
`ParserRegistryService` scans the directory, validates the manifest (zod), builds the map
`language → parser_id`. Missing module → `parser_status: missing` in the report.

**Rationale:** FR-005, FR-017; drawing §4.2.

**Alternatives:** Configuration only in env  is worse for adding modules (SC-005).

## R6. Envelope and storage

**Decision:** The parser writes the JSON file in a temp dir; the orchestrator validates
wrapping (not `model`), calls `ingestNative` per file chunk into graph indices, then
upserts **metadata** in `ods-parser-envelopes` (`model` always `{}`,
`_id` = `{analysis_run_id}:{parser_id}`).

**Rationale:** FR-007, FR-012, FR-013; durable graph is `ods-graph-*`, not native blob.

**Alternatives:** Persist full native `model` in ES — rejected at scale (circuit-breaker).
Disk offload of the full model — rejected (still treats giant JSON as storage).

## R7. The Elasticsearch Index (005)

**Decision:** Three new indices (names are stable for `006`):

| The index | The assignment |
|--------|------------|
| `ods-language-reports` | The latest and historic detector reports |
| `ods-analysis-runs` | The following is the list of countries by the number of countries in which the country of origin is located: |
| `ods-parser-envelopes` | metadata only (`model` always `{}`) |

All with `project_id` keyword; DELETE  delete_by_query filtering (coordinate the cascade with `002` FR-013).

**Rationale:** `code-analysis-subsystem.md` §7; individual indexes as `002`.

**Alternatives:** Nested in `ods-projects`  rejected in `001`/constitution.

## R8. API and UX

**Decision:** Prefix `/api/v1/projects/{projectId}/analysis/...`  extension of the OpenAPI
`002` (File `openapi-analysis.yaml` v `005`, merge pri Realization). Frontend:  After
`sync_status=success` — fetch report → modal 1 → fetch change set → modal 2 → POST confirm
→ poll run status.

**Rationale:** FR-014, US2; single API versioning with `002`.

**Alternatives:** WebSocket  is too much for a pilot.

## R9. The first parser module (delivery)

**Decision:** The development increment starts with `parsers/typescript` (TS Compiler API,
the same runtime Node)  **no** means runtime priority.
Python will be the first to run the Python module when it's registered.

**Rationale:** FR-016; team convenience; agreed with the user (runtime ≠ delivery).

**Alternatives:** Start with C# (Roslyn)  above the deps threshold for the first increment.

## R10. Lighting up new languages (window 1)

**Decision:**Keep `languages[]` from the **previous** report on the project; when repeated
sync language ∈ new \ old → highlight: green if `available`, red if `missing`. First
report (no previous)  without illumination.

**Rationale:** US2 from 23.

**Alternatives:** Diff on file_count only  is not enough for new language.
