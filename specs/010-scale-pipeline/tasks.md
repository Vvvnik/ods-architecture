# Tasks: Pipeline scaling (010)

**Input**: `specs/010-scale-pipeline/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅ (sync clarify session 2), spec.md ✅; `005`–`009` implemented

**Tests**: SC-001...007 + quickstart — unit inventory/progress; **integration walk-count on large-repo (≥1000 files)**; **SC-003 full vs incremental measure**; large-repo timing ≤900s; frontend progress; Vitest

**Organization** (for priority, not by number US): US1 inventory P1 → US2 progress+metrics P1 → US3 C# P1 → US5 ingest P1 → US4 orchestrator P2 → US6 graph UI P2 → US7 SDK follow-up P3 → Polish DoD

**Clarify session 2 (closed on spec/plan)**: walk-scope = inventory from sync; SC-002 gate = large-repo; SC-003 = required measurement; SC-005 = max large-repo (10k landmark); sync progress = only stage; progress_phase = `queued|parsing|ingest|done`

**Harmonization code**: increments A–F plan; no new indexes count; `009` spec not to touch; US7 only tracking

## Format: `[ID] [P?] [Story] Description`

- **[P]**: you can simultaneously (in different files, there is no dependence on incomplete)
- **[Story]**: US1–US7 from spec.md

**Language of**: Russian (Constitution)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Map file large-repo fixture, reconciliation acceptance

- [x] T001 Fix the map reuse in `specs/010-scale-pipeline/research.md` (section `## R9. Code reuse audit`) — `sync.service.ts`, `file-inventory` target, `language-detector.service.ts`, `change-set.service.ts`, `analysis-orchestrator.service.ts`, `analysis-run.ts`, `analysis.schemas.ts`, `useAnalysis.ts`, `WorkspacePage.tsx`, `GraphPage.tsx`, `GraphNodeTree.tsx`, `GraphSearch.tsx`
- [x] T002 [P] Check/document creation `large-repo` (≥1000 files) via `docker/fixtures/repos/setup-fixtures.sh --demo` in `docker/fixtures/repos/README.md` (path `/repos/large-repo` no external reference in git)
- [x] T003 [P] Check `specs/010-scale-pipeline/quickstart.md` §§1–3 and `contracts/scale-acceptance.md` (walk gate large-repo, SC-003 table SC-005)

---

## Phase 2: Foundational — types progress + inventory helper (BLOCKER)

**Purpose**: Domain types and shared walk helper to US

**⚠️ CRITICAL**: User story work does not begin until checkpoint **F1**

- [x] T004 Add progress-field in `backend/src/domain/analysis-run.ts` at `data-model.md` — `progress_phase` Canon `queued|parsing|ingest|done` (without `detecting`/`sync`), `progress_active_parser_id`, `progress_parsers_completed`, `progress_parsers_total`, `progress_updated_at`
- [x] T005 [P] to Expand zod `analysisRunSchema` in `backend/src/api/schemas/analysis.schemas.ts` — optional progress fields
- [x] T006 [P] Mirror types progress in `frontend/src/api/analysis-types.ts`
- [x] T007 Implement shared `buildFileInventory` / walk helper in `backend/src/services/file-inventory.service.ts` at `contracts/file-inventory.md` — denylist, path+mtime+size, `source: sync_walk|reuse`
- [x] T008 Unit `backend/tests/unit/file-inventory.service.test.ts` — denylist; deterministic sort paths
- [x] T009 [P] i18n progress in `frontend/src/i18n/ru.ts` — "Syncing..."; "Analysis: {parser} ({n}/{m})" according `contracts/analysis-run-progress.md`

**Checkpoint F1**: types progress; inventory helper + unit; i18n keys

---

## Phase 3: User Story 1 — One of the files of the cycle (Priority: P1) 🎯 MVP

**Goal**: ≤1 full WC walk cycle sync+training: sync builds inventory; detector/change-set only reuse (FR-001 / SC-002)

**Independent Test**: unit reuse without a second walk; **DoD assert on large-repo ≥1000 files** (`contracts/file-inventory.md`)

**Depends on**: **F1**

### Tests

- [x] T010 [P] [US1] Unit `backend/tests/unit/file-inventory-reuse.test.ts` — detector+changeset on one inventory without a second walk (regression, **not** closes SC-002)
- [x] T011 [US1] Integration **DoD SC-002** `backend/tests/integration/file-inventory-walk-count-large-repo.test.ts` — cycle sync+detect+changeset on **large-repo (≥1000 files)** → `walk_count ≤ 1`; `skipIf` only if fixture no — **not** considered PASS (then close via T047 table walk_count / T048; see `contracts/scale-acceptance.md` §A skipIf)

### Implementation

- [x] T012 [US1] Post inventory from `backend/src/services/sync.service.ts` when sync walk — `source: sync_walk` (primary path R1 / clarify Option A)
- [x] T013 [US1] To connect inventory in `backend/src/services/language-detector.service.ts` — `detectLanguages` / artifacts through inventory (to remove excess `walkDirectory`+`listAllFilePaths` in the same cycle)
- [x] T014 [US1] To connect inventory in `backend/src/services/change-set.service.ts` — `buildChangeSet` / current files = inventory reuse
- [x] T015 [US1] Orchestrator: spawn/file lists from inventory/changeset in `backend/src/services/analysis-orchestrator.service.ts` (no direct `listAllFilePaths` walk)

**Checkpoint A1**: SC-002 green **large-repo** (or skipIf + mark); unit reuse green

---

## Phase 4: User Story 2 — run Measurable criteria and progress (Priority: P1)

**Goal**: Progress analysis = stage+parser/N from M; sync = only stage; metric/quickstart; DoD smoke checklist (FR-002/009/013, SC-001/006/007)

**Independent Test**: UI poll N/M on analysis; sync "Syncing..."; quickstart §2–4, §7

**Depends on**: **F1** (preferably A1)

### Tests

- [x] T016 [P] [US2] Unit `backend/tests/unit/analysis-run-progress.test.ts` — patch progress fields / phase enum
- [x] T017 [P] [US2] Frontend test `frontend/src/hooks/useAnalysis.progress.test.ts` (or component) — stage + N/M; sync no mandatory N/M

### Implementation

- [x] T018 [US2] `AnalysisRunRepository` patch progress in `backend/src/repositories/analysis-run.repository.ts` (+ mapping ES in `backend/src/infra/elasticsearch.ts` if necessary)
- [x] T019 [US2] The Orchestrator updates progress at the start run / start-finish line parser / ingest in `backend/src/services/analysis-orchestrator.service.ts`
- [x] T020 [US2] GET run saves progress fields — `backend/src/api/routes/analysis.ts`
- [x] T021 [US2] UI: `frontend/src/hooks/useAnalysis.ts` + `WorkspacePage.tsx` / `GraphPage.tsx` — analysis: stage+parser+N/M; sync: only stage (existing `sync_status`); i18n T009
- [x] T022 [P] [US2] Additive progress fields in `specs/005-code-analysis/contracts/openapi-analysis.yaml`

**Checkpoint A2**: SC-007 hand-girder ≥30 C; schema API ready

---

## Phase 5: User Story 3 — Large C# monorepo quietly failure (Priority: P1)

**Goal**: timeout + partial with a clear `parser_results`; incremental paths (FR-003/004); preparations for SC-003 measure

**Independent Test**: C# multi-project / large-repo csharp subset; timeout not hang; paths incremental

**Depends on**: A2 (progress visible at long csharp)

### Tests

- [x] T023 [P] [US3] Unit timeout `backend/tests/unit/analysis-orchestrator-timeout.test.ts` (mock spawn) — failed/partial with message
- [x] T024 [US3] Incremental path classification `.cs` in `backend/tests/unit/change-set.service.test.ts` (+ to increase the regression)

### Implementation

- [x] T025 [US3] The Orchestrator to ensure `parser_results` entry when timeout/crash in `backend/src/services/analysis-orchestrator.service.ts`
- [x] T026 [US3] Check `parsers/csharp/manifest.json` `timeout_ms` with `ANALYSIS_PARSER_TIMEOUT_MS`; note `specs/010-scale-pipeline/quickstart.md`
- [x] T027 [US3] Incremental spawn csharp uses `pathsForLanguage` / inventory — `backend/src/services/analysis-orchestrator.service.ts` (+ related lists of files)

**Checkpoint A3**: C# fail/timeout → clear status; path incremental ready (measurement SC-003 — Phase 10)

---

## Phase 6: User Story 5 — Ingest and completeness relations (Priority: P1)

**Goal**: bulk ingest scale; dangling = 0; incremental delete code+system (FR-006/007, SC-004)

**Independent Test**: edge-filter; dangling=0

**Depends on**: A1 desirable

### Tests

- [x] T028 [P] [US5] Regression `backend/tests/unit/ingest/ingest-edge-filter.test.ts`
- [x] T029 [P] [US5] Unit/integration incremental delete — `backend/tests/unit/change-set.service.test.ts` / ingest incremental tests

### Implementation

- [x] T030 [US5] Audit `backend/src/services/ingest/ingest.service.ts` — `filterEdgesWithKnownEndpoints` on adapters path; bulk batch size if necessary
- [x] T031 [US5] Verify `pathsForParser` / artifact coverage compose/openapi/appsettings/dotnet/bus — regression-tests green
- [x] T032 [US5] Integration assert dangling=0 after system-landscape-e2e / scale fixture — `backend/tests/integration/` (or extend an existing e2e)

**Checkpoint A5**: SC-004 = 0% dangling

---

## Phase 7: User Story 4 — Orchestration under load (Priority: P2)

**Goal**: max parallel + timeout only; all parser_results filled (FR-005)

**Independent Test**: mock M>N parsers → concurrency ≤N

**Depends on**: A2/A3

### Tests

- [x] T033 [P] [US4] Unit `backend/tests/unit/analysis-orchestrator-parallel.test.ts` — `ANALYSIS_MAX_PARALLEL_PARSERS=N` → at the same time ≤N

### Implementation

- [x] T034 [US4] Semaphore/queue parallel spawn in `backend/src/services/analysis-orchestrator.service.ts`
- [x] T035 [US4] Short ops-note (timeout+parallel without RAM cap) in `ods-help/user-guide/commands.md` if necessary

**Checkpoint A4**: parallel limit enforced

---

## Phase 8: User Story 6 Lists and search in large graph (Priority: P2)

**Goal**: pagination + layer-agreed counters (FR-008, SC-005); DoD = large-repo max nodes (10k reference)

**Independent Test**: GraphPage/tree/search after analyzing large-repo

**Depends on**: graph data after full analysis

### Tests

- [x] T036 [P] [US6] Frontend `frontend/src/components/graph/GraphNodeTree.test.tsx` — layer filter + load more serverOffset
- [x] T037 [P] [US6] Frontend `frontend/src/components/graph/GraphSearch.test.tsx` — counters when layer ≠ all

### Implementation

- [x] T038 [US6] To bring `frontend/src/components/graph/GraphNodeTree.tsx` — serverOffset paging under layer
- [x] T039 [US6] To bring `frontend/src/components/graph/GraphSearch.tsx` — honest totals / pagination when layer
- [x] T040 [US6] Regression `frontend/src/utils/graphLayerFilter.test.ts` + GraphPage; the report to fix the actual `node_count` (SC-005)

**Checkpoint A6**: first page < ~3 with on the graph large-repo

---

## Phase 9: User Story 7 — Parser CLI SDK (Priority: P3, follow-up only)

**Goal** Not to implement DoD; fix follow-up (FR-010)

**Independent Test**: n/a (tracking)

- [x] T041 [US7] Section "Follow-up: Parser CLI SDK" in `specs/010-scale-pipeline/quickstart.md` §8 and checkbox in `contracts/scale-acceptance.md` §C — **no** code parsers/
- [x] T042 [US7] Tracker follow-up SDK recorded in Notes (`post-010: shared parseArgs+envelope`) — implementation **out** DoD `/specit-implement` `010` (analyze U1: task is performed by Doc text Notes)

**Checkpoint**: US7 obviously postponed is not forgotten

---

## Phase 10: Polish & DoD (SC-001 / SC-003 / SC-006)

**Purpose**: Timing gates, **mandatory SC-003 measure**, closing smoke, the final reconciliation

- [x] T043 Integration/performance `backend/tests/integration/large-repo-scale-timing.test.ts` (or script in `backend/tests/performance/`) — full cycle on large-repo ≤900s; `skipIf` no fixture **≠** PASS SC-001 (closure through T047/T048 + explicit tagging skipped)
- [x] T044 **Compulsory metering SC-003** — script/integration `backend/tests/integration/large-repo-incremental-timing.test.ts` (or the same harness): full → ≤1% change → incremental → speedup ≥40% **or** `incremental_unavailable_reason`; table `quickstart.md` §3; if `skipIf` no fixture — **MUST** fill in §3 manually in T047 (not PASS machine)
- [x] T045 [P] Camera report template for `contracts/scale-acceptance.md` §B in `specs/010-scale-pipeline/quickstart.md` (checklist copy-paste, line SC-003)
- [x] T046 [P] Update `ods-help/user-guide/commands.md`: progress UI + scale smoke no commit external standard
- [x] T047 To banish `quickstart.md` §§1–6 on the pilot; lock table SC-001/SC-002/SC-003/SC-005 (2026-07-15, large-repo ~&lt;30s; SC-003 — `incremental_unavailable_reason`)
- [x] T048 Closing smoke (manual) according to §B — large-repo through `local_path`; checklist in `quickstart.md` §7 (2026-07-15)
- [x] T049 Verification: `009` spec.md not changed; canvas not implemented; walk assert large-repo + progress + dangling regress green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup → Foundational (F1)** — BLOCKER
- **US1 (A1)** → sync inventory + reuse; SC-002 large-repo
- **US2 (A2)** — progress; need F1
- **US3** — after A2; SC-003 measure in Polish (T044)
- **US5** — after A1; in parallel with US3 possible
- **US4** — after A2/A3
- **US6** - after the big graph
- **US7** — tracking only
- **Polish** — after A1–A6; includes SC-001 + **SC-003**

### User Story Dependencies

| Story | Depends |
|-------|---------|
| US1 | F1 |
| US2 | F1 (+A1 preferably) |
| US3 | A2 |
| US5 | A1 |
| US4 | A2/A3 |
| US6 | analysed graph |
| US7 | none (docs only) |

### Parallel Opportunities

```text
After F1:
  T010 || T016 || T017
After A1:
  T012–T015 (seq: sync → detector → changeset → orchestrator)
  then T028||T029 (US5)
After A2:
  T023 || T033
Polish:
  T043 || T044 (both large-repo; you can seq not to compete for stack)
  T045 || T046
```

---

## Parallel Example: After F1

```bash
# in parallel
Task: T010 file-inventory-reuse.test.ts
Task: T016 analysis-run-progress.test.ts
Task: T017 frontend progress test
```

---

## Implementation Strategy

### MVP First

1. Phase 1–2 (F1)
2. Phase 3 US1 (walk ≤1 on large-repo) 🎯
3. Phase 4 US2 (progress)
4. **STOP** — validate A1+A2

### Incremental to DoD

5. US3 + US5  
6. US4 + US6  
7. Polish: SC-001 ≤15m + **SC-003 measure** + closing smoke  
8. US7 remains follow-up only

---

## Notes

- Not committing an external standard scale; does not change `specs/009-system-landscape/spec.md`
- Hard RAM cap out scope; % in progress UI out MVP; sync no mandatory N/M
- Canvas → `011-ods-graph-viewer`
- **post-010 tracker (US7 / T042):** shared `parseArgs` + envelope SDK for parsers — mandatory follow-up not DoD `010`
- GraphPage: independent scrolling "Nodes"/"Connection" + sticky "Even root" (made in `010`)
- SC-002: unit reuse ≠ DoD; DoD = T011 large-repo (**or** T047 walk_count when skipIf)
- SC-003: path tests (T024) ≠ DoD; DoD = T044 measure (**or** hand - §3 in T047 when skipIf)
- **skipIf ≠ PASS** at SC-001/002/003 policy `contracts/scale-acceptance.md` §A
- All tasks: checkbox + ID + file paths
