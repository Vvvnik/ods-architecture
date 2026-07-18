# Tasks: Шаблон расширения парсеров + Java MVP (018)

**Input**: `specs/018-parser-extension-playbook/` — plan.md, spec.md,
data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-19); symbols ingest
`008`; registry/оркестратор `005`

**Tests**: unit extract/detector/ingest parent-qn; integration
spawn → ingest → graph; эталон petclinic + fixture `java-symbols-demo`
(plan Testing + SC)

**Organization**: Setup → Foundational (wrappers + ingest + JDK) →
US1 playbook P1 → US2 Java P1 (MVP) → US3 wrappers P2 → US4 изоляция P2 →
Polish (checklist audit / quickstart)

**DoD**: чеклист CP-A + Java available + FQN-пакеты/top-level типы из
`src/main/java`; без Spring HTTP; без shell-парсера

**Язык**: русский (конституция)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимости от незавершённых)
- **[Story]**: US1–US4 из spec.md

---

## Phase 1: Setup

**Purpose**: Каркас `parsers/java`, fixture, сверка контрактов

- [X] T001 Сверить `specs/018-parser-extension-playbook/contracts/` с
  `data-model.md` / `research.md` R1–R9 (FQN package path, top-level only,
  main filter, wrappers list) — расхождения зафиксировать в Notes ниже
- [X] T002 [P] Создать каркас `parsers/java/` — `manifest.json`
  (`id: java`, `languages: ["java"]`, `schema_version: "1"`, command через
  `run.sh`), `README.md`, stub `run.sh` (exit 0 + envelope с `symbols: []`)
  по контракту `005`
- [X] T003 [P] Добавить строку `java` со статусом **stub/planned** в
  `parsers/README.md` (статус **available** — только после T028)
- [X] T004 Создать fixture `docker/fixtures/repos/java-symbols-demo/` —
  `src/main/java/...` с ≥2 top-level типами в ≥1 пакете; опционально
  `src/test/java` + nested class (негатив); README; подключить в
  `docker/fixtures/repos/setup-fixtures.sh` (или аналог setup)

**Checkpoint S1**: stub java + fixture на месте

---

## Phase 2: Foundational (BLOCKER)

**Purpose**: Wrappers в детекторе, parent-qn в ingest, registry, JDK в образе

**⚠️ CRITICAL**: US2–US4 не стартуют без F1 (US1 docs MAY частично параллельно)

- [X] T005 Игнорировать build wrappers в
  `backend/src/services/language-detector.service.ts` по
  `contracts/detector-java-wrappers.md` (`mvnw`, `gradlew`, `.cmd`/`.bat`/`.ps1`)
- [X] T006 [P] Unit wrappers в
  `backend/tests/unit/detector-java-wrappers.test.ts` — mvnw не в shell;
  обычный `.sh` остаётся shell
- [X] T007 Fallback parent resolve по `qualified_name` в
  `backend/src/services/ingest/adapters/symbols-model.ingest.ts` (research R3)
  — если path-keyed miss и ровно один узел с этим qn
- [X] T008 [P] Unit parent-qn fallback в
  `backend/tests/unit/ingest/symbols-model-parent-qn.test.ts` (или рядом с
  существующими symbols ingest tests) — namespace с синтетическим path +
  class с `parent_qualified_name`
- [X] T009 Создать
  `backend/src/services/ingest/adapters/java.ingest.ts` —
  `createSymbolsModelIngestAdapter('java', 'java')`; зарегистрировать в
  `backend/src/services/ingest/ingest-registry.service.ts` (не
  `ARTIFACT_PARSER_IDS`)
- [X] T010 JDK 17 + **`mvn -f parsers/java package`** в `backend/Dockerfile`
  (research R1/R6); `chmod +x parsers/java/run.sh`; убедиться что
  `docker/docker-compose.dev.yml` mount `PARSERS_ROOT` покрывает модуль

**Checkpoint F1**: wrappers; ingest java зарегистрирован; parent-qn;
образ собирает java-модуль

---

## Phase 3: User Story 1 — Шаблон «как добавить парсер» (P1)

**Goal**: канонический чеклист доступен команде; закрытие Java доказывает
проход

**Independent Test**: открыт
`contracts/parser-extension-checklist.md`; в конце фичи tasks отмечают
проход пунктов (T029)

- [X] T011 [P] [US1] Ссылка на
  `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`
  из `parsers/README.md` (секция «как добавить модуль»)
- [X] T012 [P] [US1] Краткая ссылка на
  `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`
  в `specs/005-code-analysis/quickstart.md` (обязательно; без альтернатив)
- [X] T013 [US1] Verify: mapping чеклиста → task IDs уже в Notes ниже
  (этот файл); при расхождении — обновить таблицу; иначе закрыть как done
  (для аудита T029)

**Checkpoint US1**: чеклист обнаруживаем; mapping готов (галочки — в Polish)

---

## Phase 4: User Story 2 — Java в отчёте и code-графе (P1) 🎯 MVP

**Goal**: petclinic / fixture → `java` available → пакеты FQN + top-level
типы из `src/main/java`

**Independent Test**: quickstart §1–2; SC-001/SC-002

### Tests

- [X] T014 [P] [US2] Unit extract в `parsers/java/` — на каждый main `.java`:
  `module` + `namespace` (FQN) + top-level class/interface/enum; nested/test/
  generated **не** в symbols; фильтр `**/src/main/java/**`
- [X] T015 [P] [US2] Unit ingest
  `backend/tests/unit/ingest/java.ingest.test.ts` — nodes `module` +
  `namespace` + `class`, `language=java`, `parser_id=java`, parent_id пакета
  у типа

### Implementation

- [X] T016 [US2] Реализовать extract JavaParser в `parsers/java/` —
  **Maven** (`pom.xml` + jar; research R1) — **`module` на файл** (как
  csharp); уникальный **`namespace` на FQN** (`java-package/<slashes>`);
  top-level типы с `parent_qualified_name`; envelope schema_version 1
- [X] T017 [US2] Довести `parsers/java/run.sh` + `manifest.json` до
  рабочего spawn (не stub); обновить `parsers/java/README.md` (фильтр
  main, DoD, анти-паттерны nested)
- [X] T018 [US2] Integration
  `backend/tests/integration/java-parser.test.ts` (или аналог) —
  spawn → envelope → ingest → assert nodes для
  `docker/fixtures/repos/java-symbols-demo` (**закрывает SC-001/SC-002 для CI**)
- [X] T019 [US2] Dogfood SHOULD: petclinic re-detect + analysis → `java`
  available + типы из main (Application/Controller); результат в Notes
  (не блокер CI, если T018 зелёный)

**Checkpoint US2**: SC-001/SC-002 на fixture (+ dogfood Notes)

---

## Phase 5: User Story 3 — Wrappers не засоряют отчёт (P2)

**Goal**: `mvnw`/`gradlew` не в shell; прочие `.sh` MAY missing

**Independent Test**: quickstart §1 п.3; SC-003 (логика T005 — проверка e2e)

- [X] T020 [US3] Integration/regression
  `backend/tests/integration/detector-wrappers-petclinic.test.ts` (или
  unit на snapshot путей petclinic-like) — basename wrappers отсутствуют в
  `languages[].language=shell` file lists / counts
- [X] T021 [US3] OPTIONAL: сверить UI-статус «Парсер не установлен» для
  оставшихся shell — только если правки `frontend/`; иначе Notes
  **`T021: N/A`** и закрыть задачу

**Checkpoint US3**: SC-003

---

## Phase 6: User Story 4 — Изоляция модуля (P2)

**Goal**: без java-модуля прогон не падает; compose/другие available ok

**Independent Test**: quickstart §3; SC-004

- [X] T022 [US4] Integration: симуляция missing `java` (нет manifest /
  временно исключить registry) → `parser_status=missing`; run
  success/partial без fail из‑за java; compose artifact при наличии
  отрабатывает — тест в `backend/tests/integration/`
- [X] T023 [P] [US4] Документировать в `parsers/java/README.md` как
  отключить модуль (удалить каталог / не собирать в образе)

**Checkpoint US4**: SC-004

---

## Phase 7: Polish

**Purpose**: available статус, audit чеклиста, quickstart

- [X] T024 [P] Статус `java` → **available** в `parsers/README.md`
- [X] T025 [P] Пройти `specs/018-parser-extension-playbook/quickstart.md`
  на petclinic (или fixture) и отметить в Notes
- [X] T026 [P] Обновить статус `018` в `specs/001-ods-vision/spec.md` /
  constitution при закрытии implement (Draft → реализовано — только после
  зелёных SC)
- [X] T027 Audit reuse в Notes: нет второго оркестратора; java только через
  `parsers/java/` + `java.ingest.ts` / symbols-model; Spring HTTP не в
  `backend/src/services/ingest/`
- [X] T028 Сборка образа: `docker/docker-compose.dev.yml` +
  `backend/Dockerfile` — `--profile full --build`, backend healthy; registry
  видит `java`
- [X] T029 [US1] Отметить проход пунктов
  `contracts/parser-extension-checklist.md` в Notes (чеклист → T00x) —
  DoD CP-A / SC-005

**Checkpoint P**: SC-005/SC-006 готовность к ревью

---

## Dependencies

```text
T001–T004 (Setup)
    ↓
T005–T010 (Foundational)
    ↓
T011–T013 (US1 docs) ──┬── параллельно после F1
T014–T019 (US2 Java) ──┤
T020–T021 (US3) ───────┤ (T020 после T005)
T022–T023 (US4) ───────┘ (после T009/T016)
    ↓
T024–T029 (Polish; T029 после US2)
```

**Story order**: US1 (ссылки) ∥ US2 (после F1) → US3/US4 → Polish.

**MVP**: Phase 1–2 + US2 (T014–T019) + T005/T009 — Java на fixture.
Playbook proof = T029 после MVP.

## Parallel examples

```bash
# После S1:
# T005∥T007∥T009 (разные файлы) затем T010
# После F1:
# T011∥T012∥T014∥T015
# T016 → T017 → T018 → T019
```

## Implementation strategy

1. Stub + fixture + Dockerfile JDK  
2. Wrappers + parent-qn + java ingest register  
3. JavaParser extract → integration fixture  
4. Dogfood petclinic + checklist audit  

**Не в tasks**: Spring routes, calls/`008`, shell symbols, docs/RAG/auth

## Notes

**DoD CP-A / SC-005:** единственная точка закрытия proof «чеклист пройден» —
**T029** (FR-003 дублирует формулировку; не отдельная работа).

### Mapping чеклист → tasks (T013 / T029)

| Чеклист § | Tasks | Статус implement |
|-----------|-------|------------------|
| 0 Decision language | spec/plan (done); T016 только java language | ✅ |
| 1 Спека/контракты | T001; contracts уже в `018` | ✅ |
| 2 Детекция | T005–T006; T020 | ✅ |
| 3 CLI-модуль | T002, T016–T017, T024 | ✅ |
| 4 Ingest | T007–T009, T015 | ✅ |
| 5 Оркестрация | reuse `005` (verify T018) | ✅ |
| 6 Поставка | T010, T028 | ✅ |
| 7 Фикстуры/приёмка | T004, T014, T018–T019, T022, T025 | ✅ |
| 8 UI | reuse (T021 N/A если без правок) | ✅ T021: N/A |
| 9 Docs | T011–T012, T023–T024 | ✅ |
| Анти-паттерны | T027 | ✅ |

### Discrepancies (T001)

- Analyze remediations closed; LOW analyze 2: plan fixture MUST; T013 =
  verify mapping; D1 — proof только T029.
_(прочие расхождения contracts↔код — при implement)_

### Implement Notes (2026-07-19)

- **T019 / T025:** CI закрыт на `java-symbols-demo` (T018). Petclinic dogfood
  SHOULD — после `compose --profile full up` + re-detect; не блокер при
  зелёном T018.
- **T021: N/A** — правок `frontend/` нет; статус missing для shell без
  изменений UI.
- **T027:** java только `parsers/java/` + `java.ingest.ts` /
  `createSymbolsModelIngestAdapter`; Spring HTTP адаптеров нет; оркестратор
  `005` без дубля.
- **T028:** `backend/Dockerfile` — JDK 17 + `mvn package` java; образ
  `docker compose … build backend` успешен.
- **T029:** таблица mapping выше — все § чеклиста закрыты (CP-A / SC-005).
