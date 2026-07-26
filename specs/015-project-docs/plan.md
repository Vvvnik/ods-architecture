# Implementation Plan: Project documentation from ES via AI

**Branch**: (catalog `015-project-docs`; git branch optional) |
**Date**: 2026-07-26 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/015-project-docs/spec.md` — Markdown docs from Elasticsearch via
external AI; Documentation UI; Schema (Mermaid) + name consistency; clarify
session 2026-07-26.

**Dependencies**:

- `specs/001-ods-vision/spec.md` — Post-MVP project docs (Draft)
- `specs/002` / `003` — project, import, WC, portal shell
- `specs/005` / `006` — analysis run + canonical graph (**prerequisite changes
  in same implement wave, ordered first**)
- Graph/landscape already in canon (`008`–`014`, `018`–`021` as available)
- Product prompt: `prompts/docs-agent-prompt.md`

## Summary

Deliver **S2 — docs from ES**: platform stores Markdown under
`DATA_ROOT/docs/{projectId}/` (outside WC), seeds/renders `AGENT.md`, exposes
REST for graph/report reads + docs read/write + **AiJob** `docs_from_es`
(supersede on re-Download; writes bound to current job id; trust agent
`succeeded`/`failed`). Portal **Documentation** screen: tree + Markdown viewer +
right panel (job properties, language `en`/`ru`, **Download prompt**, **Export**
when docs job succeeded). Implement wave: (1) always-full analysis +
replace-after-success graph cleanup on `005`/`006`, then (2) docs FS/API/UI,
then (3) Export-pack (US4).

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend); React 18 / Vite
(portal frontend)

**Primary Dependencies**: Fastify + Elasticsearch client; existing
`graph-run-resolver`, analysis orchestrator; React Router; portal i18n en/ru;
Vitest; product template `prompts/docs-agent-prompt.md` (shipped with backend
image / repo)

**Storage**: Filesystem `DATA_ROOT/docs/{projectId}/`; ES for AiJob documents
(new index, see data-model); reuse existing graph/analysis indices as **read**
sources for agents; no WC reads for docs generation

**Testing**: unit (docs path safety, AGENT.md render, AiJob supersede/write
bind, write modes FR-016, always-full start); API contract tests for docs +
AiJob routes; manual quickstart for UI (frontend unit optional unless
regressions); fixture writes for docs viewer

**Target Platform**: Docker Compose `--profile full` (portal `:8080`);
`DATA_ROOT=/data/ods` volume

**Project Type**: backend FS + REST + portal Documentation page (no new parser)

**Performance Goals**: Documentation tree after import visible &lt;30s local
(SC-001); Download prompt one-click after successful analysis (SC-002); agent
REST pagination for graph (no full dump in one prompt)

**Constraints**: English artifacts; portal UI i18n en/ru; AI MUST NOT read WC or
mutate graph; no in-ODS LLM; Export only after docs `succeeded`; no server-side
docs quality gate on `succeeded`; constitution SDD (code only after tasks)

**Scale/Scope**: One docs tree per project; one **current** `docs_from_es` job;
Documentation + agent loop + Export-pack (US4)

## Constitution Check

*GATE: before Phase 0; re-check after Phase 1.*

| Requirement | Status |
|------------|--------|
| VI. FR in child `015`, not only `001` | ✅ |
| Scope reflected in `001` (Draft / Markdown docs) | ✅ |
| Surgical notes on `005`/`006` prerequisite only | ✅ |
| Language: EN artifacts; portal UI i18n en/ru | ✅ |
| Code after plan/tasks | ✅ (plan now; tasks next) |
| No RAG / auth / S1 graph-from-WC in this feature | ✅ |
| Docs outside WC; ES is canon source | ✅ |

**Post-design:** research + data-model + contracts + quickstart — no gate
violations. Decisions in [research.md](./research.md).

## Project Structure

### Documentation (this feature)

```text
specs/015-project-docs/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── rest-docs-ai.md
│   ├── ai-job.md
│   └── docs-tree.md
└── tasks.md             # /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/routes/          # + docs.ts, ai-jobs.ts (or nested under projects)
│   ├── api/schemas/         # docs + AiJob zod
│   ├── domain/              # AiJob document types
│   ├── repositories/        # ai-job ES repo
│   ├── services/            # docs.service (FS), agent-prompt.service, ai-job.service
│   │                        # analysis always-full + graph replace-after-success
│   └── config.ts            # DATA_ROOT (existing)
└── tests/

frontend/
├── src/
│   ├── pages/               # DocumentationPage
│   ├── components/          # docs tree, markdown viewer, docs properties panel
│   ├── app/router.tsx       # /projects/:projectId/docs
│   ├── components/MainMenu.tsx
│   └── i18n/en.ts, ru.ts
└── tests/

prompts/
├── docs-agent-prompt.md     # product template (keep aligned with spec)
└── code-agent-prompt.md     # S1 stub (unchanged)

DATA_ROOT/                   # runtime, not git
├── working-copies/{projectId}/
└── docs/{projectId}/
    ├── AGENT.md
    └── spec-*.md …
```

**Structure Decision**: Extend existing Fastify + React portal. New FS service
for docs; new ES index for AiJob; no parser module. Prerequisite edits live in
existing analysis/orchestrator/ingest + graph cleanup helpers.

## Complexity Tracking

> No constitution violations requiring justification.
