# The implementation plan: Code analysis  detector, orchestrator, parser

**Vetka**: `005-code-analysis` | **Date**: 2026-07-09 | **Spec**: [spec.md]

**Input**: `specs/005-code-analysis/spec.md`

**Dependency**:

- `specs/001-ods-vision/spec.md`  stage 4, post-MVP analysis
- `specs/002-domain-model/spec.md`  project, sync, WC, ES, DELETE
- `specs/003-portal-mvp/spec.md`  UX of two modal windows after sync

**User**: `specs/006-project-graph/spec.md`  ingest envelope → canon of the graph

## Summary

The backend extension of the ODS (**TypeScript / Node.js 20 / Fastify**) and the portal (`003`):
After sync **Language Detector** builds a language report in **Elasticsearch**;
The user confirms the analysis in **two modal windows**; **orchestrator**
runs **CLI-modules** from the `parsers/` directory in the order `file_count` decrease.
(not on the platform stack); each module returns ** envelope JSON** with free
`model`. Incremental mode  only changed files from past sync.
The canonical graph and ingest-adapters  **no** in this speck (`006`).

** Order of delivery of the modules (development): ** `typescript` → `csharp` → `python` → `cpp`
(command and deps convenience); ** runtime**  always out of the report
(FR-004, FR-008).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS (backend + first parser module);
Roslyn/.NET for `csharp`  separate subprocess

**Primary Dependencies**: Fastify 4, `@elastic/elasticsearch` 8, `zod`, `simple-git`
(for diff), `uuid`, `pino`; parser `typescript`: `typescript` compiler API

**Storage**: Elasticsearch 8.x  new indexes `ods-language-reports`,
`ods-analysis-runs`, `ods-parser-envelopes` (see [contracts/elasticsearch-indices.md](./contracts/elasticsearch-indices.md));
filesystem  only WC (`002`)

**Testing**: Vitest (unit detector, registry, orchestrator mocks); integration —
spawn stub-parser; e2e  sync → modals → analysis (Playwright, in tasks)

**Target Platform**: Docker Compose profile `full` (`docker/`); parsers in the form of backend
or mount `parsers/`

**Project Type**: Web backend + subprocess CLI parsers + frontend extension (`003`)

**Performance Goals**: SC-001  detector < 30 s per 10k files; SC-003  increments
-50% of the time with ≤5% of the files changed

**Constraints**: Without Redis/Kafka; in-memory lock analysis (as sync); orchestrator not
Parsite `model`; two UX-confirmations are required; localized error messages

**Scale/Scope**: Pilot; 4 target parser-modules; up to ~ 10k files / project

## Constitution Check

*GATE: before Phase 0 and after Phase 1.*

| The requirement | The status |
|------------|--------|
| VI. Detailed specs `005`, not in `001` | ✅ |
| TypeScript backend MVP | ✅ orchestrator at `backend/` |
| ES for metadata | ✅ Individual indexes |
| Parser  subprocess, not monolith | ✅ `parsers/<id>/` |
| The boundary with `006` (graph, ingest) | ✅ envelope → ES; ingest in `006` |
| UX of the modules  contract for `003` | ✅ `contracts/analysis-ui.md` |
| Code after plan/tasks | ✅ |
| Agreement with `001` post-MVP | ✅ |

**Post-design:** OpenAPI-expansion to `contracts/openapi-analysis.yaml`; ES indices
recorded; `006` consumes `ods-parser-envelopes` without knowing `model` on the side
The orchestrator.

## Project Structure

### Documentation (this feature)

```text
specs/005-code-analysis/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│ ── openapi-analysis.yaml # REST expansion 002
│ ── envelope-schema.json # contract envelope
│ ── parser-manifest.md # catalog of parsers/
│ ── elasticsearch-indices.md # 005 index
│ ── analysis-ui.md # contract of models for 003
└── tasks.md                       # /speckit-tasks
```

### Source Code

```text
backend/
├── src/
│   ├── domain/
│   │   ├── analysis-run.ts
│   │   ├── language-report.ts
│   │   └── parser-envelope.ts
│   ├── repositories/
│   │   ├── language-report.repository.ts
│   │   ├── analysis-run.repository.ts
│   │   └── parser-envelope.repository.ts
│   ├── services/
│   │   ├── language-detector.service.ts
│   │   ├── change-set.service.ts          # diff / snapshot
│   │   ├── parser-registry.service.ts
│   │   ├── analysis-orchestrator.service.ts
│   │   └── sync.service.ts                # hook: post-sync → detector
│   └── api/routes/
│       └── analysis.ts                    # /projects/{id}/analysis/*
├── tests/
│   ├── unit/
│   └── integration/

parsers/
├── typescript/
│   ├── manifest.json
│   └── run.mjs
── csharp/ # increments 2
── python/ # increment 3
── cpp/ # increments 4

frontend/
├── src/
│   ├── components/analysis/
│ │ ── LanguagesConfirmModal.tsx # window 1
│ │ ── ChangesConfirmModal.tsx # window 2
│   └── hooks/useAnalysis.ts
```

**Structure Decision:** Register in the existing `backend/`; parser  separate
The `parsers/` catalog is at the root of the repository; UI-models  extension `frontend/` (`003`).

## Integration with `002` / `003`

| The Aspect | `002` | `005` |
|--------|-------|-------|
| Trigger | sync success | post-sync hook → detector |
| WC | `working_copy_root` | Detector input + parsers |
| Blocking | `sync_in_progress` | `analysis_in_progress` (analogue) |
| Delete the project | Cascade of elements | + delete_by_query of the 005 index |

| The Aspect | `003` | `005` |
|--------|-------|-------|
| After sync | polling status | chain of 2 modules |
| API | OpenAPI is basic | + `openapi-analysis.yaml` |

## The phases of implementation (logical)

### A  detector + API of the report + window 1

- `language-detector.service`, index `ods-language-reports`
- POST-sync hook, GET the report
- `LanguagesConfirmModal` (without running the parser)

### B  change set + window 2 + orchestrator (stub)

- `change-set.service`, snapshot/diff
- `analysis-orchestrator` + `ods-analysis-runs`
- `ChangesConfirmModal`, start with the parser silenced

### The C  parser `typescript`

- `parsers/typescript/`, registry, envelope → `ods-parser-envelopes`

### The increments DF  `csharp`, `python`, `cpp`

- One module; without changes to the orchestrator except registry

## Complexity Tracking

No violations of the Constitution that require an excuse.
