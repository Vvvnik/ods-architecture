# Implementation Plan: S1 — AI graph from working copy

**Branch**: (catalog `027-ai-graph-from-wc`; git branch optional) |
**Date**: 2026-08-02 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/027-ai-graph-from-wc/spec.md` — AiJob `graph_from_wc`,
dual prompts (`AGENT-DOC` / `AGENT-CODE`), Status scope, provenance badge;
entry-draft + SpecKit clarify 2026-08-02.

**Dependencies**:

- `specs/001-ods-vision/spec.md` — Active S1
- `002`/`003` — project, WC, sync/import
- `005`/`006`/`010` — analysis run, Canon ingest, replace-after-success
- `007`/`011`/`014` — Graph View consumption + header surfaces
- `015` — shared AiJob bus (`docs_from_es`); rename + second download only
- Product templates: `prompts/code-agent-prompt.md`, `prompts/docs-agent-prompt.md`

## Summary

Deliver **S1 — AI graph from WC** on the existing AiJob bus: after a
successful **parser** analysis, the operator downloads **`AGENT-CODE.md`**,
runs an external agent that reads allowlisted WC paths (Status-scoped) and
writes Canon into a **new** analysis run with **AI** provenance. Publish uses
replace-after-success with **strict gates** (any invalid/unknown item → fail;
zero nodes → fail). Docs path keeps working with **`AGENT-DOC.md`** rename +
auto-migrate legacy `AGENT.md`, and a second download button. Concurrent
`docs_from_es` + `graph_from_wc` allowed (per-kind supersede). Graph View /
run header shows parsers vs AI badge. No in-process LLM; no import/sync AI.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend); React 18 / Vite
(portal frontend)

**Primary Dependencies**: Fastify + Elasticsearch client; existing AiJob
service/routes (`015`); analysis run + ingest + graph-run-resolver;
file/element APIs for WC reads; React portal Documentation + Graph View;
Vitest; product templates under `prompts/`

**Storage**: FS `DATA_ROOT/docs/{projectId}/` (`AGENT-DOC.md`,
`AGENT-CODE.md`); ES `ods-ai-jobs`; analysis + graph indices (AI writes
same Canon shape); WC under `DATA_ROOT/working-copies/` (**read** for
`graph_from_wc` only via ODS APIs)

**Testing**: unit (prompt rename/migrate, code-prompt render, AiJob
graph supersede, ingest bind + validation gates, Status scope filter,
provenance field); API tests for dual download + graph ingest/complete;
frontend unit for dual buttons + status picker + badge; quickstart
dogfood on ODS fixture

**Target Platform**: Docker Compose `--profile full` (portal `:8080`);
`DATA_ROOT=/data/ods` volume

**Project Type**: backend REST + FS prompts + portal UI (no new parser
module; AI is external agent)

**Performance Goals**: Code-download creates job + renders prompt in one
operator click after graph-ready parser analysis; publish gates fail-fast
on invalid/empty Canon; no wall-clock SLA beyond pilot usability (parity
with `015` agent loop)

**Constraints**: English artifacts; portal i18n en/ru; Canon = six schemas
only; no hybrid parsers+AI run; no foreign paths/UUIDs in tracked
artifacts; constitution SDD (code after tasks); no-foreign-repo-names;
WC AI reads capped by `AI_GRAPH_WC_MAX_FILE_BYTES` (default 1 MiB)

**Scale/Scope**: One current `graph_from_wc` job per project; one current
`docs_from_es` job (may run concurrently); dogfood ODS fixture + optional
operator large-tree confidence

## Constitution Check

*GATE: before Phase 0; re-check after Phase 1.*

| Requirement | Status |
|------------|--------|
| VI. FR in child `027`, not only `001` | ✅ |
| Scope reflected in `001` (Active S1) | ✅ |
| Canonical graph frame — AI same six schemas | ✅ |
| Language: EN artifacts; portal UI i18n en/ru | ✅ |
| Code after plan/tasks | ✅ (plan now; tasks next) |
| No MCP / auth / in-ODS LLM in this feature | ✅ |
| Surgical: reuse AiJob; do not fork job framework | ✅ |

**Post-design:** research + data-model + contracts + quickstart — no gate
violations. Decisions in [research.md](./research.md).

## Project Structure

### Documentation (this feature)

```text
specs/027-ai-graph-from-wc/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── rest-graph-from-wc.md
│   ├── ai-job-graph-from-wc.md
│   ├── agent-prompts.md
│   └── status-scope-and-provenance.md
└── tasks.md             # /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/routes/          # docs download split; graph-from-wc ingest;
│   │                        # WC allowlist reads for code job
│   ├── api/schemas/         # zod for code-download + graph ingest
│   ├── domain/              # AnalysisRun.graph_builder; reserved prompt names
│   ├── services/            # docs.service rename/migrate; code-prompt render;
│   │                        # ai graph ingest + finalize gates; status scope
│   │                        # for inventory/parsers + AI WC list
│   └── …
└── tests/

frontend/
├── src/
│   ├── pages/DocumentationPage.tsx   # two download buttons
│   ├── pages/Graph* / analysis UI    # provenance badge
│   ├── components/ElementProperties  # three statuses only
│   └── i18n/en.ts, ru.ts
└── tests/

prompts/
├── docs-agent-prompt.md     # align AGENT-DOC naming
└── code-agent-prompt.md     # expand S1 playbook (from stub)

ods-help/user-guide/         # docs download rename + code prompt notes
```

**Structure Decision**: Extend Fastify + React portal and shared AiJob.
AI Canon write path is a **job-bound ingest API** into a new analysis run
(not a second graph product). Parser modules unchanged except inventory
Status filtering shared with AI scope.

## Complexity Tracking

> No constitution violations requiring justification.
