# Specification: UX layers graph-view + client calls API

**Feature**: `014-graph-view-ux`

**Created**: 2026-07-18

**Status**: Draft (clarifications recorded 2026-07-18)

**Entrance** drafts `ods-help/requirements/014-graph-view-ux-draft.md` (blocks A+B)
and `ods-help/requirements/system-api-links-semantics-draft.md` (semantics
provider/consumer; types API — only as boundaries, without protocol extensions).

**Parent Spec**: `specs/001-ods-vision/spec.md` (phase 13)

**Dependencies**: `011`/`012` (canvas, dig-in); `013` (HTTP from code + `exposes`);
`009` (Canon ribs `http_calls` / `exposes` / `documents` / `depends_on`).

## Short description

The architect on Graph View clearly distinguishes the actions of **Code** and **System**,
goes into the analysis of **in the context of the current slice** with understandable breadcrumbs, sees
unified progress sync/analysis canvas. also on system-section shows,
**who is** already known HTTP-endpoint (client → endpoint) apart
from **who publishes** (`exposes`) and from **description of the contract** (`documents` /
OpenAPI). **DoD features — both units (A UX + B consumer)**; Spec `013` does not change.

## Clarifications

### Session 2026-07-18

- Q: What does "slice-only analysis" mean? → A: **B** — project analysis run
  as it is now; UI analysis opens **in the context of the slice** (focus / filter /
  breadcrumbs). Narrow spawn only the files of the cut — **not** DoD `014`.
- Q: Required blocks A and B one DoD release? → A: **A** — DoD =
  **A + B** together (B minimum: frontend→backend on ods-arch).
- Q: "View in analysis" without focusing on the service? → A: **B** - without focus
  action **unavailable** (disabled/hidden).
- Q: Where is it mandatory to see "causes"? → A: **C** — card/inspector
  is required; edges on canvas — SHOULD at slice limits.
- Q: Which client calls included in DoD extract? → A: **A** — shared
  API-client base `/api/v1` + relative path (Etalon ods-arch);
  other raw fetch / external URL — out DoD.

## The boundaries of the spec

### Is included

**A — UX graph-view**

- the signature action: **"Code"**, **"System"**, **"View in analysis"**
  (instead of confusing "Code" / "Log in");
- opening the analysis screen **in the context of the current slice** of the circuit (focus /
  filter / dust); the analysis run project **not** narrows to files
  slice; breadcrumbs in the spirit of `The system " ...` with **Up** / **To the system**;
- One common notification stream sync → confirmation → analysis progress,
  visible from the "Graph view" screen.

**B — Client calls HTTP**

- fixing connections "service calls HTTP-endpoint" in system-canon
  (the role consumer; not to be confused with `exposes` / `documents` / `depends_on`);
- standard of acceptance: **frontend → endpoints backend** on ods-arch after analysis;
- DoD extract client: **General API-client** base `/api/v1` and relative
  ways; raw fetch arbitrary/external URL — **not** DoD;
- connecting only to **existing** HTTP-endpoints (from the code and/or
  contract); **not** create endpoint only client URL;
- the card service: distinguishable blocks **"Published"** and **"Causes"**
  (**mandatory** way to see consumer); fin calls canvas —
  desirable, if you are within the limits of the cut; service publications, but
  calls, do not sign as "publishes API";
- in the presence of a source of an endpoint (code / OpenAPI) — clear mark of the source.

### Not included

- any changes DoD / FR **`013`**;
- new extractors of **server** routes (other frameworks/languages);
- merge / node dedup OpenAPI ↔ code;
- extraction gRPC, GraphQL, WebSocket/SSE, AsyncAPI yaml; strengthening the tires over `009`;
- DoD arbitrary raw `fetch` / external hosts (over shared `/api/v1` client);
- the full matrix of all protocols in UI (she semantics-draft as a card);
- docs / RAG / auth (`015`–`017`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — friendly layers for the scheme (Priority: P1)

How **architect** on the "Graph view" I see actions **"Code"** and **"System"**
and I understand where I'm going, without confusing the old signatures.

**Why this priority**: removes the main UX-pain after `012`/`013`.

**Independent Test**: open dig-in service → signature Code/The system; transitions
lead to code- and system-slices, respectively.

**Acceptance Scenarios**:

1. **Given** focus on service system, **When** watch action dig-in,
   **Then** is **"Code"** and **"System"** (not "code" / "Log in" as primary).
2. **Given** focus on the service **When** choose **"Code"**, **Then** offers
   code-slice-of-service (`012` behavior remains the same).
3. **Given** focus code, **When** choose **"System"** (or return to the system),
   **Then** again system-cut the same context of the service.

---

### User Story 2 — Analysis only slice + breadcrumbs (Priority: P1)

How **architect** from dig-in service I open the analysis **only the slice**
and I'm guided by the breadcrumbs, as in viewing the diagram.

**Why this priority**: analysis of the "whole project" with canvas breaks down the meaning dig-in
(meaning **loss of context UI** don't necessarily need to narrow spawn).

**Independent Test**: with focus backend → "View in the analysis" → analysis
context backend + breadcrumbs + rise to the system.

**Acceptance Scenarios**:

1. **Given** focus backend scheme, **When** **"View in analysis"**,
   **Then** opens the analysis **with reference to this cut** (focus /
   filter/breadcrumbs), rather than "the whole landscape" without context; analysis run
   At the same time, the project does not have to be narrow in terms of service files.
2. **Given** analysis of the slice service, **When** looking navigation **Then** visible
   Crumbs in the spirit of `<Service> system` and actions **Up** / **To the** system.
3. **Given** breadcrumbs **When** **To the system**, **Then** back to system-mind
   landscape / service without losing the project.
4. **Given** overview scheme without focus service **When** looking for
   "View in analysis", **Then** action is unavailable.

---

### User Story 3 — Uniform progress sync/analysis canvas (Priority: P1)

How **architect**, starting sync or analysis being on the "Graph view",
I see the same clear progress as from other portal screens.

**Why this priority**: now canvas often "silent" during long operations.

**Independent Test**: with graph-view start sync (and, if necessary, analysis)
→ the general overlay is visible until completion/ error.

**Acceptance Scenarios**:

1. **Given** open "Graph view", **When** is sync, **Then** can see the overall
   operation progress/status (not empty canvas without feedback).
2. **Given** after sync need analysis **When** confirm and wait **Then**
   the analysis progress is visible on the same type of overlay, without the conflicting buttons
   "Continue" / "Launch" in different locations.
3. **Given** operation failed, **When** look overlay,
   **Then** I see a clear message and can close the stream.

---

### User Story 4 — Who makes API (Priority: P1)

How **architect** on system-cut I see that **frontend causes**
HTTP-endpoints **backend**, apart from the fact that backend **publishes**.

**Why this priority**: closes the question "front same goes for the buck" without breaking `013`.

**Independent Test**: ods-arch after analyzing → dig-in frontend and/or communication
backend-endpoints → there are outgoing "calls" from frontend to known paths
`/api/v1/...`.

**Acceptance Scenarios**:

1. **Given** analysis ods-arch client calls frontend on API backend,
   **When** looking card frontend (inspector), **Then** in **"Calling"**
   there are calls to existing HTTP-endpoints (method + path are recognizable).
2. **Given** the same project and uncrowded system-slice **When** look
   scheme **Then** corresponding edges of the challenges MAY be visible; if the slice
   limited by limits, a card is enough.
3. **Given** the same project, **When** look backend, **Then** publications
   (`exposes` / "publishes") are not substituted by client calls and vice versa.
4. **Given** frontend only causes API itself does not publish them, **When**
   read card frontend, **Then** no claims that it "publishes API".

---

### User Story 5 Publishes vs Calls in the card (Priority: P2)

How **architect**, the card service I see separate **"Published"** and
**"Causes"**, and the endpoint — how is it known (code / OpenAPI) if
there is a source.

**Why this priority**: establishes the semantics of edges without mixing roles.

**Independent Test**: card backend publications; card frontend with
calls; an endpoint with a source tag, if available.

**Acceptance Scenarios**:

1. **Given** service with outbound publications and challenges **When** open
   card **Then** section **"Published"** and **"Causes"** are distinguishable.
2. **Given** endpoint of code **When** watching his card/signature,
   **Then** source code distinguishable from "OpenAPI" if both meet
   in the project.
3. **Given** only contract description without client calls **When**
   we see the connections, **Then** "describes (OpenAPI)" is not awarded for "cause".

---

### Edge Cases

- No focus on the service/node → **"View in analysis"** unavailable
  (does not open the "whole project" with canvas).
- The mapping of call edges to canvas is limited by the slice limits — DoD
  is checked using the card **"Calls"**.
- The client URL did not match any known endpoint → the connection is not
  is created; new endpoint from URL not appear.
- One method+path there are code-, and OpenAPI-endpoint → call is joined to
  preferred according to the rules Assumptions (without merge nodes).
- Service without compose-name / ambiguous client → do not link calls
  "all"; the standard DoD — frontend→backend.
- Sync/the analysis is already underway → restarting does not break the overlay (failure or
  showing the current progress — as is customary in the portal).
- No client challenges in the project → UX-block A still works; block B
  gives empty "Calls" without false connections.
- Signature of nodes/edges in graph-view and `/graph` MUST be chelovecheskimi
  (the name of the service `METHOD path`), no raw compose-/parser-id mostly
  the text; full id only as an auxiliary (hover). Cm. UI-contract.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In the "Graph view" user MUST see actions transition
  in code- and system-slices captions **"Code"** and **"System"**.
- **FR-002**: User MUST have the action **"View in analysis"**,
  opening **analysis screen in the context of the current slice** (focus / filter /
  breadcrumbs). MUST NOT require a separate narrow analysis run only for
  to slice files as DoD `014`. Without focusing on the service/slice node, the action
  MUST be unavailable (disabled or hidden).
- **FR-003**: In the analysis of the slice MUST there should be navigation breadcrumbs (system level /
  service / deeper if available) and actions **Up** / **To the** system.
- **FR-004**: While going sync and/or analysis, a user on the "Graph view"
  MUST see a single status/progress stream of the same family as on
  on the other portal screens.
- **FR-005**: System MUST be able to reflect on the relationship of the role **consumer** service
  (client) → existing HTTP-endpoint ("causes"), separate from
  **provider** ("published") and from **documents** ("describes").
- **FR-006**: System MUST NOT create HTTP-endpoints only
  client URL; joining only already known endpoints.
- **FR-007**: For DoD standard ods-arch system MUST show calls
  **frontend → backend** recognizable way API after a successful analysis.
  DoD extract: calls through **General API-client** base `/api/v1` and
  in a relative way. Raw fetch arbitrary/external URL MUST NOT
  enter the mandatory acceptance.
- **FR-008**: Card service MUST separately show **"Published"** and
  **"Calls"** (the section may be empty). Edge mapping `http_calls`
  on canvas SHOULD if there is space in the slice limits; no edge on
  the diagram with the section filled in **Causes** does not violate DoD.
- **FR-009**: Service publications, but challenges MUST NOT subscribe
  as a publisher API.
- **FR-010**: in the presence of a source endpoint (code / OpenAPI) UI MUST
  allows you to distinguish the sources from each other.
- **FR-011**: `depends_on` (orchestration services) MUST NOT be interpreted as
  "call HTTP API".
- **FR-012**: Feature MUST NOT change, requirements and acceptance **`013`**.
- **FR-013**: Feature MUST NOT enter extracting gRPC / GraphQL / new
  server HTTP-styles / merge OpenAPI↔code as DoD.

### Key Entities

- **Diagram slice**: current focus "Graph view" (service/node), relative to
  that opens the Code / System / Analysis.
- **HTTP-endpoint**: existing system-node (from the code and/or contract);
  method + path; optional source.
- **Publication API**: the connection of the service provider with the endpoint.
- **Call API**: communication of the client service with the endpoint.
- **Contract Description**: document/spec link to endpoint (not runtime-call).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: the standard dig-in signature **"Code"** / **"System"** visible from
  the first screen action; the old "In the code" / "to Enter" are not primary.
- **SC-002**: Out of focus service "View in the analysis" for ≤ 3 step leads
  to analyze the slice with breadcrumbs and return **To the** system.
- **SC-003**: When sync open with "Graph view" user in each
  sees the status of the operation before completion or error when running the pilot checklist
  (there is no "silent" waiting without indication).
- **SC-004**: On ods-arch after analysis frontend card **"Calling"**
  is ≥ 1 call to the endpoint backend by the spirit `/api/v1/...`
  (edges on canvas are desirable, not required for limits).
- **SC-005**: The frontend card does not contain the statement "publishes API" if
  has no publications; backend publications and challenges (if any) are not mixed in
  one indistinguishable pile.
- **SC-006**: Re-acceptance `013` (endpoints backend from the code in system)
  does not regress after the implementation of `014`.

## Assumptions

- Standard UX and consumer-relations project **ods-arch** (in the pilot).
- DoD block B: **frontend → backend**; other clients best-effort only
  with an unambiguous comparison to the service; not DoD.
- DoD extract client: shared API-client `/api/v1` + path (clarify 2026-07-18).
- "Analysis of the slice" = **navigation/context UI**, does not change the boundaries spawn
  analysis (clarify 2026-07-18).
- When two HTTP-endpoint one method+path (code and OpenAPI) call
  **fits preferably to the endpoint from the code**; if there is no unambiguity —
  no connection is created (nodes are not merged).
- The canonical role of the ribs are already set in `009`; `014` fills consumer and
  It shows them in UI without introducing a new "philosophy" of dependencies.
- Types API (async, gRPC, ...) remain in the map semantics-draft; in `014`
  does not extend protocols.
- Shared breadcrumbs/overlays reuse existing portal patterns, without
  the second parallel "UX-"stack is "graph-only".

## Follow-up (outside DoD `014`)

- File / path transitions; infra `connects_to` drawings (see draft).
- **Canvas color legend** for Graph view (code vs focus vs selection vs external)
  and analysis-confirm row fills (new+available green / new+missing red) —
  shared portal UX with Graph UI; tracked in `001` Post-MVP §color meanings;
  **not** owned by `019`.

## Dependencies and risks

- Need a successful analysis endpointname backend (`013` / if OpenAPI).
- The risk of false customer URL (dynamic templates) is a better pass than
  is a false connection.
- DoD includes A and B together (clarify); the lack of time cut depth
  extract B, do not throw consumer out of acceptance.