# Tasks: Spring system landscape (019)

**Input**: `specs/019-spring-system-landscape/` — plan.md, spec.md,
data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-19); system
`009`/`013`/`014`; Java symbols `018` (do not touch HTTP in detector, `parsers/java/`)

**Tests**: unit extract/ingest + detector; integration spawn → ingest →
graph-view; reference petclinic; fixture WebClient upon need (plan Testing + SC)

**Organization**: Setup → Foundational (detector/registry) → US1 Maven →
US2 API routes → US3 isolation → US4 config → US5 http_calls → Polish

**DoD**: **A+B+C+D** together (clarify); Feign **and** WebClient; Gateway SHOULD;
Boot-only services; merge Maven↔compose (display=compose); without merge OpenAPI;
without Gradle DoD

**Language**: EN artifacts; portal UI supported locales (constitution)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: US1–US5 from spec.md

---

## Phase 1: Setup

**Purpose**: Skeletons for 4 parsers, fixture WebClient, contract verification

- [X] T001 Verify `specs/019-spring-system-landscape/contracts/` with
  `data-model.md` / `research.md` R1–R12 (Boot→service, merge compose,
  Feign+WebClient, Gateway SHOULD) — record discrepancies in Notes below
- [X] T002 [P] Create scaffold `parsers/maven-project/` — `manifest.json`
  (`id: maven-project`), `README.md`, stub `run.sh`/`run.mjs` (exit 0 +
  `modules: []`) by contract `005`
- [X] T003 [P] Create scaffold `parsers/spring-config/` — `manifest.json`,
  `README.md`, stub entry (exit 0 + `configs: []`) by contract `005`
- [X] T004 [P] Create scaffold `parsers/java-api-routes/` — `manifest.json`,
  `README.md`, stub entry (exit 0 + `routes: []`) by contract `005`
- [X] T005 [P] Create scaffold `parsers/java-http-calls/` — `manifest.json`,
  `README.md`, stub entry (exit 0 + `calls: []`) by contract `005`
- [X] T006 [P] Add rows `maven-project` / `spring-config` /
  `java-api-routes` / `java-http-calls` with status **stub/planned** in detector,
  `parsers/README.md` (**available** — only after green story + Polish)
- [X] T007 Create fixture `docker/fixtures/repos/java-http-webclient-demo/` —
  minimal Spring Boot with **WebClient** literal path + compose service;
  README; connect in `docker/fixtures/repos/setup-fixtures.sh` (or alternative)
- [X] T008 [P] Create shared AST helper `parsers/_shared/java-ast/` (or
  analogue research R9) for reuse between `java-api-routes` and `java-http-calls`
  **without** contract/output changes `parsers/java/`. If in a single pass
  cheaper to copy minimal code — for example skip with explicit annotation in
  README both modules «shared cancelled.)

**Checkpoint S1**: stubs 4 modules + WebClient fixture in place

---

## Phase 2: Foundational (BLOCKER)

**Purpose**: Detector artifacts + registry ingest + spawn before user stories

**⚠️ CRITICAL**: US1–US5 do not start without F1

- [X] T009 Add artifact rules for `maven-project`, `spring-config`,
  `java-api-routes`, `java-http-calls` in detector,
  `backend/src/config/detector-rules.json` by
  `contracts/detector-spring-system.md`
- [X] T010 Extend detector in `backend/src/services/artifact-detector.ts`
  and/or `backend/src/services/language-detector.service.ts` — scan globs/hints
  → `artifacts[]` (pom / application* / `@RestController` / `@FeignClient` /
  `WebClient`)
- [X] T011 [P] Unit detector signals in
  `backend/tests/unit/detector-spring-system.test.ts` — positive/negative
  samples per item artifact_type
- [X] T012 Register stub adapters + allowlist in detector,
  `backend/src/services/ingest/ingest-registry.service.ts` and
  `backend/src/services/ingest/ingest.service.ts` (`ARTIFACT_PARSER_IDS`:
  `maven-project`, `spring-config`, `java-api-routes`, `java-http-calls`)
- [X] T013 Ensure orchestrator/change-set spawn’it new artifacts
  (`backend/src/services/change-set.service.ts` /
  `analysis-orchestrator.service.ts`) — refactor globs as needed
- [X] T014 [P] Shared helper affiliation/merge Maven↔compose in detector,
  `backend/src/services/ingest/maven-compose-merge.ts` (or adjacent to
  `api-routes-ids.ts`) — normalize name, unambiguous match → compose id;
  display = compose (research R3)
- [X] T015 JDK/build for Java CLI-modules (`java-api-routes` /
  `java-http-calls` / upon need `maven-project`) in detector, `backend/Dockerfile` by
  analogy with `parsers/java`; `chmod +x` entry scripts; mount `PARSERS_ROOT`

**Checkpoint F1**: detector sees 4 artifacts; registry knows parser_id;
merge helper ready

---

## Phase 3: User Story 1 — Services from Maven (CP-A) (P1) 🎯

**Goal**: petclinic → system-services from Boot application-modules; merge with
compose

**Independent Test**: quickstart §1 — recognizable microservices, one node at
match with compose

### Tests

- [X] T016 [P] [US1] Unit extract Boot vs parent/library in detector,
  `parsers/maven-project/` (tests alongside module) — `is_boot_app` true/false
  (research R2)
- [X] T017 [P] [US1] Unit ingest merge in detector,
  `backend/tests/unit/ingest/maven-project.ingest.test.ts` — unambiguous
  match → compose id + `metadata.maven_*`; ambiguity → without stitching;
  library → none `service`

### Implementation

- [X] T018 [US1] Implement extract Maven reactor in detector,
  `parsers/maven-project/` by `contracts/native-maven-project.schema.json`
- [X] T019 [US1] Implement
  `backend/src/services/ingest/adapters/maven-project.ingest.ts` by
  `contracts/ingest-maven-project.md` (use T014)
- [X] T020 [US1] Replace stub adapter on worker in
  `backend/src/services/ingest/ingest-registry.service.ts`
- [X] T021 [US1] Dogfood petclinic: re-analysis → SC-001 (≥5 `service`, including
  customers / vets / visits / api-gateway; parent/library none)

**Checkpoint**: US1 independently verify on petclinic

---

## Phase 4: User Story 2 — HTTP API from Spring (CP-C) (P1)

**Goal**: system-service interior shows endpoints from MVC/WebFlux;
`exposes`; Gateway SHOULD

**Independent Test**: quickstart §3 — dig-in → ≥1 method+path from code

### Tests

- [X] T022 [P] [US2] Unit extract `@RequestMapping` / `@GetMapping` + class
  prefix in detector, `parsers/java-api-routes/` — full path / only method-literal
  (research R5)
- [X] T023 [P] [US2] Unit ingest in detector,
  `backend/tests/unit/ingest/java-api-routes.ingest.test.ts` —
  `http_endpoint` id `service|METHOD|path`, `metadata.source=code`,
  `exposes` upon affiliation

### Implementation

- [X] T024 [US2] Implement extract MVC in detector,
  `parsers/java-api-routes/` by `contracts/native-java-api-routes.schema.json`
  (DoD petclinic = **MVC-annotations**). WebFlux `RouterFunction` — only if
  encountered in WC/fixture; absence WebFlux **not** validates SC-002.
  Reuse shared AST upon availability T008; **not** touch `parsers/java/` symbols
- [X] T025 [US2] Implement
  `backend/src/services/ingest/adapters/java-api-routes.ingest.ts` by
  `contracts/ingest-java-api-routes.md`
- [X] T026 [P] [US2] Gateway static routes — SHOULD extract in the same module
  (`route_kind=gateway`); absence does not fail DoD
- [X] T027 [US2] Dogfood petclinic: dig-in service with controllers → SC-002;
  code-layer Java without regression smoke

**Checkpoint**: US2 independently; endpoints in detector, system

---

## Phase 5: User Story 3 — Modules are pluggable (P1)

**Goal**: failure/absence of any module `019` does not degrade compose and Java
symbols

**Independent Test**: quickstart §5 — missing module → rest is ok

- [X] T028 [US3] Negative scenarios: disable/break registry entry
  each of the 4 parser_id sequentially — compose + `java` symbols available;
  `parser_status=missing` or no artifact
- [X] T029 [P] [US3] Unit/integration isolation in
  `backend/tests/unit/ingest/` or integration — empty model / error
  one adapter does not fail run (parity FR-011)

**Checkpoint**: US3 verified for all 4 modules

---

## Phase 6: User Story 4 — Spring config (CP-B) (P1)

**Goal**: ports and `connects_to` from local `application*`

**Independent Test**: quickstart §2 — port and/or DB hint without placeholder-ribs

### Tests

- [X] T030 [P] [US4] Unit parse `application.yml` / `.properties` in detector,
  `parsers/spring-config/` — port + jdbc engine / skip placeholder
  (research R4)
- [X] T031 [P] [US4] Unit ingest in detector,
  `backend/tests/unit/ingest/spring-config.ingest.test.ts` —
  `metadata.port`, `database` + `connects_to`

### Implementation

- [X] T032 [US4] Implement extract in detector, `parsers/spring-config/` by
  `contracts/native-spring-config.schema.json`
- [X] T033 [US4] Implement
  `backend/src/services/ingest/adapters/spring-config.ingest.ts` by
  `contracts/ingest-spring-config.md`
- [X] T034 [US4] Dogfood petclinic / fixture → SC-006

**Checkpoint**: US4 independently

---

## Phase 7: User Story 5 — Feign and WebClient (CP-D) (P1)

**Goal**: «Calls» / `http_calls` for **both** client styles to
existing endpoints

**Independent Test**: quickstart §4 — Feign on petclinic + WebClient
(petclinic or `java-http-webclient-demo`)

### Tests

- [X] T035 [P] [US5] Unit extract Feign (`@FeignClient` + mapping) in detector,
  `parsers/java-http-calls/`
- [X] T036 [P] [US5] Unit extract WebClient literals path in detector,
  `parsers/java-http-calls/`
- [X] T037 [P] [US5] Unit ingest in detector,
  `backend/tests/unit/ingest/java-http-calls.ingest.test.ts` —
  `http_calls` to the existing id; without creation endpoint; skip upon miss

### Implementation

- [X] T038 [US5] Implement extract Feign+WebClient in detector,
  `parsers/java-http-calls/` by `contracts/native-java-http-calls.schema.json`
  (`client_kind`: feign|webclient)
- [X] T039 [US5] Implement
  `backend/src/services/ingest/adapters/java-http-calls.ingest.ts` by
  `contracts/ingest-java-http-calls.md` (prefer
  `java-api-routes:http_endpoint:…`)
- [X] T040 [US5] Dogfood: Feign on petclinic + WebClient on fixture/reference
  → SC-007 (both styles explicitly)

**Checkpoint**: US5 independently; full consumer path

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: checklist `018`, available, full quickstart, audit DoD

- [X] T041 Pass applicable items
  `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`
  for each of the 4 `parser_id` — to close gaps or explicitly justify them
- [X] T042 [P] Update statuses to **available** in detector, `parsers/README.md` for
  of all 4 modules after green SC
- [X] T043 Run full `specs/019-spring-system-landscape/quickstart.md`
  on petclinic (+ WebClient fixture) — SC-001…007
- [X] T044 [P] Regression Java symbols `018` on petclinic (SC-003) — smoke
  count/types code-nodes without crash
- [X] T045 Audit: no second orchestrator; spawn only via `artifacts[]`
  (SC-005); HTTP/Feign absent in `parsers/java/`; **Gradle not in DoD**
  (FR-015 — not mandatory `gradle-project` / acceptance `build.gradle*`)

**Checkpoint**: DoD A+B+C+D closed (SC-001…007); next Phase 9 = SC-008

---

## Phase 9: RestClient dogfood (SC-008)

**Purpose**: Extraction RestClient on petclinic (genai → customers); clarify
2026-07-19 RestClient dogfood; FR-010 / SC-008

- [X] T046 [P] Unit extract RestClient + `getInstances("…")` callee + path
  concat (`/owners`, `/owners/{id}/pets`) in detector, `parsers/java-http-calls/`
- [X] T047 Detector hint `RestClient` in detector, `backend/src/config/detector-rules.json`
  (+ contract detector); ingest accepts `client_kind=restclient`
- [X] T048 Implement extract RestClient in detector, `parsers/java-http-calls/extract.mjs`
  (reuse WebClient uri resolve + discovery helper)
- [X] T049 Dogfood petclinic → SC-008: ≥3 `http_calls` restclient
  genai-service → customers-service; without dangling ends

**Checkpoint**: SC-008 closed; petclinic consumer-path full for the reference

---

## Feature closure

**2026-07-19:** DoD A+B+C+D + SC-008 completed; tasks T001–T049 `[X]`.
Active work on `019` completed. Follow-up — in detector, `spec.md` (§Follow-up) and
Post-MVP `001` (§stack coverage). Next feature — via `/speckit-specify`
after selection in `001` / explicit command.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: start immediately
- **Foundational (Phase 2)**: after Setup — **BLOCKER** for US1–US5
- **US1 (Maven)**: after F1 — preferred first (affiliation for C/B/D)
- **US2 (API routes)**: after F1; preferably after US1 (service resolve)
- **US3 (isolation)**: after appearance ≥1 worker module; full run — after
  all four
- **US4 (config)**: after F1; preferably after US1
- **US5 (http_calls)**: after US2 (are needed endpoints) + US1
- **Polish**: after US1+US2+US4+US5 (+US3)
- **Phase 9 (RestClient)**: after US5 / Polish (are needed endpoints customers)

### User Story Dependencies

| Story | Depends on |
|-------|------------|
| US1 Maven | F1 |
| US2 API | F1; SHOULD after US1 |
| US3 Isolation | ≥1 module implemented |
| US4 Config | F1; SHOULD after US1 |
| US5 Calls | F1 + US2 (+ US1) |

### Parallel Opportunities

- T002–T006, T008 in detector, Setup in parallel
- T011, T014 in detector, F1 in parallel with T012/T013 after T009–T010
- T016∥T017; T022∥T023; T030∥T031; T035∥T036∥T037
- After F1: US4 may partially parallelize with US2, if different files;
  US5 wait endpoints US2

### Parallel Example: Setup stubs

```bash
# Parallel parser skeletons:
Task: "T002 parsers/maven-project/"
Task: "T003 parsers/spring-config/"
Task: "T004 parsers/java-api-routes/"
Task: "T005 parsers/java-http-calls/"
Task: "T006 parsers/README.md stubs"
```

### Parallel Example: US5 extract tests

```bash
Task: "T035 Feign extract tests"
Task: "T036 WebClient extract tests"
Task: "T037 java-http-calls ingest tests"
```

---

## Implementation Strategy

### Increment (do not confuse with closure DoD)

1. Setup + F1 → foundation
2. **US1** → services from Maven (early dogfood landscape)
3. **US2** → endpoints in system
4. **US4** → config hints
5. **US5** → Feign+WebClient calls
6. **US3** + Polish → isolation, checklist, available

### Feature closure

Only after **US1+US2+US4+US5** (+ US3 + Polish): DoD = **A+B+C+D**.
Partial acceptance A+C **not** covers `019` (clarify).

### MVP demo (not DoD)

US1+US2 sufficient for demo 'services + API from code'; full equivalent C#/TS —
only with B+D.

---

## Notes

- Forbidden: HTTP/Feign/Gateway in detector, `parsers/java/`
- T001: discrepancies between contracts, data-model and research not found.
- T015: all four new CLI implemented on Node.js; JDK and changes
  `backend/Dockerfile` not required, manifest command — `["node", "run.mjs"]`.
- Gateway — SHOULD (T026), not a blocker SC-002
- WebClient fixture (T007) required if petclinic does not cover SC-007b
- Id endpoints / `http_calls` — parity `013`/`014`
- FR-015: Gradle **not** in detector, DoD (check in T045)
- SC-001: ≥5 service; minimum customers/vets/visits/api-gateway
- Contract discrepancies after T001 — complete here
