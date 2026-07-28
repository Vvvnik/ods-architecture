# Implementation Plan: Parser pipeline performance

**Branch**: `026-parser-pipeline-perf` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/026-parser-pipeline-perf/spec.md`
(clarify locked: DoD fixture `large-repo`; max parallel default **4**; no
depth modes / no quality cut; SC-001 **≥30%** operator-measured; **no**
product surface for writing wall-clock/stage times).

**Dependencies**:

- `specs/001-ods-vision/spec.md` — active `026`; analysis wall-clock promoted
- `specs/005-code-analysis/` — orchestrator, registry, spawn, envelopes
- `specs/010-scale-pipeline/` — timeout / max parallel / file chunks (extend;
  do not casually reopen)
- `specs/008-code-graph-depth/` — semantic `calls` quality bar (unchanged)
- `specs/018-parser-extension-playbook/` — native host per stack

**Out of this plan**: symbols-fast / calls-deep modes; timing UX (Sync status
column, toasts redesign, API timing fields, mandatory timing tables);
extract DoD for `024`/`025`; wrong-host rewrites; hard RAM caps; S1 / MCP /
auth / color legend; C++ API parsers.

## Summary

Cut full-analysis **wall-clock** on ODS `large-repo` by **≥30%** (operator
stopwatch DoD) **without** lowering parser semantic depth:

| Lever | Approach |
| ------ | ---------- |
| P0 Parallel | Default `ANALYSIS_MAX_PARALLEL_PARSERS` **2 → 4**; document override |
| P0 Prebuilt | Hot path MUST use Release DLL / JAR / ready Node packs; no silent `dotnet run` / `mvn package` when artifact expected |
| P1 Workers | One long-lived OS process per `parser_id` per run; chunks over stdin NDJSON, not new process per chunk |
| P1 Chunks | Keep global chunk size **500**; merge pathological tiny last chunks; per-parser size **out of DoD** (future MAY) |
| P2 Skip | Confirm detector/orchestrator already skip empty/irrelevant; fix gaps only |

Native hosts stay (TS→Node, C#→.NET, Java→JVM). No timing product surfaces.

## Technical Context

**Language/Version**: TypeScript / Node 20 (backend orchestrator + Vitest);
existing parser hosts unchanged (Node, .NET 8, JVM, Python where present)

**Primary Dependencies**: existing Fastify analysis orchestrator
(`analysis-orchestrator.service.ts`), `analysis-file-chunks.ts`,
`parser-registry`, Docker parser image build; Vitest

**Storage**: unchanged ES indexes / Canon; no new node/edge kinds; no new
timing fields on analysis runs

**Testing**: Vitest unit/integration for chunk merge, parallel default,
worker session (spawn count), prebuilt fail-loud; Docker/pilot smoke that
DLL/JAR path is used; operator-measured SC-001 on `large-repo`; smoke
fixture for SC-002 `calls` (existing `008` dogfood, e.g. code-graph-depth)

**Target Platform**: Docker Compose `--profile full` + local pilot

**Project Type**: orchestrator + packaging + optional `--ods-worker` support
in language/heavy parsers; docs (`.env.example`, user-guide); no new UI

**Performance Goals**: ≥30% faster full analysis wall-clock on
`docker/fixtures/repos/large-repo` vs pre-change baseline (same host class);
zero false `calls` from these changes

**Constraints**: no depth modes; no timing UX/API; no extract DoD expansion;
timeouts + max-parallel caps remain; English artifacts; no foreign path
hardcodes

**Scale/Scope**: defaults + worker protocol + prebuilt hardening + chunk
policy; light skip audit; docs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution: `.specify/memory/constitution.md` (v1.4.12). Vision:
`specs/001-ods-vision/spec.md`.

| Requirement | Status |
| ------------- | -------- |
| VI. Detailed FR in child `026`, not inflated into `001` | ✅; `001` promotes active feature only |
| Scope in `001` before plan | ✅ — Draft / Next = `026` |
| Code only after plan/tasks | ✅ |
| Do not merge perf into extract DoD | ✅ — Non-goals |
| Do not casually reopen `010` as redesign | ✅ — extends knobs/spawn/packaging |
| English feature artifacts | ✅ |
| Surgical changes under `specs/026-parser-pipeline-perf/` | ✅ |
| No foreign product/repo names in tracked artifacts | ✅ — `large-repo` only |
| Native modular parsers / host per stack (`018`) | ✅ |

**Post-design:** research + data-model + contracts + quickstart below; no
Constitution violations (Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/026-parser-pipeline-perf/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── scale-knobs.md
│   ├── parser-worker-protocol.md
│   └── prebuilt-hot-path.md
└── tasks.md                 # via /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── config.ts                              # default max parallel 4; chunk knobs
│   └── services/
│       ├── analysis-orchestrator.service.ts   # worker session per parser_id
│       ├── analysis-file-chunks.ts            # tiny-last-chunk merge
│       └── parser-worker-session.ts           # NEW: stdin NDJSON session
└── tests/
    ├── unit/
    └── integration/

parsers/
├── _common/require-prebuilt.sh                # shared ANALYSIS_REQUIRE_PREBUILT gate
├── */run.sh | run.mjs                         # source gate; refuse silent source-build when required
├── csharp/ (+ other *dotnet*)                 # --ods-worker support (priority)
├── typescript/                                # --ods-worker support (priority)
├── java/ (+ heavy JVM modules as needed)      # --ods-worker support (priority)
└── */manifest.json                            # supports_ods_worker (no per-parser chunk in DoD)

docker/
├── .env.example                               # document parallel + chunk knobs
└── Dockerfile / compose                       # ensure prebuild; no hot-path build

ods-help/user-guide/                           # document defaults + when to raise
```

**Structure Decision**: Extend existing backend orchestrator and parser
entrypoints; no new top-level app. Frontend unchanged (timing UX out).

## Complexity Tracking

> No constitution violations requiring justification.
