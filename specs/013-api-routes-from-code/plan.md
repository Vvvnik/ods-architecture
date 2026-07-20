# Implementation Plan: API routes from code (013 CP1)

**Branch**: `013-api-routes-from-code` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/013-api-routes-from-code/spec.md` — HTTP API from **code**
(TS Fastify-literals + C# controllers/minimal APIs) → `http_endpoint` system;
the uniqueness **service + method + path**; full path at a static prefix.
UX CP2 (`014`) outside scope.

**Dependencies**:

- `specs/001-ods-vision/spec.md` — stage 12
- `specs/005-code-analysis/spec.md` — modular parsers envelope, the Orchestrator
- `specs/006-project-graph/spec.md` — Canon ES, ingest
- `specs/009-system-landscape/spec.md` — system kinds/`exposes`, detector artifacts
- `specs/011-ods-graph-viewer/spec.md` + `012` — system interior shows
  `http_endpoint` (SYSTEM_INSIDE_KINDS); UI-RENAM not touch

## Summary

Two new **system**-parser (`ts-api-routes`, `dotnet-api-routes`): CLI →
native envelope → ingest → `http_endpoint` + `exposes` → compose `service`;
with a clear match — **optional metadata handler_*** (R6; **no** new
EdgeType to code-handler in CP1). The detector adds artifacts based on the signals
(Fastify/`MapGet`/`[HttpGet]`). Without merge with OpenAPI; without Python; without a second
the orchestrator. Standards: **ods-arch** (TS) + C#-fixture (controllers + Map*).

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (`ts-api-routes`, backend ingest);
C# / .NET 8 (`dotnet-api-routes`, Roslyn/toolchain as `parsers/csharp`)

**Primary Dependencies**: existing Fastify backend + ES; typescript
compiler API or lightweight regex/AST walk for Fastify-literals (decision
in research); Roslyn for C#; Vitest

**Storage**: the same `ods-graph-nodes` / `ods-graph-edges` / envelopes;
`metadata.layer=system`; id given service (R2). Node field `path` = path
**file source**; HTTP path store in `metadata.http_path` (+
`qualified_name` = `METHOD path`) — see `data-model.md`.

**Testing**: unit — extract + ingest + id/path; integration — spawn parsers →
ingest → `GET .../graph/view?focus=<service>`; regression compose/code `012`

**Target Platform**: Docker Compose `--profile full`

**Project Type**: Parser modules + backend detector/orchestrator/ingest
(frontend without mandatory changes to CP1)

**Performance Goals**: SC-001/002 — ≥1 endpoint on the standard for dig-in; parser
is incomplete semantic extract (literal routes only)

**Constraints**: code only as DoD; Fastify-literals / C# controllers+Map*;
uniqueness service+method+path; full path only with static prefix;
reuse registry `005`/`009`; audit "does not feature on the top"

**Scale/Scope**: 2 parser_id; pilot ods-arch + 1 C# fixture; Python/Express/Nest
Outside DoD

## Constitution Check

*GATE: to Phase 0 after Phase 1.*

| Requirement | Status |
|------------|--------|
| VI. Detailed Spec `013`, FR not `001` | ✅ |
| Scope in `001` (CP1 / `014` UX) | ✅ |
| Modular CLI-parsers, not inflating `typescript`/`csharp` | ✅ |
| One Canon ES `ods-graph-*` | ✅ |
| Russian UI/artifacts | ✅ |
| Code after plan/tasks | ✅ |
| Without the auth/RAG/docs product | ✅ |

**Post-design:** research + data-model + contracts + quickstart — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/013-api-routes-from-code/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── detector-api-routes.md
│   ├── native-ts-api-routes.schema.json
│   ├── native-dotnet-api-routes.schema.json
│   └── ingest-api-routes.md
└── tasks.md                          # /specit-tasks
```

### Source Code

```text
parsers/
├── ts-api-routes/          # manifest + run (Fastify literals)
└── dotnet-api-routes/      # manifest + run (controllers + Map*)

backend/
├── src/
│   ├── config/detector-rules…      # + artifact globs/signals
│   ├── services/
│   │   ├── language-detector…      # artifacts ts-api / dotnet-api
│   │   └── ingest/adapters/
│   │       ├── ts-api-routes.ingest.ts
│   │       └── dotnet-api-routes.ingest.ts
│   └── services/graph-view…        # without changing UX; http_endpoint already inside
└── tests/
    ├── unit/ingest/
    └── integration/

docker/fixtures/repos/
├── ods-arch/ # Etalon TS (already have)
└── api-routes-csharp-demo/ # create: controller + MapGet (+ compose)
```

**Structure Decision**: extension of an existing tree `parsers/` + ingest
adapters + detector; new C#-fixture; frontend CP1 not required.

## Complexity Tracking

> There are no constitutional violations that require justification.
