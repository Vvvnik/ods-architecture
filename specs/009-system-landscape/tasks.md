# Tasks: System landscape (009)

**Input**: `specs/009-system-landscape/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅ (clarify 2026-07-14); `005`/`006`/`007`/`008` реализованы

**Tests**: SC-001…005, quickstart.md — unit ingest + integration parser→ingest + регрессия code-only; Vitest

**Organization**: US1 compose P1 → US2 openapi P1 → US3 appsettings P1 → US6 layer filter P1 → US4 dotnet P2 → US5 bus P2

**Согласование с кодом**: Phase 2 — `artifacts[]`, канон system types, ingest `layer=system`; без новых индексов графа

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимости от незавершённых)
- **[Story]**: US1–US6 из spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Точки расширения, правила детектора, скелеты парсеров

- [x] T001 Зафиксировать карту затрагиваемых файлов в `specs/009-system-landscape/research.md` секция `## R13. Code reuse audit` — `language-detector.service.ts`, `analysis-orchestrator.service.ts`, `language-report.ts`, `graph-node.ts`, `graph-edge.ts`, `ingest-registry.service.ts`, `parsers/{compose,appsettings,openapi,dotnet-project,bus-rabbit,bus-kafka}/`, `frontend/src/pages/GraphPage.tsx`
- [x] T002 [P] Создать `backend/src/config/detector-rules.json` по `contracts/detector-rules.md` (artifact globs + bus signal hints)
- [x] T003 [P] Скелеты каталогов `parsers/compose/`, `parsers/appsettings/`, `parsers/openapi/`, `parsers/dotnet-project/`, `parsers/bus-rabbit/`, `parsers/bus-kafka/` — `manifest.json` (schema_version `1`), `README.md` stub; зарегистрировать в `parsers/README.md`

---

## Phase 2: Foundational — artifacts[] + канон system (BLOCKER)

**Purpose**: Детектор/оркестратор system-парсеров; расширение NodeKind/EdgeType; ingest helper `layer=system`

**⚠️ CRITICAL**: User story work не начинается до checkpoint **F1**

- [x] T004 Добавить `ArtifactEntry` и поле `artifacts[]` в `backend/src/domain/language-report.ts` по `data-model.md` §1
- [x] T005 Расширить bootstrap mapping `ods-language-reports` nested `artifacts` в `backend/src/infra/elasticsearch.ts`; обновить описание в `specs/005-code-analysis/contracts/elasticsearch-indices.md`
- [x] T006 Реализовать artifact scan + bus resolver (tie-break → `bus-rabbit`) в `backend/src/services/language-detector.service.ts` — читать `backend/src/config/detector-rules.json`; не ломать `languages[]`
- [x] T007 [P] Unit `backend/tests/unit/language-detector-artifacts.test.ts` — compose/appsettings globs; bus Rabbit-only, Kafka-only, both→Rabbit; denylist
- [x] T008 Расширить `LanguageDetectorService.enrichWithParserStatus` — `parser_status` для `artifacts[]` (как languages)
- [x] T009 Сохранять `artifacts[]` в post-sync flow (`backend/src/services/sync.service.ts` или путь сохранения report) — report MUST содержать оба массива
- [x] T010 Расширить `backend/src/services/analysis-orchestrator.service.ts` — после spawn `languages[]` цикл по `report.artifacts` с тем же `spawnedParserIds`; передавать `artifacts` в `executeRun`
- [x] T011 Расширить `backend/src/services/change-set.service.ts` — `resolveArtifactChangeSet` / классификация путей по artifact globs для incremental
- [x] T012 [P] API `GET .../language-report/latest` — отдавать `artifacts` в `backend/src/api/routes/analysis.ts` (OpenAPI mirror при наличии)
- [x] T013 [P] Расширить `NodeKind` system kinds в `backend/src/domain/graph-node.ts` по `contracts/canonical-node-system.schema.json`
- [x] T014 [P] Расширить `EdgeType` + `isEdgeType` в `backend/src/domain/graph-edge.ts` и `backend/src/services/ingest/types.ts` по `contracts/canonical-edge-types-system.md`
- [x] T015 [P] Helper `withSystemLayer(metadata)` в `backend/src/services/ingest/system-layer.ts` (или рядом с types) — MUST `layer: system`
- [x] T016 [P] Синхронизировать `specs/006-project-graph/contracts/canonical-schemas.json` и `ods-help/requirements/json-model/canonical-*-system.schema.json` — enum kinds/types (note 009)
- [x] T017 Добавить `ArtifactEntry` и поле `artifacts` в `frontend/src/api/analysis-types.ts` по `contracts/detector-artifacts.md`
- [x] T018 [P] Подписи типов артефактов и bus-профиля в `frontend/src/i18n/ru.ts` — `compose`, `appsettings`, `openapi`, `dotnet-project`, `bus`; `bus-rabbit`→RabbitMQ, `bus-kafka`→Kafka
- [x] T019 Расширить `frontend/src/components/analysis/LanguagesConfirmModal.tsx` — секция «Системные артефакты» под языками: сводка `artifacts[]` (тип, file_count, sample_path, badge); bus — одна строка по `parser_id`
- [x] T020 `frontend/src/context/AnalysisProvider.tsx` + `frontend/src/hooks/useAnalysis.ts` — передать `artifacts`, подсветка новых artifact types; окно 1 если `languages.length > 0 || artifacts.length > 0`; обновить `specs/005-code-analysis/contracts/analysis-ui.md` §окно 1
- [x] T021 [P] Unit `frontend/src/components/analysis/LanguagesConfirmModal.test.tsx` — languages + artifacts сводка (в т.ч. bus одна строка)

**Checkpoint F1**: artifacts в ES/report; детектор+оркестратор spawn artifact parsers; system EdgeType/NodeKind в домене; окно 1 показывает сводку artifacts

---

## Phase 3: User Story 1 — Граф сервисов из compose (Priority: P1) 🎯 MVP

**Goal**: `docker-compose.yml` → узлы `service` + рёбра `depends_on`

**Independent Test**: `quickstart.md` §2; US1 acceptance; fixture compose

**Depends on**: **F1**

### Implementation for User Story 1

- [x] T022 [US1] Реализовать `parsers/compose/run.mjs` — parse yaml, native model по `contracts/native-compose.schema.json`; envelope `schema_version: "1"`
- [x] T023 [P] [US1] `parsers/compose/manifest.json` + `parsers/compose/README.md` — CLI contract как `005` parser-manifest
- [x] T024 [US1] `backend/src/services/ingest/adapters/compose.ingest.ts` — services→`service`, depends_on→`depends_on`, `withSystemLayer`, id `{parser_id}:{kind}:{stable_key}`
- [x] T025 [US1] Зарегистрировать адаптер в `backend/src/services/ingest/ingest-registry.service.ts`
- [x] T026 [P] [US1] Fixture `backend/tests/fixtures/ingest/compose-model-v1.json` + unit `backend/tests/unit/ingest/compose.ingest.test.ts`
- [x] T027 [US1] Integration `backend/tests/integration/compose-parser.test.ts` — CLI → envelope → ingest → assert nodes/edges `depends_on` в каноне

**Checkpoint A1**: compose end-to-end на fixture

---

## Phase 4: User Story 2 — HTTP-контракты из OpenAPI (Priority: P1)

**Goal**: OpenAPI yaml → `http_endpoint`, `documents`, `exposes` (при match service)

**Independent Test**: `quickstart.md` §3; US2 acceptance

**Depends on**: **F1** (желательно A1 для `exposes` cross-link)

### Implementation for User Story 2

- [x] T028 [US2] Реализовать `parsers/openapi/run.mjs` — paths/operations; invalid yaml → exit partial/error без падения оркестратора
- [x] T029 [P] [US2] `parsers/openapi/manifest.json` + README
- [x] T030 [US2] `backend/src/services/ingest/adapters/openapi.ingest.ts` — operations→`http_endpoint`, `documents`; heuristic `exposes` к `service` (research R6)
- [x] T031 [US2] Регистрация ingest + unit `backend/tests/unit/ingest/openapi.ingest.test.ts` + fixture `backend/tests/fixtures/ingest/openapi-model-v1.json`
- [x] T032 [US2] Integration `backend/tests/integration/openapi-parser.test.ts` — ingest assert `http_endpoint` + `documents`

**Checkpoint A2**: openapi end-to-end

---

## Phase 5: User Story 3 — Подключения к БД из конфигурации (Priority: P1)

**Goal**: appsettings → `database` + `connects_to`; N connection strings → N узлов

**Independent Test**: `quickstart.md` §3; US3; FR-013

**Depends on**: **F1** (A1 для `connects_to`→service)

### Implementation for User Story 3

- [x] T033 [US3] Реализовать `parsers/appsettings/run.mjs` — JSON + `.env`; bindings `database`/`broker` по `contracts/native-appsettings.schema.json`
- [x] T034 [P] [US3] `parsers/appsettings/manifest.json` + README
- [x] T035 [US3] `backend/src/services/ingest/adapters/appsettings.ingest.ts` — bindings `database` → узел `database` + `connects_to` (каждая CS, `metadata.engine`, дедуп); bindings `broker` → узел `broker` + `connects_to`; skip placeholder
- [x] T036 [US3] Регистрация + unit `backend/tests/unit/ingest/appsettings.ingest.test.ts` (multi CS fixture)
- [x] T037 [US3] Integration `backend/tests/integration/appsettings-parser.test.ts`

**Checkpoint A3**: appsettings/БД end-to-end

---

## Phase 6: User Story 6 — Фильтр слоя на экране «Граф» (Priority: P1)

**Goal**: UI `code` | `system` | `all`; правила рёбер FR-008

**Independent Test**: `quickstart.md` §5; SC-002; US6 acceptance

**Depends on**: **F1** + данные system (лучше после A1–A3)

### Implementation for User Story 6

- [x] T038 [US6] Добавить `SYSTEM_EDGE_TYPE_LABELS` и `graphEdgeTypeLabel` расширение в `frontend/src/i18n/ru.ts` по `contracts/canonical-edge-types-system.md`
- [x] T039 [US6] Контрол фильтра слоя на `frontend/src/pages/GraphPage.tsx` — `code`/`system`/`all`; persist session/local state
- [x] T040 [US6] Фильтрация узлов/рёбер в `frontend/src/components/graph/GraphSearch.tsx`, `EdgeTable.tsx`, `FileGraphPanel.tsx` (если применимо) — system↔system / code↔code / all
- [x] T041 [P] [US6] Unit `frontend/src/components/graph/GraphLayerFilter.test.tsx` (или расширить существующий graph test) — mock nodes обоих слоёв
- [x] T042 [US6] Зафиксировать в `specs/009-system-landscape/plan.md` §Constraints: фильтр слоя MVP — **client-only** (без query `layer` в `backend/src/api/routes/graph.ts`); server-side filter — follow-up post-MVP

**Checkpoint A4**: фильтр слоя работает на проекте с code+system

---

## Phase 7: User Story 4 — Ссылки между .NET-проектами (Priority: P2)

**Goal**: `.csproj`/`.sln` → `dotnet_project` + `project_reference`

**Independent Test**: US4 acceptance; integration dotnet-project

**Depends on**: **F1**

### Implementation for User Story 4

- [x] T043 [US4] Реализовать `parsers/dotnet-project/` — .NET CLI или `run.sh` + csproj/sln parse; native `contracts/native-dotnet-project.schema.json`
- [x] T044 [P] [US4] `manifest.json` + README для `dotnet-project`
- [x] T045 [US4] `backend/src/services/ingest/adapters/dotnet-project.ingest.ts` + registry + unit test + fixture
- [x] T046 [US4] Integration `backend/tests/integration/dotnet-project-parser.test.ts`

**Checkpoint A5**: project_reference в каноне

---

## Phase 8: User Story 5 — Сообщения на шине (Priority: P2)

**Goal**: bus-rabbit **или** bus-kafka (детектор); `consumes`/`publishes`

**Independent Test**: `quickstart.md` §4; US5 scenario 3 tie-break

**Depends on**: **F1** + T006 bus resolver

### Implementation for User Story 5

- [x] T047 [US5] Реализовать `parsers/bus-rabbit/` — Roslyn handlers/listeners; native `contracts/native-bus-rabbit.schema.json`
- [x] T048 [P] [US5] Реализовать `parsers/bus-kafka/` — consumers/topics; native `contracts/native-bus-kafka.schema.json`
- [x] T049 [P] [US5] manifests + README для обоих bus parsers
- [x] T050 [US5] `backend/src/services/ingest/adapters/bus-rabbit.ingest.ts` и `bus-kafka.ingest.ts` + registry
- [x] T051 [US5] Unit ingest tests для bus adapters + fixtures
- [x] T052 [US5] Integration `backend/tests/integration/bus-rabbit-parser.test.ts` (и опционально kafka-only fixture)
- [x] T053 [P] [US5] Unit/assert в `language-detector-artifacts.test.ts` — mixed signals → только `bus-rabbit` artifact entry

**Checkpoint A6**: bus end-to-end; один spawn за прогон

---

## Phase 9: Polish & Cross-Cutting

**Purpose**: Demo fixture, e2e SC-001/003/004, json-model, docs

- [x] T054 [P] Создать `docker/fixtures/repos/system-landscape-demo/` — compose + appsettings + openapi + csproj + Rabbit listener; README; golden manifest `backend/tests/fixtures/system-landscape/expected-links.json` (размеченные связи для SC-004); подключить в `docker/fixtures/repos/setup-fixtures.sh`
- [x] T055 Integration `backend/tests/integration/system-landscape-e2e.test.ts` — полный прогон demo → ≥10 system nodes, ≥8 edges (SC-001); assert SC-004: ≥90% связей из `expected-links.json` присутствуют в каноне после ingest
- [x] T056 [P] Регрессия SC-003: `backend/tests/integration/system-landscape-code-regression.test.ts` на `code-graph-depth-demo` — code graph без изменений
- [x] T057 [P] Обновить `ods-help/requirements/json-model/README.md` и `implementation_status: done` для C02, C04, P01–P07 после зелёных тестов
- [x] T058 [P] Синхронизировать `specs/006-project-graph/contracts/ingest-pipeline.md` — system adapters, `layer=system`
- [x] T059 Прогнать `specs/009-system-landscape/quickstart.md` §1–§8; отметить чеклисты при отклонениях
- [x] T060 [P] Обновить `specs/001-ods-vision/spec.md` статус этапа 8 → реализовано (после зелёного e2e, в polish)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup** → сразу
- **Phase 2 Foundational** → после Setup; **блокирует** US1–US6
- **US1 → US2 → US3** → после F1 (US2/US3 лучше после US1 для cross-link, но тестируемы с минимальным fixture)
- **US6** → после F1; **рекомендуется** после A1–A3 (есть system data)
- **US4, US5** → после F1; параллельно друг с другом после A3
- **Polish** → после A1–A6

### User Story Dependencies

| Story | Depends |
|-------|---------|
| US1 compose | F1 |
| US2 openapi | F1 (A1 для exposes) |
| US3 appsettings | F1 (A1 для connects_to→service) |
| US6 layer filter | F1; данные A1–A3 |
| US4 dotnet-project | F1 |
| US5 bus | F1 |

### Parallel Opportunities

```text
After F1:
  Dev A: US1 (T022–T027)
  Dev B: US3 appsettings parser skeleton (T033–T034) — ingest after A1 optional
  Dev C: modal artifacts UI (T017–T021) — параллельно с парсерами после T012
After A1–A3:
  Dev D: US6 (T038–T042)
  Dev E: US4 (T043–T046)
  Dev F: US5 (T047–T053)
Polish [P]: T054, T056, T057, T058, T060 parallel
```

### Parallel Example: после F1

```bash
# Параллельно:
Task: "T022 parsers/compose/run.mjs"
Task: "T028 parsers/openapi/run.mjs"
Task: "T033 parsers/appsettings/run.mjs"
```

---

## Implementation Strategy

### MVP First (F1 + US1 + US3 + US6)

1. Phase 1–2 (F1)
2. Phase 3 US1 (compose)
3. Phase 5 US3 (appsettings) — быстрая ценность БД
4. Phase 6 US6 (filter)
5. **STOP**: validate quickstart §2, §3, §5 на demo subset

### Incremental Delivery

1. F1 → artifacts pipeline
2. US1 → compose topology
3. US2 → API contracts
4. US3 → databases
5. US6 → usable UI
6. US4 → dotnet graph
7. US5 → bus
8. Polish → full demo SC-001

---

## Notes

- Canvas (`010`) — **не** делать
- `dotnet-api-routes`, `path prefix` — **не** в tasks MVP
- Детектор **не** перечисляет DB engines (FR-013); modal — сводка artifacts (вариант A)
- Фильтр слоя MVP — **client-only** (T042); golden SC-004 — `expected-links.json` (T054–T055)
- Оба bus в registry; spawn **одного** за прогон
- Все задачи в формате `- [x] Txxx ...` с путями файлов
