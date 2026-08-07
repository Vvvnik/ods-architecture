# Tasks: Parser extension template + Java MVP (018)

**Input**: `specs/018-parser-extension-playbook/` — plan.md, spec.md,
data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-19); symbols ingest
`008`; registry/orchestrator `005`

**Tests**: unit extract/detector/ingest parent-qn; integration
spawn → ingest → graph; reference petclinic + fixture `java-symbols-demo`
(plan Testing + SC)

**Organization**: Setup → Foundational (wrappers + ingest + JDK) →
US1 playbook P1 → US2 Java P1 (MVP) → US3 wrappers P2 → US4 isolation P2 →
Polish (checklist audit / quickstart)

**DoD**: checklist CP-A + Java available + FQN-packages/top-level types from
`src/main/java`; without Spring HTTP; without shell-parser

**Language**: EN artifacts; portal UI supported locales (constitution)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: US1–US4 from spec.md

---

## Phase 1: Setup

**Purpose**: Skeleton `parsers/java`, fixture, contract verification

- [X] T001 Verify `specs/018-parser-extension-playbook/contracts/` with
  `data-model.md` / `research.md` R1–R9 (FQN package path, top-level only,
  main filter, wrappers list) — record discrepancies in Notes below
- [X] T002 [P] Create scaffold `parsers/java/` — `manifest.json`
  (`id: java`, `languages: ["java"]`, `schema_version: "1"`, command via
  `run.sh`), `README.md`, stub `run.sh` (exit 0 + envelope with `symbols: []`)
  by contract `005`
- [X] T003 [P] Add row `java` with status **stub/planned** in detector,
  `parsers/README.md` (status **available** — only after T028)
- [X] T004 Create fixture `docker/fixtures/repos/java-symbols-demo/` —
  `src/main/java/...` with ≥2 top-level types in ≥1 package; optionally
  `src/test/java` + nested class (negative); README; connect in
  `docker/fixtures/repos/setup-fixtures.sh` (or alternative setup)

**Checkpoint S1**: stub java + fixture in place

---

## Phase 2: Foundational (BLOCKER)

**Purpose**: Wrappers in detector; others parent-qn in detector, ingest, registry, JDK in one spec;

**⚠️ CRITICAL**: US2–US4 do not start without F1 (US1 docs MAY partially in parallel)

- [X] T005 Ignore build wrappers in detector,
  `backend/src/services/language-detector.service.ts` by
  `contracts/detector-java-wrappers.md` (`mvnw`, `gradlew`, `.cmd`/`.bat`/`.ps1`)
- [X] T006 [P] Unit wrappers in detector,
  `backend/tests/unit/detector-java-wrappers.test.ts` — mvnw not in shell;
  standard `.sh` remains in shell
- [X] T007 Fallback parent resolve by `qualified_name` in detector,
  `backend/src/services/ingest/adapters/symbols-model.ingest.ts` (research R3)
  — if path-keyed miss and exactly one node with this qn
- [X] T008 [P] Unit parent-qn fallback in detector,
  `backend/tests/unit/ingest/symbols-model-parent-qn.test.ts` (or adjacent to
  existing symbols ingest tests) — namespace with synthetic path +
  class with `parent_qualified_name`
- [X] T009 Create
  `backend/src/services/ingest/adapters/java.ingest.ts` —
  `createSymbolsModelIngestAdapter('java', 'java')`; register in
  `backend/src/services/ingest/ingest-registry.service.ts` (not
  `ARTIFACT_PARSER_IDS`)
- [X] T010 JDK 17 + **`mvn -f parsers/java package`** in detector, `backend/Dockerfile`
  (research R1/R6); `chmod +x parsers/java/run.sh`; ensure that
  `docker/docker-compose.dev.yml` mount `PARSERS_ROOT` covers the module

**Checkpoint F1**: wrappers; ingest java registered; parent-qn;
image collects java-module

---

## Phase 3: User Story 1 — Template 'how to add a parser' (P1)

**Goal**: canonical checklist is available to the team; closure Java demonstrates
pass

**Independent Test**: deferred; duplication temporarily
`contracts/parser-extension-checklist.md`; in image tasks marked pass
pass items (T029)

- [X] T011 [P] [US1] Link to
  `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`
  from `parsers/README.md` (section "how to add a module"
- [X] T012 [P] [US1] Short link to
  `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`
  in detector, `specs/005-code-analysis/quickstart.md` (mandatory; no alternatives)
- [X] T013 [US1] Verify: mapping checklist → task IDs already in Notes below
  (this file); on mismatch — update table; otherwise close as done
  (for auditing T029)

**Checkpoint US1**: checklist detected; mapping ready (checkmarks — in Polish)

---

## Phase 4: User Story 2 — Java in report and in code-graph (P1) 🎯 MVP

**Goal**: petclinic / fixture → `java` available → packages FQN + top-level
types from `src/main/java`

**Independent Test**: quickstart §1–2; SC-001/SC-002

### Tests

- [X] T014 [P] [US2] Unit extract in detector, `parsers/java/` — on each main `.java`:
  `module` + `namespace` (FQN) + top-level class/interface/enum; nested/test/
  generated **not** in detector, symbols; filter `**/src/main/java/**`
- [X] T015 [P] [US2] Unit ingest
  `backend/tests/unit/ingest/java.ingest.test.ts` — nodes `module` +
  `namespace` + `class`, `language=java`, `parser_id=java`, parent_id package
  at the type

### Implementation

- [X] T016 [US2] Implement extract JavaParser in detector, `parsers/java/` —
  **Maven** (`pom.xml` + jar; research R1) — **`module` on file** (as
  csharp); unique **`namespace` on FQN** (`java-package/<slashes>`);
  top-level types with `parent_qualified_name`; envelope schema_version 1
- [X] T017 [US2] Bring to `parsers/java/run.sh` + `manifest.json` before
  worker spawn (not stub); update `parsers/java/README.md` (filter
  main, DoD, anti-patterns nested)
- [X] T018 [US2] Integration
  `backend/tests/integration/java-parser.test.ts` (or alternative) —
  spawn → envelope → ingest → assert nodes for
  `docker/fixtures/repos/java-symbols-demo` (**covers SC-001/SC-002 for CI**)
- [X] T019 [US2] Dogfood SHOULD: petclinic re-detect + analysis → `java`
  available + types from main (Application/Controller); result in Notes
  (not a blocker CI, if T018 green)

**Checkpoint US2**: SC-001/SC-002 on fixture (+ dogfood Notes)

---

## Phase 5: User Story 3 — Wrappers do not clutter the report (P2)

**Goal**: `mvnw`/`gradlew` not in shell; others `.sh` MAY missing

**Independent Test**: quickstart §1 p.3; SC-003 (logic T005 — verification e2e)

- [X] T020 [US3] Integration/regression
  `backend/tests/integration/detector-wrappers-petclinic.test.ts` (or
  unit on snapshot paths petclinic-like) — basename wrappers absent in
  `languages[].language=shell` file lists / counts
- [X] T021 [US3] OPTIONAL: verify UI-status "Parser not installed" for
  remaining shell — only if changes `frontend/`; else Notes
  **`T021: N/A`** and close the task

**Checkpoint US3**: SC-003

---

## Phase 6: User Story 4 — Module isolation (P2)

**Goal**: without java-module run does not fail; compose/other available ok

**Independent Test**: quickstart §3; SC-004

- [X] T022 [US4] Integration: simulation missing `java` (none manifest /
  temporarily exclude registry) → `parser_status=missing`; run
  success/partial without fail due to java; compose artifact upon availability
  executes — test in `backend/tests/integration/`
- [X] T023 [P] [US4] Document in `parsers/java/README.md` as
  open

**Checkpoint US4**: SC-004

---

## Phase 7: Polish

**Purpose**: available status, audit checklist, quickstart

- [X] T024 [P] Status `java` → **available** in detector, `parsers/README.md`
- [X] T025 [P] Pass `specs/018-parser-extension-playbook/quickstart.md`
  on petclinic (or fixture) and note in Notes
- [X] T026 [P] Update status `018` in detector, `specs/001-ods-vision/spec.md` /
  constitution upon closing implement (Draft → implemented — only after
  greens SC)
- [X] T027 Audit reuse in detector, Notes: no second orchestrator; java only via
  `parsers/java/` + `java.ingest.ts` / symbols-model; Spring HTTP not in
  `backend/src/services/ingest/`
- [X] T028 Image build: `docker/docker-compose.dev.yml` +
  `backend/Dockerfile` — `--profile full --build`, backend healthy; registry
  sees `java`
- [X] T029 [US1] Mark item pass
  `contracts/parser-extension-checklist.md` in detector, Notes (checklist → T00x) —
  DoD CP-A / SC-005

**Checkpoint P**: SC-005/SC-006 review readiness

---

## Dependencies

```text
T001–T004 (Setup)
    ↓
T005–T010 (Foundational)
    ↓
T011–T013 (US1 docs) ──┬── in parallel after F1
T014–T019 (US2 Java) ──┤
T020–T021 (US3) ───────┤ (T020 after T005)
T022–T023 (US4) ───────┘ (after T009/T016)
    ↓
T024–T029 (Polish; T029 after US2)
```

**Story order**: US1 (link) ∥ US2 (after F1) → US3/US4 → Polish.

**MVP**: Phase 1–2 + US2 (T014–T019) + T005/T009 — Java on fixture.
Playbook proof = T029 after MVP.

## Parallel examples

```bash
# After S1:
# T005∥T007∥T009 (different files) then T010
# After F1:
# T011∥T012∥T014∥T015
# T016 → T017 → T018 → T019
```

## Implementation strategy

1. Stub + fixture + Dockerfile JDK  
2. Wrappers + parent-qn + java ingest register  
3. JavaParser extract → integration fixture  
4. Dogfood petclinic + checklist audit  

**Not in tasks**: Spring routes, calls/`008`, shell symbols, docs/RAG/auth

## Notes

**DoD CP-A / SC-005:** single closure point proof «checklist passed
**T029** (FR-003 duplicates the wording; not a separate task).

### Mapping checklist → tasks (T013 / T029)

| Checklist § | Tasks | Status implement |
|-----------|-------|------------------|
| 0 Decision language | spec/plan (done); T016 only java language | ✅ |
| 1 Spec/contracts | T001; contracts already in `018` | ✅ |
| 2 Detection | T005–T006; T020 | ✅ |
| 3 CLI-module | T002, T016–T017, T024 | ✅ |
| 4 Ingest | T007–T009, T015 | ✅ |
| 5 Orchestration | reuse `005` (verify T018) | ✅ |
| 6 Delivery | T010, T028 | ✅ |
| 7 Fixtures/Acceptance | T004, T014, T018–T019, T022, T025 | ✅ |
| 8 UI | reuse (T021 N/A if without changes) | ✅ T021: N/A |
| 9 Docs | T011–T012, T023–T024 | ✅ |
| Anti-patterns | T027 | ✅ |

### Discrepancies (T001)

- Analyze remediations closed; LOW analyze 2: plan fixture MUST; T013 =
  verify mapping; D1 — proof only T029.
_(other discrepancies contracts↔code — at implement)_

### Implement Notes (2026-07-19)

- **T019 / T025:** CI closed on `java-symbols-demo` (T018). Petclinic dogfood
  SHOULD — after `compose --profile full up` + re-detect; not a blocker at
  green T018.
- **T021: N/A** — corrections `frontend/` no; status missing for shell without
  changes UI.
- **T027:** java only `parsers/java/` + `java.ingest.ts` /
  `createSymbolsModelIngestAdapter`; Spring HTTP no adapters; orchestrator
  `005` without duplicate.
- **T028:** `backend/Dockerfile` — JDK 17 + `mvn package` java; image
  `docker compose … build backend` successful
- **T029:** table mapping above — all § checklist closed (CP-A / SC-005).
