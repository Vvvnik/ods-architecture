# Feature Specification: gRPC from protobuf (+ .NET HTTP clients)

**Feature Branch**: `024-grpc-from-proto`

**Created**: 2026-07-28

**Status**: ✅ Closed (2026-07-28)

**Input**: User description: "Implement `024-grpc-from-proto` from
`ods-help/requirements/024-grpc-from-proto-draft.md`: one language-agnostic
protobuf/gRPC surface extract; gRPC client→RPC binds for TS, Java, and .NET;
`dotnet-http-calls` HTTP client parity with TS/Java; ODS-owned fixture DoD;
reuse system Graph view; defer Python/C++, RSocket/SOAP/AsyncAPI; do not
rewrite existing HTTP/OpenAPI/Feign modules."

**Parent Spec**: `specs/001-ods-vision/spec.md` (Post-MVP: gRPC extract;
.NET HTTP client capability gap)

**Dependencies**: `specs/005-code-analysis/spec.md` (detector, orchestrator,
parser envelope); `specs/006-project-graph/spec.md` (Canon ingest);
`specs/009-system-landscape/spec.md` (system layer baseline; gRPC was Phase 2);
`specs/013-api-routes-from-code/spec.md` / `specs/014-graph-view-ux/spec.md`
(HTTP surface + `http_calls` UX parity; `014` previously excluded gRPC extract —
this feature supplies gRPC **data** without rewriting Graph UX);
`specs/018-parser-extension-playbook/spec.md` (artifact-module checklist);
`specs/019-spring-system-landscape/spec.md` (gRPC deferred Post-MVP there)

**Entry draft**: `ods-help/requirements/024-grpc-from-proto-draft.md`

## Short description

After analysis, architects see **protobuf/gRPC RPC surface** (services and
methods from `.proto`) and **client→RPC** links for TypeScript, Java, and .NET
on the existing **system** Graph slice — comparable to HTTP `http_endpoint` /
`http_calls`. The same feature closes the **.NET HTTP client** gap so .NET
outgoing HTTP calls appear like TS/Java `http_calls`. Bus edge `rpc_handles`
is not a substitute for gRPC/protobuf extract. Python/C++ HTTP and gRPC
clients stay out of this feature.

## Spec boundaries

### Included

- Detect protobuf / gRPC presence (`.proto` roots; optional codegen markers)
  without treating OpenAPI/HTTP as gRPC;
- **One** language-agnostic artifact analysis module for IDL/server surface
  from `.proto` → system Canon RPC service / method representation using a
  dedicated gRPC/RPC method node kind (protocol metadata marked as `gRPC`);
- Service→method (or equivalent) exposure links and optional contract→method
  documentation links, expressed using existing system exposure/client edge
  types (`exposes`, `http_calls`, and `documents` as applicable) with protocol
  metadata marked as `gRPC` (no new gRPC-specific edge types in this feature);
- **gRPC client→method** binds when statically resolvable for **TypeScript,
  Java, and .NET** (separate artifact modules per stack; same feature DoD);
- **.NET HTTP client** extract into existing `http_calls` / HTTP endpoint
  Canon (parity with TS/Java HTTP clients; no new HTTP kinds) for statically
  resolvable outgoing call-sites made via `HttpClient` (static URL/path
  patterns) and typed/generated client styles when present (e.g. Refit/
  NSwag-like);
- Detector artifact rows + analysis confirm status for new modules (`018`);
- ODS-owned multi-module fixture: ≥1 RPC method surface; ≥1 gRPC client bind
  **per** TS, Java, and .NET; ≥1 .NET HTTP client bind;
- Show results on existing system Graph view (no new Graph product);
- Skip ambiguous / unresolved binds (no invented endpoints; run must not fail
  solely because of unresolved sites);
- Promote this feature in `001`; correct vision capability wording so gRPC is
  not implied complete under HTTP clients alone.

### Not included

- Python / C++ HTTP or gRPC clients (later capability wave via `018`);
- RSocket, SOAP, GraphQL, AsyncAPI;
- Runtime-only discovery without static source evidence;
- Cross-ODS-project / multi-repo binds;
- Full codegen / build-tool integration as a product requirement;
- Rewriting OpenAPI, Feign, existing `*-api-routes` / `ts-http-calls` /
  `java-http-calls`, or language symbol parsers;
- S1 `graph_from_wc`, MCP (`016`), auth (`017`), color legend;
- Pixel UI / Graph UI redesign (system Graph only unless a proven display gap);
- Dogfood hardcodes locked to one external tree path or name strip;
- Claiming bus `rpc_handles` equals gRPC coverage;
- **Analysis / parser pipeline performance** (long-lived workers, chunk/spawn
  policy, parallel defaults, optional symbols-fast vs semantic depth) —
  deferred unnumbered draft
  `ods-help/requirements/parser-pipeline-perf-draft.md`; gRPC modules SHOULD
  use the existing native host per stack when implemented, but perf work is
  **out of this feature’s DoD**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — gRPC RPC surface from protobuf (Priority: P1)

As an **architect**, after analyzing a project that contains `.proto` service
definitions, I see the **RPC service and method surface** on the system Graph
slice so I can inventory gRPC APIs the same way I inventory HTTP endpoints.

**Why this priority**: Without surface, client binds and Graph value are empty;
this is the core deferred gap from `009` / `019`.

**Independent Test**: ODS fixture with ≥1 `.proto` defining a service and
method → after analysis, system Canon shows that RPC surface on Graph system
view.

**Acceptance Scenarios**:

1. **Given** an ODS-owned fixture with a `.proto` declaring a gRPC service and
   at least one RPC method, **When** analysis completes successfully,
   **Then** the system Canon contains that service/method surface as
   `grpc_method` nodes discoverable on the system Graph slice.
2. **Given** a repository with no `.proto` and no gRPC markers, **When**
   analysis completes, **Then** no gRPC/RPC surface nodes are invented for
   that project.
3. **Given** OpenAPI/HTTP-only sources without protobuf, **When** analysis
   completes, **Then** those sources are not classified as gRPC surface.

---

### User Story 2 — Client→RPC binds for TS, Java, and .NET (Priority: P1)

As an **architect**, I see **who calls which RPC method** when client call
sites are statically resolvable in TypeScript, Java, or .NET — parity intent
with HTTP `http_calls`.

**Why this priority**: Surface alone does not show consumer→provider
architecture; three stacks are locked DoD for this feature.

**Independent Test**: Fixture includes one resolvable gRPC client call per
TS, Java, and .NET → after analysis, each produces a client→method bind in
Canon / Graph.

**Acceptance Scenarios**:

1. **Given** a uniquely resolvable gRPC client call-site in the fixture for
   TypeScript targeting a method from the same project’s `.proto` surface,
   **When** analysis completes, **Then** a client→method bind exists for that
   call.
2. **Given** the same for Java and for .NET in the fixture, **When** analysis
   completes, **Then** each stack has ≥1 such bind.
3. **Given** an ambiguous or unresolved client call-site, **When** analysis
   completes, **Then** no bind is invented for that site and the run does not
   fail solely because of it.

---

### User Story 3 — .NET HTTP clients parity (Priority: P1)

As an **architect**, after analyzing a .NET project with statically resolvable
outgoing HTTP client calls, I see **`http_calls`** edges comparable to
TypeScript and Java HTTP client extract — closing the .NET HTTP client gap.

**Why this priority**: Locked with gRPC DoD for .NET stack completeness in
this feature; uses existing HTTP Canon (no new HTTP kinds).

**Independent Test**: Fixture with ≥1 resolvable .NET HTTP client call →
`http_calls` (or equivalent existing edge) appears without regressing
`dotnet-api-routes` / TS/Java HTTP paths.

**Acceptance Scenarios**:

1. **Given** a fixture .NET call-site that matches the DoD MUST client
   patterns (per clarify), **When** analysis completes, **Then** at least one
   `http_calls` edge links the caller side to an HTTP endpoint or external API
   node per existing HTTP semantics.
2. **Given** an unresolved .NET HTTP call-site, **When** analysis completes,
   **Then** no false edge is created and the run does not fail solely because
   of it.
3. **Given** existing TS/Java HTTP client and route extract paths, **When**
   this feature ships, **Then** those paths still behave as before (no
   rewrite of those modules).

---

### User Story 4 — Analysis availability without breaking empty repos (Priority: P2)

As a **platform operator**, new gRPC / .NET HTTP modules appear in detector /
confirm status when relevant, and projects without protobuf/gRPC remain
unchanged aside from optional .NET HTTP when .NET HTTP sources exist.

**Why this priority**: Operator trust and `018` playbook compliance; secondary
to Graph outcomes.

**Independent Test**: Run analysis on fixture with `.proto` → new modules
available/stored; run on repo without `.proto` → no false gRPC landscape.

**Acceptance Scenarios**:

1. **Given** the DoD fixture, **When** the operator opens analysis confirm,
   **Then** gRPC-related artifact/parser status is visible for applicable
   modules and envelopes are stored on success.
2. **Given** a project without `.proto` / gRPC, **When** analysis completes,
   **Then** the system Graph gains no false gRPC RPC landscape.

---

### Edge Cases

- Invalid or empty `.proto` → module reports error/partial; orchestrator run
  does not hard-fail solely for that module when other modules succeed
  (same spirit as OpenAPI invalid handling).
- Generated stubs present without matching `.proto` in-tree → no invented
  server surface; client binds only when target method surface exists or
  clarify allows documented exception (default: no invent).
- Same project, multiple modules / packages with `.proto` → all in-scope
  services/methods extracted; cross-module binds within one ODS project when
  uniquely resolvable.
- Streaming RPC methods in `.proto` → methods remain visible on surface;
  deep streaming semantics beyond listing MAY be deferred (default: show
  method; no special runtime streaming analysis).
- Mixing HTTP and gRPC in one service → both landscapes may appear; protocols
  must not be conflated in detection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Platform MUST detect protobuf/gRPC presence from project sources
  (at least `.proto` roots) and expose applicable artifact/parser status in
  the analysis flow without classifying OpenAPI/HTTP-only evidence as gRPC.
- **FR-002**: Platform MUST extract gRPC/protobuf **service and RPC method
  surface** from `.proto` into the system Canon for the analyzed project.
- **FR-003**: Platform MUST represent that surface using
  a dedicated RPC/gRPC method node kind (not reusing `http_endpoint` as a
  proxy). The representation MUST include protocol metadata marking the
  entity as `gRPC`.
- **FR-004**: Platform MUST create exposure (and, if agreed, documentation)
  links for RPC surface using
  existing system exposure/client edge types (`exposes`, `documents`, and/or
  `http_calls` as applicable) with protocol metadata marking them as `gRPC`;
  do not introduce gRPC-specific edge types as part of this feature.
- **FR-005**: Platform MUST extract statically resolvable **gRPC client→method
  binds** for TypeScript, Java, and .NET within the same feature DoD (separate
  modular extractors per stack; not mixed into language symbol parsers).
- **FR-006**: Platform MUST skip unresolved or ambiguous gRPC client binds
  without inventing targets and without failing the overall analysis run solely
  for those sites.
- **FR-007**: Platform MUST provide **.NET HTTP client** extraction into the
  existing HTTP `http_calls` Canon for
  statically resolvable outgoing HTTP call-sites made via `HttpClient` (static
  URL/path patterns) and typed/generated client styles when present
  (e.g. Refit/NSwag-like), with skip-unresolved policy equivalent to
  TS/Java HTTP clients.
- **FR-008**: Platform MUST NOT rewrite existing OpenAPI, route, or TS/Java
  HTTP client extract modules to deliver this feature.
- **FR-009**: Platform MUST demonstrate DoD on an **ODS-owned** fixture
  containing: RPC surface from `.proto`; ≥1 gRPC client bind each for TS,
  Java, and .NET; ≥1 .NET HTTP client bind; heuristics MUST NOT hard-code a
  single external pilot path or name strip.
- **FR-010**: After analysis of the DoD fixture, users MUST be able to see RPC
  surface and required binds on the existing **system** Graph view without a
  new Graph product.
- **FR-011**: Bus `rpc_handles` MUST NOT be treated as fulfillment of gRPC /
  protobuf extract requirements.
- **FR-012**: Python and C++ HTTP/gRPC client extract MUST remain out of scope
  for this feature.
- **FR-013**: RSocket, SOAP, GraphQL, and AsyncAPI extract MUST remain out of
  scope for this feature.
- **FR-014**: `graph-view` system slice MUST provide protocol-family filtering
  for relationships (`all`, `http`, `grpc`, `rpc_bus`, `infra`) so architects
  can inspect mixed landscapes without switching products. Filters that have
  no matching edges in the current slice MUST be hidden. Selection SHOULD be
  URL-persisted (`system_filter`). Baseline documented also in
  `specs/014-graph-view-ux/spec.md` §Current Graph View behavior.
- **FR-015**: System `graph-view` MUST use a single grouped layout (no
  Flow/Grouped toggle). Dense `http_endpoint` sets MUST be compacted into
  per-service (and optional external) group nodes so consumer edges remain
  readable. Nodes with no visible edges under the active filter MUST be
  parked aside (not drawn as if connected). Truncation caps MAY remain
  server-side; the overview MUST NOT rely on a truncation banner for DoD
  readability of gRPC/HTTP mixes.

### Key Entities

- **Protobuf contract (`.proto`)**: Source of gRPC service and RPC method
  definitions for server surface extract.
- **RPC service / method surface**: System-layer `grpc_method` nodes for
  exposed gRPC operations (`metadata.protocol=grpc`).
- **gRPC client bind**: System-layer `http_calls` edge (with
  `metadata.protocol=grpc`) from a caller to a `grpc_method` when statically
  resolvable.
- **.NET HTTP client call**: Outgoing HTTP invocation from .NET sources that
  becomes an `http_calls` edge when statically resolvable.
- **Analysis artifact module**: Modular extractor registered for detection and
  spawn (`018`), producing a stored envelope for ingest.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the DoD fixture, after one successful analysis, an architect
  can identify ≥1 gRPC/RPC **service** surface and ≥1 **method** on the system
  Graph slice in under 2 minutes without opening source files.
- **SC-002**: On the DoD fixture, the system Graph (or equivalent system-layer
  node/edge inspection) shows ≥1 gRPC client→method bind for **each** of
  TypeScript, Java, and .NET.
- **SC-003**: On the DoD fixture, ≥1 .NET outgoing HTTP client relationship
  appears as an `http_calls` (or same-meaning existing) edge.
- **SC-004**: Spot-check of a project without `.proto`/gRPC yields **zero**
  invented gRPC/RPC landscape nodes attributable to this feature.
- **SC-005**: Regression spot-check: existing HTTP route/client paths for
  TypeScript/Java and .NET routes still produce their prior expected HTTP
  landscape on a known smoke project (no loss of HTTP coverage).
- **SC-006**: Ambiguous/unresolved gRPC or .NET HTTP call-sites in the fixture
  produce **no** false binds and do not alone fail the analysis run.

## Delivered stack coverage (Closed)

Canonical vision matrix lives in `specs/001-ods-vision/spec.md`
§**Stack coverage matrix**. What this feature closed:

| Stack | HTTP clients (this feature) | gRPC clients (this feature) | gRPC IDL surface |
|-------|----------------------------|-----------------------------|------------------|
| **TS** | (already `ts-http-calls`) | ✅ `ts-grpc-calls` | ✅ shared `grpc-proto` |
| **Java** | (already `java-http-calls`) | ✅ `java-grpc-calls` | ✅ shared `grpc-proto` |
| **.NET / C#** | ✅ `dotnet-http-calls` | ✅ `dotnet-grpc-calls` | ✅ shared `grpc-proto` |
| **Python / C++** | out of scope | out of scope | surface only if `.proto` present |

## Assumptions

- Existing system Graph view (`014` / related) can display new or reused
  system node/edge kinds once present in Canon; no pixel redesign is required
  for DoD unless a proven filter/label gap appears at plan time.
- Server surface comes from `.proto`; generated stubs are used for **client**
  resolution aids only, not to invent missing IDL surface.
- Same-project cross-module binds within one ODS project are in DoD; multi-repo
  is out.
- AsyncAPI remains a separate later feature by default.
- Streaming RPC methods appear as methods on the surface; specialized streaming
  behavior analysis is not required for DoD.
- Second external pilot tree is SHOULD smoke only, not the sole DoD oracle.
- Feature id / short name remains `024-grpc-from-proto` even though DoD also
  includes `.NET` HTTP clients.
- Vision (`001`) is updated when this spec is created so roadmap and capability
  table no longer imply gRPC is already done under HTTP clients.
- Parser pipeline performance optimization is tracked separately (unnumbered
  draft `ods-help/requirements/parser-pipeline-perf-draft.md`) and is not
  required to close this feature.
