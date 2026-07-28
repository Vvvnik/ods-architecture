# Feature Specification: Parser and sync pipeline performance

**Feature Branch**: `026-parser-pipeline-perf`

**Created**: 2026-07-28

**Status**: Implemented (2026-07-29) — analysis levers + tree index ES hot
path (preload / bulk / skip-unchanged on warm sync). Operator confidence
on a large local tree (no paths in tracked artifacts): warm **sync** +
language detect ~tens of seconds; cold **tree import** (first full element
write) remains minutes-class; analysis ~few minutes, complete. Formal
SC-001 / SC-007 stopwatch on ODS `large-repo` still the fixture DoD for
close paperwork if required separately.

**Input**: User description: "Implement parser pipeline performance from
`ods-help/requirements/parser-pipeline-perf-draft.md`. Assign next free
feature id. Parent 001. Depends on 005/010/008/018; related closed 024/025
must stay orthogonal. Priority: P0 parallel defaults + prebuilt runtimes,
P1 long-lived workers + chunk policy; optional symbols-fast/calls-deep
only if clarify proves need. Keep native host per stack; no wrong-host
rewrites. Dogfood: measurable wall-clock on ODS fixture without false
calls. Update 001: promote pipeline perf from deferred to this feature;
S1 remains optional later. Do not reopen 010 casually."

**Scope amendment (2026-07-29)**: End-to-end pilot wait includes **tree
index** as well as analysis. Operators MUST NOT be forced through
multi-tens-of-minutes **warm sync** solely to re-validate analysis. Tree
index MUST NOT use per-path Elasticsearch round-trips on the scan hot path
(preload + bulk upsert / bulk soft-delete + in-memory status resolve;
skip unchanged docs on warm re-sync).

**Terminology (2026-07-29)**:

| Term | Meaning |
| ---- | ------- |
| **Tree import** | Cold first full write of the working-copy tree into Elasticsearch (all paths indexed). Same code path as sync; cost dominated by bulk write volume. |
| **Tree sync** (warm) | Later full WC walk + status resolve; **skip unchanged** element docs; soft-delete missing paths. Day-to-day operator loop after import. |
| Portal/API | Existing project **Import** creates the project; `POST` sync runs both cold import and warm sync. This feature does **not** rename UI/API strings — vocabulary above is for specs / dogfood / operator talk. |

**Parent Spec**: `specs/001-ods-vision/spec.md` (analysis + tree import/sync
wall-clock / large-repo pipeline performance)

**Dependencies**: `specs/005-code-analysis/spec.md` (orchestrator + parser
spawn); `specs/010-scale-pipeline/spec.md` (timeout / max parallel / file
chunks — consumed, not casually reopened); `specs/008-code-graph-depth/spec.md`
(semantic `calls` quality bar — cost driver); `specs/018-parser-extension-playbook/spec.md`
(modular parsers; native host per stack); `specs/002-domain-model/spec.md`
(sync / elements tree — extended, not casually reopened)

**Related (orthogonal, not dependencies)**: closed `024-grpc-from-proto`,
closed `025-python-parsers` — MUST NOT absorb this work into extract DoD

**Entry draft**: `ods-help/requirements/parser-pipeline-perf-draft.md`

## Clarifications

### Session 2026-07-28

- Q: Which ODS-owned fixture locks full-analysis wall-clock dogfood
  (SC-001 / FR-001)? → A: Existing `large-repo` fixture (≥1000 files;
  same class as `010`). Optional operator manual smoke on a large local
  project outside the ODS repo is allowed for confidence, but MUST NOT
  be the sole DoD and MUST NOT hardcode foreign paths, project UUIDs, or
  localhost portal URLs into tracked artifacts.
- Q: New default for max parallel parsers (today `2` in `010`)? → A:
  Raise the default to a fixed **4**, with operator documentation on when
  to raise it further; keep operator override within `010` safety bounds.
- Q: Include optional depth modes (symbols-fast vs calls-deep) in `026`
  DoD? → A: **No** — out of first cut. Keep current parser depth/quality
  unchanged (no quality trade-off for speed); wins are orchestration and
  packaging only (parallel defaults, prebuilt runtimes, workers, chunks).
- Q: Wall-clock improvement threshold for SC-001 on `large-repo`? → A:
  Keep **≥30%** vs recorded pre-feature baseline.
- Q: Where must before/after wall-clock (and phase timings) be written? → A:
  **Nowhere for now** — do not add timing fields to portal UI, analysis
  status column, API run status, backend log requirements, or mandatory
  quickstart timing tables. SC-001 is verified by operator-measured
  wall-clock (manual / external) before vs after on `large-repo`; no
  product surface for writing stage times in this feature.
- Q (analyze remediation): Per-parser chunk size in DoD? → A: **Out of
  DoD** — global chunk **500** + tiny-remainder merge only; per-parser
  override is a future MAY.
- Q (2026-07-29): Is **sync** wall-clock in `026` DoD? → A: **Yes** —
  tree index is in scope. Primary lever: eliminate per-path ES
  round-trips (preload, resolve status in memory, bulk upsert + bulk
  soft-delete). Manual status / `not_needed` inheritance MUST be
  preserved. Timing UX remains out.
- Q (2026-07-29): Sync success threshold? → A: Tree index wall-clock on
  ODS `large-repo` MUST improve by **≥30%** vs recorded pre-change
  baseline (SC-007), operator-measured. Distinguish **tree import**
  (cold full write) vs **warm sync** (skip unchanged) when interpreting
  measurements.
- Q (2026-07-29): Name cold first tree write vs warm re-run? → A: Call
  cold full element write **tree import**; call warm re-run **tree
  sync**. Do not rename portal/API in this feature; vocabulary is for
  specs/dogfood. Warm sync MUST keep a **full WC walk** (not
  change-only walk — that previously broke the tree).
- Q (2026-07-29): Skip unchanged on warm sync? → A: **Yes** — after full
  walk, omit ES bulk for active docs whose type/parent/status/manual
  flags are unchanged; still soft-delete missing paths.
## Short description

Operators on **large** repositories wait too long for **tree import /
warm sync** (element index into Elasticsearch) and for **full analysis**.
This feature cuts both **wall-clock** paths: tree index via preload + bulk
writes + skip-unchanged on warm sync (no per-path ES chatty loop; still a
**full** WC walk); analysis via safer parallelism defaults, prebuilt parser
runtimes, long-lived workers across chunks, and chunk policy — **without**
inventing false semantic `calls`, rewriting parsers onto the wrong host,
or folding performance into stack-extract features.

## Spec boundaries

### Included

- **P0 — Tree index ES hot path**: Working-copy tree import/sync MUST NOT
  issue per-path Elasticsearch find/upsert/ancestor queries on the scan
  hot path. MUST preload project elements (scroll/search_after; include
  inactive for id reuse), resolve status (manual preserve and
  manual-`not_needed` inheritance) in memory, bulk upsert **changed**
  elements only on warm sync, and bulk soft-delete missing paths.
  Progress throttling MUST NOT await ES on every path. Refresh only when
  writes occurred. **MUST** keep a full WC walk (not change-only scan).
- **P0 — Parallel defaults**: Raise the documented default for how many
  parser jobs may run concurrently from **2** to a fixed **4**, with
  operator guidance on when to raise further on larger hosts; build on
  `010` knobs without casually reopening `010` scope
- **P0 — Prebuilt runtimes**: Pilot/CI/Docker analysis hot path MUST use
  already-built parser artifacts (no on-the-fly source build / ad-hoc
  `run from source` fallback that adds cold latency when a release artifact
  is expected). Image build MUST prebuild every stack that sources the
  shared require-prebuilt gate. Worker startup failure MUST fall back to
  oneshot chunk spawn rather than leaving the whole run “partial” solely
  for worker protocol issues when oneshot would succeed.
- **P1 — Long-lived workers**: For a given analysis run, avoid spawning a
  fresh OS process for every file chunk of the same parser; reuse one
  worker (or equivalent warm pool) per `parser_id` for chunk work
- **P1 — Chunk policy**: Keep global file-chunk size (**500**); merge
  pathological tiny last chunks. Per-parser chunk overrides are **out of
  DoD** for this feature (future MAY)
- **P2 — Skip waste (light)**: Confirm empty/irrelevant artifact parsers
  stay skipped and analysis confirm honesty is preserved (detector +
  orchestrator; no new extract semantics)
- Operator-facing knobs / defaults for parallelism and chunking remain
  explicit and documented
- Dogfood: before/after wall-clock on the **same** ODS-owned `large-repo`
  fixture (same class as `010`, ≥1000 files), measured by the operator
  (manual / external) for **tree index** (SC-007; report import vs warm
  sync) and full analysis (SC-001). This feature MUST NOT add UI/API/log/
  quickstart surfaces that write stage or wall-clock times.
  Optional extra manual smoke on an operator’s large local tree is
  allowed for confidence only — not sole DoD; no foreign path / project
  id / localhost URL hardcodes in tracked artifacts
- Preserve native host per stack (TypeScript→Node, C#→.NET, Java→JVM, and
  other stacks already on their correct hosts)
- Preserve `010` timeout / parallel safety invariants (no silent removal of
  timeouts or unbounded fan-out)
- Promote `001` analysis/tree-index wall-clock item from deferred draft to
  this feature while active; S1 remains optional later
- Spec/dogfood vocabulary: **tree import** (cold) vs **tree sync** (warm);
  no portal/API string rename in this feature
### Deferred (explicitly out of this feature)

- **Optional depth modes** (“symbols-fast” / surface inventory vs semantic
  `calls`-deep / phased depth) — **out**. Current semantic depth and
  Canon quality for `calls` MUST remain as today; this feature MUST NOT
  add a lower-quality fast path. A future feature may revisit depth modes
  only with a separate clarify/spec.
- **Timing UX / observability product surfaces** — writing stage or
  wall-clock times into Sync status column, portal UI, API fields, or
  mandatory dogfood timing tables — **out** for now (clarify 2026-07-28).
  Replacing black analysis toasts with column progress is likewise **out**
  of this feature (prior chat idea; not in DoD here).
- Separate ingest/ES bulk profiling beyond enough to prove parse vs
  ingest bottleneck for **analysis** (P3 in draft). Sync element bulk
  upsert is **in** DoD (not deferred).
- Incremental-first day-to-day policy beyond what `010` already provides (P3)

### Not included

- Absorbing this into extract features (`024`, `025`, future stack extracts)
- Rewriting language parsers onto the wrong host for micro-benchmarks
- Matching syntax-only inventory tools feature-for-feature (different product)
- Lowering parser semantic depth or inventing a “fast but weaker `calls`”
  mode inside this feature
- Writing analysis/sync stage durations or wall-clock into portal UI,
  Sync status column, API run status, required backend timing logs, or
  mandatory quickstart timing tables
- Replacing black analysis toasts with a unified status-column progress UX
  (separate future work if specified)
- Hard RAM caps (still out per `010` unless newly specified elsewhere)
- S1 AI import (`graph_from_wc`), MCP (`016`), auth (`017`), color legend
- New Canon edge/node types; new Graph product; pixel UI redesign
- Foreign path hardcodes or committing external operator trees into ODS
- Casually reopening `010` as a general scale redesign (this feature
  **extends** orchestration/packaging/sync indexing behavior; it does not
  replace `010`)
- C++ API extract or other stack-coverage work
- Changing manual status semantics or inventing new element statuses

## User Scenarios & Testing *(mandatory)*

### User Story 0 — Faster tree import/sync without status regressions (Priority: P1)

As an **operator**, when I index a large working copy, tree indexing
completes in **measurably less wall-clock** than the pre-feature baseline
on the same machine and fixture, and manual statuses / `not_needed`
inheritance behave as before. After the first **tree import**, day-to-day
**warm sync** MUST stay fast enough for parser/graph debugging without
multi-tens-of-minutes waits.

**Why this priority**: Tree index often dominates end-to-end wait before
analysis can even start; operators must not wait tens of minutes of chatty
ES writes just to re-test analysis.

**Independent Test**: Record baseline tree-index wall-clock on ODS
`large-repo`; apply this feature; re-measure (label **import** vs **warm
sync**); Vitest proves bulk path, skip-unchanged, status preserve/inherit.
Optional confidence on a large local tree without hardcoding paths.

**Acceptance Scenarios**:

1. **Given** a recorded baseline tree-index wall-clock on ODS `large-repo`,
   **When** the same index runs after this feature under comparable host
   conditions, **Then** wall-clock improves by at least the locked
   threshold (SC-007); operator notes whether the run was cold **import**
   or **warm sync**.
2. **Given** elements with `status_manually_set` and folders marked
   manual `not_needed`, **When** warm sync re-indexes the tree, **Then**
   manual statuses are preserved and descendants inherit `not_needed`
   as before.
3. **Given** a multi-thousand-path tree, **When** the scan phase runs,
   **Then** the hot path uses preload + bulk upsert / bulk soft-delete
   (not one ES round-trip per path), keeps a **full WC walk**, and on warm
   sync skips unchanged element docs.
### User Story 1 — Faster full analysis without quality loss (Priority: P1)

As an **operator / architect**, when I run full analysis on a large ODS
fixture, the run finishes in **measurably less wall-clock time** than the
pre-feature baseline on the same machine and fixture, and semantic call
edges that were trustworthy before remain trustworthy (no false edges added
to “go faster”).

**Why this priority**: Wall-clock and Canon honesty are the product outcome;
packaging and workers are means.

**Independent Test**: Record baseline full-analysis wall-clock on ODS
`large-repo`; apply this feature; re-measure under the same conditions;
compare to SC target; spot-check a smoke fixture’s semantic `calls` (or
agreed deep path) against the existing quality bar. Optional: repeat a
timing pass on the operator’s large local project for confidence only.

**Acceptance Scenarios**:

1. **Given** a recorded baseline full-analysis wall-clock on ODS
   `large-repo`, **When** the same full analysis runs after this feature
   with the same fixture and comparable host conditions, **Then**
   end-to-end wall-clock improves by at least the locked success
   threshold (see SC-001 / Assumptions).
2. **Given** a smoke fixture that already exercises semantic `calls` (or the
   agreed deep path) under closed quality bars (`008` and successors),
   **When** analysis runs with this feature’s defaults, **Then** no new
   false call edges appear solely due to performance changes.
3. **Given** a full analysis run that succeeds after this feature,
   **When** the operator compares their manual/external wall-clock to the
   pre-feature baseline on the same `large-repo` fixture, **Then** the
   improvement meets SC-001 — without requiring the product to display or
   persist stage timings.

---

### User Story 2 — Hot path uses prebuilt parser runtimes (Priority: P1)

As an **operator**, pilot/Docker/CI analysis does not pay unexpected
source-build latency because a release parser artifact was missing and the
pipeline fell back to building or running from source on the hot path.

**Why this priority**: Packaging footguns are pure waste and dominate some
runs independently of algorithms.

**Independent Test**: Docker/pilot smoke with TS, C#, and Java (or the
stacks present in the dogfood fixture) shows prebuilt artifacts are used;
a missing expected artifact fails loudly or is caught in image build — it
MUST NOT silently add a cold source-build path during analysis.

**Acceptance Scenarios**:

1. **Given** a standard Docker/pilot analysis image (or documented local
   pilot layout), **When** analysis runs for stacks that ship native
   compiled/runtime packs, **Then** those parsers execute from prebuilt
   artifacts on the hot path.
2. **Given** an expected prebuilt artifact is absent where the image/layout
   claims it should exist, **When** analysis would otherwise start that
   parser, **Then** the failure is explicit (build/image defect) — not a
   silent fallback to a slow source-build hot path.

---

### User Story 3 — Chunked parsers reuse a warm worker (Priority: P2)

As an **operator**, when a parser processes many file chunks in one run, the
system does not pay a full cold process start for every chunk of that same
parser.

**Why this priority**: Chunk×cold-start is the largest orchestration
multiplier after parallelism defaults; builds on `010` chunking.

**Independent Test**: A parser with multiple file chunks in one run reuses
one long-lived worker (or warm pool) for those chunks; spawn count for that
`parser_id` is not “one new OS process per chunk”.

**Acceptance Scenarios**:

1. **Given** an analysis run where a single `parser_id` receives two or more
   file chunks, **When** those chunks are processed, **Then** work is handed
   to a reused worker for that `parser_id` in that run (not a fresh OS
   process per chunk).
2. **Given** timeouts and max-parallel limits from `010`, **When** workers
   are reused, **Then** those safety limits still apply (no unbounded
   concurrency, no removed timeouts).

---

### User Story 4 — Explicit parallel and chunk knobs (Priority: P2)

As an **operator**, I can see and set concurrency and chunk-size controls
with documented defaults suitable for multi-core hosts, without guessing
hidden behavior.

**Why this priority**: Ops control and safe defaults are P0/P1 companions;
required for pilot hosts of different sizes.

**Independent Test**: Documented defaults (max parallel **4**, file chunk
size) and operator knobs; changing them changes run behavior observably.

**Acceptance Scenarios**:

1. **Given** the pilot documentation for analysis scale knobs, **When** an
   operator reads defaults for max parallel parsers and file chunk size,
   **Then** the values and when to raise them are explicit.
2. **Given** an operator raises max parallel parsers above the default
   **4** within documented safe bounds on a multi-core host, **When**
   many language/artifact jobs are queued, **Then** more jobs proceed
   concurrently than under default **4** (subject to safety caps).
3. **Given** a fresh pilot install with no override, **When** analysis
   starts, **Then** max parallel parsers defaults to **4** (not 2).

---

### Edge Cases

- Partial / failed parser results under timeout still surface clearly; reuse
  MUST NOT hide failures or leave orphan workers after run end
- Tiny final file chunks MUST NOT multiply cold starts (policy or merge with
  prior chunk as designed)
- Empty or irrelevant artifact parsers remain skipped; confirm modal honesty
  unchanged
- Host with few cores: higher parallel default MUST NOT force unsafe
  oversubscription beyond documented guidance
- Mixed stack run (TS + C# + Java + artifacts): native host per stack
  preserved; no unification into one polyglot process “for speed”
- Incremental / change-set runs: MUST NOT regress `010` incremental benefits;
  this feature’s primary dogfood is full analysis wall-clock

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST complete full analysis on the ODS-owned
  `large-repo` fixture (≥1000 files; same class as `010`) with
  end-to-end wall-clock improved by at least the locked threshold versus
  a recorded pre-change baseline under comparable host conditions (see
  SC-001 / Assumptions).
- **FR-002**: Performance changes MUST NOT introduce false semantic `calls`
  (or agreed deep-path edges) on smoke fixtures that already meet closed
  quality bars.
- **FR-003**: Analysis MUST keep each language/artifact parser on its
  existing native host for that stack (no wrong-host rewrite for speed).
- **FR-004**: Pilot/Docker/CI hot path MUST execute parsers from prebuilt
  artifacts when the stack ships such artifacts; MUST NOT silently fall
  back to source-build / run-from-source latency on that path. Docker image
  build MUST produce those artifacts for every module gated by
  require-prebuilt.
- **FR-005**: Within a single analysis run, when a `parser_id` processes
  multiple file chunks, the orchestrator MUST reuse a long-lived worker (or
  equivalent warm pool) for that `parser_id` rather than spawning a new OS
  process per chunk. If worker start/protocol fails, the orchestrator MUST
  fall back to oneshot chunk processing for that parser rather than failing
  the whole job solely for worker mode.
- **FR-006**: File-chunk policy MUST use a documented global chunk size
  and MUST avoid pathological tiny last-chunk patterns that defeat reuse
  (tiny-remainder merge). Per-parser chunk size overrides are **out of
  DoD** for this feature (future MAY).
- **FR-007**: Max-parallel parser concurrency MUST default to **4**
  (raised from the prior `010` default of 2), MUST remain
  operator-overridable within safety bounds inherited from `010`, and
  MUST document when operators SHOULD raise the value further on
  multi-core hosts.
- **FR-008**: Timeout and parallel safety invariants from `010` MUST remain
  in force (timeouts still apply; concurrency remains capped).
- **FR-009**: Empty/irrelevant artifact parsers MUST remain skippable; the
  analysis confirm experience MUST NOT claim work that will not run.
- **FR-010**: Formal dogfood for SC-001 and SC-007 MUST use ODS-owned
  `large-repo` and operator-measured wall-clock before vs after (manual /
  external). This feature MUST NOT add product surfaces that write stage or
  wall-clock times (portal UI, Sync status column, API run timing fields,
  mandatory timing logs, or required quickstart timing tables). Tracked
  artifacts MUST NOT hardcode foreign paths, project UUIDs, or localhost
  portal URLs. An optional operator manual smoke on a large local project
  outside the ODS repo MAY be done for confidence and MUST NOT replace
  `large-repo` as sole DoD.
- **FR-011**: Optional symbols-fast / calls-deep depth modes MUST NOT ship
  in this feature. Parser semantic depth and `calls` quality MUST remain
  at the current closed-bar level; speed wins MUST come from
  orchestration, packaging, defaults, chunk/worker behavior, and sync
  indexing only.
- **FR-012**: This feature MUST NOT expand extract DoD of closed `024` /
  `025` or reopen `010` as a general redesign; changes are limited to
  orchestration, packaging, defaults, chunk/worker behavior, sync element
  indexing performance, and documentation stated in Included.
- **FR-013**: Tree import/sync MUST preload project elements
  (`loadByProjectPathMap`), resolve status in memory (preserve
  `status_manually_set`; inherit `not_needed` from manual ancestors),
  bulk upsert **changed** elements (skip unchanged active docs with the
  same type/parent/status/manual flags), and bulk soft-delete paths no
  longer present — MUST NOT use per-path Elasticsearch find/upsert/
  ancestor queries on the scan hot path. MUST keep a **full WC walk**
  (MUST NOT revive change-only tree assembly).
- **FR-014**: Tree index performance changes MUST preserve existing
  element status semantics (manual preserve, manual-`not_needed`
  inheritance, soft-delete of missing paths, denylist inventory
  behavior).
- **FR-015**: Specs and dogfood MUST use **tree import** (cold full
  write) vs **tree sync** (warm; skip unchanged) vocabulary. This feature
  MUST NOT rename portal/API sync strings.

### Key Entities

- **Tree import**: Cold first full element write for a project tree
- **Tree sync** (warm): Later full WC walk with skip-unchanged ES writes
- **Sync run** (API): One working-copy refresh + tree scan + element index
  update (covers both import and warm sync)
- **Element preload map**: In-memory path→element snapshot used for status
  resolve and soft-delete during tree index
- **Analysis run**: One operator-triggered (or equivalent) full or
  incremental analysis over a project working copy
- **Parser job**: Work unit for one `parser_id` within a run (may cover
  multiple file chunks)
- **File chunk**: Bounded file list handed to a parser worker
- **Parser worker**: Long-lived process (or equivalent) that accepts one or
  more chunks for a `parser_id` within a run
- **Prebuilt parser artifact**: Release-ready binary/pack expected on the
  hot path for a stack’s native host
- **Scale knobs**: Operator-visible controls for max parallel parsers, chunk
  size, and related timeouts (from `010`, refined here)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Full analysis wall-clock on the ODS-owned `large-repo`
  fixture is **≥30% faster** than the recorded pre-feature baseline under
  comparable host conditions (same fixture, same analysis scope).
- **SC-002**: On a semantic-`calls` smoke fixture, deep-path quality meets
  the existing bar — **zero** new false call edges attributable to this
  feature.
- **SC-003**: Docker/pilot smoke for TS, C#, and Java (stacks present in
  dogfood) uses prebuilt parser artifacts on the hot path with **no**
  silent source-build fallback.
- **SC-004**: For a multi-chunk parser job in one run, OS process starts per
  `parser_id` are **not** one-per-chunk (worker reuse observable during
  dogfood verification).
- **SC-005**: Operators can locate documented defaults (including max
  parallel parsers default **4** and file chunk size) and override
  guidance without reading source code.
- **SC-006**: No regression of `010` timeout / max-parallel safety in
  dogfood (timeouts still fire; concurrency remains capped).
- **SC-007**: Tree index wall-clock on ODS `large-repo` is **≥30% faster**
  than the recorded pre-feature baseline under comparable host conditions.
  Measurements MUST note **tree import** vs **warm sync**. Warm sync after
  import is the day-to-day bar for parser/graph debugging.
- **SC-008**: Automated tests prove tree-index hot path uses preload +
  bulk upsert, skips unchanged docs on re-sync, avoids per-path upsert /
  ancestor ES, and preserves manual status / `not_needed` inheritance.

## Assumptions

- Wall-clock success threshold is **≥30%** improvement on `large-repo`
  for both analysis (SC-001) and tree index (SC-007); percentage is fixed
  for this feature DoD.
- **Tree import** (cold) remains write-heavy by nature; **warm sync** is
  the primary day-to-day win (full walk + skip unchanged).
- Formal dogfood fixture is ODS-owned **`large-repo`** (same class as
  `010`); plan/quickstart locks the fixture path under
  `docker/fixtures/repos/`. Optional operator smoke on a large local
  project is confidence-only and stays out of tracked hardcodes.
- Default max parallel parsers is **4** (was 2); further increases are
  operator choice per documentation, not auto-detect from CPU count.
- Chunk DoD is global size **500** + tiny-remainder merge; per-parser
  chunk overrides are out of this feature’s DoD.
- Baseline and after measurements for SC-001 / SC-007 are **operator-measured**
  (manual / external); the product MUST NOT gain timing-write UX/API in
  this feature.
- “Comparable host conditions” means same machine class / core count band
  and same analysis/import/sync profile; not a cross-cloud SLA.
- Optional depth modes stay **out**; current parser depth/quality is
  unchanged. First-cut wins are P0+P1 (+ light skip-waste) including tree
  index ES hot path.
- Native host mapping from `018` / existing modules remains correct; this
  feature does not change which runtime owns which stack.
- `010` remains the scale baseline; this feature refines behavior and
  defaults rather than replacing scale requirements wholesale.
- Sync status semantics from `002` remain correct; this feature changes
  **how** elements are written (bulk / skip unchanged), not **what**
  statuses mean. Change-only WC walks that previously broke the tree stay
  forbidden.
- Portal/API keep existing Import project + Sync action labels in this
  feature; **tree import** / **tree sync** are spec vocabulary only.
- S1, C++ API parsers, MCP, auth, and color legend remain outside and
  optional/later as already stated in `001`.
