<!--
Sync Impact Report
- Version change: 1.2.19 → 1.3.0 (Language policy: EN artifacts; UI i18n en/ru)
- Modified sections: MVP product constraints (language); Governance (language); Scope
- Modified principles: none
- Added sections: none
- Templates: overrides language notes → English
- Follow-up TODOs: translate specs/**; portal i18n + app header; Projects action icons
-->

# Constitution: ods-architecture

## Core Principles

### I. Surgical Spec Changes

Change **only** the artifact in `specs/NNN-*/` that the edit concerns:
`spec.md`, `plan.md`, or `tasks.md`. Do not mix unrelated changes in one file
or one commit without an explicit rationale.

*Rationale:* lowers regression risk and simplifies review and rollback.

### II. Spec Versioning

Every material requirements change is recorded as a **new version** of the
specification: update the existing `spec.md` with date/status in the document,
or a separate folder under `specs/` for major revisions. Prior versions remain
in git history.

*Rationale:* decision traceability and clear before/after comparison.

### III. Change Alignment

Changes to specs, plans, and tasks **MUST** be aligned before moving to the next
SDD-cycle stage. Expanding a child spec's scope **MUST** be reflected in
`specs/001-ods-vision/spec.md` before updating `plan.md` or code. Unaligned edits
are not a basis for updating `plan.md`, `tasks.md`, or code.

*Rationale:* prevents drift between vision, requirements, plan, and implementation.

### IV. Documentation After Approval

After a specification is approved, related documentation **MUST** be updated:
`plan.md`, design artifacts (`data-model.md`, `contracts/`, `quickstart.md`),
project AsciiDoc — in the order defined by the affected feature. Code does not
change until documentation is current.

*Rationale:* documentation remains the source of truth for the team and agents.

### V. Code After Documentation

Code changes are made **only after** the aligned specification and related
documentation (`plan.md`, `tasks.md`) are updated. Implementation follows tasks
in `tasks.md` (e.g. via `/speckit-implement`).

*Rationale:* Spec-Driven Development — artifacts first, then code.

### VI. ODS Spec Hierarchy

The ODS specification structure **MUST** keep role separation:

- **`001-ods-vision`** — vision, MVP/post-MVP boundaries, stage roadmap;
  **MUST NOT** contain detailed FR and user stories for implementation.
- **`002-domain-model`**, **`003-portal-mvp`**, and later `00N-*` — detailed
  feature specs with the full template section set (scenarios, FR, criteria).
- **Platform MVP** = `002` + `003`; vision and boundaries live in `001`.
- Dependencies between specs **MUST** be explicit (`Parent spec`, `Dependency`
  in the `spec.md` header). `003-portal-mvp` depends on `002-domain-model`.

Drafts under `ods-help/requirements/` are idea sources; they **MUST NOT** replace
`specs/**/spec.md`.

*Rationale:* the top-level spec stays lean; implementation follows testable child docs.

## ODS Spec Structure

| Stage | Folder | Purpose | Status |
|-------|--------|---------|--------|
| 0 | `001-ods-vision` | Vision, boundaries, roadmap | ✅ aligned |
| 1 | `002-domain-model` | MVP data model, ES, API | ✅ implemented |
| 2 | `003-portal-mvp` | Portal: menu, import, sync, UI, DELETE | ✅ implemented |
| 3 | `004-mvp-runtime` | Runtime: CI, deploy, smoke, fixtures | **paused** |
| 4 | `005-code-analysis` | Language detector, orchestrator, parsers | ✅ implemented |
| 5 | `006-project-graph` | Graph in ES, ingest, API | ✅ implemented |
| 6 | `007-portal-scale-ux` | Columns, hierarchy, graph search, folder status cascade | ✅ implemented |
| 7 | `008-code-graph-depth` | Calls, usages, semantic extract (C#/TS v2) | ✅ implemented |
| 8 | `009-system-landscape` | API, bus, DB, compose, OpenAPI (system layer) | ✅ implemented |
| 9 | `010-scale-pipeline` | Pipeline scale for large repos (pre-canvas) | ✅ implemented |
| 10 | `011-ods-graph-viewer` | Canvas system MVP (React Flow; code → `012`) | ✅ implemented |
| 11 | `012-code-graph-bottom` | Canvas: drill code to the bottom from a system component | ✅ implemented |
| 12 | `013-api-routes-from-code` | CP1: HTTP API from code → `http_endpoint` | ✅ implemented |
| 13 | `014-graph-view-ux` | CP2: layer UX + `http_calls` client→API | ✅ implemented |
| 14 | `018-parser-extension-playbook` | Parser add template + Java MVP | ✅ implemented |
| 15 | `019-spring-system-landscape` | Spring system: Maven/config/API/Feign/RestClient | ✅ implemented |
| 16 | `015-project-docs` | Project docs (AsciiDoc, PDF) | paused |
| 17 | `016-rag-mcp` | RAG, MCP, external agents | paused |
| 18 | `017-auth` | Auth and roles | paused |

Canonical roadmap: `specs/001-ods-vision/spec.md`; on conflict, `001` wins until
the next `/speckit-constitution`.

**MVP done (2026-07-09):** `002` → `003` → code; pilot via `docker/` (`--profile full`).
**`005`–`014`, `018`, `019` implemented (per `001`, 2026-07-19).**
**Next step:** on explicit command — resume paused `015`–`017`/`004` **or** an item
from Post-MVP `001` (§stack coverage: any language/infra, not Java-only).
**Do not** inflate a closed feature (`019`, etc.) into a “universal enterprise”.
**`015`–`017` and `004` remain paused** until an explicit command.

Stage `004-mvp-runtime` formalizes CI/deploy and **does not block** post-MVP analysis.

## Post-MVP: Code Analysis (direction for 005/006)

Fixed in `001` (§stack coverage / large repositories) and the draft
`data-model-persig-analysis-draft.md`:

- **Language detector** — first analysis step; report of languages and project files.
- **Parsers are modular** (`parsers/<parser_id>/`); native JSON is per module.
  **Pilot priority:** TS/JS, C#, Python, C++, Java (+ Spring system `019`).
  **Later with the same frame:** Go, Kotlin, and any stack — child spec +
  `018` checklist, no canon change.
- **Same capability layers per stack** (see table in `001`): language →
  project/modules → config → HTTP API → HTTP/RPC clients → messaging →
  (UX: infra ≠ domain). Incomplete layer on a language = coverage gap, not a
  “different graph model”.
- **Canonical graph** — normalized metadata in **Elasticsearch** (`006`),
  not raw AST and not one JSON for all parsers. **Separate indices** (like
  `ods-elements` in `002`), linked via `project_id`.
- **Graph editing in UI** — out of `007`; “Active” annotations / node hiding —
  post-MVP backlog (`001`).

## MVP Product Constraints

The following decisions from aligned specs **MUST** be followed when planning
and implementing MVP (stages 1–2) until changed via `001` and child specs:

- **Architecture:** web app — frontend + backend service; deploy via
  **Docker Compose** (`docker/`; profile `full` — ES + backend + frontend).
- **MVP stack:** **TypeScript** (frontend and backend); alternate backend
  (.NET, etc.) — only as a **parser module** (subprocess) or a separate decision in `001`.
- **Storage:** metadata (project, tree, statuses) — **JSON in Elasticsearch**;
  file contents — working-copy **filesystem**.
- **Project source:** Git URL or local path to a git repository.
- **Portal MVP:** single main menu; **three-panel** layout; file viewing
  **read-only only**; **project delete** (ES + WC cascade); “Graph” menu item —
  stub; **no** side TOC.
- **Access:** internal pilot **without** login or roles.
- **Language:**
  - **SDD / docs artifacts** (`specs/**`, `.specify/memory/constitution.md`,
    `ods-help/**` except transient drafts): **English only** (technical IT English).
  - **Portal UI:** **i18n** with locales **`en`** (default) and **`ru`**;
    user-facing strings via locale files; language switcher in the app header.
  - Already-English text is left unchanged; translate Russian → English only.

**Out of MVP** (specs `005+`): code analysis, parsers, graph, RAG,
in-UI file editing, auth, Git push/merge, PDF/AsciiDoc pipeline.
Stage `004-mvp-runtime` — pilot CI/deploy, not code analysis.

## Scope

This constitution applies to:

- all artifacts under `specs/**` (spec, plan, tasks, checklists, contracts);
- project docs under `ods-help/**` and future product AsciiDoc;
- ODS application code (frontend, backend, deploy infra).

Spec Kit infrastructure (`.specify/templates/` core files, `.cursor/skills/`,
scripts) is **upstream** and is **not** rewritten for product content rules —
those packages are already English. ODS-owned overrides under
`.specify/templates/overrides/` and this constitution **are** product artifacts
and follow the English policy.

## SDD Cycle Order

Required sequence when changing the product:

1. Update vision and boundaries in `001-ods-vision/spec.md`
   (`/speckit-constitution` when rules change; manual edit when scope changes).
2. Edit or create a child `spec.md` (`/speckit-specify`, `/speckit-clarify`).
3. Align the specification (and `001` if MVP boundaries change).
4. Update `plan.md` and design artifacts (`/speckit-plan`) —
   **for each implementable spec** (`002`, `003`, …).
5. Update `tasks.md` (`/speckit-tasks`).
6. Consistency check (`/speckit-analyze`) — including `001` ↔ child specs.
7. Implement from `tasks.md` (`/speckit-implement`).

Skipping alignment or documentation before code violates this constitution.

## Governance

- The constitution overrides informal agreements and drafts
  (`ods-help/requirements/` — idea source, not a replacement for `specs/**/spec.md`).
- Constitution amendments — via `/speckit-constitution` with a version bump
  (semver: **MAJOR** — remove/redefine a principle; **MINOR** — new principle
  or section; **PATCH** — wording clarifications).
- After a constitution change, affected `specs/**/spec.md`, `plan.md`, `tasks.md`
  **MUST** be reviewed for compliance (`/speckit-analyze`).
- PR and plan reviews **MUST** check: spec hierarchy (principle VI),
  MVP boundaries (“MVP Product Constraints”), SDD cycle order.
- **Artifact language: English.** Portal UI: i18n `en` / `ru` (default `en`).

**Version**: 1.3.0 | **Ratified**: 2026-06-26 | **Last Amended**: 2026-07-20
