# Tasks: Project documentation from ES via AI

**Input**: `specs/015-project-docs/` — plan.md, spec.md, data-model.md,
contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-26); `002`/`003`
portal; `005`/`006` analysis/graph (prerequisite code in Phase 2); prompt
`prompts/docs-agent-prompt.md`

**Tests**: plan Testing — unit (path safety, AGENT render, AiJob supersede /
write bind, always-full); API tests for docs + AiJob; frontend unit where
valuable; manual quickstart. No TDD mandate in spec — include focused tests.

**Organization**: Setup → Foundational (`005`/`006` always-full +
replace-after-success, then docs FS + AiJob skeleton) → US1 Documentation
browse → US2 Download prompt / agent loop → US3 Schema/name conventions
(prompt + fixture) → US4 Export **later** → Polish

**First-increment DoD**: US1 + US2 (+ foundational + T040 FR-016); Export UI
**hidden**; US4 not required for MVP ship. **40 tasks** (T001–T040).

**Language**: English (constitution)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete deps)
- **[Story]**: US1–US4 from spec.md

## Path Conventions (ODS)

- **Backend**: `backend/src/`, tests `backend/tests/`
- **Frontend**: `frontend/src/`, tests `frontend/tests/`
- **Prompts**: `prompts/docs-agent-prompt.md`
- **Runtime FS**: `DATA_ROOT/docs/{projectId}/` (not in git)

---

## Phase 1: Setup

**Purpose**: Align contracts and product prompt before code

- [x] T001 Verify `specs/015-project-docs/contracts/` against `data-model.md` /
  `research.md` (AiJob fields, docs paths, supersede/write-bind) — note gaps in
  tasks Notes if any
- [x] T002 [P] Confirm `prompts/docs-agent-prompt.md` matches spec Schema +
  name-consistency + write-bind rules; sync any drift from
  `contracts/docs-tree.md`
- [x] T003 [P] Note `PUBLIC_API_BASE_URL` (or equivalent) in
  `backend/src/config.ts` / compose env docs for `ODS_BASE_URL` render (no hard-code
  in git template)

**Checkpoint S1**: contracts + prompt aligned

---

## Phase 2: Foundational (BLOCKER)

**Purpose**: `005`/`006` prerequisite behavior, then shared docs FS + AiJob
infrastructure — **MUST** complete before US1–US3 product work

**⚠️ CRITICAL**: Order inside this phase: always-full + replace-after-success
**before** docs services. No Documentation UI until foundation is ready.

### 2a. Analysis always-full + graph replace-after-success

- [x] T004 Make analysis runs always full (`incremental: false`) in
  `backend/src/services/analysis-orchestrator.service.ts` and
  `backend/src/services/change-set.service.ts` (retire default incremental path;
  `force_full` always-true or deprecated per `research.md` R1)
- [x] T005 [P] Update analysis API/schema/UI so callers no longer depend on
  incremental-by-default in `backend/src/api/schemas/analysis.schemas.ts`,
  `backend/src/api/routes/analysis.ts`, `frontend/src/hooks/useAnalysis.ts` (and
  related confirm UI if it exposes force_full)
- [x] T006 Implement replace-after-success: after new run is graph-ready, delete
  older runs’ graph nodes/edges for the project in
  `backend/src/services/ingest/ingest.service.ts` (or finalize hook) +
  `backend/src/repositories/graph-node.repository.ts` /
  `graph-edge.repository.ts` per `research.md` R2 — **do not** delete prior graph
  before new success
- [x] T007 [P] Unit/API smoke for always-full + replace-after-success in
  `backend/tests/unit/` (or integration) — failed run leaves prior graph;
  second success cleans older run graph docs

### 2b. Docs FS + AiJob skeleton

- [x] T008 Add docs root helpers (`DATA_ROOT/docs/{projectId}`) with path
  traversal guards in `backend/src/services/docs.service.ts` (new)
- [x] T009 [P] Add AiJob domain type + ES repository for `ods-ai-jobs` in
  `backend/src/domain/ai-job.ts` and `backend/src/repositories/ai-job.repository.ts`
  per `data-model.md` / `contracts/ai-job.md`
- [x] T010 Ensure ES index mapping/bootstrap for `ods-ai-jobs` in existing ES
  init path (e.g. `backend/src/elasticsearch/` or startup ensure-index helper)
- [x] T011 [P] Implement `backend/src/services/ai-job.service.ts` — create
  `running` job on Download, supersede/cancel prior `running`, reject
  complete/write for non-current, get current by project+kind (MVP statuses:
  running|succeeded|failed|cancelled — no `queued`)
- [x] T012 Implement AGENT.md seed + render from `prompts/docs-agent-prompt.md`
  in `backend/src/services/agent-prompt.service.ts` (placeholders:
  `ODS_BASE_URL`, `PROJECT_ID`, `ANALYSIS_RUN_ID`, `DOCS_*`, `DOCS_JOB_ID`)
- [x] T013 Wire project import/create to seed `docs/{projectId}/AGENT.md` in
  `backend/src/services/project.service.ts` (or import path) — FR-002
- [x] T014 Cascade-delete `docs/{projectId}/` on project DELETE alongside
  existing cleanup in project delete flow
- [x] T015 Register route modules stubs and attach in `backend/src/index.ts`:
  `backend/src/api/routes/docs.ts`, `backend/src/api/routes/ai-jobs.ts` (+ zod
  schemas under `backend/src/api/schemas/`)

**Checkpoint F1**: full analysis default; replace-after-success works; docs root
+ AiJob + AGENT seed exist; routes registered (handlers may be partial until US1/US2)

---

## Phase 3: User Story 1 — Browse project documentation (P1) 🎯 MVP

**Goal**: After import, Documentation shows tree with `AGENT.md`; view Markdown
files

**Independent Test**: quickstart §1 — import → Documentation → `AGENT.md`
visible and readable

- [x] T016 [US1] Implement docs list + read content APIs in
  `backend/src/api/routes/docs.ts` + `docs.service.ts` per
  `contracts/rest-docs-ai.md` (`GET .../docs`, `GET .../docs/content`)
- [x] T017 [P] [US1] API tests for docs list/read + path traversal rejection in
  `backend/tests/` (contract-style)
- [x] T018 [P] [US1] Add i18n keys for Documentation menu/page/panel in
  `frontend/src/i18n/en.ts` and `frontend/src/i18n/ru.ts`
- [x] T019 [US1] Add route `/projects/:projectId/docs` in
  `frontend/src/app/router.tsx` (or GraphRoutes-style module) and MainMenu entry
  in `frontend/src/components/MainMenu.tsx`
- [x] T020 [US1] Build `frontend/src/pages/DocumentationPage.tsx` with
  tree + Markdown viewer + right properties shell (reuse WorkspaceLayout /
  chrome patterns from `frontend/src/layouts/WorkspaceLayout.tsx` /
  `frontend/src/styles/workspace.css`)
- [x] T021 [P] [US1] Docs API client hooks in `frontend/src/api/` (list/read)
- [x] T022 [US1] Ensure Mermaid/Schema fences render at least as fenced code in
  the Markdown viewer component used by DocumentationPage (live Mermaid optional)

**Checkpoint US1**: Documentation browse works with seeded `AGENT.md`

---

## Phase 4: User Story 2 — Download prompt + external agent loop (P1)

**Goal**: Download prompt creates/supersedes AiJob, re-renders AGENT.md; agent
writes docs bound to current job; complete updates UI; Export hidden

**Independent Test**: quickstart §§2–4 — Download → write with job_id →
complete → properties; old job_id write/complete → 409

- [x] T023 [US2] Implement `POST .../docs/download-prompt` in
  `backend/src/api/routes/docs.ts` — require graph-ready run via
  `backend/src/services/graph-run-resolver.ts`; supersede running job; render
  AGENT.md; return download
- [x] T024 [US2] Implement docs write/delete with `job_id` bind in
  `backend/src/api/routes/docs.ts` / `docs.service.ts` — reject `AGENT.md`
  mutation; reject non-current job (FR-005a / FR-008)
- [x] T040 [US2] Enforce FR-016 write modes in `backend/src/services/docs.service.ts`:
  `overwrite` → paths under `docs/{projectId}/` (not under `_generations/`);
  `versioned` → paths only under `docs/{projectId}/_generations/{generationId}/`;
  missing `generation_id` when versioned → 400; job carries `docs_write_mode` /
  `docs_generation_id` from Download prompt
- [x] T025 [US2] Implement AiJob progress + complete endpoints in
  `backend/src/api/routes/ai-jobs.ts` per `contracts/ai-job.md` — trust agent
  status; no quality gate (FR-017)
- [x] T026 [P] [US2] API tests: supersede, write-bind 409, complete reject on
  cancelled, Download blocked without analysis, versioned path/missing
  generation_id — `backend/tests/`
- [x] T027 [US2] Documentation right panel: job properties, language `en`/`ru`,
  **Download prompt** button in `frontend/src/pages/DocumentationPage.tsx` (+
  components under `frontend/src/components/docs/` as needed) — **do not** show
  Export
- [x] T028 [P] [US2] Wire AiJob current polling/refresh in frontend docs hooks
  (`frontend/src/api/` or hooks) — toast on succeeded without Export CTA
- [x] T029 [US2] Ensure entity Fetch URL for es-ref uses ODS graph/entity GET
  (reuse or thin wrapper in `backend/src/api/routes/graph.ts`) documented in
  `contracts/rest-docs-ai.md`; agent read surface MUST NOT use WC/workspace file
  APIs (FR-007 — see `contracts/rest-docs-ai.md`)

**Checkpoint US2**: full agent loop via REST; supersede safe; no Export UI

---

## Phase 5: User Story 3 — Hierarchical specs + Schema consistency (P2)

**Goal**: Platform/prompt enforce tree + Schema conventions; reviewable fixture
docs demonstrate Schema + name consistency

**Independent Test**: fixture or agent-produced root + child `spec-*.md` with
Operation→Schema; identifiers match across prose/Schema (manual/spot check
SC-004)

- [x] T030 [US3] (Playbook only — tree/Schema/name MUST lines owned by T002)
  Document agent walk order (summary → services → API/UI) and GAP rules for
  missing gRPC/AsyncAPI in `prompts/docs-agent-prompt.md` if not already explicit
- [x] T031 [P] [US3] Add optional fixture Markdown under test fixtures (e.g.
  `backend/tests/fixtures/docs-sample/` or `frontend` storybook-free fixture)
  with root + child `spec-*.md` including Schema Mermaid for DocumentationPage
  manual/dev load
- [x] T032 [US3] Spot-check fixture/prompt against FR-012–014 (Schema present,
  no invented protocol claims) — manual note in quickstart or PR; no server
  quality gate

**Checkpoint US3**: conventions locked in prompt; sample specs viewable in UI

---

## Phase 6: User Story 4 — Export-pack (P3) — LATER INCREMENT

**Goal**: Single zip `docs/` + ES data after docs succeeded — **not** first
DoD; do **not** start until US1–US2 stable

**Independent Test**: quickstart Export section (add when implementing) —
Export appears only in this increment; disabled until succeeded

- [ ] T033 [US4] Design/implement export zip builder in
  `backend/src/services/docs-export.service.ts` (docs + ES snapshot + recipient
  `BASE_ES_URL` guidance) per spec FR-018
- [ ] T034 [US4] Add `POST`/`GET` export endpoint under
  `backend/src/api/routes/docs.ts` — only when job succeeded
- [ ] T035 [US4] Show Export control in Documentation right panel **only in this
  increment** (`frontend/src/pages/DocumentationPage.tsx`) — enable after
  succeeded; was hidden in US2

**Checkpoint US4**: export-pack available (post-MVP for this feature wave)

---

## Phase 7: Polish & cross-cutting

- [x] T036 [P] Run/adjust `specs/015-project-docs/quickstart.md` against local
  `--profile full` and fix gaps
- [x] T037 [P] Sync SPECKIT / `prompts/docs-agent-prompt.md` if implement drifted
  from contracts
- [x] T038 Confirm first-increment UI has **no** Export control; Update
  `specs/015-project-docs/checklists/requirements.md` notes if needed
- [x] T039 [P] Cascade + empty states: missing analysis, empty docs besides
  AGENT, failed job summary visible on DocumentationPage

---

## Dependencies & story order

```text
Phase 1 Setup
    ↓
Phase 2 Foundational (2a analysis/graph → 2b docs/AiJob)
    ↓
US1 (Documentation browse) ──┐
    ↓                        │
US2 (Download + agent + T040 write modes) ──┼── first-increment DoD
    ↓                        │
US3 (Schema conventions) ────┘
    ↓
US4 Export (later)
    ↓
Polish
```

- US1 can ship before US2 for browse-only MVP slice; Download needs US2.
- US3 is mostly prompt/fixture; can overlap late US2.
- US4 blocked on stable US2 succeeded semantics.

## Parallel examples

- After T004: T005 ‖ T007 prep; T006 after T004.
- After T008–T009: T010 ‖ T012; T011 needs T009.
- US1: T017 ‖ T018 ‖ T021 after T016/T019 scaffolding.
- US2: T026 ‖ T028 after core routes T023–T025.

## Implementation strategy

1. **MVP**: Phase 1–2 + US1 + US2 (Documentation + Download + agent write/complete).
2. **Next**: US3 prompt/fixture hardening.
3. **Later**: US4 Export only after docs generation is stable.
4. **Do not** implement S1 `graph_from_wc`, MCP, RAG, or in-ODS LLM in this task
   list.

## Notes

- Exact REST path names may adjust slightly but MUST match
  `contracts/rest-docs-ai.md` / `ai-job.md` intent.
- Orphan cleanup on overwrite docs tree = later (spec edge case).
- **FR-011–014 (tree / Schema / name consistency / evidence-only themes)** are
  **agent-owned** via `prompts/docs-agent-prompt.md` + fixtures (T002/T031/T032).
  Platform DoD does **not** include a server-side docs quality validator
  (clarify: trust agent `succeeded`).
- AiJob MVP statuses: `running` | `succeeded` | `failed` | `cancelled` — no
  `queued` (Download creates `running` immediately).
- AiJob status enum is **not** the same as AnalysisRun (`success` vs
  `succeeded`).
- Frontend unit tests: optional; prefer manual quickstart (T036) unless
  DocumentationPage regressions appear.
- Analyze remediation 2026-07-26: C1→T040; I1→drop queued; U1→Notes;
  D1→narrow T030; U2→T029/contracts; A1/I2→Notes.
- No `after_tasks` hooks registered in `.specify/extensions.yml`.
