# Tasks: S1 — AI graph from working copy

**Input**: Design documents from `/specs/027-ai-graph-from-wc/`

**Prerequisites**: plan.md, spec.md (clarify 2026-08-02), research.md,
data-model.md, contracts/, quickstart.md; closed `015` AiJob bus;
`005`/`006` analysis + replace-after-success

**Tests**: Included per plan Testing (unit + API + focused frontend). No
TDD mandate — write tests with or immediately after the behavior they
cover.

**Organization**: Setup → Foundational (AGENT-DOC migrate +
`graph_builder` + Status helper) → US1 AI rebuild (MVP) → US2 dual
prompts UI/docs → US3 Status scope wiring → US4 provenance badge →
Polish

**MVP DoD**: Phase 1–2 + US1 (code-download → agent ingest → gated
publish + Graph View). US2–US4 required for full feature close.

**Language**: English (constitution)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete deps)
- **[Story]**: US1–US4 from spec.md
- Exact file paths in every task description

## Path Conventions (ODS)

- **Backend**: `backend/src/`, tests `backend/tests/`
- **Frontend**: `frontend/src/`, tests `frontend/tests/` or colocated `*.test.tsx`
- **Prompts**: `prompts/docs-agent-prompt.md`, `prompts/code-agent-prompt.md`
- **Contracts**: `specs/027-ai-graph-from-wc/contracts/`
- **Runtime FS**: `DATA_ROOT/docs/{projectId}/` (not in git)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align product prompts and contracts before code; no behavior
change required beyond scaffolding notes.

- [x] T001 Verify `specs/027-ai-graph-from-wc/contracts/` against
  `data-model.md` / `research.md` (dual download, ingest gates, Status
  scope, `graph_builder`) — note gaps in tasks Notes if any
- [x] T002 [P] Expand `prompts/code-agent-prompt.md` into S1 playbook per
  `contracts/agent-prompts.md` (placeholders, WC + ingest + complete,
  remove Parsers/AI import-toggle wording)
- [x] T003 [P] Update `prompts/docs-agent-prompt.md` references from
  `AGENT.md` to `AGENT-DOC.md` (keep ES-only / no-WC rules)

**Checkpoint S1**: contracts + prompts aligned

---

## Phase 2: Foundational (BLOCKER)

**Purpose**: Shared FS rename, analysis provenance field, Status scope
helper — **MUST** complete before US1–US4 product wiring.

**⚠️ CRITICAL**: No user-story UI/ingest until this phase completes.

- [x] T004 Add `graph_builder: "parsers" | "ai"` to
  `backend/src/domain/analysis-run.ts` and persist via
  `backend/src/repositories/analysis-run.repository.ts` (default
  `"parsers"` for existing/backfill reads)
- [x] T005 [P] Set `graph_builder: "parsers"` on parser-started runs in
  `backend/src/services/analysis.service.ts` /
  `analysis-orchestrator.service.ts` (wherever runs are created)
- [x] T006 Implement `AGENT-DOC.md` constants + legacy migrate
  (`AGENT.md` → `AGENT-DOC.md` when old exists and new absent) in
  `backend/src/services/docs.service.ts`; reserve both
  `AGENT-DOC.md` and `AGENT-CODE.md` against agent writes; update
  `backend/src/domain/errors.ts` reserved-file message
- [x] T007 [P] Switch seed/render/download filename to `AGENT-DOC.md` in
  `backend/src/services/agent-prompt.service.ts`,
  `backend/src/services/project.service.ts` (import seed),
  `backend/src/api/routes/docs.ts` (`Content-Disposition`),
  `backend/src/services/docs-export.service.ts`
- [x] T008 Call migrate-on-access from docs list/read/download paths in
  `backend/src/api/routes/docs.ts` / `docs.service.ts`
- [x] T009 [P] Add unit tests for migrate + reserved names in
  `backend/tests/unit/docs-agent-doc-rename.test.ts`
- [x] T010 Create Status scope helper (include `auto_found`/`needed`/
  legacy `found`; exclude `not_needed`/legacy `unused` + inherited
  descendants) in `backend/src/services/analysis-status-scope.ts` (new)
  per `contracts/status-scope-and-provenance.md`
- [x] T011 [P] Unit tests for Status scope helper in
  `backend/tests/unit/analysis-status-scope.test.ts`

**Checkpoint F1**: `AGENT-DOC` live; `graph_builder` on runs; Status helper
tested; ready for AI path

---

## Phase 3: User Story 1 — Optional AI graph rebuild (Priority: P1) 🎯 MVP

**Goal**: Code-download creates `graph_from_wc` + AI analysis run;
external agent reads WC, ingests Canon, complete with gates;
replace-after-success; Graph View shows AI graph

**Independent Test**: quickstart §3–4 — after parser success, code-download
→ agent ingest valid Canon → Graph View AI landscape; invalid/empty →
prior graph intact

### Implementation for User Story 1

- [x] T012 [US1] Implement code-prompt render from
  `prompts/code-agent-prompt.md` into `AGENT-CODE.md` in
  `backend/src/services/agent-prompt.service.ts` (placeholders
  `ODS_BASE_URL`, `PROJECT_ID`, `ANALYSIS_RUN_ID`, `CODE_JOB_ID`)
- [x] T013 [US1] Add `POST /projects/:projectId/docs/download-code-prompt`
  in `backend/src/api/routes/docs.ts` (+ zod in
  `backend/src/api/schemas/`) per `contracts/rest-graph-from-wc.md`:
  **first** code-download requires a prior **parser** graph-ready success
  in project history; **subsequent** allow any graph-ready; create
  AnalysisRun `graph_builder=ai`; supersede `graph_from_wc` AiJob; render
  `AGENT-CODE.md`; return download
- [x] T014 [P] [US1] API/unit tests for code-download supersede +
  first/subsequent prerequisite in `backend/tests/unit/` or
  `backend/tests/api/download-code-prompt.test.ts`
- [x] T015 [US1] Implement job-scoped WC list/read routes in
  `backend/src/api/routes/ai-jobs.ts` (or new
  `backend/src/api/routes/ai-graph-wc.ts` registered from
  `backend/src/index.ts`): `GET .../ai-jobs/:jobId/wc/paths` and
  `.../wc/content` using Status scope helper; add
  `AI_GRAPH_WC_MAX_FILE_BYTES` (default **1048576**) to
  `backend/src/config.ts` and enforce on content reads (oversize →
  413/400); reuse UTF-8/binary habits from
  `backend/src/services/file-content.service.ts` where practical
- [x] T016 [P] [US1] Unit/API tests for WC scope deny + oversize cap in
  `backend/tests/unit/ai-graph-wc-scope.test.ts`
- [x] T017 [US1] Implement Canon batch ingest
  `POST .../ai-jobs/:jobId/graph/ingest` in
  `backend/src/services/ai-graph-ingest.service.ts` (new) + route:
  bind current `graph_from_wc`; validate kinds/schemas; write
  nodes/edges for job `analysis_run_id` with AI provenance; fail-fast
  invalid item → fail job (no publish)
- [x] T018 [US1] Wire `complete` for `graph_from_wc` in
  `backend/src/services/ai-job.service.ts` (and/or finalize helper):
  gates (ingest errors or zero nodes → `failed`); on success mark run
  graph-ready + existing replace-after-success cleanup; failed/cancel
  leave prior graph; confirm existing `POST .../progress` works for
  current `graph_from_wc` (reuse `015` route; no new endpoint required)
- [x] T019 [P] [US1] Unit/API tests for ingest reject + zero-node /
  invalid complete gates in
  `backend/tests/unit/ai-graph-ingest-gates.test.ts`
- [x] T020 [US1] Ensure concurrent docs + graph jobs remain allowed
  (per-kind supersede only) — assert in
  `backend/tests/unit/ai-job-concurrent-kinds.test.ts`

**Checkpoint US1**: AI rebuild path works via REST without portal dual-button
polish (curl/agent OK)

---

## Phase 4: User Story 2 — Dual downloadable prompts (Priority: P1)

**Goal**: Documentation panel has two download buttons; docs path uses
`AGENT-DOC.md`; `AGENT-CODE.md` seeded after parser success; live job id
on code-download

**Independent Test**: quickstart §2 — two controls; docs → `AGENT-DOC.md`;
`AGENT-CODE.md` present after parser seed; re-rendered on code-download

### Implementation for User Story 2

- [x] T021 [P] [US2] Update Documentation UI for `AGENT-DOC.md` + dual
  download buttons in `frontend/src/pages/DocumentationPage.tsx` (and
  related hooks/API client under `frontend/src/api/` /
  `frontend/src/hooks/`)
- [x] T022 [P] [US2] Add i18n strings for both download actions in
  `frontend/src/i18n/en.ts` and `frontend/src/i18n/ru.ts`
- [x] T023 [US2] Enable code-download button when prerequisite met
  (first: parser graph-ready in history; later: any graph-ready per
  contract); wire `download-code-prompt` client call; refresh tree for
  `AGENT-CODE.md`
- [x] T024 [P] [US2] Frontend unit tests for dual buttons /
  `AGENT-DOC` naming in `frontend/src/pages/DocumentationPage.test.tsx`
  (and/or `DocsTree.test.tsx`)
- [x] T025 [US2] Fix remaining `AGENT.md` references in portal tests and
  `ods-help/user-guide/manual-docs-create.md` (docs download rename only;
  code prompt section can wait for Polish if thin)

**Checkpoint US2**: Operator can download both prompts from UI

---

## Phase 5: User Story 3 — Element Status scope (Priority: P2)

**Goal**: Parsers and AI omit `not_needed` (and scope rules); picker shows
three statuses only; sync still lists all paths

**Independent Test**: quickstart §5 — mark `not_needed` → absent from
graph inventory; tree still lists; picker has three options

### Implementation for User Story 3

- [x] T026 [US3] Apply Status scope helper when building analysis file
  inventory in `backend/src/services/file-inventory.service.ts` and/or
  `analysis-orchestrator.service.ts` / `analysis.service.ts` so parsers
  skip out-of-scope paths
- [x] T027 [P] [US3] Confirm AI WC list (T015) uses the same helper;
  add regression assertion in
  `backend/tests/unit/analysis-status-scope-inventory.test.ts`
- [x] T028 [US3] Restrict Status picker / PATCH allowed values to
  `auto_found` | `needed` | `not_needed` in
  `frontend/src/api/models.ts`,
  `frontend/src/components/ElementProperties.tsx`, and backend zod in
  `backend/src/api/routes/elements.ts` (keep legacy readable in ES;
  reject or ignore new writes of `found`/`unused`)
- [x] T029 [P] [US3] Frontend unit test for three-option picker in
  `frontend/src/components/ElementProperties.test.tsx` (create if missing)

**Checkpoint US3**: Status scope shared for parsers + AI; UI three picks

---

## Phase 6: User Story 4 — Graph provenance badge (Priority: P2)

**Goal**: Graph View / run header shows Built by parsers vs Built by AI
from `graph_builder`; Status tree unchanged

**Independent Test**: quickstart §1 vs §3 badge text; Status labels
unchanged

### Implementation for User Story 4

- [x] T030 [US4] Expose `graph_builder` on analysis-run / graph summary
  API responses used by Graph View (`backend/src/api/routes/analysis.ts`
  and/or `graph-view` DTOs in `backend/src/services/graph-view.types.ts`)
- [x] T031 [US4] Render provenance badge on Graph View header in
  `frontend/src/pages/GraphViewPage.tsx` (and/or shared graph chrome
  under `frontend/src/components/graph/`) reading current run
  `graph_builder` (MVP MUST). Optionally reuse on other existing
  run-summary chrome — not required for DoD
- [x] T032 [P] [US4] i18n badge strings in `frontend/src/i18n/en.ts` and
  `frontend/src/i18n/ru.ts` (“Built by parsers” / “Built by AI”)
- [x] T033 [P] [US4] Frontend unit/smoke for badge text in
  `frontend/src/pages/GraphViewPage.test.tsx` or component test

**Checkpoint US4**: Badge distinguishes parsers vs AI without Status overload

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Docs, dogfood, SPECKIT hygiene

- [x] T034 [P] Update `ods-help/user-guide/` for `AGENT-DOC.md`, dual
  downloads, and code-agent loop (extend or add short S1 note; English)
- [x] T035 [P] Sync OpenAPI/client types if generated from backend
  (`frontend/src/api/types.ts` / models) for new routes and
  `graph_builder`
- [x] T036 Run `specs/027-ai-graph-from-wc/quickstart.md` validation on
  ODS fixture (SC-001–SC-006); record gaps in tasks Notes if any —
  Compose dogfood 2026-08-02 (parser seed → code-download → AI rebuild with
  Code/System/UI parity including `ui_route`/`ui_screen`; Graph View badge;
  docs panel dual job status). Remaining operator-only: optional re-dogfood
  after image rebuild with latest panel/gate hardening
- [x] T037 [P] Grep-fix stray `AGENT.md` product references in
  `backend/`, `frontend/`, `prompts/`, `ods-help/user-guide/` (keep
  historical draft/spec mentions OK)
- [x] T038 Mark feature ready for `/speckit-implement` closeout; ensure
  `.specify/feature.json` still points at
  `specs/027-ai-graph-from-wc`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: start immediately
- **Foundational (Phase 2)**: after Setup — **blocks** all stories
- **US1 (Phase 3)**: after Foundational — MVP
- **US2 (Phase 4)**: after Foundational; ideally after T013 exists (uses
  code-download API); can parallelize UI with late US1 if API stubbed
- **US3 (Phase 5)**: after Foundational (T010); AI WC already scoped in
  US1 — this phase wires parsers inventory + picker
- **US4 (Phase 6)**: after Foundational (T004); best after US1 produces
  AI runs
- **Polish (Phase 7)**: after desired stories complete

### User Story Dependencies

```text
Phase 2 Foundational
    ├── US1 AI rebuild (MVP) ──► US4 badge (needs AI runs)
    ├── US2 Dual prompts UI ───► (uses US1 code-download route)
    └── US3 Status scope ──────► (shared helper from Phase 2)
```

- **US1**: no dependency on US2–US4 for API dogfood
- **US2**: depends on T013 code-download route
- **US3**: depends on T010 helper; complements US1 WC filter
- **US4**: depends on T004 `graph_builder` + successful US1 path for AI
  badge demo

### Parallel Opportunities

- T002 ∥ T003 (prompts)
- T005 ∥ T006–T007 start after T004 domain field exists carefully —
  T006 ∥ T007 after T006 constants
- T009 ∥ T011 after helpers exist
- T014 ∥ T016 ∥ T019 ∥ T020 within US1 tests
- T021 ∥ T022 ∥ T024 within US2
- T027 ∥ T029 within US3
- T032 ∥ T033 within US4
- T034 ∥ T035 ∥ T037 in Polish

### Parallel Example: User Story 1

```bash
# After T013 + T015 + T017 + T018 land, tests in parallel:
Task: "API tests code-download in backend/tests/api/download-code-prompt.test.ts"
Task: "WC scope tests in backend/tests/unit/ai-graph-wc-scope.test.ts"
Task: "Ingest gates tests in backend/tests/unit/ai-graph-ingest-gates.test.ts"
Task: "Concurrent kinds test in backend/tests/unit/ai-job-concurrent-kinds.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 Setup  
2. Phase 2 Foundational  
3. Phase 3 US1 — validate with agent/curl + Graph View  
4. **STOP** — demo AI rebuild before UI polish  

### Incremental Delivery

1. Setup + Foundational  
2. US1 → AI path MVP  
3. US2 → dual buttons + docs rename UX  
4. US3 → Status scope for parsers + picker  
5. US4 → provenance badge  
6. Polish → user-guide + quickstart SC pass  

### Suggested MVP scope

**US1** (+ Phase 1–2): code-download, WC allowlist, ingest, publish gates,
replace-after-success.

---

## Notes

- Do not invent a second AiJob framework — extend `015` bus.
- Do not seed `AGENT-CODE.md` on import.
- Do not overload element Status with parsers/AI provenance.
- No foreign repo paths/UUIDs/localhost in tracked artifacts.
- Legacy `found`/`unused`: readable; picker hidden; scope treat as
  auto_found / not_needed per `data-model.md`.
- Analyze remediation 2026-08-02: I1 first/subsequent code-download; I2
  Graph View badge MVP; U1 `AI_GRAPH_WC_MAX_FILE_BYTES`=1MiB; U2 progress
  reuse noted in T018; T1 `graph_builder` named in spec entities.
- Task count: **38** (T001–T038).
- T036 Compose dogfood done 2026-08-02 (AI rebuild + UI landscape + dual
  job properties panel). Closeout hardening same day: docs PUT/DELETE
  require `docs_from_es`; AI ingest enforces Status scope + running AI run;
  restart recovery fails bound AiJobs; AGENT-CODE seed only when
  graph-ready parser run; code-download button gated on `AGENT-CODE.md`;
  provenance badge on `no_system_participants` Graph View empty state.
- Final closeout 2026-08-02 (evening): re-dogfood `graph_from_wc` with
  parser-parity System/Code/UI; Graph View System root hides endpoints
  for parsers+AI; service focus omits UI/code externals; compact grouped
  layout. Slice rules recorded in `014` §Current Graph View behavior and
  `011` FR-013 note. Feature **Closed**; vision `001` already marks S1
  Closed. Do not commit rendered `AGENT-CODE.md` (UUIDs/localhost) —
  template remains `prompts/code-agent-prompt.md`.
