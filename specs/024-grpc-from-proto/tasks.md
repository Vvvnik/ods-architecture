# Tasks: gRPC from protobuf (+ .NET HTTP clients)

**Input**: Design documents from `/specs/024-grpc-from-proto/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project init for new parser modules + DoD fixture.

- [X] T001 [P] Create parser module skeletons + manifests for `grpc-proto`, `ts-grpc-calls`, `java-grpc-calls`, `dotnet-grpc-calls`, `dotnet-http-calls` under `parsers/`
- [X] T002 [P] Create ODS-owned DoD fixture `docker/fixtures/repos/grpc-multistack-demo/` with `.proto` (service+rpc) and client call-sites for TS/Java/.NET plus .NET HTTP client call-sites
- [X] T003 [P] Add minimal CLI entrypoints for each new parser (`parsers/<parser_id>/run.*`) that read `--files` and write envelope JSON to `--output`
- [X] T004 [P] Add initial `extract.*` implementation files for each new parser that output native model JSON matching `specs/024-grpc-from-proto/contracts/*.schema.json`
- [X] T005 [P] Add unit test skeleton files for each new parser extract (`parsers/<parser_id>/extract.test.*`) with at least one “happy path” fixture input

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend/infra wiring so new nodes/edges can be represented and incremental analysis works.

- [X] T006 Implement new system node kind `grpc_method` in `backend/src/domain/graph-node.ts`
- [X] T007 Update system node schema enum for `grpc_method` in `specs/009-system-landscape/contracts/canonical-node-system.schema.json` and `ods-help/requirements/json-model/canonical-node-system.schema.json`
- [X] T008 Update detector rules in `backend/src/config/detector-rules.json` to register `grpc-proto`, `ts-grpc-calls`, `java-grpc-calls`, `dotnet-grpc-calls`, and `dotnet-http-calls`
- [X] T009 Update ingest incremental path mapping allow-list in `backend/src/services/ingest/ingest.service.ts` by extending `ARTIFACT_PARSER_IDS` with the five new parser ids
- [X] T010 Ensure analysis spawn order prefers `grpc-proto` before `*-grpc-calls` in `backend/src/services/analysis-orchestrator.service.ts` (similar to OpenAPI after routes ordering)

---

## Phase 3: User Story 1 — gRPC RPC surface from protobuf (Priority: P1) 🎯 MVP

**Goal**: Convert `.proto` into `grpc_method` system nodes and RPC surface relations on the system Graph slice.

**Independent Test**: DoD fixture has at least one `grpc_method` node and `documents` edge after `grpc-proto` parser+ingest.

### Tests for User Story 1

- [X] T011 [US1] Add contract-level ingest test using fixture `.proto` in `backend/tests/unit/ingest/` for `grpc-proto` adapter output

### Implementation for User Story 1

- [X] T012 [US1] Implement `.proto` parsing in `parsers/grpc-proto/extract.mjs` to emit `services[]` and `methods[]` for the native model
- [X] T013 [US1] Implement CLI wrapper in `parsers/grpc-proto/run.*` to produce envelope JSON matching `native-grpc-proto.schema.json`
- [X] T014 [US1] Implement ingest adapter `backend/src/services/ingest/adapters/grpc-proto.ingest.ts` to upsert system nodes `kind=grpc_method` (`metadata.protocol=grpc`), `documents` (contract→method), and `exposes` (service→method when service hint resolves)
- [X] T015 [US1] Add parser unit tests in `parsers/grpc-proto/extract.test.*` for parsing package/service/rpc names + streaming flags (listing only is enough)
- [X] T016 [US1] Add ingest unit test in `backend/tests/unit/ingest/grpc-proto.ingest.test.ts` asserting nodes+edges shapes (including skip behavior on invalid/empty proto)
- [X] T017 [US1] Add integration test `backend/tests/integration/grpc-proto-parser.test.ts` using `runParserCli` to assert system-layer output on `grpc-multistack-demo` fixture

---

## Phase 4: User Story 2 — Client→RPC binds for TS, Java, and .NET (Priority: P1) 🎯 MVP

**Goal**: Extract static client call-sites and connect them to `grpc_method` nodes via `http_calls` edges tagged as gRPC.

**Independent Test**: On the DoD fixture, system Canon contains `http_calls` edges with `metadata.protocol=grpc` to `grpc_method` for TS, Java, and .NET.

### Implementation for User Story 2

- [X] T018 [P] [US2] Implement TS gRPC call-site extraction in `parsers/ts-grpc-calls/extract.mjs`
- [X] T019 [P] [US2] Implement TS gRPC CLI wrapper in `parsers/ts-grpc-calls/run.*`
- [X] T020 [P] [US2] Add TS extract unit tests in `parsers/ts-grpc-calls/extract.test.*`
- [X] T021 [P] [US2] Implement Java gRPC call-site extraction in `parsers/java-grpc-calls/extract.mjs`
- [X] T022 [P] [US2] Implement Java gRPC CLI wrapper in `parsers/java-grpc-calls/run.*`
- [X] T023 [P] [US2] Add Java extract unit tests in `parsers/java-grpc-calls/extract.test.*`
- [X] T024 [P] [US2] Implement .NET gRPC call-site extraction in `parsers/dotnet-grpc-calls/Ods.DotnetGrpcCallsParser/GrpcCallsExtractor.cs` (native model `calls[]`)
- [X] T025 [P] [US2] Implement .NET gRPC CLI wrapper in `parsers/dotnet-grpc-calls/run.sh` and `parsers/dotnet-grpc-calls/Ods.DotnetGrpcCallsParser/Program.cs`
- [X] T026 [P] [US2] Add .NET gRPC extract unit tests in `parsers/dotnet-grpc-calls/extract.test.*`
- [X] T027 [US2] Implement/extend ingest adapter for gRPC client binds in `backend/src/services/ingest/adapters/grpc-calls.ingest.ts` (or three adapters) to emit `http_calls` edges with `metadata.protocol=grpc` targeting `grpc_method` and skip unresolved/ambiguous targets without failing the run
- [X] T028 [US2] Add unit tests for `grpc-calls` ingest in `backend/tests/unit/ingest/` covering valid bind creates edge, missing method surface skips, and ambiguous method surface skips
- [X] T029 [US2] Add integration test `backend/tests/integration/grpc-client-binds.test.ts` asserting that DoD fixture yields ≥1 gRPC `http_calls` edge per TS/Java/.NET

---

## Phase 5: User Story 3 — .NET HTTP clients parity (Priority: P1)

**Goal**: Extract outgoing HTTP calls from .NET into existing `http_calls` canon (no new HTTP kinds).

**Independent Test**: On the DoD fixture, at least one `http_calls` edge from `dotnet-http-calls` exists and HTTP route landmarks are not regressed.

### Implementation for User Story 3

- [X] T030 [US3] Implement .NET HTTP clients parser in `parsers/dotnet-http-calls/Ods.DotnetHttpCallsParser/HttpCallsExtractor.cs` with CLI wiring in `parsers/dotnet-http-calls/run.sh` and `parsers/dotnet-http-calls/Ods.DotnetHttpCallsParser/Program.cs` to emit native `calls[]`
- [X] T031 [US3] Implement ingest adapter `backend/src/services/ingest/adapters/dotnet-http-calls.ingest.ts` to resolve to `http_endpoint`/`external_api`, emit HTTP `http_calls` edges (no `metadata.protocol=grpc`), and skip unresolved targets
- [X] T032 [US3] Add unit tests for extract + ingest in `parsers/dotnet-http-calls/extract.test.*` and `backend/tests/unit/ingest/dotnet-http-calls.ingest.test.ts`
- [X] T033 [US3] Add integration test `backend/tests/integration/dotnet-http-calls-grpc-fixture.test.ts` asserting `http_calls` edges exist for `.NET` HTTP client call-sites on `grpc-multistack-demo`

---

## Phase 6: User Story 4 — Analysis availability without breaking empty repos (Priority: P2)

**Goal**: No false gRPC landscape when `.proto` is absent, and no regression for existing HTTP/systems modules.

**Independent Test**: Running analysis on a repo without `.proto` yields zero `grpc_method` nodes from this feature; existing system landscape tests still pass.

### Implementation for User Story 4

- [X] T034 [US4] Add detector unit coverage for new artifact types in `backend/tests/unit/detector-*.test.ts` (or extend `backend/tests/unit/language-detector-artifacts.test.ts`) ensuring `.proto` absence prevents `grpc-proto` availability
- [X] T035 [US4] Add negative integration test `backend/tests/integration/grpc-from-proto-negative.test.ts` to run gRPC modules on `docker/fixtures/repos/system-landscape-demo/` (or other fixture without `.proto`) and assert no `grpc_method` nodes and no gRPC `http_calls` edges are created
- [X] T036 [US4] Extend `backend/tests/integration/system-landscape-e2e.test.ts` (or add a dedicated test) to run the new gRPC modules on `system-landscape-demo` and assert golden HTTP/system links remain unchanged and no gRPC nodes/edges appear
- [X] T037 [US4] Add explicit regression test `backend/tests/unit/ingest/grpc-rpc-handles-separation.test.ts` asserting gRPC adapters never emit `rpc_handles` and bus adapters never satisfy gRPC FR checks

---

## Phase N: Polish & Cross-Cutting Concerns

- [X] T038 Add graph compatibility tasks for `grpc_method`: update `backend/src/services/graph-view.types.ts` (`SYSTEM_INSIDE_KINDS`) and `frontend/src/utils/graphNodeLabel.ts`/`frontend/src/components/graph-view/GraphInspector.tsx` to ensure node label/relationships render in system Graph
- [X] T039 Add README stubs for each new parser in `parsers/<parser_id>/README.md` describing inputs/outputs and failure/skip behavior
- [X] T040 Update validation in `specs/024-grpc-from-proto/quickstart.md` to include measurable SC-001 timing step (capture elapsed time to find `grpc_method` + relation, target <2 minutes)
- [X] T041 Run verification suite after implementation: `cd backend && npm test` plus parser module test commands (`node ...`, `dotnet test` where applicable)
- [X] T042 Add protocol-family filter controls to `frontend/src/pages/GraphViewPage.tsx` for system slice (`all`/`http`/`grpc`/`rpc_bus`) with tests and i18n labels
