# Specification: Project documentation from ES via AI

**Feature**: `015-project-docs`

**Created**: 2026-07-26

**Status**: Closed (2026-07-27 — SpecKit complete: Documentation + Download
prompt + AiJob + Export-pack US4). Deferred outside this feature: in-ODS LLM,
S1 `graph_from_wc`, MCP/RAG, orphan docs cleanup.

**Input**: Draft `ods-help/requirements/015-project-docs-draft.md`
(Markdown project docs from Elasticsearch via external AI; portal Documentation
screen; BP Schema in each component spec; English artifacts / portal UI i18n
`en`+`ru`). Prompt template (kept in sync): `prompts/docs-agent-prompt.md`.

**Parent Spec**: `specs/001-ods-vision/spec.md` (Post-MVP — project docs)

**Dependencies**: `002`/`003` (project, import, working copy, portal shell);
`005`/`006` (analysis run + canonical graph in ES — **required data source**);
system/code/UI landscape already in canon (`008`–`014`, `018`–`021` as available).

**Prerequisite (on `005`/`006`, implement only with `015`)**: Before or as part of
`015` implementation, analysis MUST become **always-full** (retire incremental /
`force_full` as the default path) and graph ingest MUST use
**replace-after-success** (drop the previous successful graph only after the new
run succeeds). Spec notes on `005`/`006` record this; **no code change to
`005`/`006` until `015` implement starts**. Within that implement wave,
prerequisite tasks MUST be ordered **before** docs storage/UI/agent work (not a
separate pre-docs release gate).

## Short description

After import and analysis, ODS already holds a canonical system view in
Elasticsearch. Architects can explore it in Graph surfaces, but there is no
**Markdown documentation pack** for the analyzed system that can be read in the
portal (and later exported).

This feature delivers **S2 — docs from ES**: an external AI agent reads **only**
project data available through ODS (backed by Elasticsearch), writes Markdown
docs under the platform docs tree for that project (outside the git working
copy), and the portal shows a **Documentation** screen (tree + Markdown viewer)
with a **Download prompt** flow. Each component `spec-*.md` includes an
**Operation → Schema** subsection (Mermaid business-process diagram for that
node). Name and link consistency across prose, Schema, and API/messaging
sections is mandatory.

**First increment DoD** is Documentation + external-agent docs generation.
**Export-pack** (`docs/` + ES snapshot data) is a **later** step after docs are
stable — not required for the first increment.

## Clarifications (defaults from draft)

Recorded at specify time (no blocking clarifications):

1. **Format** → Markdown only (including fenced Mermaid inside `.md`). Not
   AsciiDoc/PDF as in the old roadmap wording.
2. **AI data access** → REST to ODS/ES only; AI MUST NOT read the working copy
   when generating docs.
3. **Who runs the LLM** → external agent (Cursor / Claude / …); ODS does not host
   the LLM in MVP.
4. **Export-pack** → after docs succeeded; not first-increment DoD.
5. **S1 (AI → graph from WC)** → separate future feature; share AiJob shape only;
   not in `015` scope.
6. **RAG / Q&A** → out of scope; MCP later as optional tools over the same REST.

### Session 2026-07-26

- Q: What happens if the user clicks Download prompt while a docs AiJob is still
  running? → A: **B** — new Download cancels/supersedes the current job and
  starts a new `docs_from_es`; a later complete from the cancelled job MUST be
  rejected.
- Q: What does ODS validate before accepting AiJob `succeeded`? → A: **A** —
  trust agent report only (status + summary); no server-side docs quality gate
  in MVP.
- Q: Export control in the first increment (before export-pack DoD)? → A: **A** —
  hide Export entirely until the export-pack increment.
- Q: Order of always-full / replace-after-success vs docs UI? → A: **B** — same
  `015` implement wave; prerequisite tasks first, then docs (ordered in
  `tasks.md`).
- Q: Docs writes after a job is cancelled/superseded? → A: **B** — bind docs
  writes to the current `docs_from_es` job id; reject writes for
  cancelled/non-current jobs.
- Q (analyze 2026-07-26): AiJob `queued`? → A: drop from MVP; Download →
  `running`. FR-016 → task T040. FR-011–014 → agent-owned (no server validator).

## Scope

### In scope

- Markdown **docs** for the analyzed system (depth comparable to ODS feature
  specs; not a marketing README).
- Docs storage under the platform data root: `docs/{projectId}/`, **outside** the
  git working copy.
- Seed `AGENT.md` (rendered project prompt) on import; portal Documentation tree
  non-empty after import.
- Documentation UI: left nav entry, file tree, Markdown viewer, right properties
  panel (docs job stats) above **Download prompt** and language control (`en`/`ru`,
  default = portal locale).
- External agent writes `spec-*.md` (and evidence-driven thematic files) via ODS
  docs APIs; MUST NOT overwrite `AGENT.md`.
- Docs tree mirrors system-layer hierarchy; file pattern `spec-{slug}.md`
  (no root `README.md` as the system map).
- Every `spec-*.md`: Purpose, Composition, Operation with mandatory **Schema**
  (Mermaid BP for that node’s scope).
- Name/link consistency: prose ↔ Schema ↔ API/Kafka/gRPC/HTTP (when ES evidence
  exists) MUST use the same canonical names and links from ES.
- Evidence links: file header (`project_id`, `analysis_run_id`); per entity
  index + id; visible HTTP fetch URL (ODS base while in ODS).
- Shared **AiJob** status contour with first client `kind=docs_from_es`.
- Docs write modes: default **overwrite**; optional debug **versioned** under
  `_generations/{id}/` without touching the current tree.
- Product prompt template in repo: `prompts/docs-agent-prompt.md` (kept aligned
  with this spec’s docs conventions).

### Out of scope

- AI replacing parsers / building the graph from WC (S1).
- MCP as required MVP infrastructure; RAG / Q&A.
- In-portal IDE-style docs editing (MVP = view + tree).
- Target-system codegen / rebuild inside ODS.
- Export-pack as first-increment DoD (later after docs are stable).
- “Agent only outside ODS with no portal Download prompt” (deferred).
- Writing business-process nodes/edges into the ES graph.
- Fixing “workspace volume missing on Graph view” (backlog, not DoD).
- Pixel-perfect UI; OpenSearch migration.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse project documentation (Priority: P1)

As an **architect**, after a project is imported I open **Documentation**, see at
least the project prompt file, and after docs exist I browse the docs tree and
read Markdown (including Schema diagrams) in the viewer.

**Why this priority**: Without a readable docs surface, the feature has no
user-facing value.

**Independent Test**: Import a project → open Documentation → tree shows
`AGENT.md`; after sample `spec-*.md` exist under the project docs root → open a
file → body and Schema subsection render.

**Acceptance Scenarios**:

1. **Given** a newly imported project, **When** the user opens Documentation,
   **Then** the tree is not empty and includes `AGENT.md`.
2. **Given** at least one `spec-*.md` under the project docs root, **When** the
   user selects it, **Then** the viewer shows its Markdown content.
3. **Given** a `spec-*.md` with a Schema Mermaid block, **When** the user views
   that file, **Then** the Schema subsection is present in the document body
   (diagram render quality may follow the portal Markdown capabilities).

---

### User Story 2 - Download prompt and generate docs via external agent (Priority: P1)

As an **architect**, after a successful analysis I choose docs language, click
**Download prompt**, receive a filled project prompt, and run an external agent
that reads only ODS data and writes Markdown docs for the project without
touching the working copy or the ES graph.

**Why this priority**: This is the generation loop that produces the docs pack.

**Independent Test**: Successful analysis exists → Download prompt → file
contains project id, analysis run id, language, and base URL placeholders filled
→ external agent (or simulated agent) writes a root `spec-*.md` via docs API →
Documentation tree updates; AiJob ends succeeded or failed with a summary.

**Acceptance Scenarios**:

1. **Given** a project with a current successful analysis, **When** the user
   clicks Download prompt, **Then** `AGENT.md` is re-rendered in place and a
   download is offered.
2. **Given** a docs AiJob already `running`, **When** the user clicks Download
   prompt again, **Then** the running job is cancelled/superseded, a new
   `docs_from_es` job becomes current, and `AGENT.md` is re-rendered for the new
   job.
3. **Given** no successful analysis yet, **When** the user tries Download prompt,
   **Then** the action is unavailable or clearly blocked.
4. **Given** an external agent following `AGENT.md`, **When** it generates docs,
   **Then** it reads only ODS-backed data (not WC), writes under the project docs
   root, and does not overwrite `AGENT.md` or mutate the graph.
5. **Given** the agent finishes, **When** it reports job completion for the
   **current** job, **Then** the Documentation properties panel reflects
   succeeded/failed and a short summary.
6. **Given** a job was cancelled/superseded, **When** its agent later reports
   complete, **Then** the platform rejects that completion and does not change
   the current job’s status.
7. **Given** a job was cancelled/superseded, **When** its agent attempts to write
   docs files, **Then** the platform rejects those writes (docs writes are bound
   to the current job id only).

---

### User Story 3 - Hierarchical specs with Schema and name consistency (Priority: P2)

As an **architect**, I expect docs folders to follow the system hierarchy, each
component `spec-*.md` to include Purpose / Composition / Operation→Schema, and
names/links in prose, Schema, and contract/messaging sections to match the
canonical graph (and API/Kafka/gRPC evidence when present).

**Why this priority**: Makes docs reviewable per component and trustworthy against
the graph.

**Independent Test**: On a project with known system components and at least one
HTTP or messaging link in ES, generated (or fixture) docs show matching tree
slugs, Schema at each level, and identical names for components and links across
sections; gaps are marked when evidence is missing.

**Acceptance Scenarios**:

1. **Given** a system hierarchy in the current analysis, **When** docs are
   generated, **Then** folder nesting mirrors architecturally significant
   containers and each has `spec-{slug}.md` (not `README.md` as the main file).
2. **Given** a component `spec-*.md`, **When** inspected, **Then** it contains
   Purpose, Composition, and Operation with a Schema subsection (Mermaid) scoped
   to that node (root = system-wide; child = local).
3. **Given** ES evidence for an API path/topic/method, **When** that integration
   appears in prose, Schema, and contract/messaging files, **Then** the
   identifiers match exactly (no friendly synonyms).
4. **Given** missing protocol coverage in ES (e.g. no gRPC data), **When** docs
   are written, **Then** the agent records GAP/UNKNOWN and does not invent
   contracts.

---

### User Story 4 - Export-pack after docs succeed (Priority: P3)

As an **architect**, after docs generation has succeeded I download one pack with
the docs tree (including `AGENT.md`) and ES data for offline evaluation — without
ODS claiming to rebuild the target system.

**Why this priority**: Valuable hand-off, but explicitly **after** stable docs;
not first-increment DoD. In the first increment the Export control MUST NOT
appear in the Documentation UI at all (no disabled stub).

**Independent Test**: Docs AiJob succeeded → Export enabled → one archive
download contains docs + ES data + recipient base-URL guidance; Export disabled
while job is not succeeded. (Applies only after the export-pack increment ships.)

**Acceptance Scenarios**:

1. **Given** the first docs increment (export-pack not yet shipped), **When** the
   user opens Documentation, **Then** no Export control is shown.
2. **Given** docs job status is not succeeded (export-pack increment), **When**
   the user views Documentation, **Then** Export is disabled or unavailable.
3. **Given** docs job succeeded (export-pack increment), **When** the user
   exports, **Then** one archive is produced by the platform containing `docs/`
   (with `AGENT.md`) and ES data for that project/analysis.

---

### Edge Cases

- Project imported but analysis never succeeded → Documentation shows `AGENT.md`
  only; Download prompt blocked until a current successful analysis exists.
- Agent fails mid-run → AiJob failed + summary; partial files may exist; user can
  retry (overwrite default).
- Agent reports `succeeded` with thin or missing docs → MVP still accepts the
  status (no server quality gate); gaps are found in review against success
  criteria.
- Download prompt while a docs job is `running` → cancel/supersede that job,
  start a new current `docs_from_es`, re-render `AGENT.md`; late complete from the
  cancelled job is rejected; late docs writes for the cancelled job id are
  rejected.
- Versioned debug mode without generation id → agent MUST stop with error; MUST
  NOT silently overwrite.
- Overwrite mode leaves orphan files from a previous tree shape → cleanup is
  later (not first-increment blocker); document as known gap.
- Evidence missing for a flow → Schema/prose use GAP/UNKNOWN; no invented
  end-to-end process.
- Delete project → docs tree for that project is removed with project cleanup
  (aligned with existing cascade expectations).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The platform MUST store generated project documentation under a
  per-project docs root outside the git working copy.
- **FR-002**: On project import, the platform MUST create the project docs root
  and seed `AGENT.md` from the product docs-agent prompt template.
- **FR-003**: The portal MUST provide a Documentation screen with a docs file
  tree and a Markdown viewer for the active project.
- **FR-004**: The Documentation right panel MUST show docs/job properties above
  a language control (`en`/`ru`, default = current portal locale) and a
  **Download prompt** action.
- **FR-005**: Download prompt MUST re-render `AGENT.md` with project id, current
  successful analysis run id, docs language, write mode, job id (when created),
  and instance API base URL, then offer download.
- **FR-005a**: If a docs AiJob is already `running` for the project, Download
  prompt MUST cancel or supersede that job, create a new current `docs_from_es`
  job, and re-render `AGENT.md` for the new job. At most one current docs job per
  project. A completion reported for a cancelled/superseded job MUST be rejected
  and MUST NOT overwrite the current job status. Docs file writes MUST be bound to
  the **current** docs job id; writes associated with a cancelled or non-current
  job MUST be rejected.
- **FR-006**: Download prompt MUST require a current successful analysis; otherwise
  it MUST be unavailable or clearly rejected.
- **FR-007**: Docs generation MUST use only ODS-accessible project data backed by
  Elasticsearch; the generating agent MUST NOT read the working copy and MUST NOT
  mutate the ES graph or working copy.
- **FR-008**: The platform MUST expose read access for analysis/graph/report data
  and read/write access for project docs files needed by the external agent, plus
  AiJob create/progress/complete for `docs_from_es`. Docs write operations MUST
  require association with the project’s **current** docs job id (reject
  cancelled/non-current).
- **FR-009**: ODS MUST NOT run the LLM in MVP; an external agent performs
  generation using the downloaded/rendered prompt.
- **FR-010**: The external agent MUST write Markdown docs under the project docs
  root and MUST NOT create, delete, or overwrite `AGENT.md`.
- **FR-011**: Docs tree layout MUST mirror the system-layer hierarchy of the
  current analysis; the main file per container MUST be `spec-{slug}.md` (root
  system map = `spec-{project-name}.md`, not `README.md`).
- **FR-012**: Every `spec-*.md` MUST include Purpose, Composition, and Operation;
  Operation MUST include a **Schema** subsection with a Mermaid diagram for that
  node’s business process / flows (root = system-wide; child = local).
- **FR-013**: Prose, Schema, and contract/messaging sections for the same
  component MUST use identical canonical names and links from ES (components,
  endpoints, topics, queues, RPC methods when evidence exists); no synonym
  renaming; ES identifiers MUST NOT be translated.
- **FR-014**: Optional thematic files (contracts, messaging, data, infrastructure,
  UI) MUST be created only when corresponding ES evidence exists; otherwise
  GAP/UNKNOWN — no invented contracts.
- **FR-015**: Each docs file MUST carry project id and analysis run id in its
  header; important entities MUST include ES index + document id and a visible
  HTTP fetch link (ODS API base while docs live in ODS).
- **FR-016**: Default docs write mode MUST overwrite the same relative paths;
  optional versioned mode MUST write under `_generations/{generationId}/` without
  modifying the current docs tree, and MUST fail if generation id is missing.
- **FR-017**: When the agent completes, it MUST set AiJob to succeeded or failed
  with a short summary; the Documentation UI MUST refresh properties/tree
  accordingly; on success, show a non-blocking completion notice. After the
  export-pack increment ships, that notice MAY coexist with an Export control
  that is enabled only on `succeeded`. In MVP the platform MUST
  accept the agent’s reported status without a server-side docs quality gate (no
  required check for Schema / es-ref / file presence before `succeeded`). Content
  quality remains a review / success-criteria concern, not a job-completion
  blocker.
- **FR-018**: Export-pack (single archive: docs including `AGENT.md` + ES data,
  with recipient ES base-URL guidance) MUST be available only after docs job
  succeeded. The Documentation UI MUST show Export and enable it only when the
  current docs job is `succeeded` (disabled/unavailable otherwise). ODS MUST NOT
  claim to reconstruct or rebuild the target system from the pack.
- **FR-019**: Implementing `015` MUST include the `005`/`006` prerequisite change
  to always-full analysis and replace-after-success graph update. Work happens in
  the **same** `015` implement wave: prerequisite tasks **before** docs
  storage/UI/agent API tasks (ordered in `tasks.md`). **Spec-noted now; code only
  when `015` implement starts** — not a separate pre-merge gate before any docs
  work begins.
- **FR-020**: The product docs-agent prompt template MUST stay aligned with the
  docs tree, Schema, and name-consistency rules in this specification.

### Key Entities

- **Project docs root**: Per-project filesystem tree of Markdown docs + `AGENT.md`,
  outside WC.
- **AGENT.md**: ODS-owned rendered prompt and provenance for the docs job; not a
  system spec file.
- **Component spec (`spec-*.md`)**: Markdown document for a system/container node
  with Purpose, Composition, Operation→Schema, and ES evidence references.
- **Docs AiJob (`docs_from_es`)**: Status object for a docs generation run
  (`running`/`succeeded`/`failed`/`cancelled`, progress, summary, analysis run
  id, language). MVP has no `queued` — Download creates `running` immediately.
  Distinct from AnalysisRun status vocabulary (`success` ≠ `succeeded`).
- **Evidence reference**: Stable anchor (index + id + project/analysis context)
  plus environment-specific HTTP fetch URL.
- **Export-pack**: Archive bundling docs + ES data for offline use / evaluation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After import, a user can open Documentation and see a non-empty
  tree including the project prompt file in under 30 seconds on a local full
  stack.
- **SC-002**: After a successful analysis, a user can download a filled prompt in
  one action from Documentation.
- **SC-003**: On a reference analyzed project (e.g. petclinic or ODS dogfood), an
  external agent run produces a root system `spec-*.md` plus at least one child
  component `spec-*.md` with Schema subsections, without reading WC.
- **SC-004**: In a review sample of generated docs for components that have API or
  messaging evidence, ≥95% of named integrations in Schema match the identifiers
  used in prose and contract/messaging sections (mismatches counted as defects).
- **SC-005**: When ES lacks evidence for a protocol, generated docs mark GAP rather
  than inventing endpoints/topics/methods (spot-check: zero invented gRPC/AsyncAPI
  claims without ES support on current stacks).
- **SC-006**: Documentation properties reflect AiJob completion (succeeded/failed)
  without requiring a portal reload beyond normal polling/refresh behavior.
- **SC-007**: After docs succeeded, a user can download one export archive
  containing docs and ES data; Export remains unavailable before success.

## Assumptions

- A successful full analysis and canonical graph already exist from `005`/`006`
  (and later landscape features); `015` does not invent graph structure.
- External agents can call the ODS HTTP API from the architect’s machine (local
  or reachable instance).
- Portal i18n already supports `en`/`ru`; docs language reuses that pair.
- Mermaid fences are acceptable inside Markdown; portal rendering may be plain
  fenced code if diagram preview is limited — content presence is the MVP bar.
- Export-pack ships after the first docs increment (US4); Export is enabled only
  on docs job `succeeded`.
- S1 (AI graph from WC) remains a separate feature sharing AiJob conventions only.
- Roadmap wording in `001` updates from “AsciiDoc, PDF” to Markdown docs from ES
  via AI as part of aligning this feature.

## SpecKit close (2026-07-27)

Feature **Closed**: implement DoD (US1–US4) delivered. No further
`/speckit-implement` work under `015`. Follow-ups (not this feature):

| Topic | Status |
|-------|--------|
| In-ODS / local LLM for docs | Deferred (external agent remains default) |
| S1 `graph_from_wc` (AI import) | Separate future feature; shared AiJob only |
| MCP / RAG (`016`) | Paused |
| Orphan docs cleanup on overwrite | Later polish |
