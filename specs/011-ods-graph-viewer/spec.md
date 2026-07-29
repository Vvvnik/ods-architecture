# Specification: System Graph View (diagram)

**Feature**: `011-ods-graph-viewer`

**Created**: 2026-07-15

**Updated**: 2026-07-18

**Status**: ✅ implemented (2026-07-18). System MVP closed (menu, map,
drill focus, breadcrumbs, bundle analysis↔viewing, caps/empty). Follow-up
code-drill "bottoms up" — the stage **`012`**. Graph View **protocol filters**,
**per-service HTTP endpoint grouping**, and **isolated-node parking** were
added later with **`024-grpc-from-proto`** (2026-07-28); see
`specs/014-graph-view-ux/spec.md` §Current Graph View behavior.

**Entrance**: a live preview of the canonical graph (code + system) with
drill-down by system participants; separate menu item from the list
"Graph analysis". Source: `ods-help/requirements/011-ods-graph-viewer-draft.md`.

**Parent Spec**: `specs/001-ods-vision/spec.md` (phase 10)

**Dependencies**: `specs/006-project-graph/spec.md`;
`specs/007-portal-scale-ux/spec.md`; `specs/008-code-graph-depth/spec.md`;
`specs/009-system-landscape/spec.md`; `specs/010-scale-pipeline/spec.md`

## Short description

The architect and the developer should **see the outline of the system** (services, bases,
tires, etc.) in the diagram and **fall inside** of the selected participant, without
get lost in thousands of code symbols. The current graph list screen is saved
under the name **"Graph analysis"**; new screen **"Graph view"** shows
an interactive diagram of the rule: **focus inside + out only related
The participants are**. Graph editing is not included in this feature.

## Clarifications

### Session 2026-07-15 (from a draft and discussion)

- Q: Two screens or one screen mode? → A: **Two menu items**: "Graph analysis"
  (former "Graph", lists) and "Graph view" (schema).
- Q: How does the preview open? → A: **"System" level** — participants
  (services + infos-peer's), without classes/methods.
- Q: What's inside service at the first entrance? → A: Only **system-content**
  (endpoint, project, etc. according to service affiliation). Code — deeper,
  is not the start screen of the service.
- Q: A click on an external neighbor? → A: **Change of focus** (enter the neighbor);
  "outside" to the entrance is a simplified view.
- Q: database in the diagram in MVP? → A: **Flat** node from already extracted data
  (logical connection name, etc.) + who is connecting. The hierarchy
  physics → logic → scheme **not draw** until no nodes in the Canon
  (target UX recorded for future extract not MVP `011`).
- Q: Broker and topics? → A: Broker — peer on "System"; topics **inside**
  broker; if the broker is not extracted, the topic can be peer, so that it does not
  lose a node.
- Q: Search on view? → A: **Not in MVP**; search in "Graph Analysis", from there
  switching to a scheme with the same node.
- Q: Is it possible to load the entire graph onto a diagram? → A: **No**; focus slice only
  with a limit; clear message when truncated.
- Q: Are we extending parsers/canon for the sake of the scheme? → A: **Not in MVP**; based on
  existing affiliation (`parent` / connections). Improving the database hierarchy —
  separate follow-up data.
- Q: Code (class/method) in the diagram in DoD `011`? → A: **No** — acceptance MVP
  only **system**-Navigation (System → Service/broker/database → Neighbors).
  **Be sure to mark:** need further deepening **to the "bottom"** (module →
  type → method, etc. according to canon) separate follow-up after closing
  system-MVP; not a forgotten debt.
- Q: "Open in the diagram" for node code? → A: If the nearest one is located
  **service**-context - open the preview with focus on it; otherwise, the level
  "System" + a short explanation in Russian. Code-focus in the diagram in MVP is not
  We promise.
- Q: There are no system-participants in the project? → A: Graph View screen with **empty
  with the status** (the system map is empty / not built) and the transition to
  "Graph analysis"; not a redirect or substitution of the start code-dump.
- Q: Is the truncation priority at the "System" level? → A: First, **services**, then
  related info; the rest is truncated with a message in Russian. Numeric
  limit — plan. Scale/pan at **already loaded** slice — Yes; zoom
  **does not cancel**data truncation.
- Q: Click on a participant on the chart? → A: Single click = **selection + inspector**;
  the change in focus (input) — explicit action (**"Login"** or double-click).

## The boundaries of the spec

### Is included

- the rename menu item list screen **"Graph analysis"** no
  the loss behavior of list/tree/search (`006`/`007`);
- new item **"Graph view"** and interactive diagram screen;
- level **"System"**: application services and infrastructure participants
  (separate database nodes, brokers, external API, etc. according to the canon);
- drill-down rule **focus + only external connection**;
- sign in **service** (system-content) and **broker** (tops, if any);
- focus on **database** (and similar information without internals): information from
  canon + related services from the outside, without fictitious schemes;
- navigation: crumb levels "up" / "the system", a change of focus
  to the external neighbor;
- mutual transition "open in diagram" / "show in analysis" by node
  the project;
- circuit volume limitation and truncation message (after scale `010`);
- zooming and moving ** of the loaded** slice in the diagram (zoom is not
  replaces data truncation);
- empty/erroneous states consistent in meaning with an inaccessible graph
  (`006`).

### Not included (accepted MVP `011`)

- editing/deleting nodes and edges in a diagram;
- annotations and hiding by "not needed" (`001` backlog);
- saving node coordinates between sessions in the platform storage;
- rendering **the entire** project graph on one diagram;
- text search on the "Graph view" screen;
- fake database hierarchy (physics / SQL-schema), missing from canon;
- extension parser and model OBD (physics→logic→scheme) — **follow-up
  data**, not a blocker closure UX `011`;
- **drill in code to the "bottom"** (module / class / method on the scheme) — **not DoD
  MVP**, but **mandatory follow-up** after system-view (see below);
- exporting schema to files, RAG, auth;
- replacement tree files workspace scheme.

### Deferred (be sure to fix, not DoD MVP `011`)

- **The deepening of the "bottom" code-Canon** — made in **`012-code-graph-bottom`**:
  from the service (or related context) — module/package → type → if necessary
  a method with the same "focus + external links only" rule. MUST NOT forget
  as the next product step after the closure of system-MVP `011`.
- Database hierarchy physics → logic → schema — when will the data appear extract
  (see the target UX below).

### Target UX after the data appears (not DoD MVP)

When extract will give the hierarchy of a database, viewing **MAY** collapse drill
levels: physical instance → logical database → scheme, with the same rule
the focus. There is no data — behavior MVP (§ Clarifications by DB).

## User Scenarios & Testing *(mandatory)*

### User Story 1 Two menu items (Priority: P1)

The user in the left menu sees **"Graph analysis"** and **"Graph view"**.
The first leads to the familiar list screen; the second leads to the diagram.

**Why this priority**: No explicit separation cannot be distinguished parsing lists
from system contour inspection.

**Independent Test**: Open both points on the project with a ready graph;
make sure that the lists and the diagram are different screens, the menu captions are in Russian.

**Acceptance Scenarios**:

1. **Given** portal to the selected project, **When** look at the menu, **Then**
   I see "Graph analysis" and "Graph view" (there is no "Graph" item without specification).
2. **Given** project with the count, **When** open the "Graph analysis", **Then**
   the tree/search/links are available as before the renaming (regression).
3. **Given** project with the count, **When** open the "Graph view", **Then**
   The schema screen opens, not the "layout" analysis list.

---

### User Story 2 Card system when you open a view (Priority: P1)

When entering the "Graph view", the user immediately sees **a large map
system participants**: services and infos (separate databases, brokers, etc.), without
code details.

**Why this priority**: the Main value of the view — review of the "who is who" for
seconds.

**Independent Test**: On the fixture system-landscape to open a safe and
list the visible types of participants; classes/methods not at the start.

**Acceptance Scenarios**:

1. **Given** complete analysis system-parties **When** open
   "Graph view", **Then** the diagram shows the "System" level with separate nodes
   services and infos (multiple databases/buses — multiple nodes).
2. **Given** the same entrance, **When** look launch a scheme **Then** it
   no of nodes class/method as the main contents of the card.
3. **Given** topics associated with the broker **When** - level "System",
   **Then** topics do not have to be peer'AMI close to all services
   (they open when logging into the broker); if the broker is not extracted —
   topic MAY to stay on the map, not to divide.

---

### User Story 3 — the entrance to the party: focus + external communication (Priority: P1)

The user is logged into a member (primarily a service). The diagram remains
focus contents and **only** external nodes that have connections;
the rest of the system is hidden.

**Why this priority**: This is the main rule of navigation; without it, the scheme
is becoming a dump again.

**Independent Test**: Log in to the service on the demo landscape; make sure that
the unrelated service is gone, and the related databases/neighbors are left outside
is simplified.

**Acceptance Scenarios**:

1. **Given** level "System", **When** single click service S,
   **Then** S selected available inspector, the focus of the level of "System" has not yet
   has been replaced.
2. **Given** chosen service S, **When** "Enter" or double-click, **Then**
   Focus on S: inside — system-contents (if any), outside — only
   related participants; service without links to S is not shown.
3. **Given** focus on the service S, **When** watching external neighbor,
   **Then** it is shown simplified (without its internals).
4. **Given** focus on broker **When** part of it ("Log in" /
   double-click), **Then** inside — topics (if any) outside —
   related publish/consume members.
5. **Given** database selected **When** are in focus, **Then** no
   of fictional "schemes"/"physics"; information from the canon is visible from the outside.,
   related to this database.

---

### User Story 4 — Change focus and breadcrumbs (Priority: P2)

The user explicitly logging in ("Log in" / double-click) shifts the focus to
of the external neighbor; returns up to the system in breadcrumbs.

**Why this priority**: Binds an overview of continuous study without
must return to the root every time.

**Independent Test**: Api → neighbor Orders → little "System"; chain
the magic tricks are reproducible.

**Acceptance Scenarios**:

1. **Given** external neighbor in the diagram **When** "Enter" or double-click,
   **Then** it becomes the focus; the former focus is available through breadcrumbs /
   "upstairs." A single click on a neighbor only selects it (inspector).
2. **Given** depth more than one level, **When** select "To system",
   **Then** returning to the "System" level.
3. **Given** drill inside system-part of the service (if it has child nodes),
   **When** go deeper on system, **Then** again, the rule-of-focus +
   external links only (code to the "bottom" is not a requirement of this scenario MVP).

---

### User Story 5 — Bundle analysis ↔ view (Priority: P2)

From the lists, you can open a node in the diagram; from the diagram, you can show the node in the analysis.
the same project.

**Why this priority**: Search is already in the analysis; the view does not duplicate search.

**Independent Test**: Find a node in "Graph Analysis" → "Open in Diagram";
backtracking saves the project and, if possible, the same node.

**Acceptance Scenarios**:

1. **Given** selected **system**-host in "Graph analysis", **When** "Open on
   scheme", **Then** opens the "Graph view" of the same project with a focus on
   this participant (or the level where he is visible).
2. **Given** selected **code**-host in "Graph analysis", **When** "Open on
   pattern" **Then** if you find the closest service-context — focus on it;
   otherwise the level of "System" and a short explanation in Russian (without code-focus
   in the diagram in MVP).
3. **Given** selected node on the diagram, **When** "Show analysis",
   **Then** opens the "Graph analysis" of the same project with the same node
   (as far as the list UI allows).

---

### User Story 6 — Major count does not break the safe (Priority: P1)

On a project with a large number of nodes after `010`, the scan does not attempt
load the entire system at once; the map remains responsive when truncated —
clear Russian text.

**Why this priority**: No limit canvas meaningless after scale-pipeline.

**Independent Test**: Open viewing on a project with a large node_count;
check that the start fits the criterion SC and there is no full dump.

**Acceptance Scenarios**:

1. **Given** project with great Earl **When** open the "Graph view",
   **Then** the first display of the "System" level occurs without attempting to unload
   all nodes of the project on the diagram.
2. **Given** slice exceeds the allowable volume of the show, **When** system
   truncates the scene, **Then** the user sees a clear message in Russian
   and can narrow the focus/return.
3. **Given** truncation at the level of "System", **When** map remains
   incomplete set, **Then** services are preferred among the remaining ones, then
   linked infra (not a random tail by name only).

---

### Edge Cases

- There is no analysis / graph is not built — the same meanings of "graph is unavailable" as in
  analysis (link to workspace / sync).
- The graph is empty or ingest partial without nodes - empty state in Russian.
- The analysis is, but **no system-participants** level "System" — empty
  the viewing status is in Russian + switching to Graph Analysis (not a redirect,
  not show code-roots at the start).
- The service does not have system-children — the service's focus shows an empty "inside" and
  external links, if any.
- The broker has no topics — the broker's focus is without internals + external connections.
- A topic without a broker is a topic at the "System" level like peer.
- Changing the analysis run — the scheme is reset to the current snapshot.
- If there is no selected project, it is impossible to open a meaningful preview (as in
  analysis).
- "Open in the diagram" from code without finding service — "System" + explanation,
  not a deadlock error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Portal MUST show in the menu item: **"Graph analysis"**
  (list screen) and **"Graph view"** (diagram).
- **FR-002**: "Graph analysis" MUST keep the possibilities of the tree nodes, search
  and view your communication project made in `006`/`007` (regression).
- **FR-003**: "Graph view" MUST when you first open show level
  **"System"**: participants system-layer (services and infra-peer's according
  Kanon), without classes/methods as the main content.
- **FR-004**: At the "System" level, each application service and each
  infro-participant instance (separate database, separate broker, etc.) MUST
  displayed as a separate node, if there is such a node in the canon.
- **FR-005**: Topics/queues MUST normal to relate to the content broker;
  If there is no broker in the canon, the topic MAY will be displayed as a participant.
  of the "System" level.
- **FR-006** At any level view system MUST show only:
  (a) the contents of the current focus; (b) external participants associated with the focus
  (or its contents) by the edges of the canon. Other participants MUST NOT will be displayed.
- **FR-007**: an External entity on the diagram MUST appear simplistic (without
  revealing its internals) until the user makes it the focus.
- **FR-008**: Entrance to **service** MUST show system-content of the service
  (by affiliation in the canon) and external links; MUST NOT dump
  class/method the scheme MVP. Drill code to the "bottom" — out of receiving MVP
  (the "Postponed" section), does not block the closing of the navigation system-.
- **FR-009**: Entrance to **broker** MUST show related topics (if any)
  and external participants publish/consume.
- **FR-010**: Focus on **database** (and similar infra without hierarchy in
  the Canon) MUST only show information from the existing data and external
  related services; MUST NOT Reinventing physics/circuit levels.
- **FR-011**: User MUST be able to change the focus on the external
  the neighbor and go back to the breadcrumbs / "up" / "to the system". Single click
  at the party MUST can select to show information (inspector) **no**
  automatic focus change; entry into focus MUST is performed separately
  by action ("Log in" and/or double-click).
- **FR-012**: User MUST be able to move from node to
  "Graph analysis" to "Graph view" and back for the same project.
  For **system** site viewing MUST to open with the focus on him (where
  is applicable). For **code** site in MVP: focus on the nearest **service**-context,
  if it is defined from the canon; otherwise, the "System" level and the explanation on
  in Russian. MUST NOT require showing the most code-node on the diagram to follow-up
  "bottoms out."
- **FR-013**: "Graph view" MUST NOT load and paint the full set of nodes of the
  project graph; MUST give a slice for the current focus with an explicit volume
  limitation and message when truncated (in Russian). At the "System" level when
  truncating MUST maintain priority: first the nodes **service**, then the
  associated infra; other members MAY be discarded with an indication that the
  list is incomplete.
  **Additionally (2026-07-27):** root System overview MUST load peer kinds before
  inside kinds so service↔service edges (`depends_on`, `connects_to`) present in
  store are visible; focused service insides MUST be capped with endpoint
  de-priority (research R11 / tasks T045–T046).
  *(Contrast FR-015: here **policy truncation and UX limit**, not a fact
  the availability API.)*
- **FR-014**: User MUST be able to scale and
  move **already shown** cut in the diagram. Zoom MUST NOT
  is considered a replacement for data truncation (FR-013).
- **FR-015**: System MUST provide to view a consistent cut
  "focus + external links" (server preparation of the slice is part of the feature; details
  of the contract — in plan).
  *(Contrast FR-013: here **duty server-side slice** as
  data source for UI.)*
- **FR-016**: User MUST NOT be able to edit or delete
  nodes and edges of the canon via a "Graph view".
- **FR-017**: the coordinates of the nodes in the diagram MUST NOT be stored in permanent
  platform storage as part of the canon (session layout MAY).
- **FR-018**: In the "Graph view" in MVP MUST NOT be a separate text
  graph search.
- **FR-019**: Empty and erroneous view state MUST be in Russian and
  are consistent in meaning with an inaccessible/empty analysis graph. If the analysis
  there is, but members of "the System" no, MUST show a separate empty
  viewing status with the ability to switch to Graph Analysis (without
  automatic redirect and without starting from code-nodes).
- **FR-020**: the Nodes in the diagram MUST to vary by type of participant (color/shape/
  signature kind) so that the service, database, broker, etc. are different without raw
  id. Types of fins MUST be visible for at least **signature hover and/or
  when selection** (i18n as in EdgeTable analysis); permanent signature on
  each edge at density MAY is hidden.
- **FR-021**: MVP `011` MUST NOT require extension parser for the scheme;
  the content belonging to the service is based on existing connections /
  of the parent in the canon. The membership spaces are research/follow-up plan, not
  hidden breaking FR-008.
- **FR-022**: Graph view MUST let the user resize the **right inspector** vs
  the canvas with a vertical splitter (same interaction habit as Workspace /
  Graph analysis column widths). Width MUST persist on the client between
  sessions; canvas and inspector MUST keep configured minimum widths. Shared
  preference with Graph UI is allowed (one client key for both screens).

### Key Entities

- **Party system**: node Canon-level review (service, database,
  broker, external_api, storage, …).
- **Focus**: the current participant or a nested entity relative to
  A cross-section of the scheme is being built.
- **Viewing slice**: a set of nodes "inside the focus" + simplified external ones
  neighbors + edges between them; never the entire graph of the project.
- **"System" level**: no focus / root; participants are shown
  the review.
- **Navigation breadcrumbs**: a chain of tricks from the "System" to the current one.
- **Graph analysis / Graph view**: two modes of operation with one canon
  of the project.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the fixture `system-landscape-demo` no later than
  **10 seconds** after opening the "Graph view" at the "System" level
  the operator sees **≥1** node `service` and **≥1** infra-node
  (`database` / `broker` / other peer out of the fixture data), without class/method
  as the main content of the card (quickstart §2).
- **SC-002**: After logging in to the service diagram **remains** participants without
  connection with the service; related external parties persist.
- **SC-003**: the Opening of viewing on a project with a large count **not** results
  attempts to display all project nodes; when truncated, the user sees
  explanation in Russian; on the "System" in the remaining section is saved
  priority of services, then related information.
- **SC-004**: After the feature is delivered, the list "Graph analysis" undergoes regression:
  The project's tree, search, and links work as they did before the renaming.
- **SC-005**: The canon cannot be changed via the "Graph view" (there is no successful
  scripts for deleting/adding a node or connection).
- **SC-006**: Focus on node DB **not** shows the levels physics/circuit, which
  there is no analysis in the data — only canonical information and related services.
- **SC-007**: at least **one** full scenario "System → service →
  external neighbor / back to system" played successfully on
  system-landscape demo without navigation dead ends.
- **SC-008**: The feature artifacts (spec/plan/tasks) are clearly fixed
  follow-up **"scheme to the bottom code"** as a stage **`012`** after
  system-MVP closure MVP `011` does not need to implement this drill.

## Assumptions

- Canon code + system already built pipelines `005`–`010`; view only
  reads ready-made nodes and edges.
- Pilot without auth; one active project per session as in the current portal.
- The signatures UI and the messages are in Russian.
- The target database hierarchy (physics → logic → schema) is desirable productively, but
  data will appear as a separate extract follow-up; MVP is honest to the current canon.
- The reference volume of the slice in the diagram (on the order of hundreds of nodes/edges) is set in plan
  as a technical limit; the spec fixes the principle of truncation and UX.
- Stack drawing diagrams and details HTTP-contract slice in `plan.md` not in
  Custom FR.
