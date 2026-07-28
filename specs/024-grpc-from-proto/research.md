# Research: 024-grpc-from-proto

**Date**: 2026-07-28  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## R1 — Node kind for RPC methods

**Decision:** Add system node kind **`grpc_method`** (one node per
`package.Service/Method` from `.proto`). Do **not** reuse `http_endpoint` as a
proxy for gRPC methods. Set `metadata.protocol = "grpc"` (and
`metadata.layer = "system"`). `signature` / `qualified_name` carry the full
gRPC method name (schema already anticipated “gRPC full name” on system
nodes).

**Rationale:** Clarify preference for clean separation at the **node** layer
while keeping HTTP endpoint semantics intact for OpenAPI/code routes. Matches
FR-003.

**Alternatives considered:** Reuse `http_endpoint` + protocol metadata only
(rejected — conflates HTTP path/method with RPC FQN); add both `grpc_service`
and `grpc_method` kinds (deferred — service grouping via `exposes` to existing
`service` / module hints is enough for DoD).

## R2 — Edge types for gRPC

**Decision:** Reuse existing edges only:

| Edge | From → To | When |
|------|-----------|------|
| `documents` | contract anchor (`.proto` path / synthetic id) → `grpc_method` | always for extracted methods |
| `exposes` | `service` (or resolvable module→service) → `grpc_method` | when service match unambiguous |
| `http_calls` | caller service/code anchor → `grpc_method` | static gRPC client bind |

All gRPC edges MUST set `metadata.protocol = "grpc"`. HTTP `http_calls` from
`dotnet-http-calls` omit gRPC protocol (or set `protocol=http` if already
common). **No** new edge enum values (`grpc_calls`, `exposes_rpc`, …).

**Rationale:** FR-004; preserves Graph UX vocabulary from `014` while allowing
filter by protocol metadata later. Does not require pipeline-perf work.

**Alternatives considered:** New `grpc_calls` / `exposes_rpc` (cleaner labels,
more schema/UI churn — rejected for this feature); overload `rpc_handles`
(rejected — bus RPC role, FR-011).

## R3 — `.proto` parser vs codegen

**Decision:** `grpc-proto` parses **source `.proto` text** only (services +
`rpc` methods; unary and streaming methods listed equally; no deep streaming
semantics). Generated stubs are **not** used to invent server surface. Client
modules MAY use stub type names / package paths as resolution hints toward
existing `grpc_method` ids.

**Rationale:** Spec assumptions; avoid build-tool / codegen DoD.

**Alternatives considered:** Require `protoc` in the image; parse only
generated Java/C# stubs for surface (rejected — invent risk without `.proto`).

## R4 — Client bind resolution (TS / Java / .NET)

**Decision:** Three separate artifact parsers (`ts-grpc-calls`,
`java-grpc-calls`, `dotnet-grpc-calls`) following `*-http-calls` modularity.
Emit native `calls[]` with target FQN (`package.Service/Method` or
`/package.Service/Method`). Ingest resolves to `grpc_method` id; on ambiguity
or missing surface → **skip** (no edge, run continues).

DoD fixture MUST include ≥1 resolvable call-site per stack. Exact stub APIs
for extract:

| Stack | MUST patterns (DoD) |
|-------|---------------------|
| TS | Generated client / `@grpc/grpc-js` style call where service+method names are statically visible |
| Java | Generated `*Stub` / `*BlockingStub` method invoke with unique in-project target |
| .NET | Generated client / `Grpc.Net.Client` call with unique service+method |

**Rationale:** FR-005/FR-006; parity with HTTP skip policy; `018` separation
from language symbols.

**Alternatives considered:** One mega multi-language parser (rejected);
semantic full channel graph (out of DoD).

## R5 — .NET HTTP clients (`dotnet-http-calls`)

**Decision:** New artifact module mirroring `ts-http-calls` / `java-http-calls`.
MUST extract statically resolvable:

1. `HttpClient` (or `HttpRequestMessage`) with literal / const URL or path
2. Typed/generated clients (Refit interface methods, NSwag-like generated
   clients) when method→path is statically known

Target id resolution: prefer existing `http_endpoint` from
`dotnet-api-routes` / OpenAPI; else `external_api` when URL is absolute
external; else skip. Edge type `http_calls`, `metadata.layer=system`, HTTP
protocol (not `grpc`).

**Rationale:** FR-007; closes capability gap without new HTTP kinds.

**Alternatives considered:** Only raw `HttpClient` (too narrow vs Feign
parity); only Refit (too narrow).

## R6 — Detector rules

**Decision:** Add `artifacts[]` rules (do not classify OpenAPI as gRPC):

| artifact_type / parser_id | Detection |
|---------------------------|-----------|
| `grpc-proto` | `**/*.proto` (and optional content `service ` + `rpc `) |
| `ts-grpc-calls` | `.ts`/`.tsx` + hints (`@grpc/grpc-js`, `*Client`, `.proto` sibling / generated grpc paths) |
| `java-grpc-calls` | `.java` + hints (`BlockingStub`, `grpc.`, generated stub packages) |
| `dotnet-grpc-calls` | `.cs` + hints (`Grpc.Net.Client`, `*Grpc` client types) |
| `dotnet-http-calls` | `.cs` + hints (`HttpClient`, `Refit`, `IHttpClientFactory`) — distinct from routes |

Spawn only when `file_count > 0` and status available. Empty → skipped.

**Rationale:** FR-001 / US4; avoid false gRPC landscape.

**Alternatives considered:** Spawn gRPC clients whenever any `.cs` exists
(too noisy).

## R7 — Stable ids

**Decision:**

- `grpc_method` id: `grpc-proto:grpc_method:{package}.{Service}/{Method}`
  (normalize leading `/`; case-sensitive as in proto)
- `documents` id: `grpc-proto:documents:{proto_path}|{method_key}`
- `exposes` id: `{service_parser}:exposes:{service_id}|{method_id}` (or
  `grpc-proto:exposes:…` when service synthetic)
- gRPC client `http_calls` id: `{parser_id}:http_calls:{from}|{method_key}`
- .NET HTTP `http_calls`: same pattern as `ts-http-calls` /
  `java-http-calls` adapters

**Rationale:** Align with `009`/`013`/`014` id style; deterministic cross-parser
docking.

**Alternatives considered:** Hash-only ids (harder to debug); ES lookup at
transform time (avoid — prefer pure id compute like R7 in `014`).

## R8 — Graph view / UI

**Decision:** No new Graph product. Ensure `grpc_method` is accepted in
backend domain + any frontend kind allow-lists / icon maps so nodes are not
dropped. Label via `name` / `qualified_name`. Protocol filter / legend —
out of DoD (color legend still deferred).

**Rationale:** FR-010; Assumptions in spec.

**Alternatives considered:** Full UX rewrite for protocol filters (rejected).

## R9 — Fixture layout

**Decision:** ODS-owned `docker/fixtures/repos/grpc-multistack-demo/` with:

- shared `proto/` (or `contracts/`) `.proto` with ≥1 service + ≥1 method
- `ts-client/`, `java-client/`, `dotnet-client/` each with one static gRPC call
- `dotnet-http/` (or same .NET project) with ≥1 HttpClient or Refit call to a
  known in-fixture HTTP route / external path

Synthetic names only (no foreign product paths).

**Rationale:** FR-009; anti–dogfood.

**Alternatives considered:** Three separate fixtures (heavier CI); external
pilot as sole DoD (forbidden).

## R10 — Relationship to pipeline perf (deferred)

**Decision:** Document only: new modules use native hosts (Node / JVM /
.NET). No long-lived workers, chunk policy changes, or symbols-fast modes in
`024` tasks. Pipeline perf lives in unnumbered
`ods-help/requirements/parser-pipeline-perf-draft.md` (not part of `024`).

**Rationale:** Constitution / `001` next-step split; FR non-goals.
