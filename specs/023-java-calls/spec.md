# Feature Specification: Java language schema v2 (calls)

**Feature Branch**: `023-java-calls`

**Created**: 2026-07-27

**Status**: Closed / Implemented (2026-07-27; US1–US6 + FR-014; clarify + plan/tasks)

**Input**: User description: "Java language parser schema v2: usages/calls
parity with C#/TS (008); production src/main/java only; ambiguous/unresolved
skip like 008; not HTTP/system"

**Parent Spec**: `specs/001-ods-vision/spec.md` (deferred Post-MVP backlog:
Java language schema v2 `calls`)

**Dependencies**: `specs/008-code-graph-depth/spec.md` (native v2 usages /
canonical `calls`; ambiguous skip policy); `specs/018-parser-extension-playbook/spec.md`
(Java language module MVP — packages/types; production path rule);
`specs/005-code-analysis/spec.md` (parser envelope / run);
`specs/006-project-graph/spec.md` (Canon ingest);
`specs/007-portal-scale-ux/spec.md` (graph search / link view)

## Short description

After analyzing a Java project, the developer sees **who calls whom** in
production Java code — the same code-layer call edges already available for
TypeScript and C# (`008`). The Java language analysis module emits native
model **v2** with semantic usages of type `calls`; ingest stores them in the
existing code Canon. HTTP client/server extraction and Spring system landscape
remain outside this feature (`013`/`014`/`019`).

## Clarifications

### Session 2026-07-27

- Q: May call extraction hard-code path priorities, service-name strips, or
  acceptance patterns taken from one external pilot / dogfood tree (as seen
  historically in some UI/Spring helpers)? → A: **No.** Pilot and dogfood
  are **acceptance references only**. Product rules for Java `calls` MUST be
  generic (language + `**/src/main/java/**` + unique resolution). Repo-specific
  path ranking, monorepo name-prefix stripping, and tests that only pass on
  one pilot’s folder/service naming are **out of DoD** for this feature.
- Q: Which call shapes are mandatory for DoD? → A: **Instance + static**
  method calls to uniquely resolvable in-project methods (same type and
  cross-file/cross-type); constructors, `super`, and reflective/dynamic calls
  out of DoD.
- Q: Which methods become symbols for DoD? → A: Emit method symbols for
  **all methods** declared on top-level types in production sources (any
  visibility, including private/protected).
- Q: Cross-module calls in one ODS project? → A: **Yes for DoD** when the
  target is uniquely resolvable among production `**/src/main/java/**` under
  the same ODS project (any Maven/Gradle module in that tree).
- Q: Second fixture for anti-dogfood DoD? → A: **One multi-module ODS-owned
  fixture** is enough for DoD (different module names + cross-module call);
  a second separate tree is SHOULD only.
- Q: Calls through interface / abstract types? → A: **Interface/abstract**
  static receiver: create `calls` to the unique interface/abstract method
  symbol when resolvable; **never** pick among concrete implementations.

## Spec boundaries

### Included

- native model **v2** for the **Java** language module: symbols already
  required by `018` (module / package / top-level types) plus **all methods**
  declared on those top-level types in production sources (any visibility,
  including private/protected), plus semantic usages **`calls`**;
- extraction of method/function **calls** within the project for production
  sources under `**/src/main/java/**` only — DoD shapes: **instance and
  static** method calls with a uniquely resolvable in-project target (same
  type, cross-file / cross-type, and **cross-module** within the same ODS
  project tree);
- same unresolved / ambiguous policy as `008`: **no edge** when the target
  cannot be uniquely resolved; analysis run MUST NOT fail because of one such
  site;
- ingest of Java native **v2** into canonical code-layer edges type **`calls`**
  (same Canon and layer marking as `008`);
- backward compatibility: existing Java **v1** envelopes (symbols without
  usages) MUST still ingest without regression;
- demonstration via existing graph search / link view (`007`) — no new screen;
- **ODS-owned** multi-module pilot fixture that proves end-to-end `calls`
  (including different module names and a cross-module call) without depending
  on a single external dogfood tree’s layout or names; a second separate
  ODS-owned tree is SHOULD; dogfood on an external Java service tree is SHOULD
  smoke only, not the sole DoD oracle;
- **generic** resolution rules: same behavior for any Maven/Gradle-style tree
  that places production sources under `src/main/java`, not heuristics tuned
  to one pilot monorepo.

### Not included

- HTTP API routes, Feign/WebClient/RestClient, `http_endpoint` / `http_calls`
  (→ `013` / `014` / `019`);
- Spring system landscape: Maven/Gradle → service, config, Gateway, compose
  merge (→ `019` / `009`);
- bus / DB / OpenAPI system artifacts (→ `009` / related modules);
- Kotlin / Scala;
- mandatory constructor / DI **`injects`** edges for Java (C# heuristic in
  `008` remains C#-specific; Java injects — follow-up);
- mandatory usages `creates` / `references` (same reserve stance as `008`);
- nested / anonymous / local types beyond `018` DoD (top-level only);
- test sources (`**/src/test/**`) and typical generated trees;
- **dogfood-shaped product logic**: preferential paths or scripts named after
  one external pilot UI/gateway layout; stripping a fixed monorepo/service
  name prefix to invent hints; acceptance tests that assert only that pilot’s
  path or service-id patterns (fixtures MUST use synthetic / ODS-owned names);
- new portal screens or orchestrator UX changes (`005`);
- rewriting Canon indexes or vision boundaries beyond promoting this deferred
  item from backlog to an active feature;
- claiming “works on every Java repo in the wild” via shallow regex-only
  coverage without unique resolution — DoD is fixture-proven generic rules,
  not unbounded universal parsing;
- constructor invocations, `super` calls, and reflective/dynamic dispatch as
  mandatory `calls` edges (MAY skip; not DoD).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Java calls appear in the code graph (Priority: P1)

As a **developer**, after analyzing a Java service I see **call** links
between methods (for example `create` → `save`) so I can follow execution
flow without reading every production source file by hand — on par with
C# and TypeScript after `008`.

**Why this priority**: Core value of the feature; closes the deferred Java
parity gap called out in vision.

**Independent Test**: Fixture where method A calls method B under
`src/main/java` → after a successful Java analysis run, Canon contains a
`calls` edge A→B discoverable via existing graph search or node links.

**Acceptance Scenarios**:

1. **Given** a production Java file under `**/src/main/java/**` where method
   `create` calls method `save` with a uniquely resolvable in-project target,
   **When** Java language analysis completes successfully, **Then** the Canon
   contains a call edge from `create` to `save` (or an equivalent method
   node pair with the same meaning).
2. **Given** the same fixture, **When** the user searches call edges or opens
   links on the method node, **Then** the call is visible in the existing
   graph UI (`007`) without a separate screen for this feature.
3. **Given** a call from one production file to a method in another production
   file of the same project (including another module under the same ODS
   project tree) and a uniquely resolvable target, **When** ingest finishes,
   **Then** the edge connects nodes of both files (not only local call text).

---

### User Story 2 — Ambiguous and unresolved calls are skipped (Priority: P1)

As a **platform operator**, I need analysis to stay trustworthy: when a call
cannot be uniquely resolved (overloads, external library, dynamic target),
ODS must not invent a false edge and must not fail the whole run.

**Why this priority**: Same quality bar as `008`; false call edges are worse
than missing edges for navigation.

**Independent Test**: Fixture with one unresolved and one ambiguous call site
plus one clear call → only the clear call becomes an edge; run succeeds.

**Acceptance Scenarios**:

1. **Given** a call the analyzer cannot uniquely resolve to a project symbol
   (including multiple overloads), **When** analysis completes, **Then** no
   call edge is created for that site and the run does not fail.
2. **Given** a call to an external or unresolved library symbol, **When**
   analysis completes, **Then** no edge is created to a random project node
   and the run does not fail.
3. **Given** a fixture that also contains at least one uniquely resolvable
   call, **When** analysis completes, **Then** that resolvable call still
   produces a `calls` edge.

---

### User Story 3 — Production sources only (Priority: P1)

As a **developer**, I only want call edges from **production** Java sources
(`src/main/java`), not from tests or generated trees, consistent with the
Java MVP source rule (`018`).

**Why this priority**: Keeps the graph focused on runtime product code and
avoids noise from tests.

**Independent Test**: Fixture with a call only under `src/test/java` and a
call under `src/main/java` → only the production call appears in Canon.

**Acceptance Scenarios**:

1. **Given** a method call that exists only under `**/src/test/**`, **When**
   Java language analysis completes, **Then** no `calls` edge is created from
   that test site as part of this feature’s DoD.
2. **Given** production sources under `**/src/main/java/**` with a resolvable
   call, **When** analysis completes, **Then** the production call edge is
   present in Canon.
3. **Given** typical generated source trees outside production main, **When**
   analysis runs, **Then** those trees are not required to contribute `calls`
   edges for DoD (same production-only stance as `018`).

---

### User Story 4 — Compatible Java v1 envelopes (Priority: P1)

As a **platform**, I continue to accept Java parser results in native model
**v1** (symbols without usages) and build the same symbol Canon as after
`018`, while new runs emit **v2** with `calls`.

**Why this priority**: Must not break existing Java symbol graphs or stored
envelopes.

**Independent Test**: Envelope with Java native model v1 → ingest yields
modules/packages/types as before; no failure due to missing usages.

**Acceptance Scenarios**:

1. **Given** a Java parser envelope in native model **v1** (no usages array),
   **When** ingest runs, **Then** Canon is built as for `018` (module,
   namespace/package, top-level types) without errors from missing usages.
2. **Given** a mix of v1 and v2 Java results across files or runs, **When**
   ingest runs, **Then** data combine into one Canon without crashing the run
   solely because of model version.

---

### User Story 5 — Find Java calls with existing graph UX (Priority: P2)

As a **developer**, I find Java call edges through the same search and node
link views I already use for C#/TS calls — no new tool to learn.

**Why this priority**: Value must be reachable immediately via `007`; private
UI is out of scope.

**Independent Test**: After ingest with Java `calls`, graph search/edges API
returns `type=calls` (same pattern as `008` US5 / SC-004); no new UI. Portal
click-through optional.

**Acceptance Scenarios**:

1. **Given** Canon contains Java `calls` edges, **When** existing graph
   read/search APIs are queried for call relationships (or the user opens
   method node links in the existing UI), **Then** those calls appear on a
   par with imports / inherits / other code edges.
2. **Given** a project graph that has only Java v1 symbols (no calls),
   **When** the user opens the graph, **Then** behavior remains as after
   `018`/`007` with no error merely because call edges are absent.

---

### User Story 6 — Generic rules, not one-pilot tuning (Priority: P1)

As a **platform owner**, I need Java `calls` extraction to follow **generic**
language and production-path rules so that any ordinary Java tree under
`src/main/java` can benefit — not a special case wired to one external
pilot’s folders, service prefixes, or UI/gateway path priorities.

**Why this priority**: Dogfood-shaped heuristics elsewhere already drift from
“works on many repos”; this feature must not repeat that pattern.

**Independent Test**: ODS-owned multi-module fixture with synthetic,
differently named modules yields `calls` (including a cross-module edge);
product logic has no hard-coded pilot path or name prefix required for those
passes. A second separate tree is optional smoke.

**Acceptance Scenarios**:

1. **Given** an ODS-owned multi-module fixture whose module and package names
   do **not** match any single external dogfood monorepo naming scheme,
   **When** analysis completes, **Then** uniquely resolvable production calls
   (including cross-module) still appear as `calls` edges.
2. **Given** the same call shape across differently named modules inside that
   fixture, **When** analysis completes, **Then** the corresponding `calls`
   edges appear without hard-coded paths for those module folder names.
3. **Given** DoD automated checks for this feature, **When** reviewed,
   **Then** they assert generic path rules and synthetic fixture outcomes —
   not preferential scripts or assertions locked to one external pilot’s
   layout or service-id strings.

---

### Edge Cases

- Call to an external / unresolved symbol — no false edge; run succeeds.
- Overloads / same-name methods — if the target is not uniquely chosen, no
  edge; no heuristic “best overload” pick; run succeeds.
- Empty project / no methods — successful run, zero `calls` edges.
- Incremental re-analysis: when a production file changes, old call edges for
  that file are replaced with the new extract (same file-scoped refresh
  expectations as `008`).
- Full re-run — stable call edge identities per Canon rules (`006`).
- Very large file / many call sites — run completes; missing edges only where
  resolution failed or scope excluded; not a silent total ingest failure.
- Test-only or generated-only trees — no DoD obligation to emit `calls`.
- Fixture or dogfood tree renamed / relocated under different module folder
  names — resolvable production calls under `src/main/java` MUST still extract
  without code that hard-codes the old pilot path or service prefix.
- Multi-module ODS-owned fixture with differently named modules — MUST cover
  both anti-tuning and cross-module DoD; a second separate fixture tree is
  SHOULD only.
- Cross-module call under one ODS project with a uniquely resolvable
  production target — MUST create a `calls` edge; if multiple same-named
  candidates across modules make the target ambiguous — no edge (FR-006).
- Call whose static receiver type is an **interface or abstract type** —
  MUST create a `calls` edge to that type’s method symbol when uniquely
  resolvable; MUST NOT choose a concrete implementing method among one or
  many implementations.
- Constructor / `super` / reflective call sites — no DoD obligation to emit
  `calls`; if skipped, run still succeeds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Java language analysis module MUST, on a normal analysis
  run, produce native model **v2** that includes semantic usages of type
  **`calls`** for uniquely resolvable **instance and static** method calls
  in supported production structures of the pilot fixture (same type and
  cross-file / cross-type). Cross-module targets: see **FR-013**.
  Constructor, `super`, and reflective/dynamic calls MUST NOT be required
  for DoD.
- **FR-013**: *(specializes FR-001 for multi-module trees)* When a call target
  is uniquely resolvable to a method under production `**/src/main/java/**` in
  **another module** of the same ODS project, the system MUST still emit the
  usage and ingest MUST create the canonical `calls` edge. Ambiguity across
  modules follows FR-006 (no edge).
- **FR-014**: When the static receiver type of a call is an **interface or
  abstract type** and the target method symbol on that type is uniquely
  resolvable in the project, the system MUST create a `calls` edge to that
  interface/abstract method symbol. The system MUST NOT select a concrete
  implementing method (even if exactly one implementation exists).
- **FR-002**: Native model **v2** for Java MUST include method-level symbols
  for **all methods** declared on top-level types in production sources
  (any visibility, including private/protected), sufficient to attach call
  sites and resolvable in-project targets (in addition to module / package /
  top-level type symbols from `018`). Methods on nested / anonymous / local
  types remain outside DoD per `018`.
- **FR-003**: Analysis of Java sources for this feature’s DoD MUST consider
  only production paths matching `**/src/main/java/**`; test trees
  (`**/src/test/**`) and typical generated trees MUST NOT be required to
  contribute `calls` edges.
- **FR-004**: Platform ingest MUST accept Java envelopes with native model
  **v1** and **v2** without regressing v1 symbol Canon from `018`.
- **FR-005**: Ingest MUST map Java usages of type call to canonical edge type
  **`calls`** in the same code-layer graph repository as `006`/`008`.
- **FR-006**: If a usage target is **unresolved** or **ambiguous**, the
  system MUST NOT create an edge (including MUST NOT pick a “best” overload
  candidate); MUST NOT create an edge to an incorrect node; MUST NOT fail
  the entire analysis run because of that usage alone.
- **FR-007**: New Java `calls` edges MUST be reachable through existing graph
  read and search flows (`006`/`007`) without requiring a new UI screen.
- **FR-008**: Nodes and edges written or updated by ingest for this feature’s
  code-layer documents MUST carry `metadata.layer = code` (same rule as
  `008`); older documents without the field remain valid without mandatory
  migration.
- **FR-009**: An **ODS-owned multi-module** pilot fixture MUST demonstrate
  Java `calls` end-to-end (analysis → ingest → Canon → read/search), including
  differently named modules and at least one cross-module call. A second
  separate ODS-owned tree is SHOULD. Dogfood on an external multi-module Java
  service tree is SHOULD smoke only — not a blocker and not the only
  acceptance oracle if the fixture covers SC criteria.
- **FR-010**: This feature MUST NOT require changes to HTTP/system extraction
  modules or Spring landscape DoD (`013`/`014`/`019`/`009`); language `calls`
  MUST remain distinct from `http_calls` / `exposes`.
- **FR-011**: Mandatory Java **`injects`**, `creates`, and `references`
  extraction MUST NOT block closure of this feature (follow-up; reserve only
  if the shared v2 model already allows empty optional usage kinds).
- **FR-012**: Call extraction and its DoD tests MUST NOT encode
  **repo-specific dogfood heuristics**: no hard-coded preferential paths or
  scripts keyed to one external pilot layout; no fixed monorepo/service name
  prefix stripping to invent resolution hints; no assertions that pass only
  when folder or service identifiers match that one pilot. Allowed scope filters
  are **generic** (e.g. `**/src/main/java/**`, exclude `**/src/test/**`).
  Synthetic fixture names under ODS-owned trees are required for CI DoD.

### Key Entities

- **Native model v2 (Java symbols)**: extension of Java v1 symbols with
  method-level symbols for **all methods** on top-level production types
  (any visibility) and semantic usages; DoD mandatory usage kind is
  **`calls`**.
- **Canonical edge `calls`**: code-layer link between two Canon nodes
  (caller → callee); stable id; bound to project, run, and file — same meaning
  as in `008`.
- **Canonical node (code)**: module, namespace/package, type, method — without
  changing the meaning established in `006`/`018`; new/updated writes use
  `metadata.layer = code`.
- **Envelope run**: contract from `005`; native model version determines
  whether usages are present for ingest.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the pilot Java fixture, uniquely resolvable production
  **instance and static** method calls (including at least one cross-file
  case and at least one **cross-module** case when the fixture is
  multi-module) each yield a corresponding `calls` edge after every
  successful analysis run (100% of fixture runs).
- **SC-002**: Re-ingest of a saved Java native **v1** envelope shows no
  regression on the `018` symbol checklist (modules/packages/top-level types
  still present; zero v1 regressions on that checklist).
- **SC-003**: On the ambiguous/unresolved fixture set, those sites create
  **zero** false `calls` edges and **zero** failed analysis runs caused by
  those sites alone.
- **SC-004**: After ingest of Java v2 with `calls`, existing graph read/search
  (same API/flows as after `007`/`008`) returns those edges — no new screen.
  DoD is an **integration/API assert** (parity with `008` T027); portal UI
  click-through is optional smoke only (parity with `008` T028).
- **SC-005**: A call that exists only under `src/test/java` in the fixture
  does **not** appear as a DoD `calls` edge, while the paired production call
  under `src/main/java` does.
- **SC-006**: DoD acceptance for Java `calls` passes on the ODS-owned
  **multi-module** fixture (differently named modules, no external-pilot path
  or service naming hard-coded in product logic). A second separate fixture
  tree is SHOULD; renaming pilot-specific strings in product logic must not
  be required for SC-001…005 to pass.

## Assumptions

- Orchestrator and language confirmation UX (`005`) stay unchanged: the same
  analysis run; Java module on a normal run emits **v2**; ingest still accepts
  **v1**.
- Canonical edge type `calls` and graph search after `007`/`008` are already
  sufficient to demonstrate Java calls; no Java-specific facet is required.
- Unresolved and ambiguous calls are **skipped** (no edge); no overload
  “winner” heuristic; no artificial edge cap as a DoD requirement.
  Interface/abstract receivers resolve to the interface/abstract method
  symbol when unique — never to a chosen concrete implementation.
- Production path rule matches `018`: `**/src/main/java/**` only for DoD.
- Java **`injects`** (constructor / field DI) is out of mandatory scope for
  this feature; C# `injects` from `008` is unchanged.
- HTTP and system landscape for Java/Spring stay owned by `019` and related
  artifact modules; this feature only deepens the **language** graph.
- Vision backlog item “Java language schema v2 `calls`” is the parent intent;
  promoting it into this feature does not reopen closed DoD of `018`/`019`.
- **Pilot ≠ product rule**: historical dogfood-tuned helpers in other modules
  (path priority for one UI tree, stripping one monorepo name prefix for service
  hints, tests locked to that tree’s patterns) are **anti-patterns** for this
  feature — cited as lessons learned, not templates to copy. Fixture-first
  generic rules beat “works on the pilot” special cases.
- Depth bar: uniquely resolved **instance and static** method calls on
  supported structures in fixtures; constructors / `super` / reflective out
  of DoD; not a promise of regex-MVP quality across every arbitrary Java
  repository.

## Related materials

- Vision deferred note: `specs/001-ods-vision/spec.md`
- Parity reference: `specs/008-code-graph-depth/spec.md`
- Java MVP: `specs/018-parser-extension-playbook/spec.md`
- Spring/HTTP (explicit non-goals): `specs/019-spring-system-landscape/spec.md`
- JSON-model drafts: `ods-help/requirements/json-model/` (native symbols v2 /
  canonical code edges)
