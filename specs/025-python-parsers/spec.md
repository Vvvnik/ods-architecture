# Feature Specification: Python HTTP and gRPC parsers

**Feature Branch**: `025-python-parsers`

**Created**: 2026-07-28

**Status**: ✅ Closed (2026-07-28)

**Input**: User description: "Implement `025-python-parsers` from
`ods-help/requirements/025-python-parsers-draft.md`: Python HTTP routes,
HTTP clients, and gRPC clients; DoD includes FastAPI, Flask, Django;
exclude C++; reuse `grpc-proto` and existing Canon; ODS fixtures covering
each DoD route style; follow `018`; defer pipeline perf, S1, and C++ API
parsers."

**Parent Spec**: `specs/001-ods-vision/spec.md` (Stack coverage matrix —
Python HTTP routes / HTTP clients / gRPC clients gap after `024`)

**Dependencies**: `specs/005-code-analysis/spec.md` /
`specs/006-project-graph/spec.md` (pipeline + Canon);
`specs/009-system-landscape/spec.md` (system layer);
`specs/013-api-routes-from-code/spec.md` /
`specs/014-graph-view-ux/spec.md` (HTTP API + `http_calls` UX parity);
`specs/018-parser-extension-playbook/spec.md` (parser playbook);
`specs/024-grpc-from-proto/spec.md` (gRPC Canon: `grpc_method`,
`http_calls` / `exposes` / `documents` with `metadata.protocol=grpc`;
Graph protocol filters baseline)

**Entry draft**: `ods-help/requirements/025-python-parsers-draft.md`

## Clarifications

### Session 2026-07-28

- Q: HTTP client fixture coverage — ≥1 bind per library (httpx, requests,
  aiohttp) vs ≥1 any? → A: Fixture MUST include ≥1 statically resolvable
  bind for **each** of httpx, requests, and aiohttp.
- Q: Does FastAPI alone satisfy the FastAPI/Starlette route DoD cell, or
  must a Starlette-native (no FastAPI) app also appear? → A: FastAPI alone
  satisfies the FastAPI/Starlette route DoD cell.
- Q: Fixture packaging — one multi-module ODS repo vs separate trees? → A:
  One ODS-owned multi-module repo (mini-apps for FastAPI, Flask, Django +
  clients + gRPC).
- Q: Django `include()` DoD depth? → A: Fixture MUST include ≥1 successfully
  resolved `include()` chain in addition to static `path()` / `re_path()`;
  unresolved `include()` / i18n trees are still skipped (no invent).
- Q: Are path templates with named params in DoD, or only fully static
  paths? → A: Path templates with named params are in DoD when the template
  is statically known (parity with existing HTTP features); dynamic string
  assembly remains skip.

### Session 2026-07-28 (analyze remediation)

- Q: Fix analyze I1/I2/C1/C2/U1 (+ LOW)? → A: Corrected
  `docker/fixtures/repos/setup-fixtures.sh` path; removed false `[P]` on
  sequential HTTP extract tasks; FR-006 confirm via automated status test;
  FR-008 DoD = system Graph data path (API/slice), not pixel e2e; ingest
  uses `transformApiRoutes(..., 'python')` + optional `framework` metadata;
  pytest locked for parser extract tests; external pilot SHOULD task **T043**
  added (not sole DoD).

## Short description

After analysis, architects with **Python** services see the same **system**
HTTP landscape and **gRPC client→RPC** binds already available for
TypeScript, Java, and .NET: HTTP API from code → endpoints and exposure;
outgoing HTTP clients → client→endpoint links; Python gRPC clients →
client→RPC method links when statically resolvable. Shared protobuf/gRPC
IDL surface (`grpc-proto` from `024`) is reused — not rewritten. Language
symbol coverage for Python remains unchanged. C++ HTTP/gRPC extract stays
out of this feature.

## Spec boundaries

### Included

- Three new modular artifact extractors (separate `parser_id`s per role;
  follow `018`):
  - HTTP routes (server surface) → `python-api-routes`
  - HTTP clients → `python-http-calls`
  - gRPC clients → `python-grpc-calls`
- **HTTP routes DoD** — popular Python frameworks (MUST set, do not drop):
  - **FastAPI** (app/router decorators; covers the FastAPI/Starlette DoD
    cell — a separate Starlette-only app is not required)
  - **Flask** (route decorators / blueprints)
  - **Django** (`path` / `urlpatterns` + class- or function-based views with
    statically resolvable path; fixture MUST also prove ≥1 successfully
    resolved `include()` chain)
- **HTTP clients DoD** — popular Python client libraries with literal URL or
  base+path when resolvable: **`httpx`**, **`requests`**, **`aiohttp`**
- **gRPC clients DoD** — **`grpcio`** generated stub / channel unary call when
  target RPC is statically resolvable to existing `grpc_method` surface
  (parity with `*-grpc-calls` in `024`)
- Reuse existing Canon and Graph view (`013`/`014`/`024`): `http_endpoint`,
  `exposes`, `http_calls`, `grpc_method`, protocol metadata — **no** new edge
  types and **no** second Graph product
- Detector artifact rows + analysis confirm status + ingest adapters (`018`)
- ODS-owned **single multi-module** fixture repo covering **each** DoD route
  framework (≥1 extractable endpoint for FastAPI, Flask, and Django),
  **each** DoD HTTP client library (≥1 bind for httpx, requests, and
  aiohttp), and ≥1 gRPC client bind (mini-apps in one tree; not separate
  fixture repos per framework)
- Skip ambiguous / unresolved binds (no invented endpoints; analysis run MUST
  NOT fail solely because of unresolved sites)
- Promote `001` Stack coverage matrix Python rows from draft/`—` toward ✅
  when this feature closes; roadmap points at this spec while active

### Not included

- **C++** HTTP routes, HTTP clients, or gRPC clients (later wave via `018`)
- Rewriting the existing Python **language/symbol** parser
- Rewriting TS / Java / .NET HTTP or gRPC modules or `grpc-proto`
- Niche / uncommon Python HTTP stacks beyond the locked popular MUST list
- OpenAPI-as-DoD for this feature; RSocket / SOAP / GraphQL / AsyncAPI
- Runtime reflection-only discovery; inventing RPCs or endpoints
- Cross-ODS-project / multi-repo binds
- Full build-system / codegen product integration
- Parser pipeline performance (deferred unnumbered draft
  `ods-help/requirements/parser-pipeline-perf-draft.md`)
- S1 `graph_from_wc`, MCP (`016`), auth (`017`), color legend
- Pixel UI redesign; new Graph product
- Dogfood hardcodes locked to one external tree path or name strip
- Go, Kotlin, or other new language symbol parsers in this feature

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Python HTTP API from code (Priority: P1)

As an **architect**, after analyzing a Python project that declares HTTP
routes in popular frameworks, I see those endpoints on the system Graph
slice the same way I see TypeScript / Java / .NET routes.

**Why this priority**: Without server surface, Python services appear as
symbols-only; HTTP landscape is the primary system-layer gap vs closed stacks.

**Independent Test**: ODS fixture with ≥1 extractable route per FastAPI,
Flask, and Django → after analysis, system Canon shows corresponding HTTP
endpoints and exposure on the system Graph view.

**Acceptance Scenarios**:

1. **Given** an ODS-owned fixture with ≥1 statically resolvable HTTP route
   for each of FastAPI, Flask, and Django, **When** analysis completes
   successfully, **Then** the system Canon contains matching
   `http_endpoint` nodes and `exposes` links discoverable on the system
   Graph slice.
2. **Given** a Python repository with no HTTP route declarations in DoD
   frameworks, **When** analysis completes, **Then** no HTTP endpoints are
   invented for that project from this feature’s route extractor.
3. **Given** a route site whose path/method cannot be uniquely resolved,
   **When** analysis runs, **Then** that site is skipped (no false endpoint)
   and the overall run does not fail solely for that reason.

---

### User Story 2 — Python HTTP client→endpoint binds (Priority: P1)

As an **architect**, I see **which Python code calls which HTTP endpoints**
when outgoing calls use popular client libraries with a statically
resolvable target — parity with TS/Java/.NET `http_calls`.

**Why this priority**: Client landscape completes the HTTP picture; peers
already ship this in the same capability wave as routes.

**Independent Test**: ODS fixture with ≥1 statically resolvable outgoing call
**per** DoD library (httpx, requests, and aiohttp) → system Graph shows
corresponding `http_calls` edges (protocol HTTP) from the Python caller side.

**Acceptance Scenarios**:

1. **Given** an ODS fixture with ≥1 statically resolvable outgoing HTTP call
   (literal URL or base+path) for **each** of httpx, requests, and aiohttp,
   **When** analysis completes, **Then** at least one `http_calls`
   relationship appears on the system Graph slice for each of those three
   libraries.
2. **Given** a dynamic URL-only builder with no static target, **When**
   analysis runs, **Then** no invented endpoint bind is created for that site.
3. **Given** an unresolved or ambiguous client target, **When** analysis
   runs, **Then** the site is skipped and the run does not fail solely for
   that reason.

---

### User Story 3 — Python gRPC client→RPC binds (Priority: P1)

As an **architect**, when a Python service calls a gRPC method via a
statically resolvable `grpcio` stub/channel, I see the client→RPC bind on
the system Graph the same way I see TS/Java/.NET gRPC clients — using the
existing `grpc_method` surface from `grpc-proto` when `.proto` is present.

**Why this priority**: Closes the remaining Python cell in the vision matrix
after `024` delivered IDL surface and other stacks’ clients.

**Independent Test**: Fixture with `.proto` surface (via existing
`grpc-proto`) plus ≥1 resolvable Python gRPC client call → system Graph
shows `http_calls` → `grpc_method` with gRPC protocol metadata.

**Acceptance Scenarios**:

1. **Given** an ODS fixture with protobuf RPC surface and ≥1 statically
   resolvable Python gRPC client call to that surface, **When** analysis
   completes, **Then** the system Graph shows at least one client→RPC bind
   with protocol marked as gRPC.
2. **Given** a Python gRPC call-site that cannot uniquely resolve to an
   existing RPC method, **When** analysis runs, **Then** no bind is invented
   and the run does not fail solely for that site.
3. **Given** this feature’s scope, **When** comparing to `024`, **Then**
   `grpc-proto` and existing TS/Java/.NET gRPC modules are not rewritten to
   deliver Python client binds.

---

### User Story 4 — Detector, confirm, and ingest parity (`018`) (Priority: P2)

As an **operator**, new Python HTTP/gRPC artifact modules appear in detection
and analysis confirm like other modular parsers, and successful envelopes
ingest into Canon.

**Why this priority**: Without detector/confirm/ingest, extracts are not
operable in the product flow even if CLI extract works.

**Independent Test**: Run analysis on the DoD fixture → new modules show
applicable status and stored envelopes; Graph system slice shows results.

**Acceptance Scenarios**:

1. **Given** the DoD fixture, **When** the operator opens analysis confirm,
   **Then** status for the three new Python artifact modules is visible when
   applicable, and envelopes are stored on success.
2. **Given** a project without Python HTTP/gRPC DoD evidence, **When**
   analysis completes, **Then** the system Graph gains no false Python HTTP
   or gRPC client landscape from these modules.

---

### Edge Cases

- Ambiguous or unresolved route / client / gRPC sites → skip; no invented
  targets; run must not hard-fail solely for those sites.
- Django complex `include()` / i18n URL trees that cannot be statically
  resolved → skip those sites (no invent). DoD still requires ≥1
  **successfully resolved** `include()` chain in the fixture alongside
  static `path()` / `re_path()` endpoints.
- Path-template depth → match existing HTTP skip rules from closed HTTP
  features (parity, not deeper invent). Named path parameters / converters
  (e.g. `/users/{id}`, Django `<int:pk>`) are **in DoD** when the template
  itself is statically known; dynamic URL assembly remains skip.
- Mixing HTTP and gRPC in one Python service → both landscapes may appear;
  protocols must not be conflated.
- Generated gRPC stubs without matching in-tree `.proto` → no invented
  server surface; client binds only when target method surface exists
  (same default as `024`).
- External pilot tree → SHOULD smoke only; not the sole DoD oracle; no
  hard-coded foreign path or name strip in product rules.
- Niche frameworks outside the locked MUST list → out of DoD (MAY skip or
  ignore without inventing coverage claims).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Platform MUST extract Python **HTTP API routes** from DoD
  frameworks (FastAPI, Flask, Django) into system Canon as
  `http_endpoint` nodes with `exposes` links when paths/methods are
  statically resolvable. FastAPI alone satisfies the FastAPI/Starlette DoD
  cell; a separate Starlette-only app is not required for acceptance. For
  Django, DoD includes statically resolvable `path()` / `re_path()` and
  MUST demonstrate ≥1 successfully resolved `include()` chain in the
  fixture; unresolved `include()` / i18n trees remain skip-only. Path
  templates with named parameters follow **FR-013**.
- **FR-002**: Platform MUST extract Python **HTTP client** call-sites from
  DoD libraries (`httpx`, `requests`, `aiohttp`) into existing `http_calls`
  Canon when the target is statically resolvable (literal URL or base+path);
  protocol remains HTTP (not gRPC).
- **FR-003**: Platform MUST extract statically resolvable Python **gRPC
  client→method** binds (`grpcio` stub/channel unary) into `http_calls`
  targeting `grpc_method` with protocol metadata marked as gRPC, reusing
  existing IDL surface from `grpc-proto` (`024`).
- **FR-004**: Platform MUST deliver the three capabilities as **separate**
  artifact modules with distinct `parser_id`s (`python-api-routes`,
  `python-http-calls`, `python-grpc-calls`) and MUST NOT merge them into the
  existing Python language/symbol parser without a justified exception
  recorded in plan.
- **FR-005**: Platform MUST skip unresolved or ambiguous route, HTTP client,
  and gRPC client sites without inventing targets and without failing the
  overall analysis run solely for those sites.
- **FR-006**: Platform MUST provide detector artifact rows, analysis confirm
  status, and ingest adapters for the three modules per `018`. Confirm/status
  DoD is verified by automated detector/analysis-report tests (not
  manual-only).
- **FR-007**: Platform MUST demonstrate DoD on **one ODS-owned multi-module**
  fixture repository that includes: ≥1 extractable HTTP endpoint for **each**
  of FastAPI, Flask, and Django; within Django, ≥1 endpoint reached via a
  successfully resolved `include()` chain; ≥1 HTTP client bind for **each**
  of httpx, requests, and aiohttp; ≥1 gRPC client bind; heuristics MUST NOT
  hard-code a single external pilot path or name strip. Separate fixture
  repos per framework are not required for DoD.
- **FR-008**: After analysis of the DoD fixture, users MUST be able to see
  Python HTTP endpoints, HTTP client binds, and gRPC client binds on the
  existing **system** Graph slice without a new Graph product. DoD is
  satisfied by the system Graph **data path** (Graph view API / system slice
  builder returning the nodes and edges); pixel-perfect UI e2e is not
  required.
- **FR-009**: Platform MUST NOT rewrite `grpc-proto`, existing TS/Java/.NET
  HTTP or gRPC modules, or the Python language/symbol parser to deliver this
  feature.
- **FR-010**: C++ HTTP routes, HTTP clients, and gRPC clients MUST remain out
  of scope for this feature.
- **FR-011**: RSocket, SOAP, GraphQL, AsyncAPI, OpenAPI-as-DoD for this
  feature, pipeline performance work, S1, MCP, and auth MUST remain out of
  scope.
- **FR-012**: When this feature closes, vision (`001`) Stack coverage matrix
  Python rows for HTTP routes, HTTP clients, and gRPC clients MUST be
  promoted to ✅ (with the locked parser ids).
- **FR-013**: Platform MUST treat statically known path templates with named
  parameters / converters as in-DoD extractable routes (parity with existing
  HTTP features). Dynamically assembled URL strings without a static template
  MUST be skipped (no invent).

### Key Entities

- **Python HTTP endpoint**: System-layer `http_endpoint` from a statically
  resolvable FastAPI, Flask, or Django route declaration.
- **Python HTTP client call**: Outgoing HTTP invocation from Python sources
  that becomes an `http_calls` edge when statically resolvable.
- **Python gRPC client bind**: System-layer `http_calls` edge (with gRPC
  protocol metadata) from a Python caller to a `grpc_method` when statically
  resolvable.
- **Shared gRPC IDL surface**: Existing `grpc_method` nodes from `grpc-proto`
  (`024`); reused, not redefined here.
- **Analysis artifact module**: Modular extractor registered for detection
  and spawn (`018`), producing a stored envelope for ingest.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the DoD fixture, after one successful analysis, an architect
  can identify ≥1 Python HTTP endpoint from **each** of FastAPI, Flask, and
  Django on the system Graph slice in under 2 minutes without opening source
  files, including ≥1 Django endpoint whose path was contributed via a
  resolved `include()` chain.
- **SC-002**: On the DoD fixture, the system Graph shows ≥1 Python outgoing
  HTTP client relationship (`http_calls` or same-meaning existing edge) for
  **each** of httpx, requests, and aiohttp.
- **SC-003**: On the DoD fixture, the system Graph shows ≥1 Python
  gRPC client→RPC method bind with protocol marked as gRPC.
- **SC-004**: Spot-check of a project without Python HTTP/gRPC DoD evidence
  yields **zero** invented Python HTTP or gRPC client landscape nodes
  attributable to this feature.
- **SC-005**: Ambiguous/unresolved Python route or client sites in the
  fixture produce **no** false binds and do not alone fail the analysis run.
- **SC-006**: Regression spot-check: existing TS/Java/.NET HTTP and gRPC
  coverage and shared `grpc-proto` surface still produce their prior expected
  landscape on a known smoke project (no loss of closed-stack coverage).

## Target stack coverage (this feature)

Canonical vision matrix lives in `specs/001-ods-vision/spec.md`
§**Stack coverage matrix**. What this feature targets:

| Stack | HTTP routes | HTTP clients | gRPC clients | Notes |
|-------|-------------|--------------|--------------|-------|
| **Python** | DoD FastAPI + Flask + Django → `python-api-routes` | DoD httpx + requests + aiohttp → `python-http-calls` | DoD grpcio → `python-grpc-calls` | This feature |
| **C++** | out | out | out | Later via `018` |
| **TS / Java / .NET** | out | out | out | Already closed; do not rewrite |
| gRPC IDL (`.proto`) | — | — | surface via `grpc-proto` | Reuse `024` |

## Assumptions

- One **multi-module ODS-owned** fixture repository (mini-apps for FastAPI,
  Flask, Django + HTTP clients + gRPC in one tree) is the DoD packaging;
  a second separate tree is SHOULD only; per-framework separate fixture
  repos are not required.
- HTTP client DoD fixture coverage matches route-framework parity: ≥1 bind
  for **each** of httpx, requests, and aiohttp (not merely ≥1 any library).
- FastAPI alone satisfies the FastAPI/Starlette route DoD cell; Starlette-only
  apps are out of required fixture proof (MAY still be extracted if patterns
  overlap).
- Path-template and unresolved-skip depth match existing HTTP features
  (`013`/`014`/`019`/`024`) — parity, not a deeper invent rule. Named path
  parameters are in DoD when the template is statically known.
- Django DoD covers statically resolvable `path()` / `re_path()` entries
  **and** ≥1 successfully resolved `include()` chain in the fixture;
  complex `include()` / i18n URL trees that remain unresolved are skipped
  (no invent).
- Host runtime for extract modules is CPython (same operational assumption
  as other Python tooling in the platform).
- Existing system Graph view (`014`/`024`) can display reused Canon kinds;
  no pixel redesign is required for DoD. FR-008 / SC-001–003 DoD uses the
  system Graph **data path** (view API / slice builder); full browser UI e2e
  is out of required acceptance.
- Same-project cross-module binds within one ODS project are in DoD;
  multi-repo is out.
- External pilot smoke is SHOULD (task **T043**); not the sole acceptance
  oracle; no foreign path/name hardcodes in product rules or tracked fixtures.
- Vision (`001`) is updated when this spec is created so roadmap points at
  `specs/025-python-parsers/` instead of draft-only status; matrix rows
  remain “in progress / specified” until feature close promotes them to ✅.
- Parser pipeline performance stays on the deferred unnumbered draft and is
  not required to close this feature.
