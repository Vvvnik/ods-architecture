# Tasks: Parser pipeline performance

**Input**: Design documents from `/specs/026-parser-pipeline-perf/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/,
quickstart.md

**Tests**: Included (plan Vitest + SC verification). No timing UX / no
depth modes / no extract DoD expansion.

**Language**: English (constitution).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US4)
- Exact file paths in every task description

## Path Conventions (ODS)

- **Backend**: `backend/src/`, tests `backend/tests/`
- **Parsers**: `parsers/<parser_id>/`
- **Compose**: `docker/`
- **Docs**: `ods-help/user-guide/`, `docker/.env.example`
- **Contracts**: `specs/026-parser-pipeline-perf/contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Config + chunk/worker stubs aligned to contracts; no behavior
change yet beyond scaffolding.

- [ ] T001 Extend `backend/src/config.ts` schema: default
  `ANALYSIS_MAX_PARALLEL_PARSERS` **4**; add
  `ANALYSIS_REQUIRE_PREBUILT` boolean (default `false` in code; Compose
  sets `true`); keep `ANALYSIS_PARSER_FILE_CHUNK_SIZE` default **500**
  per `specs/026-parser-pipeline-perf/contracts/scale-knobs.md`
- [ ] T002 [P] Add unit test skeleton
  `backend/tests/unit/config-analysis-scale-knobs.test.ts` asserting
  defaults (parallel 4, chunk 500, require-prebuilt false without env)
- [ ] T003 [P] Create `backend/src/services/parser-worker-session.ts`
  stub exporting session types + no-op method signatures matching
  `specs/026-parser-pipeline-perf/contracts/parser-worker-protocol.md`
  (ready / chunk / shutdown); real behavior lands in T007
- [ ] T004 [P] Add unit test skeleton
  `backend/tests/unit/analysis-file-chunks-merge.test.ts` for tiny-last-chunk
  merge rule (R2: remainder &lt; 10% of chunk size)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Chunk merge + config live; worker session library usable;
orchestrator still oneshot until US3.

**⚠️ CRITICAL**: Complete before US2–US3 wiring that depends on knobs/session.

- [ ] T005 Implement tiny-last-chunk merge in
  `backend/src/services/analysis-file-chunks.ts` (fold trailing remainder
  when size &lt; 10% of `ANALYSIS_PARSER_FILE_CHUNK_SIZE`); keep export used
  by orchestrator
- [ ] T006 Complete unit tests in
  `backend/tests/unit/analysis-file-chunks-merge.test.ts` (no merge when
  remainder large; merge when tiny; empty/single chunk unchanged)
- [ ] T007 Implement NDJSON worker session client in
  `backend/src/services/parser-worker-session.ts` (spawn with stdin pipe,
  wait `ready`, send `chunk`, await `chunk_result`, send `shutdown`,
  timeout via `ANALYSIS_PARSER_TIMEOUT_MS`, kill on cancel) per
  `contracts/parser-worker-protocol.md`
- [ ] T008 [P] Add unit tests
  `backend/tests/unit/parser-worker-session.test.ts` with a fake child
  process (mock spawn) covering ready→chunk ok→shutdown and timeout kill
- [ ] T009 Document optional `supports_ods_worker` on parser manifests in
  `backend/src/services/parser-registry.service.ts` (read flag from
  `manifest.json` if present; default false)
- [ ] T010 Add shared shell gate `parsers/_common/require-prebuilt.sh`
  (checks `ANALYSIS_REQUIRE_PREBUILT`; if true and artifact path missing,
  print clear error and exit non-zero; if false, allow caller fallback)
  per `contracts/prebuilt-hot-path.md` — **no** TypeScript helper for
  `run.sh` (shell cannot call it)

**Checkpoint**: Foundation ready — US2/US4 can proceed; US3 uses session;
US1 DoD dogfood after levers land.

---

## Phase 3: User Story 2 — Hot path uses prebuilt parser runtimes (Priority: P1)

**Goal**: Docker/pilot hot path uses DLL/JAR/node packs; no silent
`dotnet run` / `mvn package` when prebuilt required.

**Independent Test**: With `ANALYSIS_REQUIRE_PREBUILT=true`, missing DLL/JAR
fails the job loudly; present artifacts run without mid-analysis build
(SC-003).

### Tests for User Story 2

- [ ] T011 [P] [US2] Vitest `backend/tests/unit/require-prebuilt-sh.test.ts`:
  invoke `parsers/_common/require-prebuilt.sh` with a temp missing path and
  `ANALYSIS_REQUIRE_PREBUILT=true` → non-zero; with present file → zero;
  with require=false and missing → zero (fallback allowed)
- [ ] T012 [P] [US2] Vitest `backend/tests/unit/parser-run-sh-sources-prebuilt.test.ts`:
  assert `parsers/csharp/run.sh` and `parsers/java/run.sh` source
  `parsers/_common/require-prebuilt.sh` (string/presence check)

### Implementation for User Story 2

- [ ] T013 [US2] Update `parsers/csharp/run.sh` to `source`
  `parsers/_common/require-prebuilt.sh` for the Release DLL path; skip
  `dotnet run` when require-prebuilt and missing
- [ ] T014 [P] [US2] Update `parsers/dotnet-api-routes/run.sh`,
  `parsers/dotnet-http-calls/run.sh`, `parsers/dotnet-grpc-calls/run.sh`,
  and `parsers/dotnet-project/run.sh` to use the same shared shell gate
- [ ] T015 [US2] Update `parsers/java/run.sh` to use the shared shell gate
  for the JAR path; skip `mvn package` when require-prebuilt and missing
- [ ] T016 [US2] Set `ANALYSIS_REQUIRE_PREBUILT=true` in
  `docker/docker-compose.dev.yml` (profile `full` / backend service env)
  and add the env var line to `docker/.env.example` (prebuilt only; full
  knobs prose → T020)
- [ ] T017 [US2] Verify Docker image build still prebuilds csharp/java
  artifacts in `backend/Dockerfile` (or compose build); fix only if smoke
  would hit fallback
- [ ] T017a [P] [US2] Confirm TypeScript hot path: `parsers/typescript/`
  entry (`run.mjs`) runs under Docker without mid-analysis `npm install`
  / compile; document in quickstart SC-003 if image already bakes deps

**Checkpoint**: US2 done — pilot with require-prebuilt cannot silently
source-build.

---

## Phase 4: User Story 4 — Explicit parallel and chunk knobs (Priority: P2)

**Goal**: Operators see defaults (parallel **4**, chunk **500**) and when
to raise them; override works.

**Independent Test**: Fresh install defaults to parallel 4; docs list knobs
without reading source (SC-005); raising parallel increases concurrency
(SC-006 safety caps remain).

### Tests for User Story 4

- [ ] T018 [P] [US4] Extend
  `backend/tests/unit/config-analysis-scale-knobs.test.ts` for env override
  of parallel/chunk/require-prebuilt

### Implementation for User Story 4

- [ ] T019 [US4] Ensure orchestrator reads updated defaults from
  `backend/src/config.ts` in
  `backend/src/services/analysis-orchestrator.service.ts` (no hardcoded `2`)
- [ ] T020 [P] [US4] Document parallel/chunk defaults + “when to raise
  parallel” in `docker/.env.example` and `ods-help/user-guide/commands.md`
  (or scale subsection) per `contracts/scale-knobs.md`; cross-ref
  require-prebuilt (do not re-specify T016 compose wiring)
- [ ] T021 [US4] **Out of DoD**: do **not** implement per-parser
  `manifest.chunk_size` / env map in this feature — global chunk **500** +
  tiny-remainder merge (T005) satisfy FR-006 DoD; leave a one-line note in
  `specs/026-parser-pipeline-perf/research.md` R2 that per-parser override
  is a future MAY

**Checkpoint**: US4 done — knobs explicit.

---

## Phase 5: User Story 3 — Chunked parsers reuse a warm worker (Priority: P2)

**Goal**: Multi-chunk jobs for `typescript` / `csharp` / `java` use one OS
process per `parser_id` per run (SC-004).

**Independent Test**: ≥2 chunks → single worker session; timeouts still
apply; process exits after shutdown; oneshot fallback if no worker support.

### Tests for User Story 3

- [ ] T022 [P] [US3] Integration test
  `backend/tests/integration/parser-worker-session.orchestrator.test.ts`
  with a tiny fake `--ods-worker` script proving one spawn for two chunks
- [ ] T023 [P] [US3] Parser-level smoke/unit for typescript worker path
  under `parsers/typescript/` (or backend helper test) covering ready/chunk
  envelope parity with oneshot for a small file list

### Implementation for User Story 3

- [ ] T024 [US3] Integrate worker session into
  `backend/src/services/analysis-orchestrator.service.ts`: when
  `supports_ods_worker`, reuse one session across chunks; else keep
  process-per-chunk oneshot; always shut down / kill on run end
- [ ] T025 [US3] Implement `--ods-worker` in `parsers/typescript/`
  (`run.mjs` or worker entry) per
  `contracts/parser-worker-protocol.md`; set
  `supports_ods_worker: true` in `parsers/typescript/manifest.json`
- [ ] T026 [P] [US3] Implement `--ods-worker` for `parsers/csharp/`
  (and `run.sh` forwarding); set `supports_ods_worker: true` in
  `parsers/csharp/manifest.json`
- [ ] T027 [P] [US3] Implement `--ods-worker` for `parsers/java/`; set
  `supports_ods_worker: true` in `parsers/java/manifest.json`
- [ ] T028 [US3] Ensure envelope merge across worker chunks matches oneshot
  semantics in orchestrator ingest path (no Canon drift; no false `calls`)
- [ ] T029 [US3] Confirm progress N/M still updates per chunk without adding
  duration/timing fields (`backend/src/services/analysis-orchestrator.service.ts`)

**Checkpoint**: US3 done — language parsers reuse workers.

---

## Phase 6: User Story 1 — Faster full analysis without quality loss (Priority: P1) — DoD dogfood

**Goal**: Operator-measured ≥30% faster full analysis on ODS `large-repo`;
zero new false `calls`; skip waste confirmed (SC-001, SC-002, FR-009).
This phase **closes DoD**; it is **not** the “MVP levers” slice (see
Implementation strategy).

**Independent Test**: Follow `specs/026-parser-pipeline-perf/quickstart.md`
SC-001/SC-002 (stopwatch; no timing tables in repo).

### Tests for User Story 1

- [ ] T030 [P] [US1] Add/extend skip-waste regression test
  `backend/tests/unit/analysis-orchestrator-skip-empty.test.ts` (or existing)
  asserting `file_count===0` / empty file lists → `skipped` without spawn
- [ ] T031 [US1] Smoke/regression on existing semantic-`calls` fixture path
  (e.g. `docker/fixtures/repos/code-graph-depth-demo` or project standard)
  asserting no quality regression attributable to worker/chunk path
  (`backend/tests/integration/` or documented manual checklist in quickstart
  only — **no** committed wall-clock numbers)

### Implementation for User Story 1

- [ ] T032 [US1] Audit detector + orchestrator skip paths in
  `backend/src/services/artifact-detector.ts` and
  `backend/src/services/analysis-orchestrator.service.ts`; fix only concrete
  “available but zero work” leaks (P2 light)
- [ ] T033 [US1] Operator dogfood: baseline then after on
  `docker/fixtures/repos/large-repo` per quickstart SC-001 (≥30%); record
  privately — **MUST NOT** commit timings, project UUIDs, or localhost URLs
- [ ] T034 [US1] Optional confidence pass on operator large local project
  (not sole DoD; nothing about it in tracked artifacts)

**Checkpoint**: US1 DoD evidence (operator) + skip/quality checks green.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Docs alignment, safety, close feature hygiene.

- [ ] T035 [P] Align `specs/026-parser-pipeline-perf/quickstart.md` with
  final env names and worker flags (still no timing tables)
- [ ] T036 [P] Grep-guard: no new analysis timing fields in
  `backend/src/domain/analysis-run.ts` / API schemas, and no
  symbols-fast / calls-deep depth-mode flags introduced by this feature
- [ ] T037 Confirm `010` timeout + max-parallel caps still enforced under
  worker mode (manual or unit assert in
  `backend/tests/unit/parser-worker-session.test.ts`)
- [ ] T038 [P] Update entry draft status note only if needed in
  `ods-help/requirements/parser-pipeline-perf-draft.md` (point at closed
  tasks when implementing later — optional)
- [ ] T039 Run Vitest suites touched by this feature under `backend/`; fix
  regressions
- [ ] T040 Mark `specs/026-parser-pipeline-perf/spec.md` status toward
  Implemented/Closed only after SC-001–006 accepted; update `001` on close
  (separate from code tasks if process requires)

---

## Dependencies & Execution Order

### Phase dependencies

- Phase 1 → Phase 2 → (US2 ∥ US4) → US3 → US1 dogfood → Polish
- US2 and US4 after Foundational (parallelizable)
- US3 needs Foundational worker session (T007) + benefits from US2 prebuilt
- US1 dogfood needs US2 + US3 + US4 for realistic ≥30% (parallel alone may
  not suffice)

### User story dependency graph

```text
Foundational (config, chunk merge, worker client)
    ├── US2 Prebuilt ──────────────┐
    ├── US4 Knobs/docs ────────────┼──► US3 Workers ──► US1 Dogfood (≥30%)
    └──────────────────────────────┘
```

### Parallel opportunities

- T002–T004 (setup)
- T011∥T012; T014∥T017a (US2)
- T018∥T020 (US4)
- T022∥T023; T026∥T027 (US3)
- T030∥T035∥T036 (tests/polish)

### Independent test criteria

| Story | Test |
| ----- | ---- |
| US2 | require-prebuilt → fail loud; DLL/JAR used when present |
| US4 | default parallel 4; docs list knobs |
| US3 | one process for ≥2 chunks on ts/csharp/java |
| US1 | stopwatch ≥30% on `large-repo`; no false `calls`; skips ok |

---

## Implementation strategy

### Delivery slices

1. **MVP levers** (shippable increment, not full SC-001): Foundational +
   **US2** + **US4** (prebuilt + default 4 + docs + chunk merge)
2. **US3** workers on typescript/csharp/java (main spawn win)
3. **US1 DoD dogfood** — operator SC-001/002 (needs steps 1–2 for ≥30%)
4. Polish

### Suggested MVP scope

Foundational + US2 + US4. Do **not** mark feature Closed / SC-001 until
US3 + US1 dogfood complete.

### Format validation

All tasks use `- [ ]`, sequential `T00N` / `T017a`, optional `[P]`, story
`[USn]` on story phases, and concrete file paths.
