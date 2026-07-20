# Specification: Graph to the bottom (code-drill in the diagram)

**Feature**: `012-code-graph-bottom`

**Created**: 2026-07-18

**Status**: ✅ implemented (2026-07-18)

**Input**: Deepening "Graph view" from system-component to leaves
already extracted code-canon (module → type → method), with a slice rule
"focus + external links only." The acceptance standard is a project like `ods-arch`
(frontend, backend, elasticsearch).

**Parent Spec**: `specs/001-ods-vision/spec.md` (phase 11)

**Dependencies**: `specs/011-ods-graph-viewer/spec.md` (system canvas);
Canon code + system from `005`–`010` (without extension parsers in this feature).

## Short description

After a review **card system** architect needs **fall into**
of the selected landscape participant (service or other system-component) and software
**levels drill** to see the associated extracted code — up to
the leaves of the Canon of the method (if any), **not** unloading all code component
and **is not** the entire graph of the project is divided into one scheme. The cutoff rule is the same as in `011`:
inside the focus are the contents of the current level; outside are only nodes,
directly related to focus. Graph editing, chart search,
The new parsers and docs/RAG/auth** are not included in **.

## Clarifications

### Session 2026-07-18

- Q: How to start a drill code? → A: From **already selected / open
  system-component** to "Graph view" (landscape service, etc.), not with
  separate start screen code.
- Q: What is considered "component-related"? → A: Explicit edges/parent in canon
  **plus** in their absence — **view-only** match already
  extracted paths / qualified name in the view layer (without writing new ones
  edges in the canon and without new parsers). If this does not provide candidates —
  is an honest empty state.
- Q: The depth of the "bottom"? → A: By **the actual** hierarchy of the canon for the node:
  module/package → type → method (if the method is extracted). In canon, this is kinds
  like `module` / `namespace` / `file` → `class` / `interface` / ... →
  `method` / `function` / …. Levels without data are skipped; fake
  levels are not created.
- Q: The cutoff rule? → A: In `011`: **focus + only external connection**;
  the entire graph of the project is not loaded onto the diagram; when truncated, a clear message is sent.
  in Russian.
- Q: Elasticsearch / infra without code? → A: Valid **empty** code-content
  explanation; system-neighbors are still available rule `011`.
- Q: Search / edit / Database hierarchy / new parsers? → A: **No** in `012`
  (see borders).
- Q: Binding code↔system in the absence of an explicit link in the canon? → A:
  **View-only** already learned routes (option B); the Canon is not updated.
- Q: What is visible immediately after "Logging in" to the service? → A: First **system-interior**
  service in `011`; the transition to a code-layer (modules...) — separate clear step.
- Q: Click on the outer code-neighbor on the slice? → A: As in `011`: single click =
  Selection + inspector; change focus — "Enter" / double-click.
- Q: "Open in diagram" from "Graph Analysis" for code-node? → A: Focus on **itself
  code-node** (slice focus + external); if not — fallback as `011`
  (nearest service / System).
- Q: Is it possible to leave another component in code by "Logging in" to a neighbor? → A:
  **Yes** — free entry to any neighbor of the slice; image restriction —
  By the rule of focus, the return is breadcrumbs / "to the system."

## The boundaries of the spec

### Is included

- drill **down** hierarchy: after system-interior service (`011`) —
  is a separate step in the related code (module/package → type → method, if available);
- the definition of "associated" code: explicit relationships Canon **or** view-only
  matching by already extracted paths (without writing to the canon);
- showing the already extracted nodes and connections of the canon that fall into the **slice**
  current focus (including `calls`, `injects` and other existing types);
  not dump just code component on one screen;
- rule cut **"focus + only external links"** each code-level;
- navigation **back / up / to the system** and breadcrumbs of levels (as a continuation
  UX `011`); for code-cut click on the neighbor = select/inspector, which is obvious
  action ("Log in" / double-click);
- empty and truncated states in Russian;
- mutual transition "open in diagram" / "show in analysis": for **code-node**
  view MUST open with focus on this node (if applicable), otherwise
  fallback `011` (service / System);
- a reference scenario for a project with compose-services and code-graph
  (for example `ods-arch`: frontend, backend, elasticsearch).

### Not included

- editing/deleting nodes and edges in a diagram;
- text search on "Graph view";
- rendering **the entire** project graph on one diagram;
- fake database hierarchy (physics → logic → schema);
- **new** parsers or extension extract/ingest for drill;
- docs (`013`), RAG/MCP (`014`), auth (`015`);
- replacement of the list "Graph analysis";
- is a separate node "Docker" as runtime-wrapper;
- annotations "don't need" / hide nodes (`001` backlog).

### Pending (not DoD `012`)

- **entry** ribs accessories code↔service in the Canon (now only
  view-only by paths); stable ingest-dobor — separate revision;
- database hierarchy after the appearance of extract;
- Parser CLI SDK and other follow-up `008`/`010`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Input code from system-component (Priority: P1)

On the "Graph view", the user first logs into the service and sees
**system-interior** (`011`). In a separate explicit step, it passes into the **code-layer **
and sees the first associated "code-" layer (usually modules/packages), not the entire
code of the project.

**Why this priority**: No explicit transition system → code value "bottoms up"
does not start; the mixing of layers at the first entrance breaks the regression `011`.

**Independent Test**: On `ods-arch` view → enter `backend` →
see the system-part → complete the step in code → the related ones appear
code-Module/package level nodes (or honest empty state).

**Acceptance Scenarios**:

1. **Given** project system-services and code-Canon, **When** included in
   the service from the "System", **Then** first see system-the interior of the service and not
   shows a map of classes/modules at once.
2. **Given** I'm inside system-interior service tied code, **When**
   make a clear transition in code-layer **Then** see the cut first available
   code-of the affiliation level, not all code-of the project nodes.
3. **Given** same code-slice **When** watch scheme, **Then** outside
   only the nodes associated with the focus are visible (rule `011`), without
   is a full graph download.
4. **Given** service without an associated code (no apparent ties and no
   view-only coincidences on the path), **When** turn into code-layer **Then**
   I see an empty status with an explanation in Russian, system-navigation
   it remains available.

---

### User Story 2 — Deepening to the leaves of the Canon (Priority: P1)

The user continues drill: module → type → method (if there is a method in
canon) and at each step sees the contents of the focus and external links for the same
the cut-off rule.

**Why this priority**: "To the bottom" is the essence of the stage; stopping at modules without types
does not close the target.

**Independent Test**: Go through the chain to the leaf on the rich component
code-graph; breadcrumbs reflect the path; "up" returns to the previous level.

**Acceptance Scenarios**:

1. **Given** focus on the module with the child types in the Canon, **When** included in
   the module, **Then** I see the types (and the connected external nodes according to the slice rule).
2. **Given** focus on the type of methods in the Canon, **When** included in the type,
   **Then** I see methods; if there are no methods, the method level is not invented,
   the user realizes that he has reached the bottom of the data.
3. **Given** tools → ... → sheet, **When** press "up" / chips,
   **Then** I return to the selected ancestor without losing the opportunity again
   go deeper.

---

### User Story 3 Connection code in the cut (Priority: P2)

On code-level, the user sees **already extracted** connection Canon
(challenges, etc.) that fall into the focus section in order to understand the dependencies within
the component also applies to external neighbors.

**Why this priority**: the Nodes without edges give little value; fin — part
"everything extracted."

**Independent Test**: the trick known `calls`/`injects` (or other
(from canon) make sure that such edges are visible in the slice if they are incident
focus.

**Acceptance Scenarios**:

1. **Given** in canon, there is a connection between a node in focus and an external node,
   **When** enjoying a slice **Then** this relationship is expressed (external site —
   as a neighbor outside).
2. **Given** have regard only deeply out of focus, **When** look current
   slice, **Then** they do not pull the entire graph of the project onto the diagram.
3. **Given** on the cut visible external code-neighbor **When** single click
   it **Then** offers a choice/inspector without changing the focus.
4. **Given** same neighbor, **When** "Enter" or double-click, **Then**
   the focus shifts to this neighbor according to the cut—off rule, including if
   the neighbor belongs to another system-component.

---

### User Story 4 — Open code-node on the diagram of the analysis (Priority: P2)

From the "Graph analysis" the user opens the selected "code-"node on the "Graph
view" and immediately sees a slice around this node, not just the system map.

**Why this priority**: Bundle analysis↔view for code — the main entrance to
"bottom" without re- drill from the system.

**Independent Test**: In the analysis, select the type/method → "open in the diagram" →
the focus is on this node (or the understandable fallback).

**Acceptance Scenarios**:

1. **Given** selected code-node in the analysis and he is in Canon, **When**
   "open in the diagram", **Then** the preview opens with a focus on this
   the node and the "focus + external links" section.
2. **Given** code-site cannot be to focus on the scheme, **When** same
   action **Then** used fallback `011` (closest service or
   System) with an explanation in Russian if necessary.

---

### User Story 5 — Regression system-view (Priority: P2)

The system card and system-drill `011` continue to work after adding
code-drill.

**Why this priority**: you can't break already adopted system MVP.

**Independent Test**: Go through the scenario "System → service → neighbor / back to
system" on system-landscape or `ods-arch` no mandatory entry in code.

**Acceptance Scenarios**:

1. **Given** updated view **When** remain system-levels,
   **Then** behavior `011` saved (participants, zavisiton/neighbors,
   breadcrumbs to the system).
2. **Given** I delved into code, **When** back "to the system",
   **Then** again see the map system-participants.

---

### Edge Cases

- The component has no associated code (neither explicit links, nor view-only by
  paths) — empty state, without substitution of someone else's code project.
- In the canon, there is a type without methods — the bottom is on the type; the method level is not
  It is being created.
- The slice exceeds the volume limit of the diagram — truncation with a message in Russian
  (principle `011`/`010`); zoom does not negate the data truncation.
- Project without system-members — empty behavior system from `011`;
  code-drill from system does not start.
- Re—entry to the same node is a stable slice (the same nodes/connections at
  of the same canon data).
- The external code-neighbor belongs to another component — "Log in" anyway
  changes focus; user can come back in breadcrumbs / "to the system."

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: User MUST have the opportunity of system-interior
  component on the "Graph view" **separate clear step** go to
  to the associated code-slice of the first available membership level.
  First Log in on the service card system MUST keep behavior `011`
  (system-interior). The connectedness of MUST is determined by the explicit connections of the canon;
  in their absence, MUST may be allowed view-only matching is already
  the extracted paths / qualified name **no** entry in the Canon and **no**
  new parsers.
- **FR-002**: At every level drill MUST rule should be applied **focus +
  external links only**; MUST NOT upload the entire project graph to the diagram.
- **FR-003**: Hierarchy drill MUST own Canon:
  module/package (`module` / `namespace` / `file`) → type (`class` /
  `interface` / ...) → method (`method` / `function` / ...) in the presence of;
  missing levels MUST NOT to fabricate.
- **FR-004**: The MUST slice displays the nodes and connections that have already been extracted.
  of the canon, incident to the focus (including the known types of connections of the code- layer).
- **FR-005**: Navigation MUST support recess, a return to the level
  up, the transition to the system and displays the path (breadbreadcrumbs) in Russian.
- **FR-006**: If neither explicit nor view-only mapping the paths are not
  they give candidates, MUST a clear empty state is shown in Russian
  without data substitution of another component.
- **FR-007**: truncation cutoff volume MUST seem to explain
  in Russian; scaling the loaded slice MUST NOT cancel truncation.
- **FR-008**: System-navigation `011` MUST preserved (regression).
- **FR-009**: Through the "Graph view" MUST NOT be able to change
  canon (there is no successful deletion/addition of nodes or edges).
- **FR-010**: Feature MUST NOT require a new parser or fictional
  DB hierarchies for closing acceptance.
- **FR-011**: Signature UI and messages to the user MUST to be in Russian.
- **FR-012**: View-only mapping MUST NOT to create, modify, or
  delete nodes/edges of the canon.
- **FR-013**: MUST NOT mix at one initial login screen in service
  system-children and code-modules as a single mandatory starting section.
- **FR-014**: On code-cut single click on a node (including external neighbor)
  MUST can select a node and show inspector; change of focus MUST demand
  clear the "Enter" or double-click (as in `011` for system). Neighbor's Entrance
  MUST NOT be limited to the initial system-component: any neighbor of the slice
  let's say; the return is through breadcrumbs / "to the system."
- **FR-015**: "open to the scheme" from the "Graph analysis" for code-site
  MUST open a preview with focus on this node and a slice of "focus + external
  communication"; if impossible — MUST apply fallback `011` (closest
  service or the System) with an explanation in Russian if necessary.

### Key Entities

- **System-component (input focus)**: member of the landscape (service,etc.)
  which starts with code-drill.
- **Code-node**: node code-layer Canon (`module` / `namespace` / `file`,
  type, method/function, etc.).
- **A slice of the** scheme: a set of nodes and edges "inside the focus + external neighbors".
- **Navigation path (breadcrumbs)**: ordered levels from the system to the current one
  the focus.
- **The bottom of the canon**: the deepest level for which the canon has
  are child (or leaf) nodes; it doesn't go any further than drill.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the reference project compose-services and code graph
  (`ods-arch` or equivalent) user in one continuous session
  goes through the path "System → Service (system-interior) → code-layer → sheet
  canon (type or method)" no dead ends navigation.
- **SC-002**: In the same session, there is no attempt at any "code-" level on the circuit.
  show all code-project nodes at once; the slice is limited by focus and external
  connections.
- **SC-003**: For of the service without an associated code user gets empty
  is a clear text state and can return to the system without error.
- **SC-004**: Scenario system-only from `011` ("System → tools → neighbor /
  back") successfully reproduced after the introduction `012`.
- **SC-005**: The canon cannot be changed through viewing (there is no successful scenario
  edit/delete nodes or links).
- **SC-006**: at least two different system-components of the reference (e.g.
  frontend and backend) open distinguishable code-slices, if in Canon they have
  different connectivity; slices do not mix into one "whole project".
- **SC-007**: From the "Graph analysis" for an existing code-host standard action
  "open in diagram" opens a view with focus on the "**"this "**" node
  (`resolve_status=exact_code` or equivalent) or **explicit** fallback
  `011` and an explanation in Russian - not a silent map of the system without an explanation.

## Assumptions

- Canon code + system already built pipelines `005`–`010`; `012` only
  reads ready-made nodes and edges for viewing slices.
- System canvas and menu "Graph view" is already there (`011`).
- Belonging of code to system-component: explicit canon data first;
  otherwise view-only by already extracted paths; if there are no candidates, empty
  condition. There are no new parsers or membership entries in `012`.
- Pilot without auth; one active project per session.
- The cut volume limit is set in plan as the technical ceiling; in the spec
  fixed the principle of truncation and UX.
- Standard `ods-arch` available as a local fixture/repository for acceptance.
- Docs / RAG / auth remain the stages `013`–`015` not block `012`.
