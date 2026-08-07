# Implementation plan: System landscape (009)

**Branch**: `009-system-landscape` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Entrance**: `specs/009-system-landscape/spec.md` — system-layer in the Canon ES,
`artifacts[]` detector, 5+1 parsers, UI-filter layer (clarify 2026-07-14)

**Dependencies**:

- `specs/001-ods-vision/spec.md` — stage 8
- `specs/005-code-analysis/spec.md` — detector, Orchestrator, envelope
- `specs/006-project-graph/spec.md` — Canon, ingest, `ods-graph-*`
- `specs/007-portal-scale-ux/spec.md` - graph search/view
- `specs/008-code-graph-depth/spec.md` — pattern `metadata.layer`

## Summary

Platform extension **system-landscape**: detector complements language report
array **`artifacts[]`** (apart from `languages[]`); Orchestrator spawn
system-parsers in the same `analysis_run_id`; ingest writes the nodes/edges
`metadata.layer=system` to the same indexes. MVP-parsers: `compose`, `appsettings`,
`openapi`, `dotnet-project`, bus (`bus-rabbit` / `bus-kafka` detector
selects one to spawn; tie-break → Rabbit). UI: filter `code` | `system` |
`all` on the "Graph". Canvas, `path prefix` — out MVP.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend, TS-parsers compose/
openapi/appsettings); C# / .NET 8 (bus-rabbit, bus-kafka, dotnet-project) —
subprocess as `005`/`008`

**Primary Dependencies**: existing Fastify + ES; `yaml` (compose/openapi);
`@apidevtools/swagger-parser` or `js-yaml` + minimum validation OpenAPI;
Roslyn for bus/dotnet (reuse toolchain `parsers/csharp`);
Vitest + integration spawn

**Storage**: Elasticsearch — the same `ods-graph-nodes` / `ods-graph-edges` /
`ods-parser-envelopes`; extension mapping `ods-language-reports` nested
`artifacts[]` (bootstrap migration additive)

**Testing**: unit detector artifacts, bus tie-break, ingest adapters;
integration — fixture mini-monorepo → envelopes → ingest → GET graph +
layer filter; regression code-only fixture `008`

**Target Platform**: Docker Compose profile `full` (`docker/`)

**Project Type**: Parser modules (`parsers/*`) + backend (detector, orchestrator,
ingest) + frontend (layer filter, i18n system edge labels)

**Performance Goals**: SC-001/002 — ≥10 system nodes, ≥8 edges on fixture;
filter switching ≤2 C; detector artifacts no full AST

**Constraints**: All repo in MVP; not to break `languages[]` UX; one bus spawn;
databases can only `appsettings` parser; i18n labels of edges in UI;
filter layer `code`/`system`/`all` in MVP — **client-only** (without `layer`
query in graph API); modal Windows 1 — summary `artifacts[]` (see
`contracts/detector-artifacts.md`)

**Scale/Scope**: Pilot; 6 parser_id (4 infra + 2 bus, spawn 1 bus); system kinds
from C02; a standard `docker/fixtures/repos/system-landscape-demo/` (create implement)

## Constitution Check

*GATE: to Phase 0 after Phase 1.*

| Requirement | Status |
|------------|--------|
| VI. Detailed Spec `009` not FR in `001` | ✅ |
| TypeScript backend + modular parsers CLI | ✅ |
| ES metadata, one Canon `ods-graph-*` | , without new graph indexes |
| Extension scope reflected in `001` | ✅ (stage 8) |
| Draft/json-model → contracts | ✅ |
| Code after plan/tasks | ✅ |
| Language policy (constitution) | ✅ |
| Without canvas (`010`) / auth / RAG | ✅ |

**Post-design:** research + data-model + contracts + quickstart; no violations.

## Project Structure

### Documentation (this feature)

```text
specs/009-system-landscape/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── detector-artifacts.md
│   ├── detector-rules.md
│   ├── ingest-system-layer.md
│   ├── canonical-edge-types-system.md
│   ├── canonical-node-system.schema.json
│   ├── canonical-edge-system.schema.json
│   ├── native-*.schema.json          # P01–P07
│   └── _shared.schema.json
└── tasks.md                          # /specit-tasks
```

### Source Code

```text
backend/
├── src/
│   ├── domain/
│   │   ├── language-report.ts        # + ArtifactEntry, artifacts[]
│   │   ├── graph-node.ts             # + system NodeKind union
│   │   └── graph-edge.ts             # + system EdgeType union
│   ├── services/
│   │   ├── language-detector.service.ts   # + artifact scan, bus signals
│   │   ├── analysis-orchestrator.service.ts # spawn artifacts[] + languages[]
│   │   ├── change-set.service.ts          # paths for artifact types
│   │   └── ingest/
│   │       ├── adapters/
│   │       │   ├── compose.ingest.ts
│   │       │   ├── appsettings.ingest.ts
│   │       │   ├── openapi.ingest.ts
│   │       │   ├── dotnet-project.ingest.ts
│   │       │   ├── bus-rabbit.ingest.ts
│   │       │   └── bus-kafka.ingest.ts
│   │       └── ingest-registry.service.ts
│   ├── infra/elasticsearch.ts        # language-reports mapping artifacts
│ └── api/routes/graph.ts # without layer query in MVP (client-side filter)
├── config/detector-rules.json # artifact triggers (or backend/src)
└── tests/
    ├── unit/language-detector-artifacts.test.ts
    ├── unit/ingest/system-*.test.ts
    └── integration/system-landscape-*.test.ts

parsers/
├── compose/          # manifest + run.mjs (yaml parse)
├── appsettings/      # run.mjs (json + .env)
├── openapi/          # run.mjs (yaml openapi)
├── dotnet-project/ # .NET CLI or run.sh
├── bus-rabbit/       # Roslyn + config heuristics
└── bus-kafka/

frontend/
├── src/pages/GraphPage.tsx           # layer filter control (client-side)
├── src/components/analysis/LanguagesConfirmModal.tsx  # + artifacts summary
├── src/i18n/ru.ts                    # SYSTEM_EDGE_TYPE_LABELS + artifact labels

docker/fixtures/repos/system-landscape-demo/   # mini-monorepo SC-001
```

**Structure Decision:** Expanding `005`/`006`/`007`/`008⟪` , without a new index
count; system-parsers — new directory `parsers/<id>/` contract manifest.
Detector rules — Config + unit-tests (not hardcode only in service).

## Complexity Tracking

> There are no constitutional violations that require justification.

## Phase 0 — Research

Cm. [research.md](./research.md): `artifacts[]`, bus tie-break, ingest id,
cross-parser linking (service↔openapi), incremental paths.

## Phase 1 — Design

- [data-model.md](./data-model.md) — ArtifactEntry, system NodeKind/EdgeType
- [contracts/](./contracts/) — detector, ingest, JSON schemas
- [quickstart.md](./quickstart.md) — a pilot test SC-001–SC-005

## Implementation increments (for tasks)

| Increment | Content | Blocker |
|-----------|------------|--------|
| **A** | `artifacts[]` ES + domain + detector + orchestrator spawn + modal artifacts summary (window 1) | — |
| **B** | Canon: `graph-node`/`graph-edge` system types + `layer` ingest helper | A |
| **C** | Parsers `compose` + `appsettings` + ingest | B |
| **D** | Parsers `openapi` + `dotnet-project` + ingest | C |
| **E** | `bus-rabbit` + `bus-kafka` parsers + detector bus choice + ingest | C |
| **F** | UI layer filter (client-only) + i18n system edge/artifact labels | B (can be used in parallel D) |
| **G** | Fixture `system-landscape-demo` + integration SC-001/003/004 | C–F |
| **H** | json-model `implementation_status: done` + polish | G |

**Checkpoint:** after G — quickstart §1–§6 green; code-only regression `008`.
