# Tasks: HTTP API from a code → system (013 CP1)

**Input**: `specs/013-api-routes-from-code/` — plan.md, spec.md, data-model.md,
contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-18); system
`http_endpoint` / `exposes` / graph-view interior from `009`/`011`/`012`

**Tests**: unit extract/ingest + id/path; integration spawn → ingest →
`graph/view`; standards ods-arch + csharp-demo (plan Testing + SC)

**Organization**: Setup → Foundational (detector/registry) → US1 TS P1 →
US2 C# P1 → US3 exposes P1 → US4 isolation modules P2 → Polish (audit/quickstart)

**DoD**: endpoints of code in system-interior; without merge OpenAPI; without UX CP2;
without ⟪Python/Express/Nest

**Language of**: Russian (Constitution)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: you can simultaneously (in different files, there is no dependence on incomplete)
- **[Story]**: US1–US4 from spec.md

---

## Phase 1: Setup

**Purpose** Frames of parsers fixture C#, reconciliation of contracts

- [X] T001 Compare `specs/013-api-routes-from-code/contracts/` with
  `data-model.md` / `research.md` R2–R6 (id service|METHOD|path, source=code,
  exposes, handler metadata) — fix discrepancies in Notes below when
  If necessary
- [X] T002 [P] Create a framework `parsers/ts-api-routes/` —
  `manifest.json`, `README.md`, stub `run.mjs` (exit 0 + blank
  `routes: []`) contract `005`
- [X] T003 [P] Create a framework `parsers/dotnet-api-routes/` —
  `manifest.json`, `README.md`, stub entry (other C# parsers) at
  contract `005`
- [X] T004 [P] Add line parser_id `ts-api-routes` /
  `dotnet-api-routes` status **stub/planned** in `parsers/README.md`
  (status **available** — only T030 after implementation)
- [X] T005 Create fixture `docker/fixtures/repos/api-routes-csharp-demo/` —
  compose service + ASP.NET with **controller `[HttpGet]`** and **`MapGet`**
  literal; README; connect in `docker/fixtures/repos/setup-fixtures.sh`

**Checkpoint S1**: stubs parsers + C# fixture on the spot

---

## Phase 2: Foundational (BLOCKER)

**Purpose**: Detector artifacts + registry ingest + shared id helper to US

**⚠️ CRITICAL**: US1–US4 not start without F1

- [X] T006 Add artifact rules `ts-api-routes` / `dotnet-api-routes` in
  `backend/src/config/detector-rules.json` by
  `contracts/detector-api-routes.md`
- [X] T007 Extend the detector in
  `backend/src/services/language-detector.service.ts` (and related types
  report) — scan signals Fastify / HttpGet|MapGet → `artifacts[]`
- [X] T008 [P] Unit signals of the detector in
  `backend/tests/unit/detector-api-routes.test.ts` — positive/negative samples
- [X] T009 [P] Shared helper id/path **only** in
  `backend/src/services/ingest/api-routes-ids.ts` (import `systemNodeId` from
  `system-layer.ts`) — `serviceStable|METHOD|path`, unscoped fallback (R2);
  **not** duplicate logic id in `system-layer.ts`
- [X] T010 Register stub adapters in
  `backend/src/services/ingest/ingest-registry.service.ts` + allowlist
  `ingest.service.ts` if necessary (`ts-api-routes`,
  `dotnet-api-routes`)
- [X] T011 Verify that the Orchestrator spawn it artifacts along with `009`
  (`analysis-orchestrator.service.ts` / change-set paths) — modified
  change-set globs if necessary in
  `backend/src/services/change-set.service.ts`

**Checkpoint F1**: detector sees artifacts; registry knows parser_id; id helper ready

---

## Phase 3: User Story 1 — Endpointy from TS-code (P1) 🎯 MVP

**Goal**: ods-arch → system-interior backend shows HTTP from Fastify-code

**Independent Test**: quickstart §1 — dig-in backend → ≥1 `/api/v1/...`

### Tests

- [X] T012 [P] [US1] Unit extract Fastify-literals + const prefix in
  `parsers/ts-api-routes/` (tests next to the module, e.g.
  `extract.test.mjs` / `*.test.ts`) — cases from R3 (full literal,
  `${prefix}/x`, without guessing at repo)
- [X] T013 [P] [US1] Unit ingest
  `backend/tests/unit/ingest/ts-api-routes.ingest.test.ts` — nodes
  `http_endpoint`, `metadata.source=code`, id with serviceStable; when
  unambiguous handler in fixture model — filled `metadata.handler_*` (R6)

### Implementation

- [X] T014 [US1] Implement extract in `parsers/ts-api-routes/` (ts-morph /
  typescript API per R7) → native model by
  `contracts/native-ts-api-routes.schema.json`
- [X] T015 [US1] To realize
  `backend/src/services/ingest/adapters/ts-api-routes.ingest.ts` by
  `contracts/ingest-api-routes.md` + R5 service resolve + optional
  `metadata.handler_*` (R6; **not** create EdgeType to handler)
- [X] T016 [US1] Integration
  `backend/tests/integration/ts-api-routes-parser.test.ts` — envelope →
  ingest → assert ≥1 `http_endpoint` on **ways/fragments as ods-arch**
  (`app.get('/api/v1/...')` and/or `const prefix` + template); if possible,
  spawn parser on the samples from `docker/fixtures/repos/ods-arch/backend/src`
- [X] T017 [US1] After live-analysis ods-arch: be noted in **Notes** this
  `tasks.md` checklist SC-001 (focus backend → ≥1 `/api/v1/...` in
  `graph/view`); no separate "free" hand script out Notes

**Checkpoint A1**: SC-001 (T016 + Notes T017); code-layer without recourse (smoke)

---

## Phase 4: User Story 2 — Endpointy from C#-code (P1)

**Goal**: controllers + MapGet visible in system on csharp-demo

**Independent Test**: quickstart §2 — both styles

### Tests

- [X] T018 [P] [US2] Unit extract controller + Map* **in**
  `parsers/dotnet-api-routes/` (tests next to the module) — both `style`
- [X] T019 [P] [US2] Unit ingest
  `backend/tests/unit/ingest/dotnet-api-routes.ingest.test.ts`

### Implementation

- [X] T020 [US2] Implement extract Roslyn in `parsers/dotnet-api-routes/` by
  `contracts/native-dotnet-api-routes.schema.json` (R8)
- [X] T021 [US2] To realize
  `backend/src/services/ingest/adapters/dotnet-api-routes.ingest.ts`
- [X] T022 [US2] Integration
  `backend/tests/integration/dotnet-api-routes-parser.test.ts` on
  `api-routes-csharp-demo`
- [X] T023 [US2] Run quickstart §2 (SC-002 a+b)

**Checkpoint A2**: SC-002; TS (US1) not broken

---

## Phase 5: User Story 3 Connection with the service (P1)

**Goal**: to clarify **General** service-resolve (not second ingest): stable
`exposes` service → endpoint; without false binding to all. Basic exposes
is already from US1/US2 adapters — here is the removal/reinforcement of heuristics (R5).

**Independent Test**: quickstart §3

### Tests

- [X] T024 [P] [US3] Unit service resolve in
  `backend/tests/unit/ingest/api-routes-service-resolve.test.ts` —
  `backend/...` → backend; unscoped no mass exposes

### Implementation

- [X] T025 [US3] Strengthen/take out resolve (reuse
  `resolveComposeServiceIdFromHint` / affiliation path segment) in ingest
  helpers — both adapters cause a common code
- [X] T026 [US3] Check ods-arch + csharp-demo: inspector/API edges
  `exposes`; negative unscoped documented

**Checkpoint A3**: FR-005 / US3

---

## Phase 6: User Story 4 Module disable (P2)

**Goal**: missing/failed api-routes no knocks compose/code

**Independent Test**: quickstart §4

- [X] T027 [US4] Integration: artifact `parser_status=missing` or
  disabled registry → analysis run ends; compose nodes + code
  symbols available — file
  `backend/tests/integration/api-routes-module-isolation.test.ts`
- [X] T028 [US4] Unit/integration: empty `routes[]` → success, 0 endpoints,
  without false nodes — in
  `backend/tests/unit/ingest/ts-api-routes.ingest.test.ts` (and/or
  `dotnet-api-routes.ingest.test.ts`)

**Checkpoint A4**: SC-004 / FR-009

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Audit reuse, docks, i18n kind if necessary

- [X] T029 [P] Audit reuse (SC-005): There is no second orchestrator;
  only parsers + detector + ingest; quick checklist in Notes `tasks.md`
- [X] T030 [P] Update `parsers/README.md` statuses **available** for
  `ts-api-routes` / `dotnet-api-routes` after green US1/US2 (see T004 —
  there is only stub/planned)
- [X] T031 [P] If necessary, label kind `http_endpoint` in
  `frontend/src/i18n/ru.ts` (without rename buttons CP2)
- [X] T032 Banish `specs/013-api-routes-from-code/quickstart.md` entirely;
  mark SC-001...005
- [X] T033 Regression smoke: system overview ods-arch + "code" backend
  (`012`) without breakage

**Checkpoint P1**: DoD CP1 ready for close; UX `014` not started

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup** → **Foundational** → **US1** (MVP) → **US2** / **US3** (US3
  may partially go after T015) → **US4** → **Polish**
- US2 doesn't block demo US1, but DoD specs requires both languages
- US3 depends on working ingest US1 (and ideally US2)

### User Story Dependencies

| Story | Depends on |
|-------|------------|
| US1 | F1 |
| US2 | F1 (+ T005 fixture) |
| US3 | US1 ingest minimum |
| US4 | F1 + at least one adapter |

### Parallel Opportunities

- T002/T003/T004; T008/T009; T012/T013; T018/T019; T029/T030/T031

### Parallel Example: US1

```bash
Task: "T012 unit extract Fastify"
Task: "T013 unit ingest ts-api-routes"
# then T014 → T015 → T016
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Setup + Foundational  
2. US1 on ods-arch → validate SC-001
3. Then US2 (C#) → US3 polish exposes → US4 → Polish  

### Incremental Delivery

US1 gives value to the pilot; US2 closes duty `009`; US3/US4 — quality
landscape and isolation.

---

## Notes

- Loader/UX graph-view **not** change for CP1 (`http_endpoint` already inside).
- OpenAPI merge **prohibited** in tasks.
- Handler = **metadata only** (R6), without a new EdgeType (analyze I1 closed
  plan Summary).
- Id helper: **only** `backend/src/services/ingest/api-routes-ids.ts` (U1).
- Extract unit: near `parsers/<id>/`; ingest unit: `backend/tests/unit/ingest/` (U1).
- T017 = checklist SC-001 these Notes after live ods-arch (U2); not separate
  a "free" manual script.
- US3 = clarification shared resolve not take ingest US1 (D2).
- **Audit T029** — mandatory quality gate.

### SC-001 live (fills T017)

- [X] Project ods-arch analyzed with `ts-api-routes` available
- [X] `GET .../graph/view?focus=<backend service id>` → ≥1 `http_endpoint`
  with path like `/api/v1/...`
- [X] Date / run id: 2026-07-18 / `942920df-e0d1-43b9-9afe-6c7230b06f23`

### Audit T029 (SC-005)

- [X] There are no second Orchestrator — reuse analysis-orchestrator + parser registry
- [X] Only `parsers/ts-api-routes`, `parsers/dotnet-api-routes` + detector content_hints + ingest adapters
- [X] OpenAPI not merge’or / not disabled
- [X] Shared id/resolve: `api-routes-ids.ts`; shared transform: `api-routes.ingest.ts`
