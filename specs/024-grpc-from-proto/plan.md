# Implementation Plan: gRPC from protobuf (+ .NET HTTP clients)

**Branch**: `024-grpc-from-proto` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/024-grpc-from-proto/spec.md`
(clarify locked: dedicated `grpc_method` node kind; reuse `exposes` /
`http_calls` / `documents` with `metadata.protocol=grpc`; .NET HTTP MUST =
HttpClient static URL/path + typed/generated clients when resolvable).

**Dependencies**:

- `specs/001-ods-vision/spec.md` — active `024`; capability table split HTTP vs gRPC
- `specs/005-code-analysis/` — detector, registry, orchestrator, envelope
- `specs/006-project-graph/` — Canon ingest indexes
- `specs/009-system-landscape/` — system layer baseline; Phase 2 gRPC deferred
- `specs/013-api-routes-from-code/` / `specs/014-graph-view-ux/` — HTTP
  surface + `http_calls` UX parity (data only for gRPC; no UX rewrite DoD)
- `specs/018-parser-extension-playbook/` — artifact-module checklist
- `specs/019-spring-system-landscape/` — gRPC deferred there → this feature

**Out of this plan**: parser pipeline perf (`025` draft); Python/C++ clients;
RSocket/SOAP/AsyncAPI; rewriting existing HTTP extract modules.

## Summary

Deliver **system-layer gRPC landscape** and close the **.NET HTTP client** gap
without rewriting OpenAPI / `*-api-routes` / `ts-http-calls` / `java-http-calls`:

| Module | Role | Canon |
| -------- | ------ | -------- |
| `grpc-proto` | Parse `.proto` → RPC methods | nodes `grpc_method` + `documents` (+ `exposes` when service match) |
| `ts-grpc-calls` | Static TS gRPC client binds | `http_calls` → `grpc_method`, `protocol=grpc` |
| `java-grpc-calls` | Static Java stub/channel binds | same |
| `dotnet-grpc-calls` | Static .NET gRPC client binds | same |
| `dotnet-http-calls` | .NET outgoing HTTP clients | `http_calls` → `http_endpoint` / `external_api` (HTTP; no new kinds) |

**Canon rule (clarify):** new **node** kind `grpc_method` for clean separation
from HTTP; **edge** types stay existing (`exposes`, `documents`, `http_calls`)
with `metadata.protocol = "grpc"` on gRPC edges. Bus `rpc_handles` unchanged
and not used for protobuf/gRPC.

Prove DoD on an **ODS-owned** multi-stack fixture (`.proto` + TS/Java/.NET
gRPC call-sites + ≥1 .NET HTTP client call). System Graph view consumes Canon
as today, plus protocol-family filtering in system `graph-view` (`all`, `http`,
`grpc`, `rpc/bus`) for mixed-transport readability.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend detector/ingest;
`grpc-proto` + `ts-grpc-calls` CLIs); Java 17+ (JavaParser-style tooling for
`java-grpc-calls`, separate catalog from `parsers/java`); .NET 8+ (Roslyn /
existing DotnetApiRoutes patterns for `dotnet-grpc-calls` +
`dotnet-http-calls`)

**Primary Dependencies**: existing Fastify + ES ingest registry; protobuf text
parse (lightweight `.proto` AST — no full codegen); Vitest; JUnit / xUnit as
per stack module; Docker image already has Node + JDK + .NET for other parsers

**Storage**: same `ods-graph-nodes` / `ods-graph-edges` /
`ods-parser-envelopes`; `metadata.layer=system`; extend `NodeKind` enum with
`grpc_method` only (no new edge enum values)

**Testing**: unit extract + ingest adapters; detector rules; fixture
end-to-end spawn→ingest→system Graph assert; regression smoke on existing
TS/Java HTTP paths + `dotnet-api-routes`

**Target Platform**: Docker Compose `--profile full`

**Project Type**: 5 new artifact CLI parsers + detector rules + ingest
adapters + ODS fixture; thin Graph kind allow-list if required; no new Graph
product

**Performance Goals**: fixture analysis within existing parser timeouts;
skip unresolved without failing the run; **no** `025` worker/chunk redesign
in this feature (native host per stack only)

**Constraints**: do not rewrite OpenAPI / Feign / existing HTTP modules;
no inventing methods without `.proto`; no multi-repo binds; English artifacts;
anti–dogfood heuristics

**Scale/Scope**: 5 `parser_id`s; 1 ODS multi-module fixture covering three
gRPC client stacks + .NET HTTP; optional SHOULD external pilot smoke

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution: `.specify/memory/constitution.md` (v1.4.6). Vision:
`specs/001-ods-vision/spec.md`.

| Requirement | Status |
| ------------- | -------- |
| VI. Detailed FR in child `024`, not inflated into `001` | ✅; `001` promotes active feature + capability rows only |
| Scope in `001` before implement | ✅ — already promoted 2026-07-28 |
| Modular CLI parsers (`018`), not language-symbol merge | ✅ — five artifact modules |
| Single Canon ES indexes | ✅ — `grpc_method` node enum only |
| No merge of pipeline perf (`025`) into extract DoD | ✅ — Non-goals / Related |
| Code only after plan/tasks | ✅ |
| English feature artifacts | ✅ |
| Surgical changes under `specs/024-grpc-from-proto/` | ✅ |

**Post-design:** research + data-model + contracts + quickstart below; no
Constitution violations (Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/024-grpc-from-proto/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   ├── native-grpc-proto.schema.json
│   ├── native-grpc-calls.schema.json
│   ├── native-dotnet-http-calls.schema.json
│   ├── ingest-grpc-proto.md
│   ├── ingest-grpc-calls.md
│   ├── ingest-dotnet-http-calls.md
│   └── fixture-grpc-multistack.md
└── tasks.md                 # /speckit-tasks (not this step)
```

### Source Code (repository root)

```text
parsers/
├── grpc-proto/              # .proto → methods (Node)
├── ts-grpc-calls/           # TS client binds
├── java-grpc-calls/         # Java client binds
├── dotnet-grpc-calls/       # .NET gRPC client binds
└── dotnet-http-calls/       # .NET HTTP clients → http_calls

backend/src/
├── config/detector-rules.json          # + artifact rules
├── domain/graph-node.ts                # + grpc_method
├── services/ingest/adapters/           # 5 adapters (or shared grpc-calls)
└── services/ingest/ingest-registry…    # register adapters

docker/fixtures/repos/
└── grpc-multistack-demo/               # ODS-owned DoD fixture

frontend/                               # only if Graph kind filter must allow grpc_method
```

**Structure Decision**: follow `013`/`014`/`019` artifact-module pattern;
keep language parsers untouched.

## Complexity Tracking

> Empty — no Constitution violations requiring justification.
