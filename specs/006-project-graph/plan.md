# Project plan: Project graph  canon, ingest, UI

**Vetka**: `006-project-graph` | **Date**: 2026-07-09 | **Spec**: [spec.md]

**Input**: `specs/006-project-graph/spec.md`  ingest, ES indexes, API of the column, UI

**Dependency**:

- `specs/001-ods-vision/spec.md`  stage 5
- `specs/002-domain-model/spec.md`  project, tree, DELETE, OpenAPI canon
- `specs/003-portal-mvp/spec.md`  replace `GraphStubPage`
- `specs/005-code-analysis/spec.md`  ** data blocker**: envelope in `ods-parser-envelopes`

## Summary

Extension of the backend (**TypeScript / Node.js 20 / Fastify**) and the frontend (`003`):
**ingest pipeline** converts the envelope of the parser (`005`) through the adapters on `parser_id`**
canonical nodes/rebars in the **Elasticsearch** (`ods-graph-nodes`, `ods-graph-edges`).
REST API  reading the column by file and subgraph; UI `/graph`  list of nodes + simple
The connection diagram (without React Flow). Ingest is automatically run after saving
envelope (`005`); increment  point updating/removing on `path`.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS

**Primary Dependencies**: Fastify 4, `@elastic/elasticsearch` 8, `zod`, `uuid`, `pino`

**Storage**: Elasticsearch 8.x  **new** indexes `ods-graph-nodes`, `ods-graph-edges`
(see [contracts/elasticsearch-indices.md]
**reads** `ods-parser-envelopes`, `ods-analysis-runs` (`005`); does not duplicate their schemes

**Testing**: Vitest  unit of adapters ingest; integration  envelope fixture → canon in ES;
e2e  analysis (`005`) → ingest → `/graph` UI

**Target Platform**: Docker Compose profile `full`

**Project Type**: Backend services + frontend extension

**Performance Goals**: SC-001  ingest + UI < 10 s after envelope (pilot); SC-003
ingest -50% vs complete reassembly at ≤5% of files

**Constraints**: The orchestrator `005` does not parse `model`; one adapter on `parser_id`;
localized messages (portal i18n); API page (limit ≤100)

**Scale/Scope**: Pilot; 4 adapters (sync with parser `005`); up to ~ 50k nodes / project (pilot objective)

## Constitution Check

*GATE: before Phase 0 and after Phase 1.*

| The requirement | The status |
|------------|--------|
| VI. Detailed specs `006`, not in `001` | ✅ |
| TypeScript backend | ✅ |
| ES metadata, individual indices | ✅ `ods-graph-*` |
| The border with `005` | ✅ ingest only in `006` |
| Replace the column headings with `003` | ✅ `contracts/graph-ui.md` |
| Code after plan/tasks | ✅ |
| Delete the cascade | ✅ + `005` T057 |

**Post-design:** [contracts/ingest-pipeline.md](./contracts/ingest-pipeline.md),
[contracts/elasticsearch-indices.md](./contracts/elasticsearch-indices.md),
[contracts/openapi-graph.yaml](./contracts/openapi-graph.yaml) are recorded.

## Project Structure

### Documentation (this feature)

```text
specs/006-project-graph/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── elasticsearch-indices.md    # ods-graph-nodes, ods-graph-edges
│ ── ingest-pipeline.md # contract ingest + adapters
│ ── canonical-schemas.json # JSON Schema of the node/rebar
│ ── openapi-graph.yaml # REST reading of the graph
│ ── graph-ui.md # replacing GraphStubPage
└── tasks.md                        # /speckit-tasks
```

### Source Code

```text
backend/
├── src/
│   ├── domain/
│   │   ├── graph-node.ts
│   │   └── graph-edge.ts
│   ├── repositories/
│   │   ├── graph-node.repository.ts
│   │   └── graph-edge.repository.ts
│   ├── services/
│   │   ├── ingest/
│   │   │   ├── ingest.service.ts
│   │   │   ├── ingest-registry.service.ts
│   │   │   ├── types.ts              # IngestAdapter, IngestContext
│   │   │   └── adapters/
│   │   │       ├── typescript.ingest.ts
│   │   │       ├── csharp.ingest.ts
│   │   │       ├── python.ingest.ts
│   │   │       └── cpp.ingest.ts
│   │   └── analysis-orchestrator.service.ts  # hook: After envelope → ingest
│   └── api/routes/
│       └── graph.ts                  # /projects/:id/graph/*
├── tests/
│   ├── unit/ingest/
│   └── integration/graph-ingest.test.ts

frontend/
├── src/
│ ── pages/GraphPage.tsx # replacing GraphStubPage
│   ├── components/graph/
│   │   ├── NodeList.tsx
│   │   ├── EdgeTable.tsx
│   │   └── FileGraphPanel.tsx
│   └── api/graph.ts
```

**Structure Decision:** Ingest and API in `backend/`; UI  extension `frontend/` (`003`).

## Integration with `005` / `002` / `003`

| The Aspect | The source | `006` |
|--------|----------|-------|
| Input of ingest | `ods-parser-envelopes` | Read the envelope + `model` |
| The Prong | `ods-analysis-runs` | `analysis_run_id`, latest run |
| The tree | `ods-elements` | resolve `element_id` on `path` |
| DELETE | `002` FR-013 + `005` T057 | + `ods-graph-nodes/edges` |
| UI stub | `003` `/graph` | `GraphPage` by `graph-ui.md` |
| Starting the analysis | `005` API | Not provided |

## The phases of implementation (logical)

### A  index + ingest TS + hook

- bootstrap `ods-graph-nodes`, `ods-graph-edges`
- `IngestService`, adapter `typescript`
- Hook from `005` orchestrator after save envelope

### B  File reading API

- `GET .../graph/files/{path}/dependencies`
- resolve latest `analysis_run_id`

### The C  UI `/graph`

- Replacing `GraphStubPage`

### Increement D  incremental ingest

- delete_by_path + upsert for change set

### EG  C#, Python, C++ adapters

- synchronous with the parser `005`

## Complexity Tracking

There's no violation of the Constitution.
