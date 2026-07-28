# Tasks: Python HTTP and gRPC parsers

**Input**: Design documents from `/specs/025-python-parsers/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/,
quickstart.md

**Tests**: Included for DoD / acceptance (parity with closed extract features).

**Language**: English (constitution).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US4)
- Exact file paths in every task description

## Path Conventions (ODS)

- **Backend**: `backend/src/`, tests `backend/tests/`
- **Parsers**: `parsers/<parser_id>/`
- **Fixtures**: `docker/fixtures/repos/`
- **Contracts**: `specs/025-python-parsers/contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Skeletons for three artifact modules + ODS DoD fixture tree.

- [ ] T001 [P] Create parser module skeletons + `manifest.json` for `python-api-routes`, `python-http-calls`, and `python-grpc-calls` under `parsers/` (do not modify `parsers/python/`)
- [ ] T002 [P] Add CLI entrypoints `parsers/python-api-routes/run.sh`, `parsers/python-http-calls/run.sh`, and `parsers/python-grpc-calls/run.sh` (005 argv: `--project-id`, `--working-copy-root`, `--analysis-run-id`, `--output`, `--files` / `--file-list`) writing envelope JSON
- [ ] T003 [P] Add stub `extract.py` files in each new module that emit empty native `routes[]` / `calls[]` matching `specs/025-python-parsers/contracts/*.schema.json` and shared `specs/024-grpc-from-proto/contracts/native-grpc-calls.schema.json`
- [ ] T004 [P] Create ODS-owned fixture tree `docker/fixtures/repos/python-http-grpc-demo/` per `specs/025-python-parsers/contracts/fixture-python-http-grpc.md` (fastapi_app, flask_app, django_app with resolved `include()`, http_clients for httpx/requests/aiohttp, grpc_client + proto, optional compose)
- [ ] T005 [P] Register fixture in `docker/fixtures/repos/README.md` and `docker/fixtures/repos/setup-fixtures.sh`
- [ ] T006 [P] Add pytest extract unit-test skeletons `parsers/python-api-routes/tests/test_extract.py`, `parsers/python-http-calls/tests/test_extract.py`, and `parsers/python-grpc-calls/tests/test_extract.py` with at least one placeholder happy-path case each (run via `pytest` in-module)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Detector + ingest registry wiring so stories can land adapters without inventing Canon kinds.

**⚠️ CRITICAL**: Complete before US1–US4 implementation that depends on spawn/ingest.

- [ ] T007 Add artifact detector rows for `python-api-routes`, `python-http-calls`, and `python-grpc-calls` in `backend/src/config/detector-rules.json` (`.py`/`.pyw` + content hints per `specs/025-python-parsers/research.md` R6)
- [ ] T008 Extend `ARTIFACT_PARSER_IDS` in `backend/src/services/ingest/ingest.service.ts` with the three new `parser_id`s
- [ ] T009 Register placeholder/no-op or thin ingest adapters for the three ids in `backend/src/services/ingest/ingest-registry.service.ts` (wire real transforms in story phases)
- [ ] T010 Verify analysis orchestrator spawn ordering in `backend/src/services/analysis-orchestrator.service.ts` treats `python-grpc-calls` like other `*-grpc-calls` (after `grpc-proto`) and `python-api-routes` / `python-http-calls` like peer HTTP artifact modules

**Checkpoint**: Foundation ready — user stories can proceed (US2/US3 can parallelize after US1 endpoints exist for in-fixture binds).

---

## Phase 3: User Story 1 — Python HTTP API from code (Priority: P1) 🎯 MVP

**Goal**: FastAPI + Flask + Django routes → `http_endpoint` + `exposes` on system Graph.

**Independent Test**: After analysis of `python-http-grpc-demo`, Canon has ≥1 `http_endpoint` from `python-api-routes` for each of FastAPI, Flask, and Django, including ≥1 Django endpoint via resolved `include()`; named path params extractable when template static.

### Tests for User Story 1

- [ ] T011 [P] [US1] Implement pytest extract tests in `parsers/python-api-routes/tests/test_extract.py` covering FastAPI decorator, Flask route, Django `path`/`re_path`, resolved `include()`, named params, and skip of unresolved include
- [ ] T012 [US1] Add ingest unit test `backend/tests/unit/ingest/python-api-routes.ingest.test.ts` asserting `http_endpoint` + optional `exposes` shapes and skip on incomplete routes

### Implementation for User Story 1

- [ ] T013 [US1] Implement FastAPI route extract in `parsers/python-api-routes/extract.py` (`@app.*` / `@router.*` → `routes[]` with `framework=fastapi`)
- [ ] T014 [US1] Implement Flask route extract in `parsers/python-api-routes/extract.py` (`@app.route` / blueprint → `framework=flask`)
- [ ] T015 [US1] Implement Django route extract in `parsers/python-api-routes/extract.py` (`path` / `re_path` / resolved `include()` → `framework=django`, `path_complete` when prefix resolved)
- [ ] T016 [US1] Finalize CLI envelope emission in `parsers/python-api-routes/run.sh` + `extract.py` matching `specs/025-python-parsers/contracts/native-python-api-routes.schema.json`
- [ ] T017 [US1] Implement ingest adapter `backend/src/services/ingest/adapters/python-api-routes.ingest.ts` calling shared `transformApiRoutes(model, ctx, 'python')` from `api-routes.ingest.ts` per `contracts/ingest-python-api-routes.md`; preserve optional native `framework` on endpoint metadata when present
- [ ] T018 [US1] Add integration test `backend/tests/integration/python-api-routes-parser.test.ts` using `runParserCli` on `python-http-grpc-demo` asserting ≥1 endpoint each FastAPI/Flask/Django and ≥1 include-resolved Django path

---

## Phase 4: User Story 2 — Python HTTP client→endpoint binds (Priority: P1)

**Goal**: httpx + requests + aiohttp → `http_calls` (HTTP protocol).

**Independent Test**: Fixture yields ≥1 `http_calls` edge from `python-http-calls` for **each** of httpx, requests, and aiohttp; unresolved sites skipped.

### Tests for User Story 2

- [ ] T019 [P] [US2] Implement pytest extract tests in `parsers/python-http-calls/tests/test_extract.py` for httpx, requests, aiohttp literal/base+path and skip of dynamic URL-only builders
- [ ] T020 [US2] Add ingest unit test `backend/tests/unit/ingest/python-http-calls.ingest.test.ts` covering resolve to `http_endpoint` / `external_api` and skip unresolved

### Implementation for User Story 2

- [ ] T021 [US2] Implement httpx call-site extract in `parsers/python-http-calls/extract.py` (`client_kind=httpx`)
- [ ] T022 [US2] Implement requests call-site extract in `parsers/python-http-calls/extract.py` (`client_kind=requests`)
- [ ] T023 [US2] Implement aiohttp call-site extract in `parsers/python-http-calls/extract.py` (`client_kind=aiohttp`)
- [ ] T024 [US2] Finalize CLI envelope in `parsers/python-http-calls/run.sh` matching `specs/025-python-parsers/contracts/native-python-http-calls.schema.json`
- [ ] T025 [US2] Implement ingest adapter `backend/src/services/ingest/adapters/python-http-calls.ingest.ts` per `contracts/ingest-python-http-calls.md` (peer of `ts-http-calls` / `java-http-calls`)
- [ ] T026 [US2] Add integration test `backend/tests/integration/python-http-calls-binds.test.ts` asserting ≥1 HTTP `http_calls` per httpx/requests/aiohttp on `python-http-grpc-demo`

---

## Phase 5: User Story 3 — Python gRPC client→RPC binds (Priority: P1)

**Goal**: grpcio unary binds → `http_calls` with `metadata.protocol=grpc` to existing `grpc_method`.

**Independent Test**: Fixture with `.proto` + Python client yields ≥1 gRPC `http_calls` from `python-grpc-calls`; no invent of `grpc_method` from stubs alone; `grpc-proto` / peer modules untouched.

### Tests for User Story 3

- [ ] T027 [P] [US3] Implement pytest extract tests in `parsers/python-grpc-calls/tests/test_extract.py` for resolvable stub/channel unary and skip of unresolved targets
- [ ] T028 [US3] Add ingest unit test `backend/tests/unit/ingest/python-grpc-calls.ingest.test.ts` (or extend `grpc-calls.ingest` tests) for bind / skip / no `rpc_handles`

### Implementation for User Story 3

- [ ] T029 [US3] Implement grpcio call-site extract in `parsers/python-grpc-calls/extract.py` emitting shared `calls[]` (`target_service`, `target_method`, `source_path`)
- [ ] T030 [US3] Finalize CLI envelope in `parsers/python-grpc-calls/run.sh` validating against `specs/024-grpc-from-proto/contracts/native-grpc-calls.schema.json`
- [ ] T031 [US3] Extend `backend/src/services/ingest/adapters/grpc-calls.ingest.ts` (or add thin `python-grpc-calls.ingest.ts`) to accept `python-grpc-calls` per `contracts/ingest-python-grpc-calls.md`
- [ ] T032 [US3] Ensure fixture `docker/fixtures/repos/python-http-grpc-demo/proto/` + `grpc_client/` produce resolvable bind; keep `parsers/grpc-proto/` unmodified
- [ ] T033 [US3] Add integration test `backend/tests/integration/python-grpc-calls-binds.test.ts` asserting ≥1 `http_calls` with `metadata.protocol=grpc` from `python-grpc-calls` on the DoD fixture

---

## Phase 6: User Story 4 — Detector, confirm, and ingest parity (Priority: P2)

**Goal**: Analysis confirm shows the three modules when applicable; no false Python HTTP/gRPC landscape on empty evidence; no regression for closed stacks.

**Independent Test**: Confirm modal / detector report lists new modules on fixture; negative project yields zero invented Python HTTP/gRPC landscape from these modules; TS/Java/.NET smoke still green.

### Implementation for User Story 4

- [ ] T034 [US4] Add/extend detector unit coverage in `backend/tests/unit/language-detector-artifacts.test.ts` (or `backend/tests/unit/detector-*.test.ts`) for the three Python artifact rules (hit on fixture hints; no false positive on non-matching trees)
- [ ] T035 [US4] Add negative integration test `backend/tests/integration/python-parsers-negative.test.ts` on a fixture without Python HTTP/gRPC DoD evidence asserting no invented `python-api-routes` / `python-http-calls` / `python-grpc-calls` landscape
- [ ] T036 [US4] Add regression integration check (extend existing smoke or new `backend/tests/integration/python-parsers-regression.test.ts`) that known TS/Java/.NET HTTP + `grpc-proto` landscape remains on a peer smoke fixture
- [ ] T037 [US4] Add automated test `backend/tests/integration/python-parsers-confirm-status.test.ts` (or extend language-detector/analysis report tests) asserting analysis artifact status rows for `python-api-routes`, `python-http-calls`, and `python-grpc-calls` are **available** on `python-http-grpc-demo` when matching files exist (FR-006 confirm/detector parity — not manual-only)

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T038 [P] Add `parsers/python-api-routes/README.md`, `parsers/python-http-calls/README.md`, and `parsers/python-grpc-calls/README.md` (purpose, native model, skip behavior, pytest command)
- [ ] T039 Add integration test `backend/tests/integration/python-parsers-graph-slice.test.ts` that, after ingest of DoD fixture Canon, asserts system `graph/view` (or `buildViewSlicePure` system slice) returns ≥1 FastAPI/Flask/Django `http_endpoint`, HTTP `http_calls` for each client_kind, and ≥1 gRPC `http_calls` (FR-008 / SC-001–003 data path; pixel UI e2e not required); if a kind allow-list gap blocks visibility, update `backend/src/services/graph-view.types.ts` / frontend label helpers
- [ ] T040 Run verification: `pytest` in each new parser module + `cd backend && npm test` for new ingest/integration suites; record SC-001 timing note per `specs/025-python-parsers/quickstart.md`
- [ ] T041 On feature close: promote `specs/001-ods-vision/spec.md` Stack coverage matrix Python HTTP routes / HTTP clients / gRPC clients to ✅ with `python-api-routes` / `python-http-calls` / `python-grpc-calls`; mark `specs/025-python-parsers/spec.md` Closed; update constitution Next step if needed
- [ ] T042 Update `.cursor/rules/specify-rules.mdc` SPECKIT block to point at closed feature / next draft after close (or leave pointing at `tasks.md` until implement completes)
- [ ] T043 [P] SHOULD: run external pilot smoke on an operator-local Python tree (HTTP routes and/or clients and/or gRPC as present); record pass/skip notes under `specs/025-python-parsers/quickstart.md` §Pilot smoke — **not** sole DoD oracle; no foreign path/name hardcodes in product code or tracked fixtures

---

## Dependencies & Story Order

```text
Phase 1 Setup ──► Phase 2 Foundational ──► US1 (routes) ──┬──► US2 (HTTP clients)
                                                         ├──► US3 (gRPC clients)
                                                         └──► US4 (detector/confirm/negative)
                                                              └──► Phase 7 Polish / close
```

- **US1** is MVP and preferred before US2 in-fixture endpoint targeting.
- **US2** and **US3** may proceed in parallel after T017 (routes ingest) if HTTP clients target `external_api` / absolute URLs and gRPC uses `grpc-proto` only.
- **US4** should follow once modules register and produce envelopes.

## Parallel Execution Examples

**Phase 1:** T001–T006 can run in parallel (different paths).

**Phase 3 extract:** T013–T015 are **sequential** in one `extract.py` (ordered commits). T011 pytest can be written alongside.

**Phase 4 extract:** T021–T023 are **sequential** in one `parsers/python-http-calls/extract.py` (same pattern as US1; not `[P]`). T019 pytest can run in parallel with other stories’ files.

**Phase 5 vs 4:** T029–T031 parallel with US2 after foundational + `grpc-proto` available.

## Implementation Strategy

1. **MVP**: Phase 1–3 (US1) → FastAPI/Flask/Django endpoints visible on system Graph.
2. **Increment**: US2 HTTP clients (all three libraries in fixture).
3. **Increment**: US3 Python gRPC binds (reuse `grpc-proto`).
4. **Hardening**: US4 detector/negative/regression + polish + vision ✅.
5. **SHOULD**: T043 external pilot smoke (optional; never sole oracle).

## Task Summary

| Phase | Tasks | Count |
|-------|-------|-------|
| Setup | T001–T006 | 6 |
| Foundational | T007–T010 | 4 |
| US1 routes | T011–T018 | 8 |
| US2 HTTP clients | T019–T026 | 8 |
| US3 gRPC clients | T027–T033 | 7 |
| US4 detector/confirm | T034–T037 | 4 |
| Polish | T038–T043 | 6 |
| **Total** | T001–T043 | **43** |
