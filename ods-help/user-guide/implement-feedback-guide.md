# Обратная связь после speckit-implement: ошибки, спеки и рекомендации

Руководство по тому, **какие проблемы проявлялись** в прогонах `/speckit-implement` для ODS MVP,
**что из этого попало в спеки**, **что осталось в backlog**, и **как действовать** при следующих
циклах Spec Kit.

Связанные документы:

- [later.md](./later.md) — backlog пилотных багов и доработок post-MVP
- [commands-run-project.md](./commands-run-project.md) — запуск Docker-стека и операционные обходы
- [commands.md](./commands.md) — команды Spec Kit
- `specs/002-domain-model/` — backend, модель данных
- `specs/003-portal-mvp/` — frontend, портал

---

## Краткий вывод

| Вопрос | Ответ |
|--------|--------|
| Были ли правки в спеках после ошибок? | **Да, частично** — в основном до implement (analyze) и в plan/tasks/quickstart |
| Поможет ли это избежать тех же ошибок? | **Частично** — edge cases, пути Docker, порядок фаз; пилотные баги #8/#9 — **нет**, пока не вынесены в spec/tasks |
| Нормален ли цикл «implement → тест → фикс»? | **Да** — это ожидаемая обратная связь SDD, не провал процесса |

---

## Что реально обновлялось в спеках (и поможет в будущем)

### До implement — после `/speckit-analyze`

Самый полезный слой: требования и задачи **до** кодирования.

| Что добавили | Где | Зачем |
|--------------|-----|--------|
| Edge cases: симлинки, большие репо, кодировки | `specs/002-domain-model/spec.md`, `research.md` | Чтобы sync и чтение файлов не ломались на краях |
| Задачи T037–T040 | `specs/002-domain-model/tasks.md` | Симлинки → `partial`, бенчмарк 500+ детей, smoke 1000+ файлов, документация фикстур |
| Пути Docker vs локально | `specs/002-domain-model/quickstart.md`, `docker/fixtures/repos/README.md` | Не путать `/repos/...` (в контейнере) и `/Users/...` (на хосте) |
| Полный compose (`profile full`) | `specs/002-domain-model/plan.md`, `research.md` (R9) | Связка elasticsearch + backend + frontend в одном стеке |
| Checkpoint'ы B1–B4 ↔ C1–C4 | `002/tasks.md`, `003/tasks.md` | Явный порядок: backend до frontend, FileViewer после B3 |
| Коды ошибок, статусы sync | `contracts/`, `data-model.md` | `encoding_unsupported`, `sync_in_progress`, `partial`, `failed` и т.д. |
| Идемпотентность регистрации | `002/spec.md`, OpenAPI | Повторный импорт того же источника → тот же проект, без дубликата |

**Если снова запускать implement с нуля на чистом клоне**, эти артефакты **снижают** риск тех же классов ошибок (пути, edge cases, порядок фаз).

### Во время implement — в основном код и отметки `[x]` в tasks

Типичные исправления в прогонах (часть уже была в tasks, детали — в коде):

| Тема | Где зафиксировано | Примечание |
|------|-------------------|------------|
| Идемпотентность регистрации (200 вместо дубликата) | T017, spec FR | Поведение в спеке; детали HTTP-кодов — в реализации |
| Upsert элементов дерева, дедупликация по path | Код backend | В spec — поведение дерева, не каждый багфикс |
| `refreshWorkingCopy()` перед sync | Код backend | Операционная деталь git pull |
| `recoverInterruptedSyncs()` при старте | T023, tasks | `running` → `failed` после рестарта backend |

**Правило:** спека описывает **поведение**, не каждый коммит с фиксом. Детали реализации остаются в коде и тестах.

---

## Что в спеки не попало (и может повториться)

Зафиксировано в [later.md](./later.md) с пометкой «позже вынесем в спеки». Повторный implement **не предотвратит** эти проблемы, пока не появятся FR, задачи или тесты.

| # | Проблема | В спеках? | Где сейчас |
|---|----------|-----------|------------|
| 1 | Нет DELETE проекта, мусор в списке ES | Нет | `later.md` |
| 2 | Дубликаты одного репо (host path vs `/repos/...`) | Частично (идемпотентность по точной строке) | `later.md` |
| 3 | Тесты засоряют ES (`Perf Bulk`, `Large Repo`) | Нет | `later.md`, интеграционные тесты backend |
| 4 | «Синхронизация прервана при перезапуске» | Поведение MVP в коде (T023) | `later.md` — UX/post-MVP |
| 5 | Путь не для этого окружения | Частично в quickstart | `later.md`, UI-подсказки |
| 6 | `idle` после неудачного импорта | Нет | `later.md` |
| 7 | Нет управления жизненным циклом данных | Документация | `later.md`, `commands-run-project.md` |
| 8 | FileViewer не открывает файл в центре | **Нет** | `later.md` (возможная гонка UI) |
| 9 | Ручной sync → «Внутренняя ошибка сервера» | **Нет** | `later.md` |

### Операционные проблемы (не FR, но важны при повторном запуске)

| Проблема | Где задокументировано | В спеках? |
|----------|----------------------|-----------|
| `sample-project` как gitlink (`160000`) вместо файлов | Чат, [commands-run-project.md](./commands-run-project.md) | Нет |
| Нет `.git` в фикстуре после clone | `setup-fixtures.sh`, README фикстур | Нет |
| `COMPOSE_PROJECT_NAME=ods-mvp` | `docker/.env.example`, runbook | Нет |

Для **нового разработчика / нового clone** сильнее помогают runbook и скрипты, чем только `spec.md`.

---

## Три типа ошибок и куда их записывать

После каждой ошибки в прогоне implement классифицируйте находку:

```
Ошибка в прогоне
       │
       ├── Дыра в требованиях     → spec.md + tasks.md (+ тест)
       ├── Операционка / окружение → quickstart, runbook, скрипт (setup-fixtures.sh)
       ├── Баг реализации         → код + regression-тест; spec — только если уточнили поведение
       └── Post-MVP / отложено    → later.md → потом отдельный инкремент в spec
```

### 1. Дыра в требованиях

Не было FR или acceptance criteria. Пример: нормализация путей, DELETE проекта, изоляция тестового ES.

**Действие:** обновить `spec.md`, добавить задачи в `tasks.md`, при необходимости контракты OpenAPI.

### 2. Операционка и окружение

Код верный, но среда настроена неверно. Примеры: путь `/Users/...` в Docker, отсутствие `.git` в `sample-project`, submodule `160000`.

**Действие:** [commands-run-project.md](./commands-run-project.md), `quickstart.md`, `docker/fixtures/repos/README.md`, скрипты подготовки.

### 3. Баг реализации

Требование было, реализация не соответствует. Примеры (кандидаты): FileViewer #8, ручной sync #9.

**Действие:** исправить код, добавить тест; в spec — один абзац уточнения, если поведение раньше было неоднозначным.

---

## Поможет ли обновлённая спека в разных сценариях

| Сценарий | Насколько помогут текущие спеки |
|----------|----------------------------------|
| **Новый инкремент** по `later.md` | Да, **если** перед implement вынести пункты в spec/tasks |
| **Повторный полный implement с нуля** | Частично: edge cases, пути, фазы — лучше; #8, #9 — нет |
| **Разработка поверх готового MVP** | Спеки вторичны; важны тесты, CI, runbook |
| **Новый clone / новая машина** | Runbook + `setup-fixtures.sh` + quickstart важнее монолитной spec |

---

## Нормален ли процесс «ошибки во время implement»?

**Да.** В Spec-Driven Development цикл такой:

```
spec → plan → tasks → implement → тест / пилот → обратная связь → (spec | docs | код)
```

Ошибки на этапе implement — **ожидаемая обратная связь**, не признак того, что SDD «не сработал».

Идеал «спека написана — код с первого раза без правок» для MVP с Docker, Elasticsearch и **двумя спеками** (`002` + `003`) нереалистичен.

### Что в прогонах ODS было здоровым

- `/speckit-analyze` **до** implement → задачи T037–T040, согласование quickstart/plan
- Checkpoint'ы B1–B4 / C1–C4 между backend и frontend
- После демо на `:8080` — честный [later.md](./later.md), а не «забыли про баги»
- Операционные уроки (фикстуры, compose) — в runbook, не только в чате

### Что не довели до конца (источник повторов)

- Пилотные баги #8, #9 не стали FR + задачами + автотестами
- Нет отдельной спеки `004-mvp-runtime` (smoke compose, изоляция тестов ES)
- Нет явной привычки после каждого фикса: «это требование, операционка или только код?»

---

## Практическая рекомендация на будущее

### После каждого прогона `/speckit-implement`

Задайте **один вопрос** на каждую находку:

> Это **новое требование**, **операционная заметка** или **разовый багфикс**?

| Тип | Куда писать |
|-----|-------------|
| Новое требование | `specs/.../spec.md`, `tasks.md`, при необходимости `contracts/` |
| Операционка | `quickstart.md`, [commands-run-project.md](./commands-run-project.md), скрипты в `docker/` |
| Post-MVP | [later.md](./later.md) → затем отдельный инкремент со своим spec/tasks |
| Баг при верных требованиях | Код + regression-тест; spec — только при уточнении поведения |

### Перед следующим крупным implement

1. Пройти [later.md](./later.md) — решить, что входит в scope, что остаётся backlog
2. Для пунктов в scope — дописать FR и задачи **до** `/speckit-implement`
3. Запустить `/speckit-converge`, если код уже обогнал `tasks.md`
4. Для полного стека — проверить [commands-run-project.md](./commands-run-project.md) и `./docker/fixtures/repos/setup-fixtures.sh`

### Порядок спек для MVP (напоминание)

```
002-domain-model (backend)  →  checkpoint B2 минимум для портала
003-portal-mvp (frontend)   →  после B2; FileViewer после B3; Docker full — Phase 8
```

Один запуск `/speckit-implement` обрабатывает **одну** фичу (`FEATURE_DIR`). Кросс-спека оркестрация — вручную или отдельным runbook, не «одна кнопка на весь проект».

### Когда не гонять полный re-implement

- MVP уже в `main` / `develop`, код в git
- Нужны точечные доработки из `later.md`
- Достаточно: фича-инкремент → implement одной спеки → smoke на `:8080`

---

## Черновик: куда вынести пункты из later.md

| Тема | Кандидат в спеках |
|------|-------------------|
| DELETE project, каскад ES, повторный импорт | `002-domain-model` (API + data model) |
| UX списка, «Удалить», подсказки Import | `003-portal-mvp` или следующий UI-инкремент |
| Изоляция тестов, smoke compose, prod-like runtime | `004-mvp-runtime` (планировалась) |
| Нормализация путей, статусы sync (`interrupted`) | `002-domain-model` |
| FileViewer / выбор файла, sync из меню (#8, #9) | `003-portal-mvp` + тесты |

Подробные симптомы и шаги отладки — в [later.md](./later.md).

---

## Ссылки на ключевые файлы

| Файл | Назначение |
|------|------------|
| `specs/002-domain-model/spec.md` | FR backend, edge cases sync |
| `specs/002-domain-model/tasks.md` | T037–T040, checkpoint B1–B4 |
| `specs/003-portal-mvp/tasks.md` | Checkpoint C1–C4, Phase 8 Docker |
| `ods-help/user-guide/later.md` | Backlog пилота, #8 #9 |
| `ods-help/user-guide/commands-run-project.md` | Docker, фикстуры, troubleshooting |
| `docker/fixtures/repos/setup-fixtures.sh` | `.git` в sample-project после clone |
| `.specify/memory/constitution.md` | Иерархия спек 001 / 002 / 003 |

---

*Документ создан: 2026-07-08. Основан на прогонах speckit-implement ODS MVP (спеки 002, 003) и пилоте на http://localhost:8080.*
