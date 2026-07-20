# Specification: HTTP API from a code → system-layer (CP1)

**Feature**: `013-api-routes-from-code`

**Created**: 2026-07-18

**Status**: Draft (clarifications recorded 2026-07-18)

**Entrance** Draft `ods-help/requirements/013-api-routes-from-code-draft.md`,
section **CP1** — extraction workers HTTP-routes from **code** in the Canon
system-layer and show at the entrance in the "Graph view".
UX (CP2 / candidate `014`) — **not included**.

**Parent Spec**: `specs/001-ods-vision/spec.md` (phase 12)

**Dependencies**: `specs/009-system-landscape/spec.md` (system-Canon, compose);
`specs/011-ods-graph-viewer/spec.md` + `012-code-graph-bottom`;
Modular parser contract `005`.

## Short description

The architect enters the service on the system map and sees in the **system-interior**
HTTP-endpoint declared in **code** (TypeScript/JavaScript and C# / ASP.NET).
Layer **code** ("In code") - still symbols (modules, types, methods).
Extraction API — **separate** plug-in modules that are not part of language parsers
characters. Source API this cool **only code**; documentation
contracts (OpenAPI and future "space records") — **not** DoD `013`.

## Clarifications

### Session 2026-07-18

- Q: What languages are in DoD CP1? → A: **TypeScript/JavaScript and C# (ASP.NET) —
  both are required (P1)**. **Python — then** (outside `013`).
- Q: OpenAPI vs code in one method+path? → A: For API in `013` take
  **code only**. Documents/OpenAPI as a separate entity space —
  **later** (when it will be docs); now merge/dedup with yaml **not doing**
  and we do not rely on the acceptance of `013`. Parser `openapi` from `009` not expandable
  in this feature.
- Q: Low HTTP-ads TypeScript/JavaScript for DoD? → A: **Only
  reference style** — literal routes in the spirit of Fastify (`get`/`post`/`route`
  + is a string path). Express/Nest and other heuristics are optional DoD.
- Q: Low HTTP-ads C# / ASP.NET for DoD? → A: **Controllers and
  minimal APIs** — attributes (`[HttpGet]` / `[Route]` and analogues) **and**
  `MapGet`/`MapPost` (and analogues) with a literal way.
- Q: Is the HTTP-endpoint unique for one method+path for two services? → A:
  **Service + method + path** - two services → two nodes.
- Q: How to build path when prefix (Fastify prefix / `[Route]`)? → A:
  **Full path** if the prefix/base **statically** visible next to registration;
  otherwise, it's just the handler literal, without the fictitious prefix.

## The boundaries of the spec

### Includes (CP1)

- extraction HTTP-routes from **code** in the canonical nodes HTTP-endpoint
  system-layers;
- **mandatory** stacks: TypeScript/JavaScript — **literal routes in the spirit
  Fastify** (Etalon ods-arch); C# / ASP.NET — **controllers and minimal APIs**
  (attributes + `MapGet`/`MapPost` literal way);
- connection endpoint with **service** landscape;
- possible connection with **handler** in code-layer with a clear match;
- showing endpoints of code in system-interior at the "Graph view" (slice `011`);
- standards: **ods-arch** (TS) and C#-fixture with HTTP API in the code;
- analysis modules replaceable/disable; embedding to the pipeline `005`/`009`
  without a second orchestrator.

### Not included (CP1)

- wide heuristics for arbitrary C# over controllers + minimal APIs;
- Express / NestJS / other TS HTTP-styles over Fastify-literal reference
  (best-effort MAY, not DoD);
- **Python** API-of code (follow-up);
- merge / dedup with OpenAPI; development of the "documentation space" and its entities;
- rename the buttons, the cut of the analysis, strain analysis, sync-overlay (**CP2**);
- generation OpenAPI from code; GraphQL; gRPC / RPC; call API from UI;
- docs / RAG / auth as products;
- change the rules system→code from `012`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Endpointy from TS-code system (Priority: P1)

How **architect**, after analyzing the project HTTP API in TS/JS-code service
I enter in the "Graph view" (system) and see endpoint (method + path)
without the need for the OpenAPI-file.

**Why this priority**: closes the hole ods-arch.

**Independent Test**: ods-arch → analysis → enter backend (system) → there is
endpoints like `/api/v1/...`.

**Acceptance Scenarios**:

1. **Given** analysis ods-arch with the ranting in the code backend, **When** system-interior
   backend, **Then** visible HTTP-endpoints the method and path.
2. **Given** project without OpenAPI yaml, **When** system-interior backend,
   **Then** the endpoints from the code are present.
3. **Given** focus backend in system, **When** "code", **Then** visible
   modules/symbols code-layer (`012`), do not substitute one tape API.

---

### User Story 2 — Endpointy from C#-code system (Priority: P1)

How **architect** on C#-project, I see HTTP API from **controllers** and
**minimal APIs** in system-interior of the linked service.

**Why this priority** agreed — both languages at once; closes duty `009`.

**Independent Test**: C#-fixture with HTTP API → analysis → system-entrance → endpoint.

**Acceptance Scenarios**:

1. **Given** analysis fixture with `[HttpGet]` (or equivalent) controller,
   **When** entrance to a linked service (system), **Then** visible endpoint.
2. **Given** analysis fixture with `MapGet`/`MapPost` and literal way,
   **When** entrance to a linked service (system), **Then** visible endpoint.
3. **Given** the same project, **When** code-service layer **Then** characters
   the codes are available without regression of language analysis.

---

### User Story 3 Connection with the service (Priority: P1)

How **architect** I can see which service gives the endpoint extracted from the code.

**Why this priority** otherwise ribbon API not tied to the landscape.

**Independent Test**: compose + code API → rib/connection "gives service endpoint".

**Acceptance Scenarios**:

1. **Given** endpoint of the code and comparable service, **When** looking ties,
   **Then** it can be seen that the service returns this endpoint.
2. **Given** comparison is not possible, **When** analysis **Then** endpoint
   saved without false linking to all services.

---

### User Story 4 Module disable / not the rest (Priority: P2)

How **team platform**, modules API-of code detachable: failure or lack of
does not drop compose and the language code-analysis.

**Independent Test**: run without module / with error → the rest of the results are in place.

**Acceptance Scenarios**:

1. **Given** module API-of code is off or fell **When** analysis completed,
   **Then** compose-services and code-symbols are available.
2. **Given** module is enabled, but trails in the code no **When** analysis,
   **Then** without false endpoints; the run does not fall completely.

---

### Edge Cases

- Service without HTTP in the code (infra) — without endpoints from the code; acceptable.
- Dynamic paths without a literal — MAY are missing; do not invent.
- The prefix has not been statically restored — path = handler literal (do not guess
  all over the repo).
- Multiple services with one method+path — **two** the endpoint (for service),
  not one common node.
- Multiple services — without massive false linking of one API to all of them.
- Error one language API-module not coming down another (TS vs C#) and not coming down
  the rest of the analysis.
- Legacy OpenAPI from `009` can still write something in the Canon — **out
  acceptance `013`**; coordination with docs-space later.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Platform MUST extract HTTP-routes from **code** TypeScript/
  JavaScript style reference: **literal** registration in the spirit Fastify
  (`get`/`post`/`route` + path-string) to the nodes HTTP-endpoint system-of the layer
  (method + path). Express/Nest and other styles MUST NOT be required for DoD.
- **FR-002**: Platform MUST extract HTTP-routes from **code** C# / ASP.NET
  for **both** styles DoD: (1) attributes controllers (`[HttpGet]` / `[Route]`
  and analogues); (2) minimal APIs (`MapGet` / `MapPost` and analogues) with the literal
  the paths are in the same types of endpoint nodes.
- **FR-003**: Extract API MUST be **separate** plug-in modules
  analysis (not part of the language symbol modules).
- **FR-004**: Source HTTP API for DoD this feature MUST be **only code**.
  OpenAPI / documentation entities MUST NOT are required for acceptance;
  merge with yaml and "space documentation" out scope `013`.
- **FR-005**: Endpoint MUST contact the service landscape when possible
  matching; otherwise, without false binding. The uniqueness of the node MUST be
  **service + method + path** (in the absence of the service is stable without key
  about merge with someone else's service; a key part in plan).
- **FR-006**: Platform SHOULD to associate the endpoint handler code-layer
  with an unambiguous match.
- **FR-007**: In the "Graph view" in system-the interior of the service, the user MUST
  see the endpoints extracted from the code (slice `011`).
- **FR-008**: Code-layer of the same service MUST keep behavior `012`
  (code characters).
- **FR-009**: Failure or disconnection module(s) API-of code MUST NOT break
  the remaining analysis modules (compose, languages) in the sense of the platform contract.
- **FR-010**: Implementation MUST be integrated into an existing conveyor modules
  without a second Orchestrator and without parallel redundant Canon.
- **FR-011**: Python API-of code MUST NOT log in DoD `013` (follow-up).
- **FR-012** Displayed path the endpoint MUST be **full** when a prefix
  or base route **statically** extracted from the same ad/chain
  registration; if not collected — MUST use literal handler without
  a fictitious prefix.

### Key Entities

- **HTTP-endpoint (system)**: method + path from **code** visible in the landscape.
  Identity in the framework of the project: **service + method + path** (one path have
  two services → two nodes).
- **Service**: party system-landscape, giving API.
- **Handler (code)**: route function/method (optional communication).
- **Space documentation** (outside scope): future entity docs/OpenAPI —
  is separate from the code space; do not mix in DoD `013`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On ods-arch after analyzing over one dig-in in backend (system)
  visible **≥1** HTTP-endpoint in code **recognizable full** by the spirit
  `/api/v1/...` (when a prefix is statically available in the standard; OpenAPI no
  is required).
- **SC-002**: On C#-fixture after the analysis: (a) ≥1 endpoint from the controller and
  (b) ≥1 endpoint of minimal API single fixture covers both styles,
  either two scenarios; each style is explicitly checked.
- **SC-003**: Code-layer of the same services retains symbols (`012`) — smoke
  without regression on both benchmarks.
- **SC-004**: Run with disabled modules API-of code leaves compose-
  services and the code- graph are available.
- **SC-005**: Audit reusing: there are no second pipeline analysis "on the side"
  only for API-from-code.

## Assumptions

- Standard TS — **ods-arch** (Fastify, literal way); the standard C# — fixture,
  cover **controllers and MapGet/MapPost** (one or two scenarios for plan).
- Signature "Enter" / "In the code" on CP1 sufficient; UX-RENAM — `014`.
- Binding endpoint→tools — heuristics in the spirit `009` (name/path); details in plan.
- Building a complete path — only from statically visible prefixes/databases; without
  global "guessing" by repo.
- Dynamic routes without a literal may be missing.
- Split the "code space" vs "documentation space" —
  product lines later; in `013` fix only code → API.
- The language of UI is Russian.

## Related materials

- Draft: `ods-help/requirements/013-api-routes-from-code-draft.md` (CP1)
- `009` (debt API-of code)
- `011` / `012`
- The following UX: candidate `014-graph-view-ux` (CP2)
- Python API-from code — follow-up after `013`
