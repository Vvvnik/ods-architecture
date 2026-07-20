# Implementation plan: Graph depth code- (008)

**Branch**: `008-code-graph-depth` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Entrance**: `specs/008-code-graph-depth/spec.md` — native v2, calls, injects (C#),
compatible ingest v1 (clarify 2026-07-14)

**Dependencies**:

- `specs/001-ods-vision/spec.md` — stage 7
- `specs/005-code-analysis/spec.md` — parsers envelope, the Orchestrator
- `specs/006-project-graph/spec.md` — Canon, ingest, indexes `ods-graph-*`
- `specs/007-portal-scale-ux/spec.md` — search/browse ribs (no new UI)

## Summary

Extension **parsers** TypeScript and C# to native model **v2** (`usages[]` with
`calls`; C# still `injects`) and **ingest** shared symbols-adapter to
`schema_version` 1+2: rib `calls`/`injects` in `ods-graph-edges` new
documents `metadata.layer=code`. The Orchestrator/UX `005` and UI count `007` no
are changed by contract. Python/C++, `creates`/`references`, system-layer outside MVP.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend, TS-parser); C# / .NET
(Roslyn) for `parsers/csharp` — how `005`

**Primary Dependencies**: existing TS Compiler API; Roslyn / SemanticModel
for calls+DI; Fastify + ES ingest (`006`); Vitest

**Storage**: Elasticsearch — the same `ods-graph-nodes` / `ods-graph-edges` /
`ods-parser-envelopes` (without new indexes)

**Testing**: unit — extract calls/injects (fixtures), ingest v1 regression + v2
usages→edges; integration — parser CLI → envelope v2 → ingest → GET edges/
search; parser integration as `csharp-parser` / orchestrator

**Target Platform**: Docker Compose profile `full` (`docker/`)

**Project Type**: Parser modules + backend ingest extension (frontend no
mandatory changes)

**Performance Goals**: SC-001/002 — 100% pilot fixture; run falls
on presolve (SC-005); without the hard cap calls file (research R8)

**Constraints**: average run TS/C# → always v2; the ambiguity → no edge;
no new UI; no system/`009`; Russian message Orchestrator without changing UX

**Scale/Scope**: Pilot; 2 language v2; types of ribs MVP: `calls`, `injects`; target
the volume `006` (~50k nodes)

## Constitution Check

*GATE: to Phase 0 after Phase 1.*

| Requirement | Status |
|------------|--------|
| VI. Detailed Spec `008` not FR in `001` | ✅; stage focus in `001` updated |
| TypeScript backend + modular parsers | ✅ |
| ES metadata, one Canon `ods-graph-*` | , without new indexes |
| Extension scope in `001` to plan | ✅ (`008` = next) |
| Draft , canon | ✅ → `spec.md` + contracts |
| Code after plan/tasks | ✅ |
| Russian language of artifacts | ✅ |
| Without canvas / system / auth / RAG | ✅ |

**Post-design:** research + data-model + contracts + quickstart below; violations
the Constitution does not (Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/008-code-graph-depth/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│ ├── native-symbols-v2.schema.json # N02 canon for implementation
│   ├── canonical-edge-types.md         # EdgeType + injects + layer
│ └── ingest-symbols-v2.md # mapping usages → Canon, dual v1/v2
tasks.md⟫ # /specit-tasks (not this step)
```

### Source Code

```text
parsers/
├── typescript/
│   ├── run.mjs                         # schema_version 2, usages calls
│   └── manifest.json                   # schema_version "2"
├── csharp/
│   ├── Ods.CSharpParser/
│   │   ├── CSharpExtractor.cs          # calls + ctor injects
│   │   ├── Program.cs                  # SchemaVersion = "2"
│   │   └── Models.cs                   # Usage DTOs
│   └── manifest.json

backend/
├── src/
│ ├── domain/graph-edge.ts # + injects in EdgeType
│   └── services/ingest/
│       ├── types.ts                    # isEdgeType + injects
│       ├── adapters/symbols-model.ingest.ts     # dual v1/v2 + usages + layer
│       ├── adapters/typescript.ingest.ts
│       └── adapters/csharp.ingest.ts
└── tests/
    ├── fixtures/ingest/                # + typescript/csharp model v2, envelopes
    ├── unit/ingest/                    # v2 usages → calls/injects; v1 regress
    └── integration/                    # parser→ingest calls; ambiguous skip

# Optional (pilot sources)
backend/tests/fixtures/parsers/ # or parsers/*/fixtures/
├── csharp-calls/                       # Create → Save (+ DI)
└── typescript-calls/                   # unambiguous call
```

**Structure Decision:** Expanding existing modules `parsers/` and shared
symbols ingest (`006`/`005`); a separate package or a new index is introduced.
Frontend — only manual verification via `007` (quickstart).

## Complexity Tracking

> There are no constitutional violations that require justification.
