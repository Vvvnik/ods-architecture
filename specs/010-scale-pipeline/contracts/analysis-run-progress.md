# Contract: Analysis run progress (API + UI)

**Spec**: [../spec.md](../spec.md) | **Research**: R2 | Clarify: stage + parser / N from M;
sync = stage only

## Goal

The operator sees the course of a long analysis (FR-013 / SC-007), not taking it for hang.

## Extension GET `/projects/{id}/analysis/runs/{runId}`

Additive JSON fields (optional for backward compatibility):

| Field | Type | Meaning |
|-------|------|---------|
| `progress_phase` | string \| null | **Canon:** `queued` \| `parsing` \| `ingest` \| `done` |
| `progress_active_parser_id` | string \| null | Current parser |
| `progress_parsers_completed` | number | Completed |
| `progress_parsers_total` | number | Planned this year run |
| `progress_updated_at` | string \| null | ISO timestamp |

Existing `status`, `parser_results` — Canon summary.

**Not** in the Canon: `detecting`, `sync` (sync — on project, not run).

## Display UI (Workspace / Graph hints)

| Phase | Text (landmark, i18n) |
|------|-------------------------|
| sync (`project.sync_status=running`) | "Syncing..." (**no** mandatory N/M) |
| `parsing` + active id | "Analysis: {parser} ({completed}/{total})" |
| `parsing` no active | "Analysis: {completed}/{total}" |
| `ingest` | "Graph construction..." |
| terminal | hide progress / final toast |

The percentage band **is not** required.

## MUST

- The Orchestrator **MUST** update progress no less than at the start/finish line of the module.
- Poll interval UI **MAY** remain current for `running`.
- When `completed == total` and status still running — phase **MAY** be `ingest`.

## Check

E2E/manual: run ≥30 with a valid stage + N/M on analysis; sync shows
stage; unit: schema progress.
