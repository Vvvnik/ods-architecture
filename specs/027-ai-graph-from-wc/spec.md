# Specification: S1 — AI graph from working copy

**Feature**: `027-ai-graph-from-wc`

**Created**: 2026-08-02

**Status**: Closed (2026-08-02 — SpecKit complete: AiJob `graph_from_wc`,
dual prompts, Status scope, provenance badge, ingest gates; unit/API +
Compose dogfood with System/Code/UI parity; consistency hardening for
docs-write kind gate, ingest Status scope, recovery, dual-job docs panel;
Graph View System root/focus slice rules locked in `014` / `011`)

**Input**: Draft `ods-help/requirements/027-ai-graph-from-wc-draft.md`
(clarify locked 2026-08-02). Vision label **S1** (AI → graph from WC);
counterpart to closed `015` = S2 `docs_from_es`. Product template stub:
`prompts/code-agent-prompt.md`.

**Parent Spec**: `specs/001-ods-vision/spec.md`

**Dependencies**: `002`/`003` (project, WC, sync/import); `005`/`006`
(analysis run + Canon); `007`/`011`/`014` (graph consumption); `015`
(shared **AiJob** bus / runner / status — first client `docs_from_es`;
reuse, do not fork); `010` replace-after-success / full-analysis policy
as already applied for graph writes. `026` (pipeline perf) useful for WC
work but not a hard product gate for S1 dogfood.

## Short description

Modular parsers build the project graph with high control and known stack
gaps. Architects sometimes need an **alternate full landscape** from an
already-imported working copy when parsers are incomplete for that tree —
without inventing a second graph product.

This feature delivers **S1 — AI graph from WC**: after a successful **parser**
analysis, the operator downloads a **code** project prompt, runs an
**external** agent (same habit as docs in `015`), and the agent rebuilds the
**same** Canon-shaped graph (Code / System / UI) with AI provenance. Cold
import, tree sync, and first analysis stay on the **parser** path. AI never
runs on sync and is not an import toggle.

## Clarifications (locked 2026-08-02)

Recorded from entry-draft clarify; no blocking clarifications remain:

1. **Prompt filenames** → rename `AGENT.md` → `AGENT-DOC.md`; add
   `AGENT-CODE.md`.
2. **Canon depth** → same six-schema frame as parsers (Code / System / UI ×
   node + edge).
3. **Prompt storage** → project docs root (`docs/{projectId}/`), outside WC.
4. **Download UI** → two buttons (docs prompt / code prompt).
5. **Hybrid parsers+AI in one run** → out; full rebuild; last successful
   wins; failure does not replace prior success.
6. **Legacy element statuses** → UI picker shows only `auto_found` /
   `needed` / `not_needed`; leave `found`/`unused` readable in storage; no
   mandatory remap migration in first cut.
7. **Provenance UI** → MVP badge on **Graph View** header (“Built by
   parsers” / “Built by AI”) from run `graph_builder`; **do not** overload
   file-tree Status. Other run-summary surfaces optional if already present.
8. **In-process LLM** → deferred; external agent + download only (parity
   with `015`).
9. **`AGENT-CODE.md` visibility** → after first successful **parser**
   analysis (seed in docs tree); not on cold import; download refreshes
   with job id.

### Session 2026-08-02

- Q: Invalid/unknown Canon from the agent — fail whole job or drop bad
  items and publish the rest? → A: **A** — any invalid/unknown kind or
  shape → AiJob **failed**; previous successful graph is **not** replaced
  (no “drop and succeed”).
- Q: Empty or near-empty AI graph — trust agent `succeeded` or server
  gate? → A: **B** — server requires valid Canon **and** at least one
  node; otherwise AiJob **failed** and previous graph is not replaced.
- Q: When does `AGENT-CODE.md` appear in the project docs tree? → A:
  **After first successful parser analysis** (seeded then; not on cold
  import). Code-download re-renders with a live `CODE_JOB_ID`.
  *(Supersedes earlier “only on download” lock — product correction
  2026-08-02.)*
- Q: Existing projects still have `AGENT.md` — migration policy? → A: **A**
  — auto-rename `AGENT.md` → `AGENT-DOC.md` on first docs access/download
  if the old name is still present.
- Q: May `docs_from_es` and `graph_from_wc` both be `running` for one
  project? → A: **A** — yes, concurrent by kind; docs remain bound to the
  `analysis_run_id` frozen at docs-download (graph rebuild does not strip
  docs of an input graph; docs never build the graph).

### Session 2026-08-02 (analyze remediation)

- Q: Code-download prerequisite after an AI graph is current (I1)? → A:
  First code-download still requires a prior **parser** graph-ready success
  in project history; subsequent code-downloads allowed when **any**
  graph-ready run exists.
- Q: Provenance badge surfaces (I2)? → A: Graph View header is MVP MUST;
  other analysis-run chrome optional if already present.
- Q: WC read size cap (U1)? → A: Config
  `AI_GRAPH_WC_MAX_FILE_BYTES` default **1048576** (1 MiB); oversize →
  reject read (not full-file dump).

## Scope

### In scope

- AiJob kind **`graph_from_wc`** on the shared AiJob bus from `015`
  (create/supersede via Download code prompt; progress/complete; current
  job by kind).
- Grow `prompts/code-agent-prompt.md` into the S1 playbook; seed
  **`AGENT-CODE.md`** under the project docs tree **after first successful
  parser analysis** (not on cold import); code-download re-renders with
  job placeholders.
- Rename docs prompt file **`AGENT.md` → `AGENT-DOC.md`** (new imports seed
  `AGENT-DOC.md`; existing `AGENT.md` auto-renamed on first docs
  access/download); keep docs AiJob behavior otherwise intact; two
  download buttons in the docs/prompt area.
- Allowlisted WC read for the code agent (size limits; pilot safety norms);
  Canon write via existing analysis-run / **replace-after-success** rules.
- Analysis **Status scope** for parsers **and** AI: include `auto_found` and
  `needed`; exclude `not_needed` (and descendants with that status) from
  inventory/graphs; tree sync still lists all paths; Status picker shows
  three choices only.
- Graph provenance badge on **Graph View** header from run
  `graph_builder` (parsers vs AI).
- Dogfood on an ODS-owned fixture (or existing demo WC): AI path produces a
  Canon-shaped graph visible in Graph View; optional confidence on a large
  local tree without foreign paths/UUIDs/localhost URLs in tracked
  artifacts.
- Portal strings for new UI via i18n `en`/`ru` only.

### Out of scope

- Parsers/AI radio on cold import; AI during tree sync.
- Hybrid partial AI + parsers graph in one run.
- Second / parallel graph model or AI-only Canon schemas.
- Merging docs generation (`docs_from_es`) into this feature beyond the
  shared prompt rename + second button.
- In-process LLM, MCP (`016`), auth (`017`), RAG/Q&A, codegen.
- C++ API parsers; mandatory remap of legacy `found`/`unused` statuses.
- Claiming parser-grade `calls` honesty for AI edges unless separately
  measured; inventing edges to “look complete”.
- Full enterprise DLP product beyond existing pilot path allowlist / size
  caps norms.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Optional AI graph rebuild via code prompt (Priority: P1)

After a successful parser analysis, the architect downloads the **code**
project prompt, runs an external agent against ODS, and sees a full graph
rebuild from the working copy in Graph View with AI provenance. A failed or
cancelled AI job leaves the previous successful graph unchanged.

**Why this priority**: Core S1 value — alternate landscape without a second
graph product or import toggle.

**Independent Test**: On an ODS fixture with a successful parser analysis,
download code prompt → complete a `graph_from_wc` job with valid Canon →
Graph View shows that run; cancel/fail a second job → prior graph remains.

**Acceptance Scenarios**:

1. **Given** a project with successful parser analysis, **When** the operator
   downloads the code prompt, **Then** ODS starts (or supersedes) a
   `graph_from_wc` AiJob and provides a rendered `AGENT-CODE.md` for an
   external agent.
2. **Given** a running `graph_from_wc` job, **When** the agent completes
   with fully valid ingest-compatible Canon containing at least one node
   and no unknown/invalid items, **Then** Graph View shows that run’s
   graph and prior successful graph is replaced only after success.
3. **Given** a running `graph_from_wc` job, **When** the agent submits any
   unknown kind, invalid Canon shape, **or** a zero-node graph, **Then**
   the job fails and the previous successful graph remains visible.
4. **Given** a previous successful graph (parsers or AI), **When** a
   `graph_from_wc` job fails or is cancelled, **Then** the previous
   successful graph remains visible.
5. **Given** cold import of a fixture, **When** the operator runs first
   analysis, **Then** the parser path still runs (no AI on import/sync).

---

### User Story 2 - Dual downloadable prompts (Priority: P1)

In the docs/prompt area the operator has **two** download actions: docs
(`AGENT-DOC.md`) and code (`AGENT-CODE.md`). Choosing docs does not require
S1 completion beyond the rename; choosing code drives the graph job path.

**Why this priority**: Same operator habit as `015`; clear separation of S1
vs S2 without a mega-prompt.

**Independent Test**: After parser success, both buttons available; docs
download still creates/supersedes `docs_from_es` and yields `AGENT-DOC.md`;
code download yields `AGENT-CODE.md` and `graph_from_wc`.

**Acceptance Scenarios**:

1. **Given** successful parser analysis, **When** the operator opens the
   docs/prompt area, **Then** two distinct download controls are shown
   (docs and code).
2. **Given** the docs download control, **When** used, **Then** behavior
   matches closed `015` aside from the `AGENT-DOC.md` filename; if legacy
   `AGENT.md` is present, it is auto-renamed to `AGENT-DOC.md`.
3. **Given** a project after successful parser analysis, **When** the
   operator opens Documentation, **Then** both `AGENT-DOC.md` and
   `AGENT-CODE.md` appear in the docs tree (`AGENT-CODE` was not present
   at cold import alone).
4. **Given** the code download control after successful parser analysis,
   **When** used, **Then** `AGENT-CODE.md` is re-rendered with a live
   job id and the graph AiJob path is engaged (not docs writes).
5. **Given** a newly imported project, **When** docs are seeded, **Then**
   the docs prompt file is named `AGENT-DOC.md` (not `AGENT.md`) and
   `AGENT-CODE.md` is still absent until parser analysis succeeds.

---

### User Story 3 - Element Status scope at analysis (Priority: P2)

The operator marks some paths `not_needed`. Later parser analysis and AI
graph rebuild both omit those paths from inventory/graphs; the tree still
lists them after sync. The status picker offers only three choices.

**Why this priority**: Shared scope rule for parsers and AI; avoids AI
reading or writing out-of-scope paths; clarifies tree Status vs provenance.

**Independent Test**: Mark paths `not_needed` → run parser analysis and/or
AI rebuild → out-of-scope paths absent from graph inventory; tree still
shows them; picker has three options only.

**Acceptance Scenarios**:

1. **Given** some elements marked `not_needed`, **When** parser analysis or
   `graph_from_wc` runs, **Then** those paths (and descendants with that
   status) are out of inventory/graphs.
2. **Given** the same project, **When** tree sync runs, **Then** all WC
   paths remain listed and manual statuses are preserved as today.
3. **Given** the element status control, **When** the operator opens the
   picker, **Then** only `auto_found`, `needed`, and `not_needed` are
   offered (legacy `found`/`unused` not offered for new picks).

---

### User Story 4 - Graph provenance badge (Priority: P2)

On the Graph View header the operator sees whether the **current** graph
was built by parsers or by AI (`graph_builder`). File-tree Status is
unchanged (`auto_found` stays “found automatically”, not “found by AI”).

**Why this priority**: Operators must distinguish rebuild source without
overloading tree Status (clarify lock).

**Independent Test**: Parser success → badge shows parsers; AI success →
badge shows AI; element Status labels unchanged.

**Acceptance Scenarios**:

1. **Given** a successful parser analysis as current graph, **When** the
   operator views Graph View header, **Then** provenance indicates
   parsers.
2. **Given** a successful `graph_from_wc` as current graph, **When** the
   operator views Graph View header, **Then** provenance indicates AI.
3. **Given** either provenance, **When** the operator inspects file-tree
   Status, **Then** Status values/meanings are not rewritten to
   parser/AI variants.

---

### Edge Cases

- Download code prompt while a `graph_from_wc` job is already `running` →
  supersede/cancel prior job and start a new one (parity with docs AiJob);
  complete/writes from cancelled job rejected.
- Invalid / unknown Canon shape or kind from the agent → AiJob **failed**;
  do not invent edges; do **not** drop-and-publish a subset; previous
  successful graph remains (replace-after-success).
- Operator starts docs-download while `graph_from_wc` is `running` (or the
  reverse) → both MAY proceed; docs agent continues against its bound
  `analysis_run_id`; graph agent builds a separate rebuild run.
- Project that still has legacy `AGENT.md` → on first docs access or docs
  download, ODS renames to `AGENT-DOC.md`; docs flow continues without
  operator manual rename.
- AI job with schema-valid but **empty** Canon (zero nodes) → AiJob
  **failed**; previous successful graph remains (same gate as invalid
  shape). Dogfood still requires a visible useful landscape on the ODS
  fixture beyond the empty-node floor.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cold tree import MUST create elements as `auto_found` with
  **no** AI and **no** Parsers/AI import choice.
- **FR-002**: Tree sync MUST remain a filesystem↔inventory walk that never
  invokes AI and MUST preserve statuses as today (including
  `not_needed` inheritance under manual ancestors).
- **FR-003**: First analysis after import MUST use the parser path; AI
  graph rebuild MUST be an optional later step via the code prompt.
- **FR-004**: After successful parser analysis, the docs/prompt area MUST
  expose **two** download controls: docs prompt and code prompt.
- **FR-005**: Docs download MUST render/serve **`AGENT-DOC.md`** (rename
  from `AGENT.md`) and MUST preserve `docs_from_es` AiJob behavior aside
  from the filename and the second button. On first docs access or docs
  download for a project that still has `AGENT.md`, ODS MUST auto-rename
  it to `AGENT-DOC.md`.
- **FR-005a**: New project import MUST seed **`AGENT-DOC.md`** (not
  `AGENT.md`) for the docs prompt.
- **FR-006**: Code download MUST re-render/serve **`AGENT-CODE.md`** from the
  product code-agent template and MUST create/supersede AiJob
  `kind=graph_from_wc` (shared bus with `015`; no second job framework).
  After the first successful **parser** graph-ready analysis, ODS MUST
  seed `AGENT-CODE.md` into the project docs tree (empty `CODE_JOB_ID`
  until download). Cold import MUST NOT seed `AGENT-CODE.md`.
  **Prerequisite for first code-download:** a prior parser graph-ready
  success in project history; **subsequent** code-downloads MAY run when
  any graph-ready analysis exists.
- **FR-007**: Both rendered prompts MUST live under the project docs tree
  outside the analyzed working copy (`AGENT-DOC.md` may exist from import
  seed / docs download; `AGENT-CODE.md` is seeded after the first
  successful parser graph-ready analysis with empty `CODE_JOB_ID`, and
  MUST be re-rendered with a live job id on code-download).
- **FR-008**: `graph_from_wc` MUST read only allowlisted WC paths through
  ODS (with size limits — see plan/contracts WC max file bytes) and MUST NOT
  write Markdown project docs (docs remain `015`).
- **FR-009**: Successful `graph_from_wc` MUST write Canon in the **same**
  six-schema frame as parsers (Code / System / UI × node + edge) with AI
  provenance. If the agent submits any unknown kind or invalid shape, ODS
  MUST fail the AiJob and MUST NOT replace the previous successful graph
  (no partial drop-and-publish).
- **FR-009a**: ODS MUST NOT publish an AI rebuild that results in zero
  Canon nodes: such an outcome MUST fail the AiJob and MUST NOT replace
  the previous successful graph. (Dogfood MAY require richer landscape
  than this floor; the server gate for MVP is ≥1 node.)
- **FR-010**: Graph publish MUST follow replace-after-success: replace the
  previous successful graph only after the new run succeeds; failed or
  cancelled jobs MUST NOT replace it.
- **FR-011**: Hybrid parsers+AI construction of one run’s graph MUST NOT
  be offered; the visible graph MUST be the last successful full rebuild
  (parsers **or** AI).
- **FR-012**: Analysis inventory/graph scope for parsers **and** AI MUST
  include `auto_found` and `needed`, and MUST exclude `not_needed` (and
  descendants with that status).
- **FR-013**: Element Status picker MUST offer only `auto_found`,
  `needed`, and `not_needed` for new choices; legacy `found`/`unused` MAY
  remain readable without mandatory remap in this feature.
- **FR-014**: File-tree Status MUST NOT encode “found by parsers” vs
  “found by AI”.
- **FR-015**: Graph View header MUST show a provenance badge for the
  current graph: built by parsers vs built by AI (i18n `en`/`ru`), sourced
  from analysis-run `graph_builder`. Other run-summary surfaces MAY show
  the same badge when already present; they are not a separate MVP DoD.
- **FR-016**: ODS MUST NOT host an in-process LLM for S1 MVP; delivery is
  external agent + downloadable prompts only.
- **FR-017**: Tracked feature artifacts MUST NOT hardcode foreign paths,
  project UUIDs, or localhost URLs.
- **FR-018**: AiJob supersede/complete binding for `graph_from_wc` MUST
  mirror docs rules: at most one running **graph** job per project; new
  code-download cancels prior running `graph_from_wc`; complete/writes for
  cancelled/non-current graph jobs rejected.
- **FR-018a**: A project MAY have one `docs_from_es` and one
  `graph_from_wc` `running` at the same time (no cross-kind mutual
  exclusion). Docs jobs remain bound to the graph-ready
  `analysis_run_id` captured at docs-download; starting `graph_from_wc`
  MUST NOT revoke that binding mid-job.

### Key Entities

- **AiJob (`graph_from_wc`)**: Shared job contour with `docs_from_es`;
  status, progress, summary, timestamps, linkage to analysis run /
  provenance for the graph rebuild.
- **Project prompts**: `AGENT-DOC.md` (docs; seeded/renamed from former
  `AGENT.md`) and `AGENT-CODE.md` (graph; seeded after first successful
  parser analysis; re-rendered on code-download) under the project docs
  tree; ODS-owned reserved files.
- **Analysis run / graph provenance**: Field `graph_builder`
  (`parsers` | `ai`) on the analysis run distinguishes who built the
  current published graph (Graph View badge source). Not
  `ProjectElement.status`.
- **ProjectElement Status**: Operator intent for analysis include/exclude
  (`auto_found` / `needed` / `not_needed`); not graph builder identity.
- **Canon graph**: Same six contracts as parser ingest; AI writes with AI
  provenance only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On an ODS-owned fixture, an operator can complete cold import
  + first parser analysis as today, then obtain both project prompts via
  two download actions without using AI on import or sync.
- **SC-002**: After a successful external-agent `graph_from_wc` flow on
  that fixture, Graph View shows a Canon-shaped landscape and the header
  indicates AI provenance within one operator session (download → agent →
  refresh/view).
- **SC-003**: In 100% of failed or cancelled AI rebuild attempts under
  test (including invalid/unknown Canon and zero-node graphs), the
  previously successful graph remains the one shown in Graph View.
- **SC-004**: With sample paths marked `not_needed`, both a subsequent
  parser analysis and an AI rebuild omit those paths from the graph
  inventory while the file tree still lists them after sync.
- **SC-005**: Docs generation via the docs download path still succeeds
  after the `AGENT-DOC.md` rename, including auto-rename of legacy
  `AGENT.md` on first docs access/download (no regression of closed `015`
  operator docs flow aside from filename/button split).
- **SC-006**: An operator can tell parsers vs AI provenance from the
  Graph View header without inspecting file-tree Status, on both
  rebuild kinds.

## Assumptions

- Shared AiJob storage and REST contour from `015` remain the single bus;
  this feature adds adapters and UI for `graph_from_wc`, not a parallel
  framework. Concurrent `docs_from_es` + `graph_from_wc` is allowed;
  supersede remains per-kind only.
- Replace-after-success and always-full analysis policy from the `015`
  prerequisite wave already apply to graph publishes.
- Graph View and Canon consumers need no new node/edge kinds for MVP.
- External agents follow the `015` habit (download + REST); for
  `graph_from_wc`, Canon publish is gated: any invalid/unknown item **or**
  zero nodes fails the job (no replace). Docs `docs_from_es` remains
  trust-agent for Markdown quality.
- Cross-feature notes on analysis Status exclude may amend wording in
  `002`/`005`/`007` during plan/implement as needed; product intent is
  owned here.
- Optional confidence pass on a large local tree is operator-local and
  MUST NOT introduce foreign names into tracked artifacts
  (`no-foreign-repo-names` rule).

## Dependencies and references

- Entry draft (historical): `ods-help/requirements/027-ai-graph-from-wc-draft.md`
- S1 vs S2 split notes: `ods-help/requirements/015-project-docs-draft.md` §8
- Closed S2: `specs/015-project-docs/`
- Prompt stub: `prompts/code-agent-prompt.md`
- Vision: `specs/001-ods-vision/spec.md`
- Constitution: Canonical graph frame (AI writes same six schemas)
