# Tasks: Java language schema v2 (calls)

**Input**: `specs/023-java-calls/` — plan.md, spec.md, research.md, data-model.md,
contracts/, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-27); Java MVP `018`;
symbols ingest v2 path `008`; adapter `java` already `['1','2']`

**Tests**: Included — plan Testing + SC-001…006 / quickstart require JUnit extract
coverage (F1–F7) and Vitest ingest v1 regress + v2 `calls`

**Organization**: Setup → Foundational (solver + methods + v2 emit + fixture) →
US1 calls MVP P1 → FR-014 interface receivers P1 → US2 ambiguous skip P1 →
US3 production-only P1 → US4 v1 compat P1 → US6 anti-dogfood P1 →
US5 graph UX P2 → Polish

**DoD**: multi-module ODS fixture `java-calls-demo`; instance+static+cross-module
`calls`; interface→interface method; skip ambiguous; no HTTP/system; no
dogfood heuristics

**Language**: English (constitution)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: US1–US6 from spec.md

---

## Phase 1: Setup

**Purpose**: Roadmap alignment, fixture skeleton, dependency + docs pointers

- [x] T001 Promote deferred Java language schema v2 `calls` to active feature
  `023-java-calls` in `specs/001-ods-vision/spec.md` (roadmap only — no FR dump)
  — done 2026-07-27 (analyze remediation C1)
- [x] T002 [P] Create multi-module ODS-owned fixture skeleton
  `docker/fixtures/repos/java-calls-demo/` per
  `specs/023-java-calls/contracts/java-calls-fixture.md` (synthetic module/
  package names; `module-alpha` + `module-beta` `src/main/java`; test tree
  stub; README; wire in `docker/fixtures/repos/setup-fixtures.sh` if used)
- [x] T003 [P] Add `javaparser-symbol-solver-core` (compatible with existing
  `javaparser-core` 3.26.x) to `parsers/java/pom.xml`; confirm
  `mvn -f parsers/java -q -DskipTests package` still builds
- [x] T004 [P] Update `parsers/java/README.md` and
  `specs/018-parser-extension-playbook/contracts/ingest-java.md` note: normal
  runs emit `schema_version` **2** (methods + `usages` `calls`); link
  `specs/023-java-calls/contracts/ingest-java-v2.md`

**Checkpoint S1**: vision pointed at 023; fixture skeleton; solver on classpath

---

## Phase 2: Foundational (BLOCKER)

**Purpose**: Schema v2 emit, method symbols, project TypeSolver wiring — required
before story-specific call behaviors

**⚠️ CRITICAL**: No user story extract work until this phase completes

- [x] T005 Bump `schema_version` to `"2"` in `parsers/java/manifest.json` and
  `parsers/java/src/main/java/org/ods/parser/java/Main.java` (envelope always v2
  on normal run per research R5)
- [x] T006 Configure project-scoped JavaSymbolSolver in
  `parsers/java/src/main/java/org/ods/parser/java/` (new helper or inside
  `JavaExtractor.java`): discover all `**/src/main/java` roots under analysis
  path; `JavaParserTypeSolver` per root + `ReflectionTypeSolver` for JDK only;
  **no** hard-coded external pilot paths or name-prefix stripping (FR-012)
- [x] T007 Emit `kind: method` symbols for **all** methods on top-level types in
  production sources (any visibility; not constructors; not nested types) in
  `parsers/java/src/main/java/org/ods/parser/java/JavaExtractor.java` with
  stable `qualified_name` / `signature` overload disambiguation (research R3);
  keep existing module/namespace/type behavior from `018`
- [x] T008 [P] JUnit: method symbols present (incl. private) and nested/test
  methods absent in
  `parsers/java/src/test/java/org/ods/parser/java/JavaExtractorTest.java`
  (extend or add focused test class under same package)
- [x] T009 Ensure envelope `model` can carry `usages` array (empty OK) from
  `Main` / extractor serialization path in `parsers/java/` (Gson models /
  maps) without breaking v1-shaped symbols-only consumers

**Checkpoint F1**: v2 envelope + methods + solver ready; usages plumbing empty-safe

---

## Phase 3: User Story 1 — Java calls appear in the code graph (P1) 🎯 MVP

**Goal**: Uniquely resolvable instance/static (incl. cross-file/cross-module)
`calls` land in Canon via existing ingest

**Independent Test**: Fixture F1–F3 → parser usages → ingest → `calls` edges
(quickstart §1–3); SC-001

### Tests

- [x] T010 [P] [US1] JUnit F1–F3 in
  `parsers/java/src/test/java/org/ods/parser/java/` — instance, static,
  cross-module unique calls emit `usages` `{type:calls, from, to}` matching
  method QNs (use `java-calls-demo` or temp multi-module tree)
- [x] T011 [P] [US1] Add ingest fixture
  `backend/tests/fixtures/ingest/java-model-v2.json` (methods + `usages` calls)
  and extend `backend/tests/unit/ingest/java.ingest.test.ts` — v2 → canonical
  `calls` with `metadata.layer: code`

### Implementation

- [x] T012 [US1] Extract instance + static `MethodCallExpr` (and equivalent)
  call sites in `parsers/java/src/main/java/org/ods/parser/java/JavaExtractor.java`
  — resolve via symbol solver to unique in-project method QN; emit `usages`
  only when `from`/`to` both in `symbols[]`; skip constructors/`super`/reflective
  (clarify Q1)
- [x] T013 [US1] Fill `java-calls-demo` production sources for F1–F3 in
  `docker/fixtures/repos/java-calls-demo/` and verify CLI
  `parsers/java/run.sh` on that tree yields `schema_version: "2"` + expected
  `usages` (quickstart §2)
- [x] T014 [US1] Pass criteria for shared Java ingest path: run
  `backend/tests/unit/ingest/java.ingest.test.ts` with
  `backend/tests/fixtures/ingest/java-model-v2.json` — **must be green** on the
  existing `java.ingest.ts` /
  `backend/src/services/ingest/adapters/symbols-model.ingest.ts` without new
  edge types. **Touch adapter code only if that test is red**; then fix only
  shared QN map / usages→`calls` behavior and note what changed under
  `specs/023-java-calls/tasks.md` Notes (or PR description). If green with
  zero adapter edits, mark done with “no code change”.

**Checkpoint US1**: MVP calls visible via ingest unit + fixture CLI

---

## Phase 4: FR-014 — Interface / abstract receivers (P1)

**Goal**: Calls through interface/abstract static receiver resolve to that
type’s method symbol — never a concrete implementation (clarify Q5 / FR-014)

**Independent Test**: Fixture F4 + JUnit — `calls` `to` = interface/abstract
method QN

- [x] T028 [US1] Implement interface/abstract receiver policy (FR-014) in
  `parsers/java/src/main/java/org/ods/parser/java/JavaExtractor.java` — `to` =
  interface/abstract method QN; never concrete impl; add F4 sources + JUnit in
  `parsers/java/src/test/` and `docker/fixtures/repos/java-calls-demo/`

**Checkpoint FR-014**: F4 green before US2+ work is considered complete for merge

---

## Phase 5: User Story 2 — Ambiguous and unresolved calls skipped (P1)

**Goal**: Overload/library/dynamic ambiguity → no usage/edge; run succeeds;
resolvable calls still emit

**Independent Test**: F5 + F7 (+ clear call alongside) — SC-003

### Tests

- [x] T015 [P] [US2] JUnit ambiguous overload + unresolved/library target in
  `parsers/java/src/test/java/org/ods/parser/java/` — zero `calls` usages for
  those sites; suite still green; at least one unique call still present

### Implementation

- [x] T016 [US2] Enforce unique-candidate policy in
  `parsers/java/src/main/java/org/ods/parser/java/JavaExtractor.java` (and
  solver helpers): multi-candidate / missing symbol / QN not in project map →
  skip usage; never pick “best” overload (FR-006)
- [x] T017 [US2] Add F5/F7 sources to
  `docker/fixtures/repos/java-calls-demo/` per
  `specs/023-java-calls/contracts/java-calls-fixture.md`

**Checkpoint US2**: skip policy proven on fixture + unit tests

---

## Phase 6: User Story 3 — Production sources only (P1)

**Goal**: `calls` only from `**/src/main/java/**`; test/generated not DoD

**Independent Test**: F6 — SC-005

### Tests

- [x] T018 [P] [US3] JUnit: call only under `src/test/java` produces no DoD
  `calls` usage in `parsers/java/src/test/java/org/ods/parser/java/`

### Implementation

- [x] T019 [US3] Confirm extract walk for methods/`usages` only visits production
  `**/src/main/java/**` (reuse `018` filters) in
  `parsers/java/src/main/java/org/ods/parser/java/JavaExtractor.java`; do not
  emit call usages from test/generated trees
- [x] T020 [US3] Add F6 test-only call site under
  `docker/fixtures/repos/java-calls-demo/**/src/test/java/`

**Checkpoint US3**: production-only calls verified

---

## Phase 7: User Story 4 — Compatible Java v1 envelopes (P1)

**Goal**: Stored/fixture v1 envelopes still ingest; mix v1/v2 safe

**Independent Test**: `java-model-v1.json` regress — SC-002

### Tests

- [x] T021 [P] [US4] Keep/strengthen v1 regression in
  `backend/tests/unit/ingest/java.ingest.test.ts` using
  `backend/tests/fixtures/ingest/java-model-v1.json` — module/namespace/types
  unchanged; no failure from missing `usages`

### Implementation

- [x] T022 [US4] Verify `supported_schema_versions: ['1','2']` remains on
  `backend/src/services/ingest/adapters/java.ingest.ts`; add a brief assert or
  comment cross-link to
  `specs/023-java-calls/contracts/ingest-java-v2.md` if helpful (no emit-v1
  path required from parser)

**Checkpoint US4**: v1 ingest regress green alongside v2 tests

---

## Phase 8: User Story 6 — Generic rules, not one-pilot tuning (P1)

**Goal**: DoD on synthetic multi-module names; no dogfood heuristics in product
logic

**Independent Test**: SC-006 + FR-012 review; US6 acceptance

### Tests

- [x] T023 [P] [US6] Document/assert in
  `parsers/java/src/test/java/org/ods/parser/java/` (or fixture README) that
  DoD uses synthetic `java-calls-demo` module names only — no external pilot
  path strings in extract/resolution source under `parsers/java/src/main/`

### Implementation

- [x] T024 [US6] Audit `parsers/java/src/main/` (and any 023-touched shared
  helpers) for hard-coded preferential paths, monorepo/service prefix stripping,
  or pilot layout scripts — remove/avoid any introduced for this feature
  (FR-012); do **not** “fix” unrelated historical helpers unless required to
  ship 023
- [x] T025 [US6] Complete fixture naming/docs in
  `docker/fixtures/repos/java-calls-demo/README.md` stating ODS-owned synthetic
  names and pointing at
  `specs/023-java-calls/contracts/java-calls-fixture.md`

**Checkpoint US6**: anti-dogfood audit clean for 023 surface

---

## Phase 9: User Story 5 — Find Java calls via existing graph API (P2)

**Goal**: Java `calls` reachable through existing graph search/read — no new
screen (parity with `008` US5)

**Independent Test**: SC-004 — integration assert after ingest v2: GET
edges/search returns `type=calls` (same idea as `008` T027). No new frontend.
Manual portal / compose click-through is **optional** only (`008` T028).

- [x] T026 [US5] Smoke API: integration assert — after ingest of Java v2 with
  `calls`, `GET` edges/search returns `type=calls` — extend
  `backend/tests/integration/graph-search.test.ts` (or adjacent graph
  integration test used by `008`) — **no** new frontend components
  (**required** for SC-004 / DoD)
- [x] T027 [P] [US5] **Optional — you can do later:** open portal Graph and
  confirm Java `calls` appear like C#/TS (see
  `specs/023-java-calls/quickstart.md` §4). Not needed for merge if T026 is
  green. **Skipped** at implement (SC-004 closed by T026 API assert).

**Checkpoint US5**: SC-004 closed by T026; T027 = optional portal look only

---

## Phase 10: Polish & Cross-Cutting

**Purpose**: Docs sync and quickstart closure (F4 already in Phase 4 / T028)

- [x] T029 [P] Sync `parsers/java/README.md` +
  `specs/023-java-calls/quickstart.md` with actual commands and F1–F7 status
- [x] T030 Run full validation from `specs/023-java-calls/quickstart.md` §§1–3
  (`mvn test`, CLI envelope check, vitest java ingest); fix gaps
- [x] T031 Mark feature readiness: update `specs/023-java-calls/spec.md` Status
  when DoD met (Draft → Implemented) only after SC checklist pass; leave
  constitution structure row for `/speckit-constitution` if desired later

---

## Dependencies & Story Order

```text
Phase 1 Setup (T001–T004)   T001 ✅
    ↓
Phase 2 Foundational (T005–T009)  ← BLOCKER
    ↓
US1 (T010–T014) 🎯 MVP
    ↓
FR-014 / F4 (T028)  ← P1 DoD; immediately after US1
    ↓
US2 (T015–T017) ─┬─ after T028 preferred (shares extractor)
US3 (T018–T020) ─┤
US4 (T021–T022) ─┘  (US4 can start after T011)
    ↓
US6 (T023–T025)
    ↓
US5 (T026–T027)  ← P2; SC-004 = API assert T026 (T027 optional manual)
    ↓
Polish (T029–T031)
```

## Parallel Opportunities

- T002, T003, T004 after T001 (or parallel with T001)
- T008 || docs while T006–T007 in progress (tests fail until T007)
- T010 || T011 once T009 done
- T015 || T018 || T021 after T028 (or after US1 if carefully isolated)
- T023 || T025 during T024 audit
- T029 || T030 in Polish

## Implementation Strategy

1. **MVP**: Phases 1–3 (Setup + Foundational + US1) → demonstrable Java `calls`
2. **FR-014**: Phase 4 (T028) before treating P1 DoD as merge-ready
3. **Trust**: US2 + US3 + US4
4. **Hardening**: US6 anti-dogfood + US5 API SC-004 (optional UI note)
5. **Close**: quickstart §§1–3 green; §4 UI smoke optional

## MVP scope

**T001–T014** (through US1 checkpoint): schema v2, methods, unique
instance/static/cross-module calls, ingest v2 fixture tests, `java-calls-demo`
F1–F3. **Merge-ready P1 DoD also requires T028 (F4 / FR-014).**

## Task count summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Setup | T001–T004 (4; T001 done) | — |
| Foundational | T005–T009 (5) | — |
| US1 | T010–T014 (5) | US1 |
| FR-014 | T028 (1) | US1 |
| US2 | T015–T017 (3) | US2 |
| US3 | T018–T020 (3) | US3 |
| US4 | T021–T022 (2) | US4 |
| US6 | T023–T025 (3) | US6 |
| US5 | T026–T027 (2) | US5 |
| Polish | T029–T031 (3) | — |
| **Total** | **31** | |

## Format validation

All tasks use `- [ ]` / `- [x]`, sequential `Tnnn`, optional `[P]`, story labels
only on US phases, and include concrete file paths.
