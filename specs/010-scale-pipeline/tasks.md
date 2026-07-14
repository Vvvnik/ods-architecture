# Tasks: Масштабирование пайплайна (010)

**Input**: `specs/010-scale-pipeline/` — plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅ (sync clarify session 2), spec.md ✅; `005`–`009` реализованы

**Tests**: SC-001…007 + quickstart — unit inventory/progress; **integration walk-count на large-repo (≥1000 файлов)**; **SC-003 full vs incremental measure**; large-repo timing ≤900s; frontend progress; Vitest

**Organization** (по priority, не по номеру US): US1 inventory P1 → US2 progress+metrics P1 → US3 C# P1 → US5 ingest P1 → US4 orchestrator P2 → US6 graph UI P2 → US7 SDK follow-up P3 → Polish DoD

**Clarify session 2 (закрыто в spec/plan)**: walk-scope = inventory из sync; SC-002 gate = large-repo; SC-003 = обязательный замер; SC-005 = max large-repo (10k ориентир); sync progress = только этап; progress_phase = `queued|parsing|ingest|done`

**Согласование с кодом**: инкременты A–F плана; без новых индексов графа; `009` spec не трогать; US7 только tracking

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимости от незавершённых)
- **[Story]**: US1–US7 из spec.md

**Язык**: русский (конституция)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Карта файлов, large-repo fixture, сверка acceptance

- [ ] T001 Зафиксировать карту reuse в `specs/010-scale-pipeline/research.md` (секция `## R9. Code reuse audit`) — `sync.service.ts`, `file-inventory` target, `language-detector.service.ts`, `change-set.service.ts`, `analysis-orchestrator.service.ts`, `analysis-run.ts`, `analysis.schemas.ts`, `useAnalysis.ts`, `WorkspacePage.tsx`, `GraphPage.tsx`, `GraphNodeTree.tsx`, `GraphSearch.tsx`
- [ ] T002 [P] Проверить/документировать создание `large-repo` (≥1000 файлов) через `docker/fixtures/repos/setup-fixtures.sh --demo` в `docker/fixtures/repos/README.md` (пути `/repos/large-repo`, без внешнего эталона в git)
- [ ] T003 [P] Сверить `specs/010-scale-pipeline/quickstart.md` §§1–3 и `contracts/scale-acceptance.md` (walk gate large-repo, SC-003 таблица, SC-005)

---

## Phase 2: Foundational — типы progress + inventory helper (BLOCKER)

**Purpose**: Доменные типы и shared walk helper до US

**⚠️ CRITICAL**: User story work не начинается до checkpoint **F1**

- [ ] T004 Добавить progress-поля в `backend/src/domain/analysis-run.ts` по `data-model.md` — `progress_phase` канон `queued|parsing|ingest|done` (без `detecting`/`sync`), `progress_active_parser_id`, `progress_parsers_completed`, `progress_parsers_total`, `progress_updated_at`
- [ ] T005 [P] Расширить zod `analysisRunSchema` в `backend/src/api/schemas/analysis.schemas.ts` — optional progress fields
- [ ] T006 [P] Зеркало типов progress в `frontend/src/api/analysis-types.ts`
- [ ] T007 Реализовать shared `buildFileInventory` / walk helper в `backend/src/services/file-inventory.service.ts` по `contracts/file-inventory.md` — denylist, path+mtime+size, `source: sync_walk|reuse`
- [ ] T008 Unit `backend/tests/unit/file-inventory.service.test.ts` — denylist; deterministic sort paths
- [ ] T009 [P] i18n прогресса в `frontend/src/i18n/ru.ts` — «Синхронизация…»; «Анализ: {parser} ({n}/{m})» по `contracts/analysis-run-progress.md`

**Checkpoint F1**: типы progress; inventory helper + unit; i18n keys

---

## Phase 3: User Story 1 — Один снимок файлов на цикл (Priority: P1) 🎯 MVP

**Goal**: ≤1 full WC walk на цикл sync+подготовки: sync строит inventory; detector/change-set только reuse (FR-001 / SC-002)

**Independent Test**: unit reuse без второго walk; **DoD assert на large-repo ≥1000 файлов** (`contracts/file-inventory.md`)

**Depends on**: **F1**

### Tests

- [ ] T010 [P] [US1] Unit `backend/tests/unit/file-inventory-reuse.test.ts` — detector+changeset на одном inventory без второго walk (регрессия, **не** закрывает SC-002)
- [ ] T011 [US1] Integration **DoD SC-002** `backend/tests/integration/file-inventory-walk-count-large-repo.test.ts` — цикл sync+detect+changeset на **large-repo (≥1000 файлов)** → `walk_count ≤ 1`; `skipIf` только если fixture нет — **не** считать PASS (тогда закрытие через T047 таблицу walk_count / T048; см. `contracts/scale-acceptance.md` §A skipIf)

### Implementation

- [ ] T012 [US1] Публиковать inventory из `backend/src/services/sync.service.ts` при sync walk — `source: sync_walk` (primary path R1 / clarify Option A)
- [ ] T013 [US1] Подключить inventory в `backend/src/services/language-detector.service.ts` — `detectLanguages` / artifacts через inventory (убрать лишний `walkDirectory`+`listAllFilePaths` в том же цикле)
- [ ] T014 [US1] Подключить inventory в `backend/src/services/change-set.service.ts` — `buildChangeSet` / current files = inventory reuse
- [ ] T015 [US1] Оркестратор: spawn/file lists из inventory/changeset в `backend/src/services/analysis-orchestrator.service.ts` (без прямого `listAllFilePaths` walk)

**Checkpoint A1**: SC-002 зелёный на **large-repo** (или skipIf + пометка); unit reuse зелёный

---

## Phase 4: User Story 2 — Измеримый прогон, критерии и прогресс (Priority: P1)

**Goal**: Progress analysis = этап+парсер/N из M; sync = только этап; метрики/quickstart; DoD smoke checklist (FR-002/009/013, SC-001/006/007)

**Independent Test**: UI poll N/M на analysis; sync «Синхронизация…»; quickstart §2–4, §7

**Depends on**: **F1** (желательно A1)

### Tests

- [ ] T016 [P] [US2] Unit `backend/tests/unit/analysis-run-progress.test.ts` — patch progress fields / phase enum
- [ ] T017 [P] [US2] Frontend test `frontend/src/hooks/useAnalysis.progress.test.ts` (или component) — этап + N/M; sync без обязательного N/M

### Implementation

- [ ] T018 [US2] `AnalysisRunRepository` patch progress в `backend/src/repositories/analysis-run.repository.ts` (+ mapping ES в `backend/src/infra/elasticsearch.ts` при необходимости)
- [ ] T019 [US2] Оркестратор обновляет progress при старте run / старте-финише parser / ingest в `backend/src/services/analysis-orchestrator.service.ts`
- [ ] T020 [US2] GET run сохраняет progress fields — `backend/src/api/routes/analysis.ts`
- [ ] T021 [US2] UI: `frontend/src/hooks/useAnalysis.ts` + `WorkspacePage.tsx` / `GraphPage.tsx` — analysis: этап+parser+N/M; sync: только этап (существующий `sync_status`); i18n T009
- [ ] T022 [P] [US2] Additive progress fields в `specs/005-code-analysis/contracts/openapi-analysis.yaml`

**Checkpoint A2**: SC-007 на ручном прогоне ≥30 с; schema API готов

---

## Phase 5: User Story 3 — Крупный C# monorepo без тихого провала (Priority: P1)

**Goal**: timeout + partial с понятными `parser_results`; incremental paths (FR-003/004); подготовка к SC-003 measure

**Independent Test**: C# multi-project / large-repo csharp subset; timeout не hang; paths incremental

**Depends on**: A2 (progress виден при длинном csharp)

### Tests

- [ ] T023 [P] [US3] Unit таймаута в `backend/tests/unit/analysis-orchestrator-timeout.test.ts` (mock spawn) — failed/partial с message
- [ ] T024 [US3] Incremental path classification `.cs` в `backend/tests/unit/change-set.service.test.ts` (+ расширить при регрессии)

### Implementation

- [ ] T025 [US3] Оркестратор: гарантировать `parser_results` entry при timeout/crash в `backend/src/services/analysis-orchestrator.service.ts`
- [ ] T026 [US3] Сверить `parsers/csharp/manifest.json` `timeout_ms` с `ANALYSIS_PARSER_TIMEOUT_MS`; заметка в `specs/010-scale-pipeline/quickstart.md`
- [ ] T027 [US3] Incremental spawn csharp использует `pathsForLanguage` / inventory — `backend/src/services/analysis-orchestrator.service.ts` (+ связанные списки файлов)

**Checkpoint A3**: C# fail/timeout → явный статус; path incremental готов (замер SC-003 — Phase 10)

---

## Phase 6: User Story 5 — Ingest и полнота связей (Priority: P1)

**Goal**: bulk ingest scale; dangling = 0; incremental delete code+system (FR-006/007, SC-004)

**Independent Test**: edge-filter; dangling=0

**Depends on**: A1 желательно

### Tests

- [ ] T028 [P] [US5] Регресс `backend/tests/unit/ingest/ingest-edge-filter.test.ts`
- [ ] T029 [P] [US5] Unit/integration incremental delete — `backend/tests/unit/change-set.service.test.ts` / ingest incremental tests

### Implementation

- [ ] T030 [US5] Аудит `backend/src/services/ingest/ingest.service.ts` — `filterEdgesWithKnownEndpoints` на adapters path; bulk batch size при необходимости
- [ ] T031 [US5] Verify `pathsForParser` / artifact coverage compose/openapi/appsettings/dotnet/bus — регресс-тесты зелёные
- [ ] T032 [US5] Integration assert dangling=0 после system-landscape-e2e / scale fixture — `backend/tests/integration/` (или расширить существующий e2e)

**Checkpoint A5**: SC-004 = 0% dangling

---

## Phase 7: User Story 4 — Оркестрация под нагрузкой (Priority: P2)

**Goal**: max parallel + timeout only; все parser_results заполнены (FR-005)

**Independent Test**: mock M>N parsers → concurrency ≤N

**Depends on**: A2/A3

### Tests

- [ ] T033 [P] [US4] Unit `backend/tests/unit/analysis-orchestrator-parallel.test.ts` — `ANALYSIS_MAX_PARALLEL_PARSERS=N` → одновременно ≤N

### Implementation

- [ ] T034 [US4] Semaphore/queue parallel spawn в `backend/src/services/analysis-orchestrator.service.ts`
- [ ] T035 [US4] Короткая ops-заметка (timeout+parallel, без RAM cap) в `ods-help/user-guide/commands.md` при необходимости

**Checkpoint A4**: parallel limit enforced

---

## Phase 8: User Story 6 — Списки и поиск на большом графе (Priority: P2)

**Goal**: пагинация + layer-согласованные счётчики (FR-008, SC-005); DoD = large-repo max nodes (10k ориентир)

**Independent Test**: GraphPage/tree/search после анализа large-repo

**Depends on**: данные графа после полного анализа

### Tests

- [ ] T036 [P] [US6] Frontend `frontend/src/components/graph/GraphNodeTree.test.tsx` — layer filter + load more serverOffset
- [ ] T037 [P] [US6] Frontend `frontend/src/components/graph/GraphSearch.test.tsx` — счётчики при layer ≠ all

### Implementation

- [ ] T038 [US6] Довести `frontend/src/components/graph/GraphNodeTree.tsx` — serverOffset paging под layer
- [ ] T039 [US6] Довести `frontend/src/components/graph/GraphSearch.tsx` — честные totals / пагинация при layer
- [ ] T040 [US6] Регресс `frontend/src/utils/graphLayerFilter.test.ts` + GraphPage; в отчёте зафиксировать фактический `node_count` (SC-005)

**Checkpoint A6**: первая страница < ~3 с на графе large-repo

---

## Phase 9: User Story 7 — Parser CLI SDK (Priority: P3, follow-up only)

**Goal**: Не реализовывать в DoD; зафиксировать follow-up (FR-010)

**Independent Test**: n/a (tracking)

- [ ] T041 [US7] Раздел «Follow-up: Parser CLI SDK» в `specs/010-scale-pipeline/quickstart.md` §8 и checkbox в `contracts/scale-acceptance.md` §C — **без** кода parsers/
- [x] T042 [US7] Tracker follow-up SDK зафиксирован в Notes (`post-010: shared parseArgs+envelope`) — реализация **вне** DoD `/speckit-implement` `010` (analyze U1: задача-док выполнена текстом Notes)

**Checkpoint**: US7 явно отложен, не забыт

---

## Phase 10: Polish & DoD (SC-001 / SC-003 / SC-006)

**Purpose**: Timing gates, **обязательный SC-003 measure**, closing smoke, финальная сверка

- [ ] T043 Integration/performance `backend/tests/integration/large-repo-scale-timing.test.ts` (или script в `backend/tests/performance/`) — full cycle на large-repo ≤900s; `skipIf` без fixture **≠** PASS SC-001 (закрытие через T047/T048 + явная пометка skipped)
- [ ] T044 **Обязательный замер SC-003** — script/integration `backend/tests/integration/large-repo-incremental-timing.test.ts` (или тот же harness): full → ≤1% изменений → incremental → speedup ≥40% **или** `incremental_unavailable_reason`; таблица в `quickstart.md` §3; при `skipIf` без fixture — **MUST** заполнить §3 вручную в T047 (не PASS автоматом)
- [ ] T045 [P] Операторский шаблон отчёта по `contracts/scale-acceptance.md` §B в `specs/010-scale-pipeline/quickstart.md` (чеклист copy-paste, строки SC-003)
- [ ] T046 [P] Обновить `ods-help/user-guide/commands.md`: progress UI + scale smoke без коммита внешнего эталона
- [ ] T047 Прогнать `quickstart.md` §§1–6 на пилоте; зафиксировать таблицы SC-001/SC-002/SC-003/SC-005
- [ ] T048 Closing smoke (ручной) по §B — результат вне git ODS; отметить DoD в checklist/PR description
- [ ] T049 Сверка: `009` spec.md не изменён; canvas не реализован; walk assert large-repo + progress + dangling регресс зелёный

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup → Foundational (F1)** — BLOCKER
- **US1 (A1)** → sync inventory + reuse; SC-002 large-repo
- **US2 (A2)** — progress; нужна F1
- **US3** — после A2; SC-003 measure в Polish (T044)
- **US5** — после A1; параллельно с US3 возможен
- **US4** — после A2/A3
- **US6** — после большого графа
- **US7** — tracking only
- **Polish** — после A1–A6; включает SC-001 + **SC-003**

### User Story Dependencies

| Story | Depends |
|-------|---------|
| US1 | F1 |
| US2 | F1 (+A1 желательно) |
| US3 | A2 |
| US5 | A1 |
| US4 | A2/A3 |
| US6 | analysed graph |
| US7 | none (docs only) |

### Parallel Opportunities

```text
After F1:
  T010 || T016 || T017
After A1:
  T012–T015 (seq: sync → detector → changeset → orchestrator)
  then T028||T029 (US5)
After A2:
  T023 || T033
Polish:
  T043 || T044 (оба на large-repo; можно seq чтобы не конкурировать за стек)
  T045 || T046
```

---

## Parallel Example: After F1

```bash
# параллельно
Task: T010 file-inventory-reuse.test.ts
Task: T016 analysis-run-progress.test.ts
Task: T017 frontend progress test
```

---

## Implementation Strategy

### MVP First

1. Phase 1–2 (F1)
2. Phase 3 US1 (walk ≤1 на large-repo) 🎯
3. Phase 4 US2 (progress)
4. **STOP** — validate A1+A2

### Incremental to DoD

5. US3 + US5  
6. US4 + US6  
7. Polish: SC-001 ≤15m + **SC-003 measure** + closing smoke  
8. US7 remains follow-up only

---

## Notes

- Не коммитить внешний эталон масштаба; не менять `specs/009-system-landscape/spec.md`
- Hard RAM cap вне scope; % в progress UI вне MVP; sync без обязательного N/M
- Canvas → `011-ods-graph-viewer`
- **post-010 tracker (US7 / T042):** shared `parseArgs` + envelope SDK для parsers — обязательный follow-up, не DoD `010`
- SC-002: unit reuse ≠ DoD; DoD = T011 large-repo (**или** T047 walk_count при skipIf)
- SC-003: path tests (T024) ≠ DoD; DoD = T044 measure (**или** ручной §3 в T047 при skipIf)
- **skipIf ≠ PASS** по SC-001/002/003 — политика в `contracts/scale-acceptance.md` §A
- Все tasks: checkbox + ID + пути файлов
