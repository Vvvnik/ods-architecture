# Tasks: Spring system landscape (019)

**Input**: `specs/019-spring-system-landscape/` — plan.md, spec.md,
data-model.md, contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-19); system
`009`/`013`/`014`; Java symbols `018` (не трогать HTTP в `parsers/java/`)

**Tests**: unit extract/ingest + detector; integration spawn → ingest →
graph-view; эталон petclinic; fixture WebClient при нужде (plan Testing + SC)

**Organization**: Setup → Foundational (detector/registry) → US1 Maven →
US2 API routes → US3 изоляция → US4 config → US5 http_calls → Polish

**DoD**: **A+B+C+D** вместе (clarify); Feign **и** WebClient; Gateway SHOULD;
Boot-only services; merge Maven↔compose (display=compose); без merge OpenAPI;
без Gradle DoD

**Язык**: русский (конституция)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимости от незавершённых)
- **[Story]**: US1–US5 из spec.md

---

## Phase 1: Setup

**Purpose**: Каркасы 4 парсеров, fixture WebClient, сверка контрактов

- [X] T001 Сверить `specs/019-spring-system-landscape/contracts/` с
  `data-model.md` / `research.md` R1–R12 (Boot→service, merge compose,
  Feign+WebClient, Gateway SHOULD) — расхождения зафиксировать в Notes ниже
- [X] T002 [P] Создать каркас `parsers/maven-project/` — `manifest.json`
  (`id: maven-project`), `README.md`, stub `run.sh`/`run.mjs` (exit 0 +
  `modules: []`) по контракту `005`
- [X] T003 [P] Создать каркас `parsers/spring-config/` — `manifest.json`,
  `README.md`, stub entry (exit 0 + `configs: []`) по контракту `005`
- [X] T004 [P] Создать каркас `parsers/java-api-routes/` — `manifest.json`,
  `README.md`, stub entry (exit 0 + `routes: []`) по контракту `005`
- [X] T005 [P] Создать каркас `parsers/java-http-calls/` — `manifest.json`,
  `README.md`, stub entry (exit 0 + `calls: []`) по контракту `005`
- [X] T006 [P] Добавить строки `maven-project` / `spring-config` /
  `java-api-routes` / `java-http-calls` со статусом **stub/planned** в
  `parsers/README.md` (**available** — только после зелёных story + Polish)
- [X] T007 Создать fixture `docker/fixtures/repos/java-http-webclient-demo/` —
  минимальный Spring Boot с **WebClient** литералом path + compose service;
  README; подключить в `docker/fixtures/repos/setup-fixtures.sh` (или аналог)
- [X] T008 [P] Создать shared AST helper `parsers/_shared/java-ast/` (или
  аналог research R9) для reuse между `java-api-routes` и `java-http-calls`
  **без** изменения контракта/выхода `parsers/java/`. Если за один проход
  дешевле скопировать минимум кода — допустим skip с явной пометкой в
  README обоих модулей «shared отложен; дублирование временно»

**Checkpoint S1**: stubs 4 модулей + WebClient fixture на месте

---

## Phase 2: Foundational (BLOCKER)

**Purpose**: Детектор artifacts + registry ingest + spawn до user stories

**⚠️ CRITICAL**: US1–US5 не стартуют без F1

- [X] T009 Добавить artifact rules для `maven-project`, `spring-config`,
  `java-api-routes`, `java-http-calls` в
  `backend/src/config/detector-rules.json` по
  `contracts/detector-spring-system.md`
- [X] T010 Расширить детектор в `backend/src/services/artifact-detector.ts`
  и/или `backend/src/services/language-detector.service.ts` — scan globs/hints
  → `artifacts[]` (pom / application* / `@RestController` / `@FeignClient` /
  `WebClient`)
- [X] T011 [P] Unit сигналов детектора в
  `backend/tests/unit/detector-spring-system.test.ts` — positive/negative
  samples по каждому artifact_type
- [X] T012 Зарегистрировать stub adapters + allowlist в
  `backend/src/services/ingest/ingest-registry.service.ts` и
  `backend/src/services/ingest/ingest.service.ts` (`ARTIFACT_PARSER_IDS`:
  `maven-project`, `spring-config`, `java-api-routes`, `java-http-calls`)
- [X] T013 Убедиться, что оркестратор/change-set spawn’ит новые artifacts
  (`backend/src/services/change-set.service.ts` /
  `analysis-orchestrator.service.ts`) — доработать globs при необходимости
- [X] T014 [P] Shared helper affiliation/merge Maven↔compose в
  `backend/src/services/ingest/maven-compose-merge.ts` (или рядом с
  `api-routes-ids.ts`) — normalize name, однозначный match → compose id;
  display = compose (research R3)
- [X] T015 JDK/сборка для Java CLI-модулей (`java-api-routes` /
  `java-http-calls` / при нужде `maven-project`) в `backend/Dockerfile` по
  аналогии с `parsers/java`; `chmod +x` entry scripts; mount `PARSERS_ROOT`

**Checkpoint F1**: detector видит 4 artifacts; registry знает parser_id;
merge helper готов

---

## Phase 3: User Story 1 — Сервисы из Maven (CP-A) (P1) 🎯

**Goal**: petclinic → system-сервисы из Boot application-модулей; merge с
compose

**Independent Test**: quickstart §1 — узнаваемые микросервисы, один узел при
match с compose

### Tests

- [X] T016 [P] [US1] Unit extract Boot vs parent/library в
  `parsers/maven-project/` (тесты рядом с модулем) — `is_boot_app` true/false
  (research R2)
- [X] T017 [P] [US1] Unit ingest merge в
  `backend/tests/unit/ingest/maven-project.ingest.test.ts` — однозначный
  match → compose id + `metadata.maven_*`; неоднозначность → без склейки;
  library → нет `service`

### Implementation

- [X] T018 [US1] Реализовать extract Maven reactor в
  `parsers/maven-project/` по `contracts/native-maven-project.schema.json`
- [X] T019 [US1] Реализовать
  `backend/src/services/ingest/adapters/maven-project.ingest.ts` по
  `contracts/ingest-maven-project.md` (использовать T014)
- [X] T020 [US1] Заменить stub adapter на рабочий в
  `backend/src/services/ingest/ingest-registry.service.ts`
- [X] T021 [US1] Dogfood petclinic: re-analysis → SC-001 (≥5 `service`, в т.ч.
  customers / vets / visits / api-gateway; parent/library нет)

**Checkpoint**: US1 независимо проверяем на petclinic

---

## Phase 4: User Story 2 — HTTP API из Spring (CP-C) (P1)

**Goal**: system-интерьер сервиса показывает эндпоинты из MVC/WebFlux;
`exposes`; Gateway SHOULD

**Independent Test**: quickstart §3 — dig-in → ≥1 method+path из кода

### Tests

- [X] T022 [P] [US2] Unit extract `@RequestMapping` / `@GetMapping` + class
  prefix в `parsers/java-api-routes/` — полный path / только method-литерал
  (research R5)
- [X] T023 [P] [US2] Unit ingest в
  `backend/tests/unit/ingest/java-api-routes.ingest.test.ts` —
  `http_endpoint` id `service|METHOD|path`, `metadata.source=code`,
  `exposes` при affiliation

### Implementation

- [X] T024 [US2] Реализовать extract MVC в
  `parsers/java-api-routes/` по `contracts/native-java-api-routes.schema.json`
  (DoD petclinic = **MVC-аннотации**). WebFlux `RouterFunction` — только если
  встречается в WC/fixture; отсутствие WebFlux **не** валит SC-002.
  Reuse shared AST при наличии T008; **не** трогать `parsers/java/` symbols
- [X] T025 [US2] Реализовать
  `backend/src/services/ingest/adapters/java-api-routes.ingest.ts` по
  `contracts/ingest-java-api-routes.md`
- [X] T026 [P] [US2] Gateway static routes — SHOULD extract в том же модуле
  (`route_kind=gateway`); отсутствие не валит DoD
- [X] T027 [US2] Dogfood petclinic: dig-in сервиса с контроллерами → SC-002;
  code-слой Java без регресса smoke

**Checkpoint**: US2 независимо; endpoints в system

---

## Phase 5: User Story 3 — Модули отключаемы (P1)

**Goal**: сбой/отсутствие любого модуля `019` не роняет compose и Java
symbols

**Independent Test**: quickstart §5 — missing module → остальное ок

- [X] T028 [US3] Негативные сценарии: выключить/сломать registry entry
  каждого из 4 parser_id по очереди — compose + `java` symbols доступны;
  `parser_status=missing` или нет артефакта
- [X] T029 [P] [US3] Unit/integration изоляции в
  `backend/tests/unit/ingest/` или integration — пустой model / ошибка
  одного адаптера не валит run (паритет FR-011)

**Checkpoint**: US3 подтверждён для всех 4 модулей

---

## Phase 6: User Story 4 — Spring config (CP-B) (P1)

**Goal**: порты и `connects_to` из локальных `application*`

**Independent Test**: quickstart §2 — port и/или DB hint без placeholder-рёбер

### Tests

- [X] T030 [P] [US4] Unit parse `application.yml` / `.properties` в
  `parsers/spring-config/` — port + jdbc engine / skip placeholder
  (research R4)
- [X] T031 [P] [US4] Unit ingest в
  `backend/tests/unit/ingest/spring-config.ingest.test.ts` —
  `metadata.port`, `database` + `connects_to`

### Implementation

- [X] T032 [US4] Реализовать extract в `parsers/spring-config/` по
  `contracts/native-spring-config.schema.json`
- [X] T033 [US4] Реализовать
  `backend/src/services/ingest/adapters/spring-config.ingest.ts` по
  `contracts/ingest-spring-config.md`
- [X] T034 [US4] Dogfood petclinic / fixture → SC-006

**Checkpoint**: US4 независимо

---

## Phase 7: User Story 5 — Feign и WebClient (CP-D) (P1)

**Goal**: «Вызывает» / `http_calls` для **обоих** стилей клиента к
существующим эндпоинтам

**Independent Test**: quickstart §4 — Feign на petclinic + WebClient
(petclinic или `java-http-webclient-demo`)

### Tests

- [X] T035 [P] [US5] Unit extract Feign (`@FeignClient` + mapping) в
  `parsers/java-http-calls/`
- [X] T036 [P] [US5] Unit extract WebClient литералов path в
  `parsers/java-http-calls/`
- [X] T037 [P] [US5] Unit ingest в
  `backend/tests/unit/ingest/java-http-calls.ingest.test.ts` —
  `http_calls` к существующему id; без создания endpoint; skip при miss

### Implementation

- [X] T038 [US5] Реализовать extract Feign+WebClient в
  `parsers/java-http-calls/` по `contracts/native-java-http-calls.schema.json`
  (`client_kind`: feign|webclient)
- [X] T039 [US5] Реализовать
  `backend/src/services/ingest/adapters/java-http-calls.ingest.ts` по
  `contracts/ingest-java-http-calls.md` (prefer
  `java-api-routes:http_endpoint:…`)
- [X] T040 [US5] Dogfood: Feign на petclinic + WebClient на fixture/эталоне
  → SC-007 (оба стиля явно)

**Checkpoint**: US5 независимо; полный consumer path

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: чеклист `018`, available, полный quickstart, audit DoD

- [X] T041 Пройти применимые пункты
  `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`
  для каждого из 4 `parser_id` — пробелы закрыть или явно обосновать
- [X] T042 [P] Обновить статусы на **available** в `parsers/README.md` для
  всех 4 модулей после зелёных SC
- [X] T043 Прогнать полный `specs/019-spring-system-landscape/quickstart.md`
  на petclinic (+ WebClient fixture) — SC-001…007
- [X] T044 [P] Регресс Java symbols `018` на petclinic (SC-003) — smoke
  количества/типов code-узлов без падения
- [X] T045 Audit: нет второго оркестратора; spawn только через `artifacts[]`
  (SC-005); HTTP/Feign отсутствуют в `parsers/java/`; **Gradle не в DoD**
  (FR-015 — нет обязательного `gradle-project` / приёмки `build.gradle*`)

**Checkpoint**: DoD A+B+C+D закрыт (SC-001…007); далее Phase 9 = SC-008

---

## Phase 9: RestClient dogfood (SC-008)

**Purpose**: Извлечение RestClient на petclinic (genai → customers); clarify
2026-07-19 RestClient dogfood; FR-010 / SC-008

- [X] T046 [P] Unit extract RestClient + `getInstances("…")` callee + path
  concat (`/owners`, `/owners/{id}/pets`) в `parsers/java-http-calls/`
- [X] T047 Detector hint `RestClient` в `backend/src/config/detector-rules.json`
  (+ контракт detector); ingest принимает `client_kind=restclient`
- [X] T048 Реализовать extract RestClient в `parsers/java-http-calls/extract.mjs`
  (reuse WebClient uri resolve + discovery helper)
- [X] T049 Dogfood petclinic → SC-008: ≥3 `http_calls` restclient
  genai-service → customers-service; без dangling ends

**Checkpoint**: SC-008 закрыт; petclinic consumer-path полный для эталона

---

## Закрытие фичи

**2026-07-19:** DoD A+B+C+D + SC-008 выполнены; задачи T001–T049 `[X]`.
Активная работа по `019` завершена. Follow-up — в `spec.md` (§Follow-up) и
Post-MVP `001` (§покрытие стеков). Следующая фича — через `/speckit-specify`
после выбора в `001` / явной команды.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: старт сразу
- **Foundational (Phase 2)**: после Setup — **BLOCKER** для US1–US5
- **US1 (Maven)**: после F1 — желателен первым (affiliation для C/B/D)
- **US2 (API routes)**: после F1; лучше после US1 (service resolve)
- **US3 (изоляция)**: после появления ≥1 рабочего модуля; полный прогон — после
  всех четырёх
- **US4 (config)**: после F1; лучше после US1
- **US5 (http_calls)**: после US2 (нужны endpoints) + US1
- **Polish**: после US1+US2+US4+US5 (+US3)
- **Phase 9 (RestClient)**: после US5 / Polish (нужны endpoints customers)

### User Story Dependencies

| Story | Зависит от |
|-------|------------|
| US1 Maven | F1 |
| US2 API | F1; SHOULD после US1 |
| US3 Isolation | ≥1 модуль реализован |
| US4 Config | F1; SHOULD после US1 |
| US5 Calls | F1 + US2 (+ US1) |

### Parallel Opportunities

- T002–T006, T008 в Setup параллельно
- T011, T014 в F1 параллельно с T012/T013 после T009–T010
- T016∥T017; T022∥T023; T030∥T031; T035∥T036∥T037
- После F1: US4 может частично параллелиться с US2, если разные файлы;
  US5 ждать endpoints US2

### Parallel Example: Setup stubs

```bash
# Параллельно каркасы парсеров:
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

### Инкремент (не путать с закрытием DoD)

1. Setup + F1 → foundation
2. **US1** → сервисы из Maven (ранний dogfood ландшафта)
3. **US2** → эндпоинты в system
4. **US4** → config hints
5. **US5** → Feign+WebClient calls
6. **US3** + Polish → изоляция, checklist, available

### Закрытие фичи

Только после **US1+US2+US4+US5** (+ US3 + Polish): DoD = **A+B+C+D**.
Частичная приёмка A+C **не** закрывает `019` (clarify).

### MVP demo (не DoD)

US1+US2 достаточны для демо «сервисы + API из кода»; полный аналог C#/TS —
только с B+D.

---

## Notes

- Запрет: HTTP/Feign/Gateway в `parsers/java/`
- T001: расхождений между contracts, data-model и research не найдено.
- T015: все четыре новых CLI реализованы на Node.js; JDK и изменения
  `backend/Dockerfile` не требуются, manifest command — `["node", "run.mjs"]`.
- Gateway — SHOULD (T026), не блокер SC-002
- WebClient fixture (T007) обязателен, если petclinic не покрывает SC-007b
- Id эндпоинтов / `http_calls` — паритет `013`/`014`
- FR-015: Gradle **не** в DoD (проверка в T045)
- SC-001: ≥5 service; минимум customers/vets/visits/api-gateway
- Расхождения контрактов после T001 — дописать сюда
