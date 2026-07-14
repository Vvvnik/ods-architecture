# Tasks: Глубина code-графа (008)

**Input**: `specs/008-code-graph-depth/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅ (clarify 2026-07-14); `005`/`006`/`007` реализованы в коде

**Tests**: В spec — FR-010 / SC-001…005 и критерий готовности черновика (unit + integration); по `plan.md` — Vitest unit ingest + integration parser→ingest; смоук — `quickstart.md`

**Organization**: По user stories spec.md (US1 C# calls P1 → US2 TS calls P1 → US3 v1 compat P1 → US4 injects P2 → US5 UI P2)

**Согласование с кодом**: Phase 2 — расширить shared symbols ingest и `EdgeType` (без новых индексов/UI)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимости от незавершённых)
- **[Story]**: US1–US5 из spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Точки расширения без нового пакета/репо

- [X] T001 Зафиксировать карту затрагиваемых файлов в `specs/008-code-graph-depth/research.md` секция `## R11. Code reuse audit` — `parsers/typescript/run.mjs`, `parsers/csharp/Ods.CSharpParser/*`, `backend/src/domain/graph-edge.ts`, `backend/src/services/ingest/types.ts`, `backend/src/services/ingest/adapters/symbols-model.ingest.ts`, thin `typescript.ingest.ts`/`csharp.ingest.ts`, fixtures `backend/tests/fixtures/ingest/*`
- [X] T002 [P] Проверить: **не** добавлять npm/NuGet зависимости без нужды (TS checker уже в `parsers/typescript`; Roslyn — в проекте csharp); обосновать в research R11 при отклонении

---

## Phase 2: Foundational — канон рёбер + ingest v1/v2

**Purpose**: `injects` в EdgeType; dual `['1','2']`; usages→edges; `metadata.layer=code` — блокирует все US

**⚠️ CRITICAL**: User story work не начинается до checkpoint **F1**

- [X] T003 [P] Добавить `'injects'` в `EdgeType` в `backend/src/domain/graph-edge.ts` и в allowlist `isEdgeType` в `backend/src/services/ingest/types.ts` по `contracts/canonical-edge-types.md`
- [X] T004 [P] Синхронизировать enum `type` (+ `injects`) в `ods-help/requirements/json-model/canonical-edge-code.schema.json` и при наличии зеркала в `specs/006-project-graph/contracts/canonical-schemas.json` — note `implementation_status` / 008
- [X] T005 Расширить `backend/src/services/ingest/adapters/symbols-model.ingest.ts`: `supported_schema_versions: ['1','2']`; обработка `model.usages[]` (`calls`|`injects` → рёбра); резолюция from/to по map qn; skip если конец не найден; игнор прочих usage types — `contracts/ingest-symbols-v2.md`
- [X] T006 В том же адаптере (или helper рядом): при upsert узлов/рёбер мержить `metadata.layer = 'code'` (сохранять `parent_qualified_name` и др.) — FR-008 / research R7
- [X] T007 [P] Обновить комментарии thin-адаптеров `backend/src/services/ingest/adapters/typescript.ingest.ts` и `csharp.ingest.ts` (v1+v2 via shared). Shared symbols-адаптер: `supported_schema_versions: ['1','2']` для **всех** языков (typescript/csharp/python/cpp) — python/cpp по-прежнему эмитят только v1, dual versions без вреда (research R11)
- [X] T008 [P] Unit-регрессия ingest v1: обновить ожидания metadata в `backend/tests/unit/ingest/typescript.ingest.test.ts` и `csharp.ingest.test.ts` (допустимо `layer=code`); добавить кейс v2 usages→`calls` в новом или том же файле `backend/tests/unit/ingest/symbols-model-v2.ingest.test.ts` с fixture `backend/tests/fixtures/ingest/typescript-model-v2.json` (минимальный usages calls)

**Checkpoint F1**: `injects` в домене; ingest принимает schema 2 и пишет `calls`; v1 тесты зелёные; layer на новых документах transform

---

## Phase 3: User Story 1 — Вызовы в C# (Priority: P1) 🎯 MVP

**Goal**: Парсер C# v2 извлекает однозначные `calls` → ingest → канон

**Independent Test**: `quickstart.md` §1; SC-001 — ребро `calls` на multi-file fixture Create→Save (cross-file)

**Depends on**: **F1**

### Implementation for User Story 1

- [X] T009 [US1] Добавить DTO `Usage` и поддержку `Usages` в model в `parsers/csharp/Ods.CSharpParser/Models.cs`
- [X] T010 [US1] Выставить `SchemaVersion = "2"` в `parsers/csharp/Ods.CSharpParser/Program.cs` и `"schema_version": "2"` в `parsers/csharp/manifest.json`
- [X] T011 [US1] Реализовать извлечение вызовов (SemanticModel / InvocationExpression) в `parsers/csharp/Ods.CSharpParser/CSharpExtractor.cs` — только однозначные цели; неоднозначность → не писать usage (FR-006)
- [X] T012 [P] [US1] Пилотный исходник fixture **обязательно multi-file** в `backend/tests/fixtures/parsers/csharp-calls/` — метод `Create` в одном файле вызывает однозначный `Save` в **другом** файле того же прогона (US1 A3 / research R4: оба символа в одном envelope)
- [X] T013 [US1] Integration `backend/tests/integration/csharp-parser-calls.test.ts` — CLI → envelope `schema_version=2` + usages `calls`; **MUST** ingest → assert ребро `type=calls` в каноне/ES (harness как `graph-ingest`); assert cross-file from/to
- [X] T014 [P] [US1] Fixture envelope/model `backend/tests/fixtures/ingest/csharp-model-v2.json` (+ optional `envelope-csharp-v2.json`) для unit/ingest без полного Roslyn

**Checkpoint A1**: C# fixture даёт `calls` в envelope и в каноне

---

## Phase 4: User Story 2 — Вызовы в TypeScript (Priority: P1)

**Goal**: Парсер TS v2 + checker → однозначные `calls`

**Independent Test**: `quickstart.md` §2; SC-002

**Depends on**: **F1** (можно параллельно с US1 после F1)

### Implementation for User Story 2

- [X] T015 [US2] Выставить `schema_version: "2"` в envelope write и `parsers/typescript/manifest.json`; расширить emit `usages[]` в `parsers/typescript/run.mjs`
- [X] T016 [US2] Извлечение calls через TypeScript type checker в `parsers/typescript/run.mjs` (или выделенный модуль рядом, напр. `parsers/typescript/extract-usages.mjs`) — skip unresolved/ambiguous
- [X] T017 [P] [US2] Пилотный fixture **обязательно multi-file** в `backend/tests/fixtures/parsers/typescript-calls/` — caller в одном файле → однозначный callee в другом (паритет US1 A3 / R4)
- [X] T018 [US2] Integration `backend/tests/integration/typescript-parser-calls.test.ts` — CLI → v2 + usages; **MUST** ingest → assert ребро `type=calls` в каноне/ES; assert cross-file from/to
- [X] T019 [P] [US2] Fixture `backend/tests/fixtures/ingest/typescript-model-v2.json` уже из T008 — дополнить до паритета с csharp-model-v2 при необходимости

**Checkpoint A2**: TS fixture даёт `calls` end-to-end

---

## Phase 5: User Story 3 — Совместимость envelope v1 (Priority: P1)

**Goal**: v1 envelope → канон как до 008; смесь v1/v2 не роняет прогон

**Independent Test**: SC-003; unit fixtures v1; `quickstart.md` §5

**Depends on**: **F1** (логически после US1/US2 желательно, но тестируемо сразу после F1)

### Implementation for User Story 3

- [X] T020 [US3] Явный regression-набор: убедиться что `backend/tests/fixtures/ingest/typescript-model-v1.json`, `csharp-model-v1.json`, `envelope-typescript-v1.json` проходят transform/ingest без требования `usages`
- [X] T021 [US3] Unit/integration кейс «смесь»: один transform v2 usages + отдельный v1 model того же `parser_id` политики не затирают чужой язык — расширить `backend/tests/unit/ingest/` или `graph-ingest.test.ts` по `contracts/ingest-symbols-v2.md`
- [X] T022 [P] [US3] Проверить registry: неизвестная version по-прежнему ошибка; `"1"` и `"2"` accepted для typescript/csharp в `backend/tests/unit/ingest/ingest-registry.service.test.ts` (или аналог)

**Checkpoint A3**: SC-003 закрыт тестами

---

## Phase 6: User Story 4 — DI injects в C# (Priority: P2)

**Goal**: Constructor injection → канон `injects`

**Independent Test**: `quickstart.md` §3; US4 acceptance

**Depends on**: **F1** + желательно US1 (тот же extractor)

### Implementation for User Story 4

- [X] T023 [US4] Эвристика ctor DI в `parsers/csharp/Ods.CSharpParser/CSharpExtractor.cs` — usage `injects` class→param type при разрешённом типе проекта; примитивы/нерезолв — skip
- [X] T024 [P] [US4] Расширить fixture `csharp-calls` (или `csharp-injects/`) классом с ctor(IRepo)
- [X] T025 [US4] Тесты: unit ingest usage injects→edge в `backend/tests/unit/ingest/symbols-model-v2.ingest.test.ts`; integration parser assert `injects` в envelope/каноне
- [X] T026 [P] [US4] Негатив: параметр `int`/неизвестный тип — нет ребра `injects` (тест в integration или extractor unit)

**Checkpoint A4**: `injects` виден в каноне на DI-fixture

---

## Phase 7: User Story 5 — Поиск/просмотр новых рёбер (Priority: P2)

**Goal**: `calls`/`injects` доступны через UI/API `007` без нового экрана

**Independent Test**: `quickstart.md` §6; SC-004

**Depends on**: US1 или US2 (данные `calls` в ES)

### Implementation for User Story 5

- [X] T027 [US5] Смоук API: integration assert — после ingest v2 `GET` edges/search возвращает `type=calls` (расширить `backend/tests/integration/graph-search.test.ts` или `graph-file-dependencies.test.ts`) — **без** новых frontend компонентов
- [X] T028 [P] [US5] Пройти вручную `quickstart.md` §6 на пилоте (compose full) и коротко отметить результат в `specs/008-code-graph-depth/quickstart.md` (чекбокс/note) — опционально если CI уже покрыл T027

**Checkpoint A5**: SC-004 закрыт (тест и/или ручной смоук)

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: Неоднозначность, манифесты, json-model статусы, docs

- [X] T029 [P] Fixture + тест неоднозначных перегрузок (C# и/или TS) — нет `calls` usage/ребра; прогон success — `backend/tests/fixtures/parsers/` + integration (SC-005)
- [X] T030 [P] Обновить `ods-help/requirements/json-model/README.md` и `native-symbols-v2.schema.json` `implementation_status` → done после зелёных тестов; зеркало в `specs/008-code-graph-depth/contracts/`
- [X] T031 [P] Обновить `parsers/typescript/README.md` и при наличии csharp README — schema v2, usages
- [X] T032 Прогнать сценарии `quickstart.md` §1–5; поправить пробелы в тестах/доках при отклонениях
- [X] T033 [P] Убедиться что python/cpp parsers по-прежнему `schema_version: "1"` и ingest v1 зелёный (`backend/tests/unit/ingest/python.ingest.test.ts`, `cpp.ingest.test.ts`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup** → сразу
- **Phase 2 Foundational** → после Setup; **блокирует** US1–US5
- **US1 / US2 / US3** → после F1; US1∥US2; US3 можно сразу после F1
- **US4** → после F1 (+ лучше после US1 extractor)
- **US5** → после появления `calls` в каноне (US1 или US2)
- **Polish** → после нужных US

### User Story Dependencies

| Story | Depends |
|-------|---------|
| US1 C# calls | F1 |
| US2 TS calls | F1 |
| US3 v1 compat | F1 |
| US4 injects | F1 (+ US1 желательно) |
| US5 UI/API | US1 или US2 |

### Parallel Opportunities

```text
After F1:
  Dev A: US1 (T009–T014)
  Dev B: US2 (T015–T019)
  Dev C: US3 (T020–T022)
Then: US4 → US5 → Polish [P] tasks
```

### Parallel Example: после F1

```bash
# Параллельно:
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
4. Далее US2 → US3 → US4 → US5 → Polish

### Incremental Delivery

1. F1 → ingest понимает v2
2. US1 → ценность C# calls
3. US2 → паритет TS
4. US3 → страховка v1
5. US4 → DI injects
6. US5 → видимость в существующем UI/API

---

## Notes

- Новый UI / OpenAPI экраны — **не** делать (FR-007)
- `creates`/`references` extract — **не** в задачах MVP (FR-012)
- Все задачи в формате `- [ ] Txxx ...` с путями файлов
- Язык tasks — русский
