# Спецификация: Шаблон расширения парсеров + Java MVP

**Фича**: `018-parser-extension-playbook`

**Создано**: 2026-07-19

**Статус**: ✅ реализовано (2026-07-19)

**Вход**: Черновик
`ods-help/requirements/018-parser-extension-playbook-draft.md`
(решения зафиксированы 2026-07-19).

**Родительская спека**: `specs/001-ods-vision/spec.md` (этап 14)

**Зависимость**: модульный контракт парсеров `005`; канон code `006`/`008`;
system-артефакты `009` (паттерн, не Spring-ландшафт); эталон добавления
модулей — `013`. Docs/RAG/auth (`015`–`017`) — **после** этой фичи.

## Краткое описание

Платформа получает **нормативный шаблон** «как добавить новый модуль анализа»
(language или artifact) и **первый новый языковой модуль — Java** (символы
code-слоя: пакеты и типы). Эталон dogfood —
spring-petclinic-microservices: после анализа Java перестаёт быть
«парсер не установлен», в code-графе появляются типы/пакеты. Spring-ландшафт,
HTTP из Java и symbols shell **не** входят в DoD.

## Clarifications

### Session 2026-07-19

- Q: Приоритет vs docs? → A: **`018` перед `015`** (уже в `001` / constitution).
- Q: Только шаблон или сразу Java? → A: **CP-A (шаблон) + CP-B (Java MVP)**
  в одной спеке; иначе шаблон не проверен на живом модуле.
- Q: Глубина Java? → A: **пакеты + типы** (классы/интерфейсы/enum); методы —
  MAY; calls/usages `008` — **не** DoD.
- Q: Shell? → A: **без** symbols-парсера; wrappers `mvnw`/`gradlew`
  **игнорировать** в детекторе; прочие `.sh` → `missing`.
- Q: Spring system (Maven, yml, Feign)? → A: **follow-up**, не DoD `018`.
- Q: Какие Java-исходники входят в DoD анализа? → A: **Только production** —
  `**/src/main/java/**`; исключить `**/src/test/**` и типичный generated.
- Q: Вложенные / внутренние типы Java в DoD? → A: **Только top-level** типы
  в compilation unit; nested / anonymous / local — вне DoD.
- Q: Как пакеты входят в code-граф (DoD)? → A: **Один узел на FQN-пакет**;
  типы принадлежат пакету (без иерархии сегментов `com`→`com.example`).
- Q: Обязателен ли отдельный узел «файл» (`kind: module`)? → A: **Да —
  как у всех language-парсеров** (typescript/python/csharp/cpp): на каждый
  разобранный `.java` MUST быть `kind: module`. Пакет — `kind: namespace`
  (как namespace в csharp); типы — class/interface/enum. (Решение после
  analyze: единообразие; прежний «только path» отменён.)
- Q: SC-001 только petclinic? → A: **petclinic или** fixture
  `java-symbols-demo` (эквивалент для CI); dogfood petclinic — SHOULD
  (analyze C1).

**Термин:** «playbook» / «шаблон расширения» = канон
`contracts/parser-extension-checklist.md` (чеклист).

## Границы спеки

### Входит

**A — Шаблон расширения парсеров**

- нормативный чеклист touchpoints: решение language vs artifact vs ignore;
  детекция; модуль; ingest в канон; оркестрация; поставка runtime;
  фикстуры/приёмка; UI-статусы; документация модулей;
- анти-паттерны (один модуль «на всё»; новые типы канона без контракта;
  `missing` как «баг» и т.п.);
- артефакт: `contracts/parser-extension-checklist.md`;
- доказательство: проход чеклиста при добавлении Java (tasks).

**B — Java MVP (language)**

- модуль анализа для языка **java** (отдельный сменный CLI);
- извлечение в канон code-слоя **как у прочих language-парсеров**: на каждый
  `.java` — **`module`**; пакет — **`namespace`** (FQN, как namespace в
  csharp); **top-level типы** — из **production** `**/src/main/java/**`
  (без test и типичного generated);
- отчёт по языкам: для Java статус модуля **доступен** при установленном
  модуле;
- эталон приёмки: spring-petclinic-microservices (+ компактная fixture
  при необходимости);
- изоляция: отключение/отсутствие модуля → статус «не установлен» без
  поломки остальных модулей (в т.ч. compose / уже поддерживаемые языки).

**Общее**

- wrappers сборки (`mvnw`, `gradlew` и аналоги basename) **не** считаются
  языком shell в отчёте;
- встраивание в существующий конвейер анализа `005`/`006` без второго
  оркестратора.

### Не входит

- docs / RAG / auth (`015`–`017`);
- Spring system landscape (Maven/Gradle-проект как сервисы, `application*.yml`,
  Gateway/Feign, Java HTTP-роуты / http_calls);
- Kotlin / Scala;
- calls / usages глубины `008` для Java;
- nested / inner / anonymous / local типы Java (DoD — только top-level);
- symbols-парсер shell; artifact «build-scripts»;
- merge OpenAPI ↔ code; смена стека backend платформы;
- новые типы узлов/рёбер канона сверх уже существующих code-типов
  (переиспользовать модель `008`/symbols).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Шаблон «как добавить парсер» (Priority: P1)

Как **команда платформы**, я опираюсь на один канонический чеклист шагов
при добавлении любого нового модуля анализа и не изобретаю процесс заново.

**Why this priority**: без шаблона каждый язык/артефакт снова «с нуля»;
цель всей фичи.

**Independent Test**: в спеке/контрактах есть чеклист; при закрытии Java
tasks отмечен проход по пунктам чеклиста.

**Acceptance Scenarios**:

1. **Given** канон фичи `018`, **When** открываю контракт шаблона,
   **Then** вижу полный список touchpoints (решение типа модуля → детекция →
   модуль → ingest → поставка → приёмка) и анти-паттерны.
2. **Given** будущий новый язык (например Go), **When** планирую спеку
   модуля, **Then** достаточно сослаться на этот чеклист + описать
   предмет извлечения — без новой «мета-спеки процесса».
3. **Given** закрытие CP-B Java, **When** смотрю tasks/DoD, **Then**
   проход чеклиста зафиксирован (не только «парсер работает»).

---

### User Story 2 — Java в отчёте и в code-графе (Priority: P1)

Как **архитектор**, на Java-микросервисном репозитории (petclinic) после
анализа я вижу, что Java **поддерживается**, и в code-слое есть пакеты/типы
из исходников — не только «парсер не установлен».

**Why this priority**: главный пробел dogfood; проверяет шаблон на живом
модуле.

**Independent Test**: sync/detect petclinic → Java available → анализ →
в code-графе есть типы/пакеты из `.java`.

**Acceptance Scenarios**:

1. **Given** petclinic после sync с установленным Java-модулем, **When**
   смотрю отчёт по языкам, **Then** у `java` статус модуля **доступен**
   (не «не установлен»).
2. **Given** подтверждённый прогон анализа, **When** смотрю code-слой
   (или узлы графа кода) по Java-файлам, **Then** видны **module** (файлы),
   **namespace** (FQN-пакеты) и **top-level типы** из `src/main/java`.
3. **Given** тот же проект, **When** code-слой, **Then** не подмена
   code-символов system-сущностями Spring (HTTP/Feign и т.п. отсутствуют
   как DoD этой фичи); типы только из test/generated **не** обязаны
   присутствовать.

---

### User Story 3 — Wrappers не засоряют отчёт (Priority: P2)

Как **архитектор**, я не вижу `mvnw`/`gradlew` как «язык shell» с
отсутствующим парсером — они не мешают читать отчёт по реальным языкам.

**Why this priority**: снижает шум dogfood; зафиксировано в черновике.

**Independent Test**: detect petclinic → в отчёте нет basename-wrappers
сборки как файлов shell (или они исключены из подсчёта shell).

**Acceptance Scenarios**:

1. **Given** репозиторий с `mvnw` и `.java`, **When** детектор завершён,
   **Then** `mvnw`/`gradlew` **не** увеличивают `shell` как обычные
   исходники (исключены по basename).
2. **Given** обычные `.sh` скрипты без модуля shell, **When** отчёт,
   **Then** они MAY остаться в `shell` со статусом **не установлен** —
   без падения анализа остальных языков.

---

### User Story 4 — Изоляция модуля (Priority: P2)

Как **оператор платформы**, я могу работать без Java-модуля: остальные
модули (compose, уже поддерживаемые языки) продолжают анализ; Java просто
«не установлен».

**Why this priority**: сменность модулей — принцип `005`/`013`.

**Independent Test**: убрать/не регистрировать Java-модуль → missing для
java; compose и др. available и отрабатывают.

**Acceptance Scenarios**:

1. **Given** Java-модуль отсутствует, **When** detect + анализ, **Then**
   `java` → не установлен; прогон не падает из‑за одного missing.
2. **Given** compose (или другой available-модуль) на том же проекте,
   **When** анализ, **Then** его результат по-прежнему доступен.

---

### Edge Cases

- Равный `file_count` у языков — порядок как в `005` (имя).
- Пустой набор `.java` после фильтров — модуль не обязан создавать узлы;
  статус available при установленном модуле сохраняется.
- Ошибка извлечения одного файла — не валит весь прогон (partial /
  ошибки модуля по правилам `005`/`006`).
- Повторный анализ / инкремент — устаревшие code-узлы по изменённым path
  обновляются или удаляются по правилам ingest платформы.
- Файл без пакета / нестандартная раскладка — тип всё же попадает в канон
  с best-effort привязкой к файлу.
- `.java` вне `src/main/java` (test, generated) — вне DoD извлечения;
  детектор MAY по-прежнему учитывать их в `file_count` языка (или нет —
  не блокер), но модуль **не** обязан создавать по ним code-узлы.
- Nested / inner / anonymous / local типы — вне DoD; отсутствие узлов по
  ним не считается провалом приёмки.
- Пакеты — **плоские FQN-узлы** (не цепочка сегментов); тип без `package`
  — best-effort (default/unnamed), без требования иерархии сегментов.

## Requirements *(mandatory)*

### Functional Requirements

**A — Шаблон**

- **FR-001**: Платформа MUST иметь канонический чеклист расширения парсеров
  (`contracts/parser-extension-checklist.md`) с разделами: решение типа
  модуля; детекция; CLI-модуль; ingest в канон; оркестрация; поставка;
  приёмка; UI-статусы; документация модулей; анти-паттерны.
- **FR-002**: Чеклист MUST различать **language**, **artifact** и
  **не парсер** (ignore/шум) и MUST запрещать смешивать symbols языка и
  system/HTTP в одном модуле без отдельного обоснования.
- **FR-003**: Закрытие Java-модуля в этой фиче MUST сопровождаться явным
  проходом чеклиста (tasks / DoD), доказывая шаблон на практике.

**B — Java + детекция**

- **FR-004**: Платформа MUST предоставлять сменный модуль анализа для
  языка **java**, совместимый с конвейером `005` (envelope + registry).
- **FR-005**: После успешного анализа Java-проекта модуль MUST порождать
  канонические code-сущности **в том же духе, что typescript/csharp/python/cpp**:
  - **`module`** — на каждый разобранный `.java` из
    **`**/src/main/java/**`** (`path` / `qualified_name` = путь файла);
  - **`namespace`** — пакет FQN (роль как namespace в csharp; **один** узел
    на FQN с синтетическим path `java-package/...`, без сегментной
    иерархии `com`→`com.example`);
  - **`class` / `interface` / `enum`** — только **top-level** в compilation
    unit; MUST иметь `path` к `.java` и быть связаны с пакетом
    (`parent_qualified_name` = FQN namespace).
  Методы — MAY. Файлы в `**/src/test/**` и типичный generated MUST NOT
  требоваться в DoD канона. Nested, anonymous и local типы MUST NOT входить
  в DoD.
- **FR-006**: В отчёте по языкам для Java MUST отображаться статус модуля
  **доступен**, если модуль установлен и исправен; иначе **не установлен**
  или **ошибка** по правилам `005`.
- **FR-007**: Детектор MUST исключать из классификации shell basename
  wrappers сборки: как минимум `mvnw`, `gradlew` (и оговорённые аналоги).
- **FR-008**: Отсутствие Java-модуля MUST NOT блокировать анализ других
  available-модулей того же прогона.
- **FR-009**: Модуль Java MUST быть отключаемым/удаляемым без поломки
  конвейера и без требования менять оркестратор «под Java».
- **FR-010**: Фича MUST NOT требовать новых NodeType/EdgeType system-слоя
  и MUST NOT включать Spring HTTP / Feign / Maven-as-services в DoD.

### Key Entities

- **Чеклист расширения парсера**: нормативный список touchpoints и
  анти-паттернов для любого нового модуля.
- **Модуль анализа (language)**: сменный компонент на язык; java — первый
  новый после базового набора `005`.
- **Отчёт по языкам**: язык, число файлов, статус модуля, примеры путей.
- **Code-сущности Java**: **`module`** (файл), **`namespace`** (FQN-пакет,
  как csharp), **top-level тип**; тип принадлежит пакету; module — файл.
- **Wrapper сборки**: служебный скрипт (`mvnw`/`gradlew`), не исходник для
  symbols.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: После анализа на **petclinic** или на fixture
  `java-symbols-demo` у языка Java статус модуля — **доступен** (не «не
  установлен»). Dogfood на petclinic — SHOULD (ручная проверка в tasks).
- **SC-002**: После анализа того же эталона (petclinic или fixture) в
  code-слое есть узлы **`module`**, **`namespace`** (FQN) и **top-level**
  типов из `src/main/java` (выборка: не пусто; на petclinic — классы вроде
  Application / Controller).
- **SC-003**: `mvnw`/`gradlew` не фигурируют в отчёте как учитываемые
  shell-исходники после детекции.
- **SC-004**: При отсутствии Java-модуля прогон с compose (и/или другими
  available) завершается без падения из‑за Java missing.
- **SC-005**: В репозитории спеки есть чеклист расширения; tasks Java
  ссылаются на проход чеклиста (аудит закрытия фичи).
- **SC-006**: Добавление следующего языка в будущем планируется по тому же
  чеклисту без новой мета-спеки процесса (проверяется ревью плана/спеки
  follow-up).

## Assumptions

- Карта `001` уже ставит `018` следующим после `014`; статус спеки
  обновляется при implement.
- Детектор уже распознаёт `.java` как язык java; работа — модуль + ingest +
  фильтр wrappers.
- Канон code-слоя как у прочих parsers: **`module` + `namespace` + тип**
  (`008`/symbols); новых system-типов не нужно.
- Эталон: **fixture `java-symbols-demo`** для CI/автотестов; **petclinic**
  для dogfood (SHOULD).
- Технология extract: **JavaParser + Maven** CLI — см. plan/research.
- DoD Java-extract — **production** `src/main/java`; test/generated не
  обязательны в каноне; типы — **только top-level**; пакеты — **FQN
  `namespace`** (не сегментная иерархия).
- Прочие `.sh` без модуля остаются `missing` — приемлемый шум до
  отдельного follow-up.

## Связанные материалы

- Черновик: `ods-help/requirements/018-parser-extension-playbook-draft.md`
- Контракт шаблона: `contracts/parser-extension-checklist.md`
- `specs/005-code-analysis/` — envelope, registry, статусы модулей
- `specs/008-code-graph-depth/` — глубина code (calls — вне DoD `018`)
- `specs/009-system-landscape/` — паттерн artifact-модулей (follow-up Spring)
- `specs/013-api-routes-from-code/` — эталон добавления сменного модуля
- Dogfood: `https://github.com/spring-petclinic/spring-petclinic-microservices.git`
