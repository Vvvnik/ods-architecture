# Specification: Code Graph Depth (calls usages, model v2)

**Feature**: `008-code-graph-depth`

**Created**: 2026-07-14

**Status**: Implemented (2026-07-14; US1–US5, clarify + plan/tasks)

**Entrance**: Extension code-layer Canon: semantic calls and usages
(not only imports/inherits), native model v2 for TypeScript and C#, reverse
compatible with envelope v1. A source:
`ods-help/requirements/008-code-graph-and-system-landscape-draft.md` (§A);
model `ods-help/requirements/json-model/` (N02, C03).

**Parent Spec**: `specs/001-ods-vision/spec.md` (phase 7)

**Dependencies**: `specs/005-code-analysis/spec.md` (parsers envelope, run);
`specs/006-project-graph/spec.md` (Canon, ingest, indexes, graph);
`specs/007-portal-scale-ux/spec.md` (graph search, including by edge type)

## Short description

After analyzing the project, the user sees not only the structure of symbols and
imports, but **who calls whom** in the code (and associated semantic relationships),
to navigate through large services. The parsers TypeScript and C# give
enriched native-model (v2); ingest saves the new edges in the same Canon
`006`. Existing runs and envelope v1 **don't break**.

## Clarifications

### Session 2026-07-14

- Q: How DI (`injects`) is Canon? → A: A separate type of canonical ribs `injects` (extension of the set of types code-layer)
- Q: Do `creates` / `references` in MVP 008? → A: MVP only `calls` + `injects` (C#); `creates`/`references` — follow-up, not a blocker
- Q: Ambiguous call policy (overloads/ multiple candidates)? → A: We are not creating an edge
- Q: Do `metadata.layer=code` new documents 008? → A: New nodes/edges ingest MUST with `layer=code`; old fields without valid
- Q: Parsers TS/C# after 008 — always v2 or dual? → A: In conventional analysis always v2; ingest accepts and v1

## The boundaries of the spec

### Is included

- native model **v2** symbols for **TypeScript** and **C#** (minimum phase):
  characters in v1 plus semantic usages; in MVP **mandatory** usages
  `calls` and (for C#) `injects`; field/type `creates`/`references` in the model
  MAY be present as a reserve, with no obligation extract and ingest in MVP;
- extraction **calls** methods/functions in a pilot fixture for C# and TypeScript;
- heuristic **injection designer** (DI) in C#: native usage
  `injects` → canonical edge type **`injects`**;
- ingest-adapters, host **v1 and v2** (backward compatible);
- canonical ribs code-layer MVP: **`calls`** and **`injects`**; existing
  types `006` break; ingest `creates`/`references` — out MVP;
- mark the layer `code` metadata: do **new** nodes and edges that writes
  ingest within `008`, **mandatory** (`metadata.layer = code`); have already
  existing documents without a field — without mandatory migration;
- accessibility of new edges via existing graph search/view (`007`),
  without a new screen.

### Not included

- system-layer: compose, appsettings, OpenAPI, Kafka/Rabbit, DB
  (→ `009-system-landscape`);
- full unloading HTTP-routes / `[Route]` as system/API-count
  (→ `009`; partial observations code — no obligation `008`);
- canvas / React Flow (→ `010-ods-graph-viewer`);
- RAG, auth, edit the graph in UI;
- **mandatory** extraction and ingest usages/`creates` and `references`
  (follow-up after MVP `008`);
- **mandatory** v2 for Python and C++ at this stage (follow-up after MVP `008`);
- change UX Modula analysis and Orchestrator (`005`) — the same run, enriched
  the result of the parsers;
- rewriting Canon `006` or indexes wood `002`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 Calls in C# fall into count (Priority: P1)

How **developer** after analyzing C#-project I see the connection **calls** between
methods (for example, `Create` causes `Save`) to understand the flow of execution
without manually reading the entire file.

**Why this priority**: the Main value `008` — semantic calls; C# — key
Pilot language monorepo.

**Independent Test**: Fixture method A calling method B → after running
analysis in the canon, there is a call edge A→B; it is found by searching/viewing links.

**Acceptance Scenarios**:

1. **Given** file C#, where the method `Create` causes `_repo.Save`, **When**
   successful analysis parser C#, **Then** in the Canon has an edge type
   "call" from the node method `Create` node method `Save` (or permitted purpose
   with the same meaning).
2. **Given** same fixture, **When** user searches for ribs call / looks
   connection node method **Then** call is displayed in the existing UI count
   (`007`), without a separate screen `008`.
3. **Given** a method call from another file in the same project and a goal
   explicitly allowed **When** ingest, **Then** edge connects nodes of both
   files, not just the local call text.

---

### User Story 2 Calls in TypeScript fall into count (Priority: P1)

How **developer** after analyzing TypeScript-project I see the connection **calls**
functions/methods (e.g. `userService.create` → `repo.save`), symmetrically C#.

**Why this priority**: TS is the second compulsory language MVP `008`; parity with C#.

**Independent Test**: Fixture TS with the call A→B → an edge of challenge in the Canon after
analysis.

**Acceptance Scenarios**:

1. **Given** TypeScript-a file where a function/method calls another
   function/method in the project, **When** successful parser analysis completed
   TypeScript, **Then** in the Canon has an edge of type "call" from the calling
   get to the goal with a successful resolution.
2. **Given** a call that the parser cannot uniquely resolve to a character
   project (including several overloads), **When** analysis is complete, **Then**
   the run does not crash and the call edge for this location **is not** is created.

---

### User Story 3 — Compatible envelope v1 (Priority: P1)

As a **platform**, I continue to accept parser results in the format
model v1 (imports/inherits no usages) and get the same Canon that before `008`.

**Why this priority**: you can't break an already running runs and parsers
without v2.

**Independent Test**: Envelope with `schema_version` / model v1 → ingest gives
the nodes and edges imports/inherits as `006` no errors due to the lack usages.

**Acceptance Scenarios**:

1. **Given** envelope parser native model **v1** (without the array usages),
   **When** ingest, **Then** Canon is constructed as in `006` (characters imports,
   inherits and others . already supported types).
2. **Given** project mix results v1 and v2 different files/runs,
   **When** ingest, **Then** data are combined into a single Canon without
   overwriting a foreign language and no crack just run because of the version of the model.

---

### User Story 4 — dependency injection in C# (Priority: P2)

How **developer** I see the connection "a class gets a dependency through
designer" (for example, the service implements the repository) to understand wiring
without reading all the constructors manually.

**Why this priority**: Strengthens the semantics beside calls; heuristics, is not complete
DI-container.

**Independent Test**: Fixture with constructor injection → after analysis
the canonical connection of introduction/references to the type of consumer to the type of dependence.

**Acceptance Scenarios**:

1. **Given** class C# with the constructor parameter type-safe interface, or
   class project **When** analysis C# v2 completed **Then** in the Canon is
   fin type **`injects`** from the consumer node to the node dependencies.
2. **Given** primitive/unresolved type constructor parameter,
   **When** analysis **Then** incorrect edge is not created; run successful.

---

### User Story 5 — find and view new edges (Priority: P2)

How **developer**, I find the edges of the calls through an already existing search and
view links on the Graph screen, without a new tool.

**Why this priority**: the value of the data `008` should be available soon via
`007`; private UI not included in the stage.

**Independent Test**: After ingest with `calls` search/filter by type edges or
node link view shows calls.

**Acceptance Scenarios**:

1. **Given** in Canon there are edges challenges **When** user is looking for on the box
   or open a communication node method **Then** challenges seen on a par with imports/
   inherits.
2. **Given** count with ribs v1 (without calls), **When** user
   opens the "Count", **Then** behavior after `007` without errors due to
   the absence of new types.

---

### Edge Cases

- Calling to an external/unresolved character (library, dynamic) — without false
  edges to a random node of the project; the run does not crash.
- Overloads and methods of the same name — if the target is **not**
  is chosen heuristically: the edge **is not** is created; the run does not crash.
- Incremental analysis (`005`/`006`): when a file changes, the old calls this
  the file is deleted/replaced along with the other edges of the file.
- Empty project / no methods — successful run, zero edges calls.
- Very large file / many calls — the run is ending; partial shortage
  calls valid only with fixation restrictions plan/test fixture, not as
  silent total failure ingest.
- Full re-run — idempotency id ribs calls (stable id by
  by the rules of the canon `006`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Parser C# MUST in the normal run of the analysis to form native
  model **v2** semantic usages include at least the calls
  methods (`calls`) on supported structures pilot fixture.
- **FR-002**: Parser TypeScript MUST conventional analysis run to form
  native model **v2** with usages call functions/methods (`calls`) at
  the ability to uniquely resolve a goal within a project.
- **FR-003**: Platform (ingest) MUST make envelope with native model
  **v1** and **v2** existing `parser_id` code-layer without regression
  ingest v1 (regression saved envelope, tongues out TS/C# v2).
- **FR-004**: Ingest MUST convert usages call type in the canonical
  fin type `calls` (and save them in the same repository graph that `006`).
- **FR-005**: Ingest MUST convert usages dependency injection C#
  (constructor injection) in the canonical fin type **`injects`** (extension
  the set of edge types code-layer of relatively `006`).
- **FR-006**: If unresolved **or ambiguous** purpose usage system
  MUST NOT create an edge (including not choosing the "best" candidate among
  overloads); MUST NOT create edge to the wrong node; MUST NOT drop
  The entire analysis run is due to one such usage.
- **FR-007**: the New edges MUST be accessible through existing scripts
  read graph and search (`006`/`007`) without necessarily new UI `008`.
- **FR-008**: Nodes and edges that ingest records within `008` (including
  incrementally updated documents code-layer), MUST have
  `metadata.layer = code`. Documents previously created without this field, MUST
  remain valid without mandatory migration.
- **FR-009**: JSON-model native v2 canonical code-ribs (drafts
  `json-model` N02/C03) MUST be coordinated with specai and brought to status
  readiness to implement in plan/contracts (copies or links to `contracts/`
  features).
- **FR-010**: Pilot fixture for C# and TypeScript MUST demonstrate
  the appearance of ribs `calls` end-to-end (parser → ingest → Canon → reading).
- **FR-011**: Extension native v2 for Python and C++ MUST NOT block
  closure MVP `008` (follow-up out mandatory scope).
- **FR-012**: Extract and ingest usages types `creates` and `references`
  MUST NOT lock closure MVP `008` (reserve model, for example; the obligation
  — follow-up).

### Key Entities

- **Native model v2 (symbols)**: extension v1 characters of the file plus the semantic
  usages; in MVP mandatory `calls` and `injects` (C#); `references` /
  `creates` and others . — optional groundwork of the circuit without the obligation of filling.
- **Canonical edge code**: a connection between two nodes of the canon; types as in
  `006`, plus `calls` and **`injects`** in MVP; stable id; binding to
  project, run, file.
- **Canonical node code**: without changing the meaning `006`; when you write/update
  ingest `008` MUST to `metadata.layer = code`.
- **Envelope run**: contract `005`; version native model determines,
  which usages are available ingest.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: pilot C#-fixture with a known method call, the user
  (or a validating scenario) finds the corresponding call edge in the graph
  after a successful review — 100% of the runs fixture.
- **SC-002**: pilot TypeScript-fixture with the known challenge is the same:
  an edge of challenge in the graph after the successful analysis 100% of the runs fixture.
- **SC-003**: Re-run with only envelope v1 regression on a set
  `006` does not affect the set of edges imports/inherits (zero regressions on the checklist
  v1).
- **SC-004**: the Developer finds a challenge in UI count (search or links of node)
  without learning a new screen — the script is executed in the same steps as the search
  rib after `007`.
- **SC-005**: Unresolved **and ambiguous** calls fixture not create
  edges (i.e. false) and do not lead to failed analysis run.

## Assumptions

- The Orchestrator and UX confirmation languages (`005`) do not change: The same analysis
  run; parsers TypeScript and C# in the normal run give **v2**; ingest
  still takes v1.
- Edge type search / link view is already sufficient in `007` to demonstrate
  `calls`; individual facets "only calls" is not required to `008`.
- Unauthorized **and ambiguous** calls **skipped** (no edge);
  heuristic selection of one of the overloads is not used; "edge cap"
  is not used.
- Constructor injection in C# - heuristic for constructor parameters, incomplete
  container analysis DI.
- Python/C++ remain v1 with the closing `008`; v2 them separate
  follow-up.
- Usages `creates` / `references` — follow-up; MVP closes `calls` +
  `injects` (C#).
- System-artifacts and tires — only `009`; open questions about the draft
  id system-nodes and message link to `008` not apply.
- Source schema: `ods-help/requirements/json-model/`; Canon id ribs —
  in `006` / README json-model.

## Related materials

- Draft: `ods-help/requirements/008-code-graph-and-system-landscape-draft.md` (§A)
- JSON-model: `ods-help/requirements/json-model/` (N02, C03; E01, N01, C01)
- `specs/005-code-analysis/`, `specs/006-project-graph/`, `specs/007-portal-scale-ux/`
- Working materials: `ods-help/working-materials/arch-from-gpt.md`,
  `ods-help/requirements/canonical-graph-model.md`
