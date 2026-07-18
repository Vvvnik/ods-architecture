# Tasks: HTTP API из кода → system (013 CP1)

**Input**: `specs/013-api-routes-from-code/` — plan.md, spec.md, data-model.md,
contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-18); system
`http_endpoint` / `exposes` / graph-view interior из `009`/`011`/`012`

**Tests**: unit extract/ingest + id/path; integration spawn → ingest →
`graph/view`; эталоны ods-arch + csharp-demo (plan Testing + SC)

**Organization**: Setup → Foundational (detector/registry) → US1 TS P1 →
US2 C# P1 → US3 exposes P1 → US4 изоляция модулей P2 → Polish (audit/quickstart)

**DoD**: эндпоинты из кода в system-интерьере; без merge OpenAPI; без UX CP2;
без Python/Express/Nest

**Язык**: русский (конституция)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимости от незавершённых)
- **[Story]**: US1–US4 из spec.md

---

## Phase 1: Setup

**Purpose**: Каркасы парсеров, fixture C#, сверка контрактов

- [X] T001 Сверить `specs/013-api-routes-from-code/contracts/` с
  `data-model.md` / `research.md` R2–R6 (id service|METHOD|path, source=code,
  exposes, handler metadata) — зафиксировать расхождения в Notes ниже при
  необходимости
- [X] T002 [P] Создать каркас `parsers/ts-api-routes/` —
  `manifest.json`, `README.md`, stub `run.mjs` (exit 0 + пустой
  `routes: []`) по контракту `005`
- [X] T003 [P] Создать каркас `parsers/dotnet-api-routes/` —
  `manifest.json`, `README.md`, stub entry (как другие C# parsers) по
  контракту `005`
- [X] T004 [P] Добавить строки parser_id `ts-api-routes` /
  `dotnet-api-routes` со статусом **stub/planned** в `parsers/README.md`
  (статус **available** — только в T030 после реализации)
- [X] T005 Создать fixture `docker/fixtures/repos/api-routes-csharp-demo/` —
  compose service + ASP.NET с **controller `[HttpGet]`** и **`MapGet`**
  литералом; README; подключить в `docker/fixtures/repos/setup-fixtures.sh`

**Checkpoint S1**: stubs парсеров + C# fixture на месте

---

## Phase 2: Foundational (BLOCKER)

**Purpose**: Детектор artifacts + registry ingest + shared id helper до US

**⚠️ CRITICAL**: US1–US4 не стартуют без F1

- [X] T006 Добавить artifact rules `ts-api-routes` / `dotnet-api-routes` в
  `backend/src/config/detector-rules.json` по
  `contracts/detector-api-routes.md`
- [X] T007 Расширить детектор в
  `backend/src/services/language-detector.service.ts` (и связанные типы
  report) — scan сигналов Fastify / HttpGet|MapGet → `artifacts[]`
- [X] T008 [P] Unit сигналов детектора в
  `backend/tests/unit/detector-api-routes.test.ts` — positive/negative samples
- [X] T009 [P] Shared helper id/path **только** в
  `backend/src/services/ingest/api-routes-ids.ts` (импорт `systemNodeId` из
  `system-layer.ts`) — `serviceStable|METHOD|path`, unscoped fallback (R2);
  **не** дублировать логику id в `system-layer.ts`
- [X] T010 Зарегистрировать stub adapters в
  `backend/src/services/ingest/ingest-registry.service.ts` + allowlist
  `ingest.service.ts` при необходимости (`ts-api-routes`,
  `dotnet-api-routes`)
- [X] T011 Убедиться, что оркестратор spawn’ит artifacts наравне с `009`
  (`analysis-orchestrator.service.ts` / change-set paths) — доработать
  change-set globs при необходимости в
  `backend/src/services/change-set.service.ts`

**Checkpoint F1**: detector видит artifacts; registry знает parser_id; id helper готов

---

## Phase 3: User Story 1 — Эндпоинты из TS-кода (P1) 🎯 MVP

**Goal**: ods-arch → system-интерьер backend показывает HTTP из Fastify-кода

**Independent Test**: quickstart §1 — dig-in backend → ≥1 `/api/v1/...`

### Tests

- [X] T012 [P] [US1] Unit extract Fastify-литералов + const prefix в
  `parsers/ts-api-routes/` (тесты рядом с модулем, напр.
  `extract.test.mjs` / `*.test.ts`) — cases из R3 (полный литерал,
  `${prefix}/x`, без угадывания по репо)
- [X] T013 [P] [US1] Unit ingest
  `backend/tests/unit/ingest/ts-api-routes.ingest.test.ts` — nodes
  `http_endpoint`, `metadata.source=code`, id с serviceStable; при
  однозначном handler в fixture model — заполнены `metadata.handler_*` (R6)

### Implementation

- [X] T014 [US1] Реализовать extract в `parsers/ts-api-routes/` (ts-morph /
  typescript API per R7) → native model по
  `contracts/native-ts-api-routes.schema.json`
- [X] T015 [US1] Реализовать
  `backend/src/services/ingest/adapters/ts-api-routes.ingest.ts` по
  `contracts/ingest-api-routes.md` + R5 service resolve + optional
  `metadata.handler_*` (R6; **не** создавать EdgeType к handler)
- [X] T016 [US1] Integration
  `backend/tests/integration/ts-api-routes-parser.test.ts` — envelope →
  ingest → assert ≥1 `http_endpoint` на **путях/фрагментах как в ods-arch**
  (`app.get('/api/v1/...')` и/или `const prefix` + template); при возможности
  spawn парсера на сэмпле из `docker/fixtures/repos/ods-arch/backend/src`
- [X] T017 [US1] После live-анализа ods-arch: отметить в **Notes** этого
  `tasks.md` чеклист SC-001 (focus backend → ≥1 `/api/v1/...` в
  `graph/view`); без отдельного «свободного» ручного сценария вне Notes

**Checkpoint A1**: SC-001 (T016 + Notes T017); code-слой без регресса (smoke)

---

## Phase 4: User Story 2 — Эндпоинты из C#-кода (P1)

**Goal**: controllers + MapGet видны в system на csharp-demo

**Independent Test**: quickstart §2 — оба стиля

### Tests

- [X] T018 [P] [US2] Unit extract controller + Map* **в**
  `parsers/dotnet-api-routes/` (тесты рядом с модулем) — оба `style`
- [X] T019 [P] [US2] Unit ingest
  `backend/tests/unit/ingest/dotnet-api-routes.ingest.test.ts`

### Implementation

- [X] T020 [US2] Реализовать extract Roslyn в `parsers/dotnet-api-routes/` по
  `contracts/native-dotnet-api-routes.schema.json` (R8)
- [X] T021 [US2] Реализовать
  `backend/src/services/ingest/adapters/dotnet-api-routes.ingest.ts`
- [X] T022 [US2] Integration
  `backend/tests/integration/dotnet-api-routes-parser.test.ts` на
  `api-routes-csharp-demo`
- [X] T023 [US2] Прогон quickstart §2 (SC-002 a+b)

**Checkpoint A2**: SC-002; TS (US1) не сломан

---

## Phase 5: User Story 3 — Связь с сервисом (P1)

**Goal**: уточнить **общий** service-resolve (не второй ingest): стабильный
`exposes` service → endpoint; без ложной привязки ко всем. Базовый exposes
уже из US1/US2 adapters — здесь вынос/усиление эвристик (R5).

**Independent Test**: quickstart §3

### Tests

- [X] T024 [P] [US3] Unit service resolve в
  `backend/tests/unit/ingest/api-routes-service-resolve.test.ts` —
  `backend/...` → backend; unscoped без mass exposes

### Implementation

- [X] T025 [US3] Усилить/вынести resolve (reuse
  `resolveComposeServiceIdFromHint` / affiliation path segment) в ingest
  helpers — оба adapters вызывают общий код
- [X] T026 [US3] Проверка на ods-arch + csharp-demo: inspector/API edges
  `exposes`; негатив unscoped задокументирован

**Checkpoint A3**: FR-005 / US3

---

## Phase 6: User Story 4 — Модуль отключаем (P2)

**Goal**: missing/failed api-routes не валит compose/code

**Independent Test**: quickstart §4

- [X] T027 [US4] Integration: artifact `parser_status=missing` или
  отключённый registry → analysis run завершается; compose nodes + code
  symbols доступны — файл
  `backend/tests/integration/api-routes-module-isolation.test.ts`
- [X] T028 [US4] Unit/integration: пустой `routes[]` → success, 0 endpoints,
  без ложных узлов — в
  `backend/tests/unit/ingest/ts-api-routes.ingest.test.ts` (и/или
  `dotnet-api-routes.ingest.test.ts`)

**Checkpoint A4**: SC-004 / FR-009

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Audit reuse, доки, i18n kind при необходимости

- [X] T029 [P] Audit переиспользования (SC-005): нет второго оркестратора;
  только parsers + detector + ingest; краткий чеклист в Notes `tasks.md`
- [X] T030 [P] Обновить в `parsers/README.md` статусы **available** для
  `ts-api-routes` / `dotnet-api-routes` после зелёных US1/US2 (см. T004 —
  там только stub/planned)
- [X] T031 [P] При необходимости метка kind `http_endpoint` в
  `frontend/src/i18n/ru.ts` (без ренейма кнопок CP2)
- [X] T032 Прогнать `specs/013-api-routes-from-code/quickstart.md` целиком;
  отметить SC-001…005
- [X] T033 Регресс smoke: system overview ods-arch + «В код» backend
  (`012`) без поломки

**Checkpoint P1**: DoD CP1 готов к close; UX `014` не начат

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup** → **Foundational** → **US1** (MVP) → **US2** / **US3** (US3
  может частично идти после T015) → **US4** → **Polish**
- US2 не блокирует демо US1, но DoD спеки требует оба языка
- US3 зависит от работающего ingest US1 (и ideally US2)

### User Story Dependencies

| Story | Depends on |
|-------|------------|
| US1 | F1 |
| US2 | F1 (+ T005 fixture) |
| US3 | US1 ingest минимум |
| US4 | F1 + хотя бы один adapter |

### Parallel Opportunities

- T002/T003/T004; T008/T009; T012/T013; T018/T019; T029/T030/T031

### Parallel Example: US1

```bash
Task: "T012 unit extract Fastify"
Task: "T013 unit ingest ts-api-routes"
# затем T014 → T015 → T016
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Setup + Foundational  
2. US1 на ods-arch → validate SC-001  
3. Затем US2 (C#) → US3 polish exposes → US4 → Polish  

### Incremental Delivery

US1 даёт ценность на пилоте; US2 закрывает долг `009`; US3/US4 — качество
ландшафта и изоляция.

---

## Notes

- Loader/UX graph-view **не** менять для CP1 (`http_endpoint` уже inside).
- OpenAPI merge **запрещён** в tasks.
- Handler = **metadata only** (R6), без нового EdgeType (analyze I1 закрыт в
  plan Summary).
- Id helper: **только** `backend/src/services/ingest/api-routes-ids.ts` (U1).
- Extract unit: рядом с `parsers/<id>/`; ingest unit: `backend/tests/unit/ingest/` (U1).
- T017 = чеклист SC-001 в этих Notes после live ods-arch (U2); не отдельный
  «свободный» ручной сценарий.
- US3 = уточнение shared resolve, не дубль ingest US1 (D2).
- **Audit T029** — обязательный quality gate.

### SC-001 live (заполняет T017)

- [X] Project ods-arch analyzed with `ts-api-routes` available
- [X] `GET .../graph/view?focus=<backend service id>` → ≥1 `http_endpoint`
  with path like `/api/v1/...`
- [X] Date / run id: 2026-07-18 / `942920df-e0d1-43b9-9afe-6c7230b06f23`

### Audit T029 (SC-005)

- [X] Нет второго оркестратора — reuse analysis-orchestrator + parser registry
- [X] Только `parsers/ts-api-routes`, `parsers/dotnet-api-routes` + detector content_hints + ingest adapters
- [X] OpenAPI не merge’или / не отключали
- [X] Shared id/resolve: `api-routes-ids.ts`; общий transform: `api-routes.ingest.ts`
