# Implementation plan: Pipeline scaling (010)

**Branch**: `010-scale-pipeline` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Entrance**: `specs/010-scale-pipeline/spec.md` — hardening sync→detector→Orchestrator→
parsers→ingest→graph API/UI under large repo; clarify 2026-07-15 (+ walk-scope /
SC gates)

**Dependencies**:

- `specs/001-ods-vision/spec.md` — stage 9
- `specs/005-code-analysis/spec.md` — detector, Orchestrator, envelope
- `specs/006-project-graph/spec.md` — Canon, ingest, `ods-graph-*`
- `specs/007-portal-scale-ux/spec.md` - graph search/tree
- `specs/008-code-graph-depth/spec.md` — code-layer
- `specs/009-system-landscape/spec.md` — system-layer (**not** change `spec.md`)

## Summary

**One** file inventory cycle sync+training (usually walk when sync;
detector/change-set — only reuse). Measurable DoD: ≤ **15 min** on
`large-repo`; SC-002 assert walk-count on large-repo; **mandatory**
metering SC-003 (40% incremental or documented fallback); closing smoke on
external reference; progress UI (sync = stage; analysis = parser / N from M);
timeout + max parallel no RAM cap; ingest no dangling; page UI
on the actual graph large-repo (10k is a landmark). Canvas and parser CLI SDK —
outside DoD (`011` / follow-up).

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend + frontend); C# / .NET 8
(parser csharp) — without stack change

**Primary Dependencies**: Fastify, Elasticsearch client, Vitest, React;
existing services `SyncService`, `LanguageDetectorService`,
`ChangeSetService`, `AnalysisOrchestratorService`, `IngestService`

**Storage**: Elasticsearch — `ods-projects`, `ods-analysis-runs`,
`ods-sync-snapshots` (or equivalent inventory), `ods-graph-*` (without new
graph indexes)

**Testing**: unit — inventory reuse, progress patch, edge-filter, orchestration
limits; integration — large-repo timing ≤900s, **walk-count ≤1 on large-repo**,
**SC-003 full vs incremental timing**; frontend — progress display; manual —
closing smoke checklist

**Target Platform**: Docker Compose profile `full` + local backend for
benchmarks; closing smoke — WC at `local_path` out git ODS

**Project Type**: Backend services + frontend progress UX + fixtures/docs;
no new parser_id

**Performance Goals**: SC-001 ≤ **15 min**; SC-002 ≤1 walk (gate large-repo);
SC-003 incremental ≥40% faster (required measurement or fallback note);
SC-005 first page UI < 3 with on the graph large-repo; SC-007 progress ≥30 with

**Constraints**: No canvas; without hard RAM cap; without commit the external standard;
`009` spec not rule; dangling = 0; portal UI i18n; sync progress no N/M

**Scale/Scope**: Pilot / ops hardening; auto-Etalon `large-repo`; DoD smoke —
external operator reference (manual)

## Constitution Check

*GATE: to Phase 0 after Phase 1.*

| Requirement | Status |
|------------|--------|
| VI. Detailed Spec `010`, FR not `001` | ✅ roadmap updated |
| TypeScript backend + modular parsers CLI | , without changing the stack |
| ES metadata, Canon `ods-graph-*` | , without new graph indexes |
| Extension scope in `001` to plan | ✅ stage 9 = scale |
| Code after plan/tasks | ✅ |
| Language policy (constitution) | ✅ |
| Without canvas / auth / RAG in MVP | ✅ |

**Post-design:** research + data-model + contracts + quickstart
synchronized with clarify session 2; no violations.

## Project Structure

### Documentation (this feature)

```text
specs/010-scale-pipeline/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── file-inventory.md
│   ├── analysis-run-progress.md
│   └── scale-acceptance.md
└── tasks.md                          # /specit-tasks
```

### Source Code

```text
backend/
├── src/
│   ├── domain/
│   │   └── analysis-run.ts           # + progress fields
│   ├── services/
│   │   ├── file-inventory*           # walk once / publish snapshot
│   │   ├── language-detector.service.ts  # inventory reuse
│   │   ├── change-set.service.ts         # inventory reuse
│   │   ├── analysis-orchestrator.service.ts  # progress; parallel
│   │   ├── sync.service.ts               # build inventory on sync walk
│   │   └── ingest/ingest.service.ts      # dangling filter, bulk
│   └── api/schemas/analysis.schemas.ts   # progress in run response
└── tests/
    ├── unit/…inventory / progress / orchestrator
    ├── integration/…large-repo timing / walk-count / SC-003
    └── fixtures/…scale timing notes

frontend/
├── src/
│   ├── hooks/useAnalysis.ts / useSync.ts
│   ├── pages/WorkspacePage.tsx / GraphPage.tsx
│   └── i18n/ru.ts
└── tests/…progress UI

docker/fixtures/repos/                # large-repo
parsers/ # SDK out DoD (US7)
```

**Structure Decision**: expanding the existing road; inventory — from sync walk
or the equivalent snapshot reuse; there are no new graph indexes.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Implementation Increments (for tasks)

| Increment | Stunt | FR / SC |
|-----------|--------|---------|
| A | File inventory: sync walk → reuse detect/CS | FR-001, SC-002 |
| B | Progress API + UI (analysis N/M; sync = stage) | FR-013, SC-007 |
| C | Orchestrator: timeout + max parallel; C# partial | FR-003…005 |
| D | Ingest scale + dangling = 0 | FR-006…007, SC-004 |
| E | Graph tree/search pagination; SC-005 on large-repo | FR-008, SC-005 |
| F | Quickstart: timings, **SC-003 measure**, closing smoke | FR-002/004/009, SC-001/003/006 |
| G | (follow-up) Parser CLI SDK — tracking only | FR-010 |
| H | Graph tree/edges: independent scroll panels + sticky "Still rooted" | FR-008 UX |

Analysis modals (languages/changes): viewport + sticky footer + path portions —
in the code `010`.
