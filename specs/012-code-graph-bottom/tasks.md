# Tasks: Граф до дна (012)

**Input**: `specs/012-code-graph-bottom/` — plan.md, spec.md, data-model.md,
contracts/, research.md, quickstart.md

**Prerequisites**: plan.md ✅; spec.md ✅ (clarify 2026-07-18); `011` system
canvas реализован

**Tests**: unit affiliation + code slice; API `layer=code` / `exact_code`;
frontend «В код» / empty / drill; регресс system (plan Testing + SC)

**Organization** (по priority): US1 вход в code P1 → US2 до дна P1 → US3
связи/соседи P2 → US4 open-from-analysis P2 → US5 регресс system P2 → Polish

**DoD**: code-drill на схеме без новых парсеров; system-первый вход сохранён;
запись affiliation в канон — **не** в этих tasks

**Язык**: русский (конституция)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно (разные файлы, нет зависимости от незавершённых)
- **[Story]**: US1–US5 из spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Сверка контрактов и каркас affiliation-модуля

- [X] T001 Сверить `specs/012-code-graph-bottom/quickstart.md` с
  `contracts/openapi-graph-view-code.yaml` и `contracts/graph-view-code-ui.md`
  (query `layer`, `exact_code`, `no_related_code`, «В код»)
- [X] T002 [P] Создать каркас `backend/src/services/graph-view-affiliation.ts`
  (export stub `matchCodeToService` / типы) по `research.md` R1 и
  `data-model.md`
- [X] T003 [P] Добавить i18n-заготовки в `frontend/src/i18n/ru.ts` —
  `graphView.enterCode`, `graphView.emptyNoRelatedCode` по
  `contracts/graph-view-code-ui.md`

**Checkpoint S1**: контракты сверены; stub affiliation + i18n ключи есть

---

## Phase 2: Foundational — affiliation + layer API (BLOCKER)

**Purpose**: Сервер умеет `layer=code` и view-only привязку до UI-историй

**⚠️ CRITICAL**: US1–US4 не закрывают SC без F1

- [X] T004 Расширить DTO/`GraphViewSlice` полями `layer`, `affiliation`,
  `empty_reason=no_related_code`, `resolve_status=exact_code` в
  `backend/src/services/graph-view.types.ts` по `data-model.md`
- [X] T005 [P] Zod query/response: параметр `layer` (`system`|`code`) в
  `backend/src/api/schemas/graph.schemas.ts` по
  `contracts/openapi-graph-view-code.yaml`
- [X] T006 [P] Зеркало типов клиента (`layer`, affiliation, empty/resolve) в
  `frontend/src/api/graph-types.ts`
- [X] T007 Реализовать view-only affiliation (имя сервиса ↔ path segment;
  explicit parent/edges first) в
  `backend/src/services/graph-view-affiliation.ts` (R1)
- [X] T008 Unit `backend/tests/unit/graph-view-affiliation.test.ts` —
  `backend`↔`backend/...`, `frontend`↔`frontend/...`, compose-path не матчит
  code; elasticsearch → пусто; детерминизм при ничьей
- [X] T009 Расширить loader в `backend/src/services/graph-view.service.ts` —
  подгружать code kinds для `layer=code` / focus code без полного dump
  проекта (R5). **Выбрать одну** стратегию: (A) ES query по path-prefix
  имени сервиса **или** (B) ограниченный in-memory scroll code-layer с cap;
  зафиксировать выбор комментарием в файле + строкой в Notes `tasks.md`.
  Caps ответа 200/500.
- [X] T010 Расширить `buildViewSlicePure` /
  `backend/src/services/graph-view-slice.ts` — `layer=system` без регресса
  `011`; `layer=code` + focus service → affiliated roots; focus code →
  children по `parent_id` + externals; `no_related_code`
- [X] T011 Unit дополнения в `backend/tests/unit/graph-view.service.test.ts`
  (или `graph-view-slice.test.ts`) — service+layer=code roots; empty
  no_related_code; system layer регресс peers/inside
- [X] T012 [P] Клиент `getGraphView` принимает `layer` в
  `frontend/src/api/graph.ts`

**Checkpoint F1**: `GET .../graph/view?focus=<service>&layer=code` + unit
affiliation/slice зелёные; system без `layer` как `011`

---

## Phase 3: User Story 1 — Вход в code от system-компонента (Priority: P1) 🎯 MVP

**Goal**: После system-интерьера сервиса явный шаг «В код» открывает первый
code-уровень affiliated узлов (FR-001/006/012/013, SC-001 частично, SC-003,
SC-006)

**Independent Test**: quickstart §2 на ods-arch — backend «В код» → модули;
elasticsearch → empty; frontend≠backend срезы

**Depends on**: **F1**, S1

### Tests

- [X] T013 [P] [US1] Frontend test `frontend/src/pages/GraphViewPage.code-entry.test.tsx`
  (или components) — на system-фокусе service видна «В код»; double-click
  service не ставит `layer=code`
- [X] T014 [P] [US1] Integration/API
  `backend/tests/integration/graph-view-code-layer.test.ts` — layer=code для
  сервиса с path-match; no_related_code для инфро-сервиса

### Implementation

- [X] T015 [US1] Inspector: кнопка «В код» при focus service + `layer=system`
  в `frontend/src/components/graph-view/GraphInspector.tsx`
- [X] T016 [US1] `GraphViewPage` синхронизирует `?layer=code|system` с запросом
  slice; «В код» → `layer=code` без смены focus id в
  `frontend/src/pages/GraphViewPage.tsx`
- [X] T017 [US1] Empty state `no_related_code` (русский текст) в
  `frontend/src/pages/GraphViewPage.tsx` / banner component
- [X] T018 [P] [US1] Стили/подписи code kinds на canvas (module/class/method)
  в существующем `frontend/src/components/graph-view/SystemNode.tsx` (или
  том же custom node, что system) — отличимы от system; **новый**
  `CodeNode.tsx` не обязателен

**Checkpoint A1**: SC-003/SC-006 на ods-arch; system enter ≠ code enter

---

## Phase 4: User Story 2 — Углубление до листьев канона (Priority: P1)

**Goal**: Drill module → type → method по канону; крошки / наверх (FR-003/005,
SC-001)

**Independent Test**: quickstart §3 — цепочка до листа и назад

**Depends on**: A1

### Tests

- [X] T019 [P] [US2] Unit в `backend/tests/unit/graph-view.service.test.ts` —
  focus module → class children; focus class → methods; нет фейкового уровня
  без узлов
- [X] T020 [P] [US2] Frontend test крошек
  `frontend/src/components/graph-view/GraphBreadcrumbs.test.tsx` (или page) —
  путь Система › service › code…; «Наверх» / «К системе» сбрасывает layer

### Implementation

- [X] T021 [US2] В `backend/src/services/graph-view-slice.ts` для focus
  code-узла: `inside` = прямые дети по `parent_id` с code-kind; если детей
  нет — пустой inside (дно), без synthetic узлов. Закрыть gap после T010;
  покрыто asserts T019

- [X] T022 [US2] «Войти»/double-click на code-узле → `focus=<id>` (layer
  выводится) в `frontend/src/pages/GraphViewPage.tsx`
- [X] T023 [US2] Крошки включают code-уровни; «К системе» → focus null +
  `layer=system` в `frontend/src/components/graph-view/GraphBreadcrumbs.tsx` +
  page

**Checkpoint A2**: SC-001 полный путь на backend/frontend без тупика

---

## Phase 5: User Story 3 — Связи кода в срезе (Priority: P2)

**Goal**: Рёбра канона в срезе; клик≠вход; свободный вход в внешнего соседа
(FR-002/004/014, SC-002)

**Independent Test**: calls/injects видны как externals; Войти в чужой сосед
меняет focus

**Depends on**: A2

### Tests

- [X] T024 [P] [US3] Unit `backend/tests/unit/graph-view.service.test.ts` —
  incident `calls`/`injects` → external stub; truncate не тянет весь граф
- [X] T025 [P] [US3] Frontend test — click external = inspector only; enter
  external меняет focus (в т.ч. «чужой» компонент) в
  `frontend/src/pages/GraphViewPage.focus.test.tsx` (расширить)

### Implementation

- [X] T026 [US3] Срез включает рёбра инцидентные focus∪inside для code-layer в
  `backend/src/services/graph-view-slice.ts`
- [X] T027 [US3] Подписи типов рёбер на hover/selection для code-связей (i18n)
  в `frontend/src/components/graph-view/GraphCanvas.tsx` /
  `frontend/src/i18n/ru.ts`
- [X] T028 [US3] Баннер `truncated` на code-срезе (русский) в
  `frontend/src/pages/GraphViewPage.tsx`

**Checkpoint A3**: SC-002; FR-014 на code

---

## Phase 6: User Story 4 — Открыть code на схеме из анализа (Priority: P2)

**Goal**: Из «Граф анализ» code-узел открывается с фокусом на нём
(`exact_code`); fallback `011` (FR-015, SC-007)

**Independent Test**: quickstart §6

**Depends on**: F1 (желательно A2 для осмысленного среза)

### Tests

- [X] T029 [P] [US4] Unit resolve_from code → `exact_code` в
  `backend/tests/unit/graph-view.service.test.ts`; неизвестный id → 404 или
  system_fallback по контракту
- [X] T030 [P] [US4] Frontend test `frontend/src/pages/GraphPage.open-view.test.tsx`
  (или расширить) — code «Открыть на схеме» → `/graph-view?resolve_from=`

### Implementation

- [X] T031 [US4] `resolve_from` / resolve path: code → focus code +
  `resolve_status=exact_code` в `backend/src/services/graph-view-slice.ts` /
  `graph-view.service.ts` (R4); иначе R5 `011`
- [X] T032 [US4] GraphPage «Открыть на схеме» для code передаёт
  `resolve_from` (не только service collapse) в
  `frontend/src/pages/GraphPage.tsx`
- [X] T033 [US4] GraphViewPage: при `exact_code` без баннера «code не
  показываем»; при system_fallback — баннер `011` в
  `frontend/src/pages/GraphViewPage.tsx` + i18n
- [X] T034 [P] [US4] «В анализе» с code-фокуса → `/graph?select=` регресс в
  `frontend/src/components/graph-view/GraphInspector.tsx`

**Checkpoint A4**: SC-007

---

## Phase 7: User Story 5 — Регресс system-просмотра (Priority: P2)

**Goal**: Карта системы и system-drill `011` не сломаны (FR-008, SC-004/005)

**Independent Test**: quickstart §1; system-landscape-demo или ods-arch system-only

**Depends on**: F1; желательно после A1 чтобы поймать регрессии layer

### Tests

- [X] T035 [P] [US5] Регресс unit/integration: view без `layer` / `layer=system`
  — peers, broker topics, database empty inside в
  `backend/tests/unit/graph-view.service.test.ts` и/или
  `backend/tests/integration/graph-view-system.test.ts`
- [X] T036 [P] [US5] Frontend smoke — double-click service остаётся system
  interior; на «Граф просмотр» **нет** UI удаления/добавления узлов или
  рёбер канона (FR-009 / SC-005)

### Implementation

- [X] T037 [US5] Зафиксировать default `layer=system` и отсутствие авто-прыжка
  в code при enter service в `frontend/src/pages/GraphViewPage.tsx`
- [X] T038 [US5] Пройти ручной чеклист quickstart §1 на поднятом стеке; зазоры
  backend/UI закрыть точечно

**Checkpoint A5**: SC-004/SC-005

---

## Phase 8: Polish & Cross-Cutting

**Purpose**: DoD, документация статуса, запрет парсеров/ingest

- [X] T039 [P] Прогон `specs/012-code-graph-bottom/quickstart.md` на ods-arch
  (SC-001…SC-007) и краткая отметка в Notes ниже
- [X] T040 [P] Обновить статус в `specs/001-ods-vision/spec.md` /
  `.specify/memory/constitution.md` после закрытия implement (не раньше)
- [X] T041 Подтвердить в Notes: affiliation **не** пишется в ES; парсеры не
  менялись; follow-up «рёбра code↔service в канон» отложен
- [X] T042 [P] Убрать/обновить устаревшие UI-тексты `011` про «code на схеме
  не показываем» там, где противоречит `exact_code`, в
  `frontend/src/i18n/ru.ts`

**Checkpoint P1**: DoD `012` готов к close

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (S1)**: сразу
- **Foundational (F1)**: после S1 — **блокирует** US1–US4
- **US1 (A1)**: после F1 — MVP
- **US2 (A2)**: после A1
- **US3 (A3)**: после A2
- **US4 (A4)**: после F1 (параллельно A2/A3 при осторожности к тем же файлам)
- **US5 (A5)**: после F1; финальная проверка после A1+
- **Polish**: после A2 минимум; ideally после A4+A5

### User Story Dependencies

| Story | Зависит от |
|-------|------------|
| US1 | F1 |
| US2 | US1 |
| US3 | US2 |
| US4 | F1 (UI удобнее после US2) |
| US5 | F1 |

### Parallel Opportunities

```text
S1:  T002, T003 || T001
F1:  T005, T006 || после T004; T008 || после T007; T012 || после T005
US1: T013, T014 || ; T018 || после T016
US2: T019, T020 ||
US3: T024, T025 ||
US4: T029, T030 || ; T034 || после T032
US5: T035, T036 ||
Polish: T039, T040, T042 ||
```

### Parallel Example: Foundational

```bash
Task: "T005 Zod layer in backend/src/api/schemas/graph.schemas.ts"
Task: "T006 Client types in frontend/src/api/graph-types.ts"
# после T004
Task: "T007 affiliation in backend/src/services/graph-view-affiliation.ts"
Task: "T008 unit graph-view-affiliation.test.ts"  # после T007
```

---

## Implementation Strategy

### MVP First (US1)

1. S1 → F1 → US1 (A1)
2. **STOP**: на ods-arch «В код» для backend + empty для elasticsearch
3. Затем US2 (дно) → US3 → US4 → US5 → Polish

### Incremental Delivery

1. F1 → API layer=code готов
2. US1 → демо «В код»
3. US2 → до метода
4. US3 → рёбра/соседи
5. US4 → из анализа
6. US5 + Polish → close

---

## Notes

- [P] = разные файлы / нет зависимости от незакрытых
- Не менять `parsers/**` и ingest
- Не писать affiliation в ES
- Эталон: `docker/fixtures/repos/ods-arch/`
- Регресс system: `system-landscape-demo` + ods-arch system path
- OpenAPI `servers.url` localhost — не трогать в этих tasks (осознанно)
- **Loader strategy (R5 / T009):** **(A)** ES `listByPathSegment` по имени сервиса + CODE_KINDS
- После implement: `/speckit-implement` по чеклисту выше
- Analyze remediation 2026-07-18: I1/A1/A2/U1/U2 + FR order + terminology
