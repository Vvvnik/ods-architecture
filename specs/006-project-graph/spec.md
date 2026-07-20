# Specifications: Project graph  canon, ingest and UI

**Fiction**: `006-project-graph`

**Created**: 2026-07-09

**Statute**: Fulfilled (US1US6, ingest C#/Python/C++; polish T063T065 optional)

**Input**: Formalisation of the canonical code column in the metadata repository, ingest from
The envelope of the parser, the API of consumption, the minimum UI instead of the shutter Graph.
Source of the : `ods-help/requirements/data-model-persig-analysis-draft.md` (§2, §3 D-006-*),
`ods-help/requirements/canonical-graph-model.md`.

**Parental specs**: `specs/001-ods-vision/spec.md` (stage 5)

**Dependency**: `specs/002-domain-model/spec.md` (project, tree, DELETE)

**Blockers by data**: `specs/005-code-analysis/spec.md` (envelope of the parseers, the analysis poros)

## A brief description

The platform normalizes the results of language parser (`005`) into a single canonical
column**  nodes and edges with a link to the project and files.
The code depends on the API and the minimum UI Graph** (replacement)
The stumps `003`). With raw AST and native `model` parser **does not** They're going out like
The main contract is only canon after ingest.

**Data level (from § 2 of the drawing):** envelope and artefacts of the projection  levels 12 (`005`);
**level 3**  `graph_nodes` / `graph_edges` in the metadata repository (`006`).

## The limits of heat

### It 's coming in .

- **canonical model** of the node and the edge (kind, id, name, language, path, location, metadata);
- **index of the column** in the metadata repository (`graph_nodes`, `graph_edges`)  separately
  from the project document, filtering by `project_id`;
- **ingest pipeline**: envelope (`parser_id`) → adapter → canon; one adapter on `parser_id`;
- **Incremental ingest**  Update/remove the nodes and edges of the affected files,
  without completely reassembling the column;
- **REST API** reading of the column: subgraph, node/dependencies on the file, link to the analysis progon;
- **connection with tree `002`**: the node is referred to `element_id` and/or `path`;
- **minimum UI Graph**  list of nodes and simple visualization of links (replacement)
  `GraphStubPage` in `003`);
- **cascade DELETE** of the project  cleaning the index of the column together with the artifacts of the analysis;
- **versioning** of the displayed graph by `analysis_run_id` (last successful drive).

### Not included

- Language Detector, orchestrator, parser, envelope-contracts, UX of modals after sync (`005`);
- the start of the analysis and the status of the orchestration of the parser (API `005`; `006` consumes the result);
- full-fledged graph viewer (React Flow, interactive layout)  post-MVP (`010-ods-graph-viewer`, after `008`/`009`);
- RAG, vector search, authentication;
- duplicating the file tree (`ods-elements` remains in `002`);
- One native JSON for all the parser;
- storage of sources outside the working copy.

## User Scenarios & Testing *(mandatory)*

### User Story 1  Ingest in the canonical graph (Priority: P1)

As a **platform**, after successfully saving the parser envelope (`005`) I convert
the native `model` into canonical data and store the nodes and edges in the metadata repository..

**Why this priority**: Without ingest there is no data for API and UI; it's the kernel `006`.

**Independent Test**: After the analysis is done with at least one envelope in storage
There are documents in the index of the column with the correct `project_id` and `parser_id`.

**Acceptance Scenarios**:

1. **Given** envelope with `parser_id=typescript` in the storage (`005`), **When** ingest
   completed, **Then** in the canon there are nodes and edges for files from `files_analyzed[]`.
2. **Given** several envelope of one `analysis_run_id` (different `parser_id`),
   When each one ingest, the nodes/limbs join in one canon without
   the data transcript of another language.
3. **Given** unknown `parser_id` without adapter, **When** ingest, **Then** error
   It's fixed for the propeller; the other adapters aren't blocked.
4. **Given** ingest, **When** the orchestrator (`005`) is processing the envelope,
   **Then** the orchestrator **no** interprets the structure of `model` (only the adapter `006`).

---

### User Story 2  View the file dependencies through API (Priority: P1)

As a developer, I request nodes and outgoing/inbound connections for the selected
So you can use a project file to understand dependencies without an IDE.

**Why this priority**: The basic value of the graph for the pilot user.

**Independent Test**: `GET` dependencies for a file with known connections → list of nodes
and edges in the localized UI context (empty list if analysis is not done).

**Acceptance Scenarios**:

1. **Given** project with successful ingest, **When** node request on `path` file,
   **Then** the answer contains canonical nodes (kind, name, language, location) and
   the edges (type, from, to).
2. **Given** file without nodes in the column, **When** query, **Then** empty result and
   The message is clear (not 500).
3. **Given** several scan runs, **When** a query without specifying a version,
   **Then** data from the last successful** `analysis_run_id` for the project.
4. **Given** a request from `analysis_run_id`, **When** the driveway exists,
   **Then** the graph image matches that progon.

---

### User Story 3  Minimum UI Graph (Priority: P1)

As a developer, I open the menu item, the dependency graph, and I see the analysis data.
Instead of a plug,  a list of project nodes and a simple link diagram.

**Why this priority**: Closes the 005 → 006 chain for the user; replaces FR-010
The shutter is  v `003`.

**Independent Test**: `/graph` shows the nodes with analysis when the selected project;
without analysis  the message Graph is empty yet (or an localized equivalent).

**Acceptance Scenarios**:

1. **Given** project with canon in storage, **When** user opens `/graph`,
   ** Then** shows a list of nodes (with language filter optional) and simple
   visualization of the edges (table or diagram  not React Flow).
2. **Given** analysis was not performed, **When** `/graph`, **Then** message with hint
   perform sync and analysis (reference to the project workplace).
3. **Given** user selects node, **When** click,
   **Then** shows name, kind, path, language and related nodes (1 hop).
4. **Given** menu item Graph, **When** navigation from workspace,
   **Then** context `project_id` is stored (as for sync).

---

### User Story 4  Increased ingest (Priority: P2)

How did you do that? **The platform**, After incremental analysis (`005`), I update only nodes and edges for changed files and remove canonical data for deleted files.

**Why this priority**: Agree with D-006-3 and the `005` increments; critical for large reps.

**Independent Test**: Re-analysis of a single modified file → number of affected files
The nodes in the canon are changed only for this `path`; the rest of the files are unchanged.

**Acceptance Scenarios**:

1. **Given** change set with `modified` and `deleted` routes, **When** ingest after the expulsion,
   **Then** for `modified`  upsert nodes/rebers; for `deleted`  removal of all
   nodes/edges for the corresponding `path` and `parser_id`.
2. Given an incremental run, When ingest is complete,
   **Then** the full column of the project **not** is being performed.
3. Given the first full analysis, When ingest,
   Then a canon is being built for all the files in the envelope.

---

### User Story 5  Connecting a graph to a file tree (Priority: P2)

As a developer, I go from a graph node to a file in a tree (and backwards) using
common `path` or `element_id`.

**Why this priority**: Linking the analysis to the MVP navigation (`002`/`003`).

**Independent Test**: The node from `path=src/app.ts` → switching to workspace opens the same file.

**Acceptance Scenarios**:

1. **Given** node with field `path`, **When** click Open the file in the UI column,
   **Then** switch to `/projects/:id` with the tree element separated by path.
2. **Given** file is open in workspace, **When** request File graph (API or panel),
   **Then** subgraph for this `path`.
3. **Given** `element_id` in the canon, **When** the element is removed from the tree (sync),
   **Then** nodes remain inactive until the next ingest/removal or are marked inactive
   (behavior is documented in plan; user sees a warning when dissynchronized).

---

### User Story 6  Clean up when you delete a project (Priority: P2)

Like the **platform**, when DELETE the project (`002`) I remove all the nodes and edges of the column
This project is from the warehouse.

**Why this priority**: D-006-7; consistency with the cascade `005`.

**Independent Test**: DELETE of the project → search for `project_id` in the index of column → 0 documents.

**Acceptance Scenarios**:

1. **Given** project with the graph, **When** `DELETE /projects/{id}`, **Then** all documents
   `graph_nodes` and `graph_edges` with this `project_id` deleted.
2. **Given** DELETE, **When** completed, **Then** other projects not affected.

---

### Edge Cases

- Envelope empty `model` or without extractable characters: ingest successful with zero nodes
  For this module, the drive is not `failed` whole.
- Two adapters for one `path` (different languages in one file  rarely): nodes differ
  by `parser_id` / `language`; id The project is unique.
- Ingest during DELETE project: deviation or no-op with log.
- Very large file: API response is paged (limit of nodes per query).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store canonical **nodes** with fields: stable `id`,
  `kind`, `name`, `language`, `parser_id`, `path`, `location` (optionally), `metadata`
  (optionally), `project_id`, `analysis_run_id`.
- **FR-002**: The system MUST store canonical **rebbra** with fields: `from`, `to` (id nodes),
  `type`, `language`, `parser_id`, `path` ( Context ), `project_id`, `analysis_run_id`.
- **FR-003**: The nodes and edges MUST be stored in separate indexes of metadata storage;
  **not** nested inside the project document; all queries are filtered by `project_id`.
- **FR-004**: The system MUST implement **ingest pipeline**: envelope from `005` → adapter
  po `parser_id` → upsert v canon; orchestrator `005` MUST NOT know structure `model`.
- **FR-005**: Incremental pronging ingest MUST update the canon only for
  affected `path` and MUST delete nodes/reps for **removed** files.
- **FR-006**: The system MUST provide API for getting nodes and edges on `path` file**
  and **sub-clause** around the node (at least 1 hop).
- **FR-007**: API MUST support the selection of the image by `analysis_run_id`; by default
  The last successful project.
- **FR-008**: The canonical node MUST link to the file via `path` and optional
  `element_id` from the tree `002`.
- **FR-009**: UI MUST replace the shutter  Dependencies graph (`003` FR-010) on the screen
  with data from the canon (list of nodes + simple visualization of connections).
- **FR-010**: DELETE project (`002`) MUST cascading all documents `graph_nodes`
  and `graph_edges` with `project_id` project (together with the cascade `005`).
- **FR-011**: The system MUST version the displayed graph by `analysis_run_id`
  (`started_at`, `completed_at` from the metadata of the progoon `005`).
- **FR-012**: Ingest MUST run automatically after the envelope is saved successfully
  The parser (hook after `005`); separate public start analysis at `006` **no** is required.
- **FR-013**: For each targeted `parser_id` (`typescript`, `csharp`, `python`, `cpp`)
  MUST have an ingest adapter (delivery in increment, synchronous with the parser `005`).
- **FR-014**: UI messages and API error messages for the column MUST be in **Russian**.

### Key Entities

- **Canonical node (Graph Node) **: the essence of the code (class, function, method, ...) in a single
  format for all languages after ingest.
- **Canonical edge (Graph Edge) **: connection between nodes (calls, imports, inherits, ...).
- **Ingest Job**: converting one envelope into a set of nodes/rebars for `analysis_run_id`.
- **Adapter ingest**: component `parser_id` → mapping native `model` → canon.
- **Image of the column**: subset of nodes/rebars for `(project_id, analysis_run_id)`.
- **Tree attachment**: link `path` / `element_id` between the canon and `002`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After successful analysis (`005`) the user sees the ** empty** list
  The graph will be generated by the node on `/graph` within **10 seconds** after the ingest (pilot volumes) is completed.
- **SC-002**: The dependencies query for the known links file returns **100%**
  The expected edges from the test fixtures.
- **SC-003**: The incremental ingest when changing **≤5%** of the files is completed **no
  Less than twice as fast** as a complete reassembly of the same design canon.
- **SC-004**: **90%** of the pilot users find the dependencies of the selected file via
  UI Graph without documentation (observed testing).
- **SC-005**: DELETE of the project cleans the column: **0** of documents with `project_id` in the indexes
  Graph after the operation.

## Assumptions

- The envelope and the analysis porosity are already in the storage (`005`: `ods-parser-envelopes` , `ods-analysis-runs`);
  `006` only adds the canon indexes.
- **Names of indices:** logical `graph_nodes` / `graph_edges` (spec, drawings) =
  The following is the list of the physical **`ods-graph-nodes`** / **`ods-graph-edges`** (ES, code, contracts).
- The names of the `005` artefacts index are recorded in `005/contracts/elasticsearch-indices.md`;
  `006` does not duplicate their schemes (except for patch `ingest_*` on `ods-analysis-runs`  see the same contract).
- The minimum UI is implemented in `frontend/` within `006` (expansion `003`, without separate
  The portal specs .
- Full React Flow and complex semantics interlinguistic edges  post-MVP; first
  Iteration  list + simple diagram.
- Pilot without authentication.
