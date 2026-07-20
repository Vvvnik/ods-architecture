# Specification: Zooming the pipeline (large repo)

**Feature**: `010-scale-pipeline`

**Created**: 2026-07-15

**Status**: ✅ implemented (2026-07-15). DoD A+B closed (pilot large-repo;
T047/T048). Follow-up: Parser CLI SDK (US7 / post-010). Canvas → `011`.

**Input**: Pipeline gain sync → detector → orchestrator → parsers →
ingest → store count → API/UI-lists under **large** repository
(class enterprise .NET monorepo). Scale reference for manual smoke —
external path (not committed to ODS). Canvas / React Flow — **not** in scope
this feature (→ `011-ods-graph-viewer`).

**Parent Spec**: `specs/001-ods-vision/spec.md` (phase 9)

**Dependencies**: `specs/005-code-analysis/spec.md`;
`specs/006-project-graph/spec.md`; `specs/007-portal-scale-ux/spec.md`;
`specs/008-code-graph-depth/spec.md`; `specs/009-system-landscape/spec.md`

## Short description

After closing code- and system-layers (`005`–`009`) pilot on a small fixture
works, but the target repositories are orders of magnitude larger. The user must
get **predictable, correct and fast enough** full cycle
analysis of a large source tree **no** interactive diagrams (canvas).
This feature is about the sustainability and scale of the pipeline and list view
graph, not about the new UX- visualizer.

## Clarifications

### Session 2026-07-15

- Q: be sure to close the stage `010`? → A: **SC on fixtures +
  mandatory manual smoke** on the external benchmark for scale operator
  (**no** CI and **no** commit a reference in git ODS).
- Q: Absolute limit wall-clock full cycle `large-repo` fixture? →
  A: **≤ 15 minutes**; the operator needs **visible progress** stroke sync/analysis
  (not "silence" on a long run).
- Q: What progress is sufficient in MVP? → A: **Stage + active parser /
  "N from M"** (exempt per cent).
- Q: General parser CLI SDK (US7) — in MVP `010` or follow-up? → A:
  **Follow-up after scale MVP**; in Speke **leave a clear reminder**,
  what needs to be done (not forgotten technical debt).
- Q: the memory limit child parsers in MVP? → A: **Only timeout +
  max parallel** (without hard RAM cap).
- Q: What is included in the limit "≤ 1 full bypass WC" on cycle sync + training
  analysis (walk-scope)? → A: **One walk for the entire cycle**: sync builds
  file inventory; detector and change-set MUST reuse this image
  without completely traversing the disk again.
- Q: How to close SC-003 (increment ≥40% faster full) in DoD? → A:
  **Compulsory metering** wall-clock analysis+ingest large fixture:
  incremental after changing ≤1% files ≥40% faster full **or**
  explicit record of the reason why the increment is unavailable.
- Q: What is the threshold of nodes for SC-005 / DoD list UI? → A: DoD =
  the first page of the tree/search graph **large-repo** (actual
  max nodes after the analysis); the goal is ≥10 000 — **landmark** not hard
  blocker if fixture is less.
- Q: What progress sync sufficient MVP (FR-013)? → A: **Stage only**
  "Synchronization..."; detail "N from M" / active module — only for
  analysis run (parsers).
- Q: To what extent mandatory assert SC-002 (≤1 walk)? → A: **Gate on
  large-repo (≥1000 files)**; smaller fixtures — regression only/
  unit, not a replacement for acceptance.

## The boundaries of the spec

### Is included

- Troubleshooting **repeat round** wood working copy on one
  cycle sync+training analysis: **exactly one** full walk (usually in
  sync) builds file inventory; detector, change-set and related steps
  MUST take this picture without going around the tree again;
- **measurable** readiness criteria and quickstart: duration of stages
  cycle (including **comparison full vs incremental** for SC-003), the volume
  graph, run `large-repo` fixture; **mandatory**
  manual smoke on an external operator scale reference (local path outside
  repository ODS) — without committing the standard, without necessarily Docker-mount
  and **no** requirements CI;
- scale **C#-analysis**: many projects / solution, timeouts, partial
  success (`partial`) with clear parser results, increment without
  full recalculation of the entire repository without the need;
- scale **Orchestration**: controlled concurrency and child timeouts
  processes transparent status when `partial` / `failed` (hard RAM cap
  on subprocess **not** in MVP);
- scale **ingest / index count**: packet write, incremental
  upsert/delete for code- and system-layer, no dangling edges on
  non-existent nodes;
- scale **API list UI** count: pagination and search at large
  the number of nodes/edges (without canvas);
- **visible progress** long operations sync and analysis for the operator
  (stages / progress status, so as not to lose track of time).

**Postponed (must be fixed, not MVP `010`):**

- general CLI-contract / SDK for parsers (parsing arguments + writing
  envelope) — follow-up after closing scale MVP; MUST NOT forget.

### Not included

- React Flow / canvas / layout count (→ `011-ods-graph-viewer`);
- semantic change system-/code-layer parsers artifacts
  (except for necessary edits to scale existing modules);
- edit requirements and closing stages `002`–`009` (depending only
  **consumed**; spec `009` **not** replaceable);
- commit of an external operator scale reference or a copy thereof in
  `docker/fixtures`;
- RAG, auth, editing/deleting nodes in the graph UI;
- implementation of total parser CLI SDK within DoD `010` (follow-up see US7);
- hard RAM cap / kill threshold of memory per subprocess (outside MVP);
- mandatory CI-run on an external standard (only manual smoke
  by quickstart; not part of CI).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — One of the files of the cycle (Priority: P1)

How **operator platform** after sync and run analysis on large
repositories I am sure that the "**" system does not scan the "**" tree of the working copy
multiple times independently unnecessarily, and that detector, change-set and related
The steps rely on **one consistent** snapshot of file paths and metadata.

**Why this priority**: Re-crawls — the main source of extra time
and I/O on large trees; without this, the rest of the "scale" masks the symptom.

**Independent Test**: On **large-repo** (≥1000 files) to measure the number of
round WC one sync+the preparation of analyses (DoD SC-002); detector
and change-set give consistent sets of paths.

**Acceptance Scenarios**:

1. **Given** large WC (large-repo class), **When** runs sync and
   the report is based detector / change-set, **Then** for the entire cycle
   sync+training is used **no more than one** full bypass
   file tree: inventory created when sync (or the equivalent),
   detector and change-set **not** re full walk.
2. **Given** same WC, **When** compare the sample paths of the detector and
   change-set one snapshot moment, **Then** no contradictions
   "one has the file, the other does not" unchanged disk state.

---

### User Story 2 — Measurable run, the criteria of readiness and progress (Priority: P1)

How **team ODS** I can quickstart to get rid of large fixture, remove
stage durations (sync, detector, analysis run, ingest) and size
count and **necessarily** fix manual smoke external benchmark
the scale before the stage closes. During a long run, **operator**
sees **progress** (progress by stages), not "hanging without a signal".

**Why this priority**: No SC and run "blind" could not close the stage;
with no progress on a 15-minute cycle, it's easy to mistake a normal run for hang.

**Independent Test**: Follow quickstart on `large-repo` (or
equivalent to fixture); fill in the duration table; criterion SC
running or explicitly recorded regression.

**Acceptance Scenarios**:

1. **Given** manual quickstart, **When** perform a complete cycle on
   large-repo fixture, **Then** the report has duration sync, detector,
   analysis run and ingest plus counts nodes/edges.
2. **Given** an external scale reference is available locally from the operator,
   **When** runs closing smoke at quickstart, **Then** steps
   reproducible **no** premises benchmark in git ODS and **no** CI;
   step `010` **not** closes without a fixed result
   smoke (success or documented `partial` with a breakdown).
3. **Given** launched sync or analysis run on large fixture, **When**
   the operator is watching the portal during execution, **Then** is visible
   current status: **current stage** (sync / metal / analysis / ingest
   or equivalent) and during analysis — **active parser** and/or counter
   "N from M", updated to completion.

---

### User Story 3 — Large C# monorepo no "silent" failure (Priority: P1)

How **developer**, for a repository with many `.csproj` / solution I
get a completed run: either a complete success or **partial** with
clear parser statuses and timeouts, and a repeat run at
small changes **not** requires a complete recalculation of all the tree without
is necessary.

**Why this priority**: Target class of repositories .NET; C# — home
consumer CPU/time.

**Independent Test**: Fixture / repository with multiple projects C#;
the run ends within the timeout policy; incremental changes
only affected paths.

**Acceptance Scenarios**:

1. **Given** many projects C# in WC, **When** run the analysis,
   **Then** the run does not hang indefinitely: timeout or termination with
   the explicit status of the parser.
2. **Given** last successful run and modify a small set `.cs`,
   **When** re-analysis **Then** increment affected affected
   way; a complete recalculation of all repo **not** required; wall-clock
   analysis+ingest faster full baseline no less than **40%** **or**
   the report/quickstart explicitly states why the increment is unavailable.
3. **Given** failure or timeout of one of the parser in the success of others, **When**
   watch the end of the run, **Then** status `partial`/`failed` and list
   parser results allow you to understand what has fallen.

---

### User Story 4 — Orchestration under load (Priority: P2)

How is the **operator**, when running multiple parsers in parallel on
On a large repo, the system respects the concurrency limit and child timeouts.
processes and does not leave "empty" results without the error message.

**Why this priority**: after the basic correctness C# and picture FS;
enhances real-time stability.

**Independent Test**: Run multiple code + system parsers on
large fixture; observed limits; all statuses in `parser_results`
are filled.

**Acceptance Scenarios**:

1. **Given** configured limit concurrency N, **When** spawn M > N
   parsers **Then** at the same time are not more N.
2. **Given** failure or timeout of the child process, **When** run
   ends **Then** as a result there is a clear status and message
   for the operator (without the "quiet" skip no reason).
3. **Given** policy MVP no hard RAM cap, **When** parser falls
   OOM OS/runtime, **Then** this is reflected failed/partial message,
   without a separate mechanism kill by threshold RSS.

---

### User Story 5 — Ingest and completeness relations for large graph (Priority: P1)

As a **consumer of the graph**, after analyzing a large run, I see that
nodes and edges of code/system are written consistently: batch processing
maintains volume, increments delete obsolete, there are no edges to
non-existent nodes in the same snapshot of the run.

**Why this priority**: Invalid ingest at scale breaks the trust
count stronger slow UI.

**Independent Test**: Run fixture with code+system; the verification of the absence of
dangling edges; incremental delete/upsert path.

**Acceptance Scenarios**:

1. **Given** big envelope/a set of nodes **When** ingest, **Then**
   the entry is completed without error OOM/timeout within the policy stage.
2. **Given** incremental run with remote paths **When** ingest,
   **Then** corresponding nodes/edges code and system updated or
   they are being deleted.
3. **Given** cross-parser ribs (system), **When** target does not appear in
   picture **Then** edge **not** saved (policy `009` FR-010).

---

### User Story 6 Lists and search in large graph (Priority: P2)

How **portal user** on a graph with a large number of nodes , I open
list/search/tree screens and get result pages without hovering
UI and without counters that contradict the layer filter.

**Why this priority**: Canvas pending; list UX — the only way
check the graph on the scale.

**Independent Test**: Draft after analyzing large fixture; pagination roots/
children and search; the layer filter is matched with the displayed elements.

**Acceptance Scenarios**:

1. **Given** project after analyzing large-repo (actual node_count
   ≫ the page size; landmark ≥10 000 not mandatory) **When** download
   roots / "more" / search, **Then** UI responds page by page without downloading
   the entire graph is sent to the browser and there is no timeout on the first page.
2. **Given** filter layer `code` or `system`, **When** watch list /
   search, **Then** displayed items and counters displayed
   matched with the filter (without a "blank page" due to the client
   clipping without finishing reading).

---

### User Story 7 — General CLI for parsers (Priority: P3, follow-up)

How **developer parsers** after closing scale MVP I use
is a common contract for arguments CLI and entries envelope, so as not to duplicate
strapping in each module.

**Why this priority**: Need tendong, but **doesn't block** SC/FR scale
`010`. Closure phase `010` **not** requires the implementation US7; Spec
**captures** that **MUST** schedule followed.

**Independent Test** After the onset shared helper — two parser them
is used; the contract manifest/CLI for the orchestrator is unchanged.

**Acceptance Scenarios**:

1. **Given** follow-up after `010`, **When** implement common helper,
   **Then** argv/envelope conform to the contract `005` no change
   semantics spawn.

---

### Edge Cases

- The repository is larger than large-repo fixture (external reference): allowed
  longer run; MUST maintain predictable completion
  (success / partial / failed), not hanging.
- Sync again starts during analysis: the current rules `005`
  (conflict/restart failure) persists.
- Only system-artifacts or only code: pipeline scale MUST
  work in both cases.
- Empty change-set (incremental, no changes): The run is short
  completes without unnecessary heavy parsing (behavior `005`).
- The parser has run out of timeout: envelope missing or incomplete; status
  failed/partial without spoiling the previous successful snapshot of the graph .
  increment policies/bootstrap.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST not carry more than one full bypass
  of the working copy tree for a consistent cycle **sync + preparation
  analysis of**. Typical path: sync builds **file inventory** (one walk);
  detector and change-set MUST read this picture MUST NOT perform
  independent repeated full walk of the same WC in the same cycle.
- **FR-002**: System MUST to publish (in quickstart / report run)
  measurable indicators: duration sync, detector, analysis run,
  ingest and counts nodes/edges for the reference large fixture.
- **FR-003**: C#-parser and Orchestrator MUST support the policy timeout
  and completion with explicit status on multiple repositories
  projects/solutions.
- **FR-004**: incremental analysis MUST limit hard work
  affected paths (code and system) if there is a valid previous one
  a snapshot of the graph. DoD MUST include **measurable** comparison full vs
  incremental (see SC-003) or the documented reason for unavailability
  increments.
- **FR-005**: the Orchestrator MUST to comply with the limit parallel parsers and
  timeout policy; MUST record the result of each scheduled
  module (success / failed / skipped / missing) with reason for the failure.
  Hard cap RAM on subprocess **not** required MVP `010`.
- **FR-006**: Ingest MUST batch entry nodes/edges and
  correct incremental upsert/delete for code- and system-layer.
- **FR-007**: Ingest MUST NOT keep ribs are missing
  one of the ends in the photo sites on this run (policy already in
  `009` FR-010 / audit P0 — fix as the requirement of scale).
- **FR-008**: Graph API list UI MUST provide paging
  node/edge access and search without necessarily loading the entire graph
  per client; with the layer filter, the counters and lists MUST must be matched.
- **FR-009**: Documentation MUST describe **mandatory** hand smoke on
  external standard scale operator **no** commit a reference in ODS and
  **no** CI; DoD stage includes the result of this smoke.
- **FR-010**: General parser CLI SDK (parseArgs + envelope) **MUST** be
  noted as **mandatory follow-up** after scale MVP; **MUST NOT**
  block closure FR-001...FR-009 and FR-013. Implementation SDK **not** included
  in DoD stage `010`, but **not** is considered "cancelled".
- **FR-011**: Changes MUST NOT require edits `specs/009-system-landscape/spec.md`;
  new semantics system-layer out scale — out scope.
- **FR-012**: Canvas / interactive map MUST NOT be implemented in
  as part of this feature.
- **FR-013** During sync and analysis run portal MUST show
  to the operator **visible progress**. The current one is sufficient for **sync**
  of the cycle stage (for example, "Synchronization...") without mandatory counters
  files/items. When **analysis run** is additionally active
  the parser and/or "N from M" completed/planned modules.
  Interest stripe **not** mandatory in MVP.

### Key Entities

- **File inventory snapshot**: a consistent snapshot of relative paths
  and metadata of the WC files at the time of sync/ analysis; source for
  detector and change-set.
- **Scale run report**: the measured duration of stages and counts count
  for acceptance (fixture mandatory closing smoke).
- **Run progress indicator** displayed to the operator the status of the long stroke
  operations (current stage of sync/analysis).
- **Parser result summary**: status and message for each module in
  run-through (already available in `005`; tightened for scale).
- **Graph page / search result**: page nodes or edges with total/
  offset; consistency with the layer filter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On large-repo fixture (order ≥1000 files) full cycle
  sync → detector → analysis → ingest ends predictable (success
  or partial with a breakdown) for **≤ 15 minutes** wall-clock pilot
  the stack.
- **SC-002**: the Number of round wood WC per cycle **sync +
  prepare analysis** ≤ 1: inventory from sync (or equivalent reuse
  snapshot) serves detector and change-set; **mandatory**
  confirmation (test/instrumentation) — on **large-repo** (order of
  ≥1000 files). Separate walk sync "over" inventory **not**
  allowed as a justification of the second full bypass. Unit/smoke on
  smaller WC valid as regression, but **not** close SC-002.
- **SC-003**: Re-analysis after changing ≤1% files WC ends
  faster full baseline same repository not less than **40%**
  (by wall-clock analysis+ingest). Criterion closure — **required
  metering** on large-repo (or equivalent) with a record in quickstart/report
  running **or** is a clear documented reason if the increment
  is unavailable (then 40% is not required, but fallback MUST can be written).
- **SC-004**: After a successful/partial run, the proportion of "hanging" edges
  (ends without nodes in the same `analysis_run`) = **0%** at the control
  checks fixture.
- **SC-005**: The user opens the node tree and searches on the project after
  analysis **large-repo** (on the actual number of nodes of the graph this run)
  and gets the first page **no** timeout UI (feel < 3 C to
  the first page appears when backend is running on the pilot). Goal
  **≥10 000** nodes is a desirable reference point of the scale; if large-repo
  gives less DoD **not** is locked — fix the actual
  `node_count` report/quickstart.
- **SC-006**: Quickstart allows the operator in one pass to remove the table
  durations and counts on fixtures; closing smoke external benchmark
  scale performed and recorded (success or `partial` with decryption)
  without changing git ODS without CI.
- **SC-007**: run time ≥ 30 with the operator sees the current stage:
  on sync is the synchronization stage; during the analysis phase, the active parser or
  "N from M", without a frozen "silence" until completion.

## Assumptions

- `002`–`009` implemented and remain a source of functional semantics;
  this feature is hardening/scale on top of them.
- The external scale reference is a large local repository of the operator
  (outside git ODS); mandatory for DoD stage (`010`) like **manual** smoke,
  in CI ODS is not required.
- Existing fixture `large-repo` / `setup-demo-repos` — base
  automatic reference; thresholds SC are specified in plan if necessary.
  For SC-002 assert walk-count DoD — **large-repo** (≥1000 files), not
  small unit alone.
- Canvas (`011-ods-graph-viewer`) starts **after** closure criteria
  of this spec (or an explicit solution to the command "accept residual risk").
- US7 (parser CLI SDK) — **mandatory follow-up** after SC-001...SC-007;
  not DoD `010`, but roadmap/Speke should stay clear of "must do".
- Hard RAM cap parser — out MVP; sufficiently timeout + max parallel.
- The language of the spec artifacts and UI is Russian (constitution / vision).
