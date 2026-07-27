# Implementation Plan: Java language schema v2 (calls)

**Branch**: `023-java-calls` | **Date**: 2026-07-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/023-java-calls/spec.md`
(clarify 2026-07-27: instance+static calls; all methods on top-level types;
cross-module; multi-module ODS fixture; interface→interface method symbol;
anti–dogfood heuristics).

**Dependencies**:

- `specs/001-ods-vision/spec.md` — promote deferred Java v2 `calls` into active roadmap
- `specs/008-code-graph-depth/` — native v2 / `calls` / ambiguous skip / ingest dual v1+v2
- `specs/018-parser-extension-playbook/` — Java language module MVP (v1 symbols)
- `specs/005-code-analysis/` — envelope / orchestrator (unchanged UX)
- `specs/006-project-graph/` — Canon ingest indexes
- `specs/007-portal-scale-ux/` — graph search (no new UI)

## Summary

Extend the existing **`parsers/java`** module from native symbols **v1**
(packages/types) to **v2**: emit **all methods** on top-level production types
and semantic **`usages[]`** of type **`calls`** (instance + static; unique
in-project resolution including cross-module; interface/abstract receivers →
interface/abstract method symbol only). Reuse the shared symbols ingest adapter
already registered for `java` with `supported_schema_versions: ['1','2']` —
no new edge types, indexes, or portal screens. Prove DoD on an **ODS-owned
multi-module** fixture; keep HTTP/system modules (`019`) untouched; forbid
pilot-specific path/name heuristics.

## Technical Context

**Language/Version**: Java 17+ (parser module / Maven); TypeScript 5.x / Node 20
(backend ingest tests only)

**Primary Dependencies**: existing `javaparser-core` (+ **JavaSymbolSolver** /
`javaparser-symbol-solver-core` for unique method resolution); Gson; shared
`createSymbolsModelIngestAdapter('java', 'java')`; Vitest for backend fixtures

**Storage**: Elasticsearch — same `ods-graph-nodes` / `ods-graph-edges` /
`ods-parser-envelopes` (no new indexes)

**Testing**: JUnit — method symbols + calls extract (unique / ambiguous /
interface / cross-module / test-path skip); Vitest — Java envelope v1 regression
+ v2 usages→`calls`; optional CLI → ingest smoke

**Target Platform**: Docker Compose profile `full` (`docker/`)

**Project Type**: Parser module extension + fixture + thin ingest fixture/tests
(frontend unchanged)

**Performance Goals**: SC-001…006 on fixture / documented checks; skip
unresolved without failing the run; no hard per-file call cap (same stance
as `008`)

**Constraints**: Normal analysis run always emits Java `schema_version: "2"`;
ambiguous/unresolved → no edge; production `**/src/main/java/**` only; no
dogfood path/prefix heuristics; no HTTP/`http_calls`; no Java `injects` DoD;
no orchestrator UX change

**Scale/Scope**: One language (`java`) to v2 `calls`; one multi-module ODS
fixture; reuse `008` contracts (link + Java delta notes)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution: `.specify/memory/constitution.md`. Vision: `specs/001-ods-vision/spec.md`.
Feature artifacts — English (technical IT).

| Requirement | Status |
|-------------|--------|
| VI. Detailed FR in child `023`, not inflated into `001` | ✅; `001` only promotes deferred backlog → active feature row |
| TypeScript backend + modular parsers | ✅ — extend `parsers/java` |
| ES metadata, one Canon `ods-graph-*` | ✅ — no new indexes; `metadata.layer=code` |
| Scope alignment in `001` before implement | ✅ — plan requires roadmap note update (tasks) |
| Code only after plan/tasks | ✅ |
| No canvas / auth / RAG / system HTTP in this feature | ✅ |
| Surgical artifacts under `specs/023-java-calls/` | ✅ |

**Post-design:** research + data-model + contracts + quickstart below; no
Constitution violations (Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/023-java-calls/
├── plan.md                 # This file
├── research.md             # Phase 0
├── data-model.md           # Phase 1
├── quickstart.md           # Phase 1
├── contracts/
│   ├── README.md           # Points at 008 native v2 + Java delta
│   ├── ingest-java-v2.md   # Dual v1/v2 emit; usages → calls
│   └── java-calls-fixture.md
└── tasks.md                # /speckit-tasks (not this step)
```

### Source Code (repository root)

```text
parsers/java/
├── pom.xml                          # + symbol-solver dependency
├── manifest.json                    # schema_version "2"
├── src/main/java/org/ods/parser/java/
│   ├── Main.java                    # schema_version "2"
│   ├── JavaExtractor.java           # methods + usages calls
│   └── (resolution helpers as needed)
└── src/test/java/...                # extract unit tests

docker/fixtures/repos/
└── java-calls-demo/                 # multi-module ODS-owned DoD fixture

backend/
├── tests/fixtures/ingest/
│   ├── java-model-v1.json           # existing regression
│   └── java-model-v2.json           # methods + usages calls
└── tests/unit/ingest/               # v2 → calls; v1 regress

# Unchanged on purpose
parsers/java-http-calls/             # HTTP — out of scope
parsers/_shared/java-spring/         # no dogfood hint changes for 023
frontend/                            # no mandatory UI work
```

**Structure Decision**: Extend existing `parsers/java` and shared symbols
ingest; add ODS-owned multi-module fixture; document contracts as Java delta
over `008` (do not fork the native v2 JSON Schema).

## Complexity Tracking

> No Constitution violations requiring justification.
