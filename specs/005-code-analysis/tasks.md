# Tasks: Анализ кода — детектор, оркестратор, парсеры

**Input**: `specs/005-code-analysis/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅; MVP `002` + `003` реализованы (sync, портал)

**Tests**: Не запрошены в spec; приёмка — `quickstart.md` (SC-001–SC-005); Vitest unit — в Polish (опционально)

**Organization**: По user stories spec.md; backend + `parsers/` + расширение `frontend/`

**Согласование**: `002` — sync/WC/DELETE; `003` — post-sync UX; `006` — ingest (не в scope)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно
- **[Story]**: US1–US5 из spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Каталог парсеров, конфиг, Docker

- [x] T001 Создать структуру `parsers/` по `contracts/parser-manifest.md` (`typescript/`, README в корне `parsers/README.md`)
- [x] T002 Расширить `backend/src/config.ts` — `PARSERS_ROOT`, `ANALYSIS_PARSER_TIMEOUT_MS`, `ANALYSIS_MAX_PARALLEL_PARSERS` (default 2), denylist каталогов детектора
- [x] T003 [P] Обновить `docker/docker-compose.dev.yml` — volume mount `./parsers` → `/app/parsers` для сервиса backend (профиль `full`)
- [x] T004 [P] Обновить `backend/Dockerfile` — `COPY parsers/` в образ (production path)
- [x] T005 [P] Добавить в `docker/.env.example` переменные `PARSERS_ROOT`, `ANALYSIS_PARSER_TIMEOUT_MS`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Домен, ES-индексы, репозитории, реестр, ошибки — блокирует все user stories

**⚠️ CRITICAL**: User story work не начинается до checkpoint **F1**

- [x] T006 Реализовать `backend/src/domain/language-report.ts` — типы LanguageReport, LanguageEntry, parser_status
- [x] T007 [P] Реализовать `backend/src/domain/analysis-run.ts` — AnalysisRun, ChangeSet, ParserResultSummary, статусы
- [x] T008 [P] Реализовать `backend/src/domain/parser-envelope.ts` — ParserEnvelope (обёртка, без валидации `model`)
- [x] T009 Добавить коды в `backend/src/domain/errors.ts` — `analysis_in_progress`, `language_report_not_found`, `analysis_run_not_found`
- [x] T010 Расширить `backend/src/infra/elasticsearch.ts` — bootstrap индексов `ods-language-reports`, `ods-analysis-runs`, `ods-parser-envelopes`, `ods-sync-snapshots` по `contracts/elasticsearch-indices.md`
- [x] T011 [P] Реализовать `backend/src/repositories/language-report.repository.ts` — save, getLatestByProjectId, listByProjectId
- [x] T012 [P] Реализовать `backend/src/repositories/analysis-run.repository.ts` — create, update, getById, listByProjectId
- [x] T013 [P] Реализовать `backend/src/repositories/parser-envelope.repository.ts` — save, listByRunId
- [x] T014 [P] Реализовать `backend/src/repositories/sync-snapshot.repository.ts` — upsert/get по `project_id`
- [x] T015 Реализовать `backend/src/services/parser-registry.service.ts` — сканирование `parsers/*/manifest.json`, zod-валидация, map language→parser_id
- [x] T016 Создать каркас `backend/src/api/routes/analysis.ts` и зарегистрировать в `backend/src/index.ts` под префиксом `/api/v1/projects/:projectId/analysis`
- [x] T017 [P] Добавить zod-схемы запросов/ответов анализа в `backend/src/api/schemas/analysis.schemas.ts` по `contracts/openapi-analysis.yaml`
- [x] T018 [P] Расширить `specs/002-domain-model/contracts/openapi.yaml` — merge paths/components из `specs/005-code-analysis/contracts/openapi-analysis.yaml` (версия 1.1.0 → 1.2.0)

**Checkpoint F1**: ES поднимает 4 новых индекса; `ParserRegistryService` читает manifest (пустой каталог — ok)

---

## Phase 3: User Story 1 — Автоопределение языков после sync (Priority: P1) 🎯 MVP

**Goal**: После sync — отчёт по языкам в ES; парсеры не стартуют автоматически

**Independent Test**: `quickstart.md` §2 — GET `language-report/latest`; языки по `file_count` ↓; Go → `missing`

**Инкремент плана**: **A** (backend)

### Implementation for User Story 1

- [x] T019 [US1] Реализовать `backend/src/services/language-detector.service.ts` — обход WC, таблица расширений, shebang, маркеры `package.json`/`*.csproj`, denylist, сортировка FR-004; edge: пустой репо / только бинарники → пустой или минимальный отчёт; целевой SC-001 — <30 с на 10k файлов
- [x] T020 [US1] Интегрировать детектор с `ParserRegistryService` — `parser_id`, `parser_status` (`available`/`missing`); перенос `failed` из последнего `analysis_run` по языку (FR-003)
- [x] T021 [US1] Добавить post-sync hook в `backend/src/services/sync.service.ts` — после `success`/`partial` вызвать детектор и сохранить отчёт; обновить sync-snapshot (для US4)
- [x] T022 [US1] Реализовать `GET /api/v1/projects/:projectId/analysis/language-report/latest` в `backend/src/api/routes/analysis.ts` — включая `parser_status: failed` при неуспешном прошлом прогоне
- [x] T023 [P] [US1] Unit-тесты детектора в `backend/tests/unit/language-detector.service.test.ts` — сортировка, расширения, missing parser

**Checkpoint A1**: curl language-report после sync; без UI

---

## Phase 4: User Story 2 — Подтверждение анализа в UI (Priority: P1)

**Goal**: Два модальных окна после sync; отмена не запускает парсеры

**Independent Test**: `contracts/analysis-ui.md` — sync → окно 1 → окно 2 → отмена на шаге 1/2 не вызывает POST runs

**Depends on**: **A1** (отчёт); change-set API (T024–T025) для окна 2

**Инкремент плана**: **A** (UI окно 1) + **B** (окно 2)

### Implementation for User Story 2

- [x] T024 [US2] Реализовать `backend/src/services/change-set.service.ts` — diff snapshot vs текущее дерево файлов; `added`/`modified`/`deleted`; флаг `incremental`
- [x] T025 [US2] Реализовать `GET /api/v1/projects/:projectId/analysis/change-set` в `backend/src/api/routes/analysis.ts`
- [x] T026 [P] [US2] Сгенерировать/дополнить типы в `frontend/src/api/types.ts` из обновлённого OpenAPI (analysis endpoints)
- [x] T027 [P] [US2] Реализовать `frontend/src/api/analysis.ts` — `getLatestLanguageReport`, `getChangeSet`
- [x] T028 [US2] Реализовать `frontend/src/hooks/useAnalysis.ts` — состояние цепочки модалей, загрузка report/changeSet
- [x] T029 [US2] Реализовать `frontend/src/components/analysis/LanguagesConfirmModal.tsx` по `contracts/analysis-ui.md` — список, badges, подсветка новых языков; «Отмена» закрывает без дальнейших шагов (FR-015)
- [x] T030 [US2] Реализовать `frontend/src/components/analysis/ChangesConfirmModal.tsx` — секции added/modified/deleted; «Отмена» — без POST runs, прежний анализ не затрагивается (FR-015)
- [x] T031 [US2] Интегрировать цепочку модалей в `frontend/src/hooks/useSync.ts` или `frontend/src/pages/WorkspacePage.tsx` — триггер после `sync_status` → success|partial; при пустом `languages[]` — тост, модали не показывать
- [x] T032 [US2] Добавить русские строки анализа в `frontend/src/i18n/ru.ts` по `contracts/analysis-ui.md`

**Checkpoint A2**: после sync показывается окно 1; «Отмена» — без POST runs

**Checkpoint B1**: окно 2 с change set; «Отмена» на шаге 2 сохраняет прежний анализ

---

## Phase 5: User Story 3 — Модульные парсеры и оркестрация (Priority: P1)

**Goal**: Spawn модулей по порядку `file_count`; envelope в ES; missing не роняет прогон

**Independent Test**: `quickstart.md` §4–§5 — POST runs → envelopes; порядок spawn по отчёту (§6)

**Depends on**: **B1** (UI confirm); stub или real parser

**Инкремент плана**: **B** (оркестратор) + **C** (реальный TS-модуль — см. US5 T043+)

### Implementation for User Story 3

- [x] T033 [US3] Реализовать `backend/src/services/analysis-orchestrator.service.ts` — lock per project (`analysis_in_progress`), create AnalysisRun со snapshot `change_set` (`added`/`modified`/`deleted`) и флагом `incremental` из `change-set.service.ts` при `POST runs`, очередь по языкам из отчёта
- [x] T034 [US3] Добавить spawn subprocess в `analysis-orchestrator.service.ts` — argv из manifest, таймаут, сбор exit code/stderr
- [x] T035 [US3] Валидация envelope (обёртка only) по `contracts/envelope-schema.json` и сохранение в `parser-envelope.repository.ts`
- [x] T036 [US3] Обновление `parser_results` и финальный статус run (`success`/`partial`/`failed`) в `analysis-orchestrator.service.ts`
- [x] T037 [US3] Реализовать `POST /api/v1/projects/:projectId/analysis/runs` и `GET .../runs/:runId` в `backend/src/api/routes/analysis.ts` (409 при sync/analysis running)
- [x] T038 [US3] Реализовать `GET .../runs/:runId/envelopes` в `backend/src/api/routes/analysis.ts`
- [x] T039 [US3] Подключить `POST runs` в `frontend/src/hooks/useAnalysis.ts` **только** после «Продолжить» окна 2 (не при «Отмена»); polling статуса каждые 2 с
- [x] T040 [P] [US3] Создать stub `parsers/stub/manifest.json` + `parsers/stub/run.mjs` для интеграционных тестов оркестратора (временно, до T047)
- [x] T041 [P] [US3] Integration-тест оркестратора в `backend/tests/integration/analysis-orchestrator.test.ts` — stub parser, порядок по file_count

**Checkpoint B2**: POST runs + stub → envelope в ES

---

## Phase 6: User Story 4 — Инкрементальный анализ (Priority: P2)

**Goal**: Повторный sync → парсеры получают только изменённые файлы своего языка

**Independent Test**: `quickstart.md` §8 — правка одного файла → в spawn передаётся только он

**Depends on**: **B2** (оркестратор)

### Implementation for User Story 4

- [X] T042 [US4] Доработать `change-set.service.ts` — классификация путей по языку детектора для передачи в парсер
- [X] T043 [US4] Доработать `analysis-orchestrator.service.ts` — при `incremental=true` передавать в модуль только пересечение change set и файлов языка; при первом анализе — полный набор
- [X] T044 [US4] Обработка `deleted` в change set — логирование в `005`; удаление узлов/рёбер графа — ingest `006` (`006` T045–T046, hook `006` T021). **Критерий закрытия:** реализованы `006` T021 + US4 ingest
- [X] T045 [P] [US4] Unit-тест инкремента в `backend/tests/unit/change-set.service.test.ts`

**Checkpoint I1**: инкрементальный прогон быстрее полного на пилотном репо (SC-003)

---

## Phase 7: User Story 5 — Поэтапная поставка парсер-модулей (Priority: P2)

**Goal**: Модули typescript → csharp → python → cpp; runtime-порядок из отчёта

**Independent Test**: каждый модуль — envelope с непустым `model`; репо с доминирующим Python → python spawn первым (US5 сценарий 3)

**Инкремент плана**: **C** (TS), **D** (C#), **E** (Python), **F** (C++)

### Implementation — модуль `typescript` (инкремент C)

- [X] T046 [US5] Создать `parsers/typescript/manifest.json` по `contracts/parser-manifest.md`
- [X] T047 [US5] Реализовать `parsers/typescript/run.mjs` — TS Compiler API, CLI args, запись envelope, native `model` v1
- [X] T048 [US5] Добавить `parsers/typescript/README.md` — локальный запуск и пример выхода
- [X] T049 [P] [US5] Удалить или отключить `parsers/stub/` после прохождения тестов с `parsers/typescript` (T047)

**Checkpoint C1**: репозиторий с `.ts` → envelope `parser_id=typescript`

### Implementation — модуль `csharp` (инкремент D)

- [X] T050 [US5] Создать `parsers/csharp/manifest.json` и `parsers/csharp/run.sh` (Roslyn CLI)
- [X] T051 [US5] Реализовать Roslyn extract в `parsers/csharp/` — envelope + `model` v1
- [X] T052 [P] [US5] Обновить `backend/Dockerfile` — установка .NET runtime для subprocess (или документировать sidecar в `parsers/csharp/README.md`)

**Checkpoint D1**: `.cs` файлы → envelope `parser_id=csharp`

### Implementation — модуль `python` (инкремент E)

- [X] T053 [US5] Создать `parsers/python/manifest.json` и `parsers/python/run.sh`
- [X] T054 [US5] Реализовать Python extract (ast/libcst) в `parsers/python/` — envelope + `model` v1

**Checkpoint E1**: `.py` файлы → envelope `parser_id=python`

### Implementation — модуль `cpp` (инкремент F)

- [X] T055 [US5] Создать `parsers/cpp/manifest.json` и `parsers/cpp/run.sh`
- [X] T056 [US5] Реализовать C++ extract (libclang/tree-sitter — выбор в README) в `parsers/cpp/`

**Checkpoint F1**: `.cpp` файлы → envelope `parser_id=cpp`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: DELETE каскад, Docker e2e, документация, приёмка

- [X] T057 Расширить `backend/src/services/project.service.ts` DELETE — delete_by_query по индексам 005 (`ods-language-reports`, `ods-analysis-runs`, `ods-parser-envelopes`, `ods-sync-snapshots`); координация с каскадом графа `006` T053; см. `specs/005-code-analysis/data-model.md` §DELETE
- [x] T058 [P] Добавить в `specs/002-domain-model/data-model.md` (§Удаление проекта) cross-ref на каскад индексов `005` — выполнено (analyze 2026-07-09)
- [X] T059 [P] Обновить `specs/003-portal-mvp/contracts/api-consumer.yaml` — зеркало analysis endpoints из OpenAPI `002` после merge
- [X] T060 Запустить сценарии `specs/005-code-analysis/quickstart.md` на `docker compose --profile full` — зафиксировать результат в `ods-help/user-guide/implement-feedback-guide.md` при находках
- [X] T061 [P] Опционально: e2e Playwright `frontend/tests/e2e/analysis-flow.spec.ts` — sync → 2 модали → success toast (SC-004)
- [X] T062 [P] Опционально: benchmark детектора в `backend/tests/performance/language-detector.bench.ts` — SC-001 (10k файлов, <30 с)
- [X] T063 [P] Обновить `ods-help/user-guide/commands.md` — шаг `speckit-implement specs/005-code-analysis`

---

## Phase 9: Convergence

- [X] T064 Обновить статус в `specs/005-code-analysis/spec.md` — отразить реализованный scope (US1–US4, TS+C#; Python/C++ и Phase 8 polish в работе) per spec header (partial)
- [X] T065 [P] Добавить integration-тест в `backend/tests/integration/project-delete-analysis.test.ts` — после DELETE count=0 в `ods-language-reports`, `ods-analysis-runs`, `ods-parser-envelopes`, `ods-sync-snapshots` per `data-model.md` §DELETE (missing; зависит от T057)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US2 (4)** → **US3 (5)** → **US4 (6)** → **US5 (7)** → **Polish (8)**
- US2 окно 2 зависит от T024 (change-set) в той же фазе — выполнять T024–T025 перед T030

### User Story Dependencies

| Story | Зависит от | Checkpoint |
|-------|------------|------------|
| US1 | F1 | A1 |
| US2 | A1, T024–T025 | A2, B1 |
| US3 | B1 | B2 |
| US4 | B2 | I1 |
| US5 | B2 (оркестратор); модули независимы друг от друга | C1–F1 |

### Parallel Opportunities

- Phase 1: T003, T004, T005 параллельно
- Phase 2: T007–T008, T011–T014, T017–T018 параллельно после T006/T009
- US1: T023 параллельно после T022
- US2: T026–T027 параллельно; T029–T030 параллельно после T028
- US3: T040–T041 параллельно после T037
- US5: инкременты D/E/F параллельны **после C1** разными разработчиками

### Parallel Example: Foundational

```bash
# Параллельно после T006:
T007 domain/analysis-run.ts
T008 domain/parser-envelope.ts
T011 language-report.repository.ts
T012 analysis-run.repository.ts
```

### Parallel Example: US5 modules (после C1)

```bash
# Разные разработчики:
T050–T052 csharp
T053–T054 python
T055–T056 cpp
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1–2 → F1
2. Phase 3 (US1) → **A1**
3. **STOP**: API отчёта после sync без UI анализа

### Инкремент A (детектор + окно языков)

1. F1 → US1 → US2 (T024–T029, T031–T032) → **A2**

### Инкремент B (подтверждение + оркестратор)

1. US2 (T030, T025) → US3 → **B2** со stub parser

### Инкремент C–F (парсеры)

1. US4 (инкремент) → US5 typescript (**C1**) → csharp/python/cpp по приоритету бизнеса

### Полная приёмка

1. Все checkpoint C1–F1 + quickstart.md + SC-001–SC-005

---

## Notes

- **Порядок запуска** парсеров — из отчёта (`file_count`), не порядок поставки модулей
- **006** ingest — `006` T021 (не путать с **005** T021 = post-sync hook детектора); T044 закрывается при merge `006` US1+US4
- Stub parser (T040) — только до готовности `parsers/typescript` (T047, удаление stub — T049)
- Коды ошибок и русские сообщения — в `error-handler.ts` + `i18n/ru.ts`
- `[P]` — разные файлы, нет зависимости от незавершённых задач в той же группе
