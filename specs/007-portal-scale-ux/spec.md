# Specifications: UX scale of the portal (columns, graphs, cascade of status)

**File**: `007-portal-scale-ux`

** Created**: 2026-07-13

**Statute**: Agreed

**Input**: Scale the portal for large projects: adjustable panels
workspace, hierarchical view and search by canonical graph (`006`),
The cascading status of the folder in the file tree.
`ods-help/requirements/007-portal-scale-ux-draft.md`.

**Parental specs**: `specs/001-ods-vision/spec.md` (stage 6)

**Dependency**: `specs/003-portal-mvp/spec.md` (workspace, tree, status)
`specs/006-project-graph/spec.md` (canon, min. UI Graph)

## A brief description

The user works with large projects: changes the width of three panels conveniently
workspace, puts the status of a whole tree branch in one action (cascade down) and
oriented in thousands of column nodes through a **loaded** and **search** hierarchy
without a graphic scheme (canvas).

## Post-implement notes (2026-07-14)

Briefly, what we did after the main implementation `007` (pilot bugfixes)
and the code ' s consistency):

1. **URL of the column**: canon `/projects/:projectId/graph` (as workspace); `/graph`
   A compatible redirect when an active project is in progress.
2. **Edges from `/` to nodeId**: wildcard route `GET .../nodes/*` + nginx without
   The standard deviation is `%2F` (otherwise the proxy broke edges/ancestors).
3. **TypeScript hierarchy**: the file symbols are inherited by the `parent_id` module (ingest)
   `symbols-model-v1` + parser); `typescript.ingest` — thin re-export.
4. **Shirts of column column**: splitter + `ods.graph.panelWidths.v1` (separately from
   workspace).
5. **Stale SPA after rebuild**: `reloadIfStaleBundle` + `Cache-Control: no-store`
   It's for HTML.
6. **Cleaning**: dead `useGraph` (flat) and `NodeList`; common
   `startColumnResize`; empty-state types in `types/graph-empty.ts`.
7. **T024/T026 task set: UI pagination `GraphSearch`; integration
   `graph-search.test.ts`; common `panelStorage` + clamp width of nodes.
8. **Analysis vs modals**: `isParserRunActive` (only a drive) separately from
   `isAnalysisRunning` (modalities + drive); UI/refresh of the column  by `isParserRunActive`.
9. **Re-audit**: immutable `GraphNodeTree`; clamp workspace on the container;
   Stale-guard `GraphSearch`; zod `q` ≥2; specs 003/006/007  runtime.
10. **Highness of search results**: horizontal splitter +
    `ods.graph.searchResultsHeight.v1` (common for the Nodes/Edges column).

## Clarifications

### Session 2026-07-13

- Q: Screen Graph  hierarchy and flat list? → A: Only hierarchy; flat list is removed from screen Graph
- Q: Cascade of folder status with thousands of descendants? → A: Synchronous and atomic: complete success or complete failure (without partial application)
- Q: Search area by default? → A: Always both (nodes and edges) in one query; groups/tabs; criteria filters  later (outside FR `007`)
- Q: Click on the search result (node)? → A: Open the path to the node in the hierarchy, scroll through and highlight
- Q: Click on the search result (rebar)? → A: Show the rebar in the links view and unlock/separate the node `from`
- Q: Sync-inheritance `not_needed`? → A: Status Not needed, hand mark mark in the heir = no (`status_manually_set=false`)
- Q: Soft-limit cascade? → A: With >5000 active descendants  rejection without recording (see Assumptions)

## The limits of heat

### It 's coming in .

- the width of the three columns of workspace (tree / file / property) with
  preserving preferences between sessions and minimum widths;
- The hierarchical view of the nodes of the graph (rounded levels, unfolding with subloading)
  The only way to navigate the nodes on the screen is by the
  Graph (the flat list is not kept);
- Search canonical nodes and edges **with one query** (both types at once) with
  by showing the results separately and moving to the selected element;
- cascade of status change **folders** down to active descendants; inheritance
  `not_needed` for sync elements under the hand-marked ancestor.

### Not included

- editing / removing nodes and edges of the column in UI;
- canvas / interactive scheme (→ `010-ods-graph-viewer`, after `008`/`009`);
- hiding the nodes of the column by the tree status `not_needed` (post-MVP backlog `001`);
- policy of preservation of the graph markings at the time of re-sync/analysis (delayed at `001`);
- the flat packed list of nodes on the screen Graph (replaced by hierarchy);
- Search filters/facetes (by tree status, kind, language, type of edge, etc.)
  **not in `007`**; not mandatory criteria are allowed in plan/contracts
  Later, without any obligation of this kind;
- the change in the text of the spec `002`/`003`  new behaviour is described and implemented in `007`;
- auth, RAG, editing the files in the repository.

## User Scenarios & Testing *(mandatory)*

### User Story 1  Cascading of the folder status (Priority: P1)

As a developer, I change the status of the folder in the tree (for example, Not needed),
And all the files and folders that are inserted are given the same status so that they don't rule.
Each element of the branch is hand-held.

**Why this priority**: Without a cascade , hand-marking large branches is impractical .
Now the status changes only in the folder itself.

**Independent Test**: Changes in the status of the posterity folder → for all active posterity
The same status and handwriting mark; the file status change doesn't affect the neighbors.

**Acceptance Scenarios**:

1. **Given** folder with attached files and status subfolders
   Finds automatically, **When** the user puts the folder Not needed,
   **Then** folder and all active descendants get Not needed and sign
   The handwriting.
2. **Given** folder with descendants, **When** user puts in the folder Need
   (or another status from the element status set), **Then** the same status
   Cascading down the branch of active offspring.
3. **Given** the offspring had a handwritten Need, **When** parent folder
   It's not needed, then the action on the branch wins.
   No need for a handwritten note.
4. **Given** folder was Not needed, **When** it's up to Needed or
   Finds automatically, **Then** the status of the children **not** changing
   automatically (hand marks inside are not wiped).
5. **Given** status change **file** (list), **When** the user saves
   The status, then, only this element changes, no cascade.
6. **Given** ancestor with Not needed and handwritten, **When** sync creates
   or updates the element under that ancestor without its own handwriting,
   **Then** the new/updated element gets Not needed as **inheritance**
   (hand mark = no) not as a separate user mark.
7. **Given** project with old data without mass migration, **When**
   Next PATCH folders or sync, **Then** cascade/inheritance activated
   for the affected elements; full migration of indices is not mandatory.
8. **Given** cascade on the folder cannot be completed entirely (storage error)
   or other refusal), **When** the operation is interrupted, **Then** the status in the branch
   no partial changes are persisted and the user sees a localized error.
9. **Given** has more than **5000** active descendants, **When** user
   changes the status of the cascading folder, **Then** the operation is rejected
   without changing any status and a localized error is shown.

---

### User Story 2  Hierarchy of the nodes of the graph (Priority: P1)

As a developer, on the graph screen I see the nodes in the tree.
Parent-child relationships are shown hierarchically instead of as a flat list.
The list of nodes.

**Why this priority**: The flat list with fixed offset is not being scaled
for large projects after `006`; in `007` it is replaced by a hierarchy.

**Independent Test**: Open the `/graph` project with a deep hierarchy → top
level is rolled → opening the node shows the children in portions; flat list
There are no nodes on the screen.

**Acceptance Scenarios**:

1. **Given** project with the hierarchy of the canon nodes, **When** user opens
   Graph, **Then** shows the tree, rolled up on the top level
   (the root/top nodes are visible, the offspring are hidden before they are revealed);
   There's no list of all the nodes.
2. **Given** a collapsed node with children, **When** the user expands it,
   **Then** direct descendants are loaded; when more children are available,
   a **Load more** action is displayed.
3. **Given** screen Graph after introducing `007`, **When** user searches
   There's no way to open the previous flat list of nodes, so there's no way to open the previous flat list.
   (navigation  hierarchy and search).

---

### User Story 3  Search for the nodes and edges of the graph (Priority: P2)

As a developer, I search nodes and edges by text and navigate to the matching
graph element.

**Why this priority**: With thousands of nodes , hierarchy alone is not enough .
You need a quick search for a name, a route, a type of connection.

**Independent Test**: Enter a query → see separate results for each node
And then the edges click → and then the right element is selected/opened.

**Acceptance Scenarios**:

1. **Given** the Graph screen with canonical data, **When** the user submits
   a query, **Then** one request searches nodes
   (name, path, type, qualified name), and by edges (type, from, to);
   and edges (type, from, to); results are grouped into **Nodes** and **Edges**.
2. **Given** a node result, **When** the user selects it,
   **Then** the hierarchy expands to that node, scrolls to it, and highlights it.
3. **Given** an edge result, **When** the user selects it,
   **Then** the edge is shown in the links view, the `from` node is selected,
   and the hierarchy expands to that node.
4. **Given** a lot of coincidences, **When** the user browses the results,
   **Then** results are paginated and bounded by a per-page limit.
5. **Given** an empty or too short request (as per the rules in Assumptions),
   **When** search is requested, **Then** the system shows a localized validation
   message and does not run an unbounded query.
6. **Given** search results are open, **When** user pulls
   The horizontal divider under the list, **Then** the height of the list changes
   within the minimum/maximum limits and is persisted between sessions for both
   the Nodes and Edges result tabs.

---

### User Story 4  Adjustable width of workspace panels (Priority: P2)

As a developer, I change the width of the column.
I drag the separators and see the same proportions after reopening the portal.
The Property panel remains legible.

**Why this priority**: Improves everyday work with the workspace `003`, but
It doesn't block the scale of the graph and cascade of status.

**Independent Test**: Change width → restart the workspace page →
The width is restored; the column is not shrunk to a minimum → below the minimum.

**Acceptance Scenarios**:

1. **Given** open workspace with three columns, **When** user
   drags the dividers, **Then** each panel width changes within the configured
   minimum and maximum bounds.
2. **Given** user entered widths, **When** he closes and again
   opens the project workspace, **Then** the saved widths are applied
   (preference between sessions).
3. **Given** attempt to compress Properties (or other column) below the minimum,
   **When** drag, **Then** the column stops at the minimum
   The width of the reading.

---

### Edge Cases

- The PATCH status changes only her.
- Deep embedding and thousands of descendants at cascade: operation ** synchronous and
  atomic**  or all affected elements are updated or the state of the branch
  **not** changes partially; if you refuse  clear localized message
  (timeout/error without half of the status).
  The soft-limit of the pilot: >5000 active descendants → denial without record (Assumptions). -->
- Over 5000 active descendants in the folder: cascade is not executed (rejected before recording).
- The knot of the count without children: the disclosure shows an empty state, without error.
- A search without a match: a blank list and a clear message.
- Selection of an edge from search: anchor the hierarchy on node `from`; node `to` is shown in
  Details/review of the links, without second disclosure.
- Sync and PATCH cascade simultaneously: final status agreed with
  the rules of inheritance `not_needed` and hand markings (see US1).
- Old project: before the first PATCH/sync cascading can be
  It's not complete. It's expected without migration.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The user MUST be able to change the width of the three columns
  workspace by dragging the partitioners.
- **FR-002**: The system MUST store the selected widths between sessions of one
  Browser/client and restore them when workspace is opened.
- **FR-003**: Each column MUST have a minimum width below which
  Compression is impossible; the property panel remains fit for status reading
  And metadata.
- **FR-004**: The screen Graph MUST provide a hierarchical representation
  The nodes relative to the parent of the descendants, by default, are rolled up on the top level,
  and MUST NOT keep a flat, page-lined list of nodes as a navigation mode.
- **FR-005**: When the node is opened , the system MUST load the direct descendants .
  portions (pagination/doggrowth), without the entire column being loaded.
- **FR-006**: The system MUST allow you to search through canonical ** nodes**
  (at least: name, path, type/kind, qualified name) in the context of the project.
  Role: Catalogue of fields/essence of nodes for search; useful for facets/filters later.
       In UI `007` not a separate mode  see FR-008 (both at once).
- **FR-007**: The system MUST allow you to search for canonical edges.
  (at least: type, identifiers/signature from and to) in the context of the project.
  Role: Catalogue of fields/essence of röbra; useful for facets/filters later.
       In UI `007` not a separate mode  see FR-008. not a duplicate of FR-008. -->
- **FR-008**: One search query MUST be executed by ** nodes and edges
  simultaneously**; the results MUST be divided into the groups Nodes and Edges.
  Choose a node. MUST open the way to it in a hierarchy, scroll to the node and
  The edges must show the edges in the links view and
  to open/Select the node `from` in the hierarchy. Filters/The facets (tree status and so on.)
  MUST NOT be included in the mandatory scope `007` (optional assignment  `filter_*` in contracts;
  The field of essences for future narrowing  FR-006/FR-007).
  The user MUST be able to change the ** height** of the results list
  Search (common for deposits) with preference on the client
  (see `contracts/graph-ui-scale.md`).
  The role in `007`: one query behavior + UI/navigation. FR-006/007 sets fields, not the second UX. -->
- **FR-009**: Search and hierarchical output MUST support page alignment
  And the answer size limit.
- **FR-010**: When the status of the file type element changes, the system
  MUST cascadingly apply the same status and handwriting mark to all
  The operation MUST be performed on the tree.
  ** synchronous and atomic**: complete success for the entire branch or complete failure
  without partial application of the status.
- **FR-011**: The status change MUST only affect this element.
- **FR-012**: When you raise the status of the folder ** from** Not needed to another status
  The system MUST NOT automatically change the status of the offspring.
- **FR-013**: In cascade No need  for the folder to have a hand-marked line
  with a different status MUST be re-recorded by the action on the branch (parent wins).
- **FR-014**: When sync a new or updated element without its own manual
  The footnotes below the prefix with No need + the handnotes MUST get No need
  and MUST have a handwritten mark = **no** (inheritance, not separate
  the user 's mark).
- **FR-015**: Mass migration of already preserved projects for the cascade
  MUST NOT be mandatory; the behavior is activated by subsequent
  The status and sync changes.
- **FR-016**: UI messages and clear errors on functions `007` MUST be
  Via portal i18n (supported locales).
- **FR-017**: UI `007` MUST NOT provide editing or deletion
  The nodes/reps of the graph and MUST NOT include the graph canvas.

### Key Entities

- **Workspace panel widths**: saved proportions of three columns for the client.
- **Highness of search results (graph) **: the height of the match list saved
  (client-only; common for the Nodes/Edges column).
- **Node of the graph (hierarchy) **: canonical node with relation to parent and child
  for tree-like UI (`006`).
- **Search result**: match on the node or edge with fields to display
  And the transition.
- **Element of the tree (file) **: the essence of the project tree (`002`/`003`) with
  The status and sign of the hand mark; the folder participates in the cascade.
- **Cascade of status**: operation folder status → same values in active
  descendants plus the inheritance rule when sync for `not_needed`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a project with a column node of ≥ 1000, the user achieves the desired
  node through a hierarchy or search; there is no flat list of all
  The test is a test of the pilot, not a mandatory gate CI.
- **SC-002**: Searching for a known node name from the fixture returns this node
  On the first page of the results of the query.
- **SC-003**: Changing the status of the folder with **≥50** descendants leads to the same
  status of 100% of the active descendants after successful completion; when refused
  The branch is not partially updated (tested).
- **SC-004**: After saving the width of the panels , reopen the workspace
  Restores widths with an error of not more than 5% of the given widths.
- **SC-005**: **90%** of the participants of the pilot drive successfully mark the branch
  Not needed with one action on the folder and find the essence in the column via
  Search or hierarchy without reference to documentation.

## Assumptions

- Workspace is still three-panel (`003`); `007` extends the UX without changing
  The composition of the column.
- Set of tree elements status  as in `002`/`003` (`auto_found`, `needed`,
  `not_needed` etc. recorded there; cascade down is applied at any
  manual folder status change.
- Active descendants  tree elements not excluded by the removal policy/
  hiding `002` (ordinary branch files and folders); details of filtering inactive
  It's like the current tree API.
- Minimum length of the search query  2 significant characters (reasonable default);
  An empty request doesn't start a full release of the column.
- Search in `007`: always both types (nodes + edges) without selecting the region; click on
  a node opens its hierarchy path; clicking an edge anchors on `from`. Filters
  criteria  possible extension after `007` (see Not included).
- The default hierarchy/search page limit is aligned with the pagination `006`
  (order of tens of elements), the exact number  in plan/contracts.
- The preferences of the width are kept on the client side between sessions; the general
  profile on the server is not required (pilot without auth).
- Cascade of folder status: synchronous and atomic in the sense of receiving
  successful **one** `update_by_query` (or equivalent) / complete refusal without
  The term "ACID" does not imply storage transaction.
  <!-- Pilot: soft-limit = 5000 active descendants; over  rejection without record (plan/contracts). -->
- Soft-limit cascade: if the active descendants of the folder **more than 5000**, the system
  MUST reject the operation without changing status and show a localized message.
- SC-001 (≥1000 knots of the column)  hand pilot / observation criteria**, not gate CI.
- Hiding the nodes of the column on `not_needed` and canvas  outside `007` (see `001`).
- Pilot without authentication; UI locales are `en` (default) and `ru`.
