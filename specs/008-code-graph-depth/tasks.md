# Tasks: Code Graph Depth (008)

**Input**: `specs/008-code-graph-depth/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅ (clarify 2026-07-14); `005`/`006`/`007` implemented in the code

**Tests**: In spec — FR-010 / SC-001...005 and the criterion of readiness of the draft (unit + integration); for `plan.md` — Vitest unit ingest + integration parser→ingest; smoke — `quickstart.md`

**Organization** By: user stories spec.md (US1 C# calls P1 → US2 TS calls P1 → US3 v1 compat P1 → US4 injects P2 → US5 UI P2)

**Harmonization code**: Phase 2 — expand shared symbols ingest and `EdgeType` (no new indexes/UI)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: you can simultaneously (in different files, there is no dependence on incomplete)
- **[Story]**: US1–US5 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Expansion points without a new package/repo

- [X] T001 Fix map of affected files in `specs/008-code-graph-depth/research.md` section `## R11. Code reuse audit` — `parsers/typescript/run.mjs`, `parsers/csharp/Ods.CSharpParser/*`, `backend/src/domain/graph-edge.ts`, `backend/src/services/ingest/types.ts`, `backend/src/services/ingest/adapters/symbols-model.ingest.ts`, thin `typescript.ingest.ts`/`csharp.ingest.ts`, fixtures `backend/tests/fixtures/ingest/*`
- [X] T002 [P] Check out: **not** add npm/NuGet according unnecessarily (TS checker already `parsers/typescript`; Roslyn — the project csharp); to substantiate research R11 when you reject

---

## Phase 2: Foundational — Canon ribs + ingest v1/v2

**Purpose**: `injects` in EdgeType; dual `['1','2']`; usages→edges; `metadata.layer=code` — blocks all US

**⚠️ CRITICAL**: User story work does not begin until checkpoint **F1**

- [X] T003 [P] Add `'injects'` in `EdgeType` in `backend/src/domain/graph-edge.ts` and allowlist `isEdgeType` in `backend/src/services/ingest/types.ts` at `contracts/canonical-edge-types.md`
- [X] T004 [P] Synchronize enum `type` (+ `injects`) in `ods-help/requirements/json-model/canonical-edge-code.schema.json` and in the presence of mirrors in `specs/006-project-graph/contracts/canonical-schemas.json` — note `implementation_status` / 008
- [X] T005 Expand `backend/src/services/ingest/adapters/symbols-model.ingest.ts`: `supported_schema_versions: ['1','2']`; processing `model.usages[]` (`calls`|`injects` → fin); resolution from/to at map qn; skip if the end was not found; ignore other usage types — `contracts/ingest-symbols-v2.md`
- [X] T006 In the same adapter (or helper nearby): when upsert nodes/edges to merit `metadata.layer = 'code'` (save `parent_qualified_name` etc.) — FR-008 / research R7
- [X] T007 [P] Update comments thin-adapters `backend/src/services/ingest/adapters/typescript.ingest.ts` and `csharp.ingest.ts` (v1+v2 via shared). Shared symbols-adapter: `supported_schema_versions: ['1','2']` for **all** languages (typescript/csharp/python/cpp) — python/cpp still the only EMITT v1, dual versions no harm (research R11)
- [X] T008 [P] Unit-regression ingest v1: update waiting metadata in `backend/tests/unit/ingest/typescript.ingest.test.ts` and `csharp.ingest.test.ts` (valid `layer=code`); add case v2 usages→`calls` in a new or the same file `backend/tests/unit/ingest/symbols-model-v2.ingest.test.ts` with fixture `backend/tests/fixtures/ingest/typescript-model-v2.json` (minimum usages calls)

**Checkpoint F1**: `injects` domain; ingest takes schema 2 writes `calls`; v1 tests green; layer new documents transform

---

## Phase 3: User Story 1 Calls in C# (Priority: P1) 🎯 MVP

**Goal**: Parser C# v2 remove unambiguous `calls` → ingest → Canon

**Independent Test**: `quickstart.md` §1; SC-001 — edge `calls` on multi-file fixture Create→Save (cross-file)

**Depends on**: **F1**

### Implementation for User Story 1

- [X] T009 [US1] Add DTO `Usage` and support `Usages` in model in `parsers/csharp/Ods.CSharpParser/Models.cs`
- [X] T010 [US1] To put `SchemaVersion = "2"` in `parsers/csharp/Ods.CSharpParser/Program.cs` and `"schema_version": "2"` in `parsers/csharp/manifest.json`
- [X] T011 [US1] To realize the extraction of calls (SemanticModel / InvocationExpression) in `parsers/csharp/Ods.CSharpParser/CSharpExtractor.cs` — only unambiguous goals; the ambiguity → not to write usage (FR-006)
- [X] T012 [P] [US1] Pilot source fixture **necessarily multi-file** in `backend/tests/fixtures/parsers/csharp-calls/` method `Create` in single file is the unequivocal `Save` in **other** file of the same run (US1 A3 / research R4: both characters in one envelope)
- [X] T013 [US1] Integration `backend/tests/integration/csharp-parser-calls.test.ts` — CLI → envelope `schema_version=2` + usages `calls`; **MUST** ingest → assert edge `type=calls` in the Canon/ES (harness as `graph-ingest`); assert cross-file from/to
- [X] T014 [P] [US1] Fixture envelope/model `backend/tests/fixtures/ingest/csharp-model-v2.json` (+ optional `envelope-csharp-v2.json`) for unit/ingest no full Roslyn

**Checkpoint A1**: C# fixture gives `calls` in envelope and in the Canon

---

## Phase 4: User Story 2 Calls in TypeScript (Priority: P1)

**Goal**: Parser TS v2 + checker → unambiguous `calls`

**Independent Test**: `quickstart.md` §2; SC-002

**Depends on**: **F1** (can parallel with US1 after F1)

### Implementation for User Story 2

- [X] T015 [US2] To put `schema_version: "2"` in envelope write and `parsers/typescript/manifest.json`; expand emit `usages[]` in `parsers/typescript/run.mjs`
- [X] T016 [US2] Extraction calls through TypeScript type checker in `parsers/typescript/run.mjs` (or dedicated module next, eg. `parsers/typescript/extract-usages.mjs`) — skip unresolved/ambiguous
- [X] T017 [P] [US2] Pilot fixture **necessarily multi-file** in `backend/tests/fixtures/parsers/typescript-calls/` — caller in one file → unambiguous callee other (parity US1 A3 / R4)
- [X] T018 [US2] Integration `backend/tests/integration/typescript-parser-calls.test.ts` — CLI → v2 + usages; **MUST** ingest → assert edge `type=calls` in the Canon/ES; assert cross-file from/to
- [X] T019 [P] [US2] Fixture `backend/tests/fixtures/ingest/typescript-model-v2.json` already T008 — Supplement to parity with csharp-model-v2 if necessary

**Checkpoint A2**: TS fixture gives `calls` end-to-end

---

## Phase 5: User Story 3 — Compatible envelope v1 (Priority: P1)

**Goal**: v1 envelope → Canon before 008; a mixture v1/v2 no drops run

**Independent Test**: SC-003; unit fixtures v1; `quickstart.md` §5

**Depends on**: **F1** (logically after US1/US2 desirable, but tested immediately after F1)

### Implementation for User Story 3

- [X] T020 [US3] Explicit regression-set: to make sure that `backend/tests/fixtures/ingest/typescript-model-v1.json`, `csharp-model-v1.json`, `envelope-typescript-v1.json` are transform/ingest no requirement `usages`
- [X] T021 [US3] Unit/integration case mix: one transform v2 usages + separate v1 model same `parser_id` policy does not overwrite a foreign language is to expand `backend/tests/unit/ingest/` or `graph-ingest.test.ts` at `contracts/ingest-symbols-v2.md`
- [X] T022 [P] [US3] Check registry: unknown version still error; `"1"` and `"2"` accepted for typescript/csharp in `backend/tests/unit/ingest/ingest-registry.service.test.ts` (or equivalent)

**Checkpoint A3**: SC-003 closed tests

---

## Phase 6: User Story 4 — DI injects in C# (Priority: P2)

**Goal**: Constructor injection → Canon `injects`

**Independent Test**: `quickstart.md` §3; US4 acceptance

**Depends on**: **F1** + preferably US1 (same extractor)

### Implementation for User Story 4

- [X] T023 [US4] Heuristic ctor DI in `parsers/csharp/Ods.CSharpParser/CSharpExtractor.cs` — usage `injects` class→param type with the permitted type of project; primitives/noresolv — skip
- [X] T024 [P] [US4] to Expand fixture `csharp-calls` (or `csharp-injects/`) class ctor(IRepo)
- [X] T025 [US4] Tests: unit ingest usage injects→edge in `backend/tests/unit/ingest/symbols-model-v2.ingest.test.ts`; integration parser assert `injects` in envelope/Canon
- [X] T026 [P] [US4] Negative: parameter `int`/unknown — no edge `injects` (test integration or extractor unit)

**Checkpoint A4**: `injects` visible in the Canon for DI-fixture

---

## Phase 7: User Story 5 — Search/view the new edges (Priority: P2)

**Goal**: `calls`/`injects` available through UI/API `007` no new screen

**Independent Test**: `quickstart.md` §6; SC-004

**Depends on**: US1 or US2 (data `calls` in ES)

### Implementation for User Story 5

- [X] T027 [US5] smoke API: integration assert — after ingest v2 `GET` edges/search returns `type=calls` (expand `backend/tests/integration/graph-search.test.ts` or `graph-file-dependencies.test.ts`) — **no** new frontend components
- [X] T028 [P] [US5] Pass manually `quickstart.md` §6 on the pilot (compose full) and briefly mention the result in `specs/008-code-graph-depth/quickstart.md` (checkbox/note) — optional if CI already covered T027

**Checkpoint A5**: SC-004 closed (test and/or manual smoke)

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: Ambiguity, manifest, json-model statuses, docs

- [X] T029 [P] Fixture + test ambiguous overloads (C# and/or TS) — no `calls` usage/ribs; run success — `backend/tests/fixtures/parsers/` + integration (SC-005)
- [X] T030 [P] Update `ods-help/requirements/json-model/README.md` and `native-symbols-v2.schema.json` `implementation_status` → done after green tests; mirror `specs/008-code-graph-depth/contracts/`
- [X] T031 [P] Update `parsers/typescript/README.md` and in the presence csharp README — schema v2, usages
- [X] T032 To run scripts `quickstart.md` §1–5; to fix the gaps in the tests/docks deviations
- [X] T033 [P] Make sure that python/cpp parsers still `schema_version: "1"` and ingest v1 green (`backend/tests/unit/ingest/python.ingest.test.ts`, `cpp.ingest.test.ts`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup** → immediately
- **Phase 2 Foundational** → after Setup; **blocks** US1–US5
- **US1 / US2 / US3** → after F1; US1 KUUS2; US3 immediately after F1
- **US4** → after F1 (+ better after US1 extractor)
- **US5** → after the appearance `calls` in the Canon (US1 or US2)
- **Polish** → after need US

### User Story Dependencies

| Story | Depends |
|-------|---------|
| US1 C# calls | F1 |
| US2 TS calls | F1 |
| US3 v1 compat | F1 |
| US4 injects | F1 (+ US1 preferably) |
| US5 UI/API | US1 or US2 |

### Parallel Opportunities

```text
After F1:
  Dev A: US1 (T009–T014)
  Dev B: US2 (T015–T019)
  Dev C: US3 (T020–T022)
Then: US4 → US5 → Polish [P] tasks
```

### Parallel Example: after F1

```bash
# Parallel:
Task: "T012 fixture csharp-calls"
Task: "T017 fixture typescript-calls"
Task: "T020 v1 regression fixtures"
```

---

## Implementation Strategy

### MVP First (US1 + F1)

1. Phase 1–2 (F1)
2. Phase 3 US1 (C# calls)
3. **STOP**: validate SC-001 / quickstart §1
4. Further US2 → US3 → US4 → US5 → Polish

### Incremental Delivery

1. F1 → ingest understand v2
2. US1 → value C# calls
3. US2 → parity TS
4. US3 → insurance v1
5. US4 → DI injects
6. US5 → visibility in the existing UI/API

---

## Notes

- New UI / OpenAPI screens — **not** to do (FR-007)
- `creates`/`references` extract — **not** in problems MVP (FR-012)
- All tasks are in the format `- [ ] Txxx ...` with file paths
- Language tasks is Russian
