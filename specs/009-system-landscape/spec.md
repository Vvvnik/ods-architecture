# Спецификация: System landscape (инфраструктурный граф)

**Фича**: `009-system-landscape`

**Создано**: 2026-07-14

**Статус**: Уточнено (clarify 2026-07-14); plan готов (2026-07-14)

**Вход**: System-слой в том же каноне графа, что и code-слой (`006`/`008`):
сервисы, HTTP-контракты, шина сообщений, БД и compose из артефактов
репозитория. Источник:
`ods-help/requirements/008-code-graph-and-system-landscape-draft.md` (§B);
модели — `ods-help/requirements/json-model/` (C02, C04, P01–P07).

**Родительская спека**: `specs/001-ods-vision/spec.md` (этап 8)

**Зависимость**: `specs/005-code-analysis/spec.md` (детектор, оркестратор,
envelope, прогон); `specs/006-project-graph/spec.md` (канон, ingest,
индексы `ods-graph-*`); `specs/007-portal-scale-ux/spec.md` (поиск и
просмотр графа); `specs/008-code-graph-depth/spec.md` (паттерн
`metadata.layer` для разделения слоёв)

## Краткое описание

После анализа monorepo пользователь видит не только **code-граф** (символы,
вызовы), но и **ландшафт системы**: какие сервисы объявлены в compose,
как связаны проекты, какие HTTP-эндпоинты описаны в OpenAPI, к каким БД
и брокерам подключаются сервисы, кто публикует и потребляет сообщения.
Все данные попадают в **те же** индексы канона (`ods-graph-nodes`,
`ods-graph-edges`) с пометкой `metadata.layer = system`. Существующий
code-слой и прогоны **не ломаются**.

## Clarifications

### Session 2026-07-14

- Q: Как расширить отчёт детектора для system-слоя — `artifacts[]` отдельно или в `languages[]`? → A: **`artifacts[]` отдельно от `languages[]`** — два массива в language report; у artifact entry: `artifact_type`, `file_count`, `sample_paths`, `parser_id`, `parser_status` (аналогично language entry).
- Q: Какой bus-парсер в MVP и политика при обоих профилях? → A: **Оба в registry** (`bus-rabbit`, `bus-kafka`); детектор по сигналам выставляет `parser_id` в `artifacts[]` **до** spawn; если признаки **обоих** — приоритет **`bus-rabbit`** (Kafka-парсер не запускается в этом прогоне).
- Q: Где фиксируются типы БД при нескольких connection strings? → A: **Только парсер `appsettings`** — детектор лишь artifact `appsettings` в `artifacts[]`; **каждая** распознанная connection string → отдельный узел `database` (+ `connects_to`); общее логическое имя → один узел, несколько рёбер от сервисов; без engine/placeholder — узел не создаётся.
- Q: Scope анализа monorepo в MVP? → A: **Весь репозиторий**; ограничение поддерева (`path prefix`) — follow-up в plan, не блокер MVP `009`; эталонный fixture — полный mini-monorepo.
- Q: Фильтр `system` / `code` — какие рёбра показывать? → A: **`system`** — только рёбра system↔system; **`code`** — только code↔code; **`all`** — все рёбра (включая смешанные code↔system, если есть в каноне).

## Границы спеки

### Входит

- расширение канона **system-слоя**: новые типы узлов и рёбер (нейтральные
  имена, без привязки к одному заказчику или стеку);
- **пять** новых модульных парсеров в MVP этапа (envelope → ingest):
  - `compose` — `docker-compose*.yml` / compose-манифесты;
  - `appsettings` — `appsettings*.json`, `.env`, `example.env`;
  - `openapi` — OpenAPI/Swagger YAML в репозитории;
  - `dotnet-project` — `*.sln`, `*.csproj`, ссылки между проектами;
  - **bus** — детектор выбирает `bus-rabbit` или `bus-kafka` по сигналам
    в config/csproj **до** spawn; оба парсера в registry, в одном прогоне
    запускается **не более одного**; при признаках обоих — **`bus-rabbit`**
    (приоритет Rabbit);
- ingest-адаптеры system-слоя в тот же канон ES; у **новых** узлов и рёбер
  system-слоя **обязательна** `metadata.layer = system`;
- расширение **детектора** (`005`): отчёт дополняется массивом **`artifacts[]`**
  (отдельно от `languages[]`) с распознаванием artifact types
  (`compose`, `appsettings`, `openapi`, `dotnet-project`, bus-профиль и др.)
  по правилам детектора; оркестратор запускает system-парсеры по `parser_id`
  из artifact entry;
- запуск system-парсеров в **том же** прогоне анализа, что и code-парсеры
  (один `analysis_run_id`);
- фильтр слоя на экране «Граф»: `code` | `system` | `all` (минимальный UI);
- доступность system-узлов и рёбер через существующий поиск/просмотр
  графа (`007`), с учётом фильтра слоя;
- пилотные fixture и критерии приёмки на репозитории с compose + config +
  OpenAPI (+ bus-профиль пилота).

### Не входит

- canvas / React Flow (→ `010-ods-graph-viewer`);
- парсер `dotnet-api-routes` — follow-up после MVP `009`
  (не блокирует закрытие этапа);
- второй bus-парсер в **одном прогоне** (если детектор уже выбрал один);
  реализация обоих парсеров в registry — в MVP, но spawn только одного;
- gRPC, cross-repo (несколько ODS-проектов) — Phase 2;
- анализ **поддерева** (`path prefix`) при старте прогона — follow-up
  после MVP (в MVP — весь репозиторий);
- RAG, auth, редактирование графа в UI;
- отдельный прогон анализа только для system-слоя;
- изменение дерева файлов `002` / индекса `ods-elements`;
- Swagger UI для API портала ODS (вне scope анализируемого репозитория).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Граф сервисов из compose (Priority: P1)

Как **архитектор или разработчик**, после анализа репозитория с
`docker-compose.yml` я вижу узлы **сервисов** и связи **зависимостей**
между ними (`api` depends on `worker`), чтобы понять топологию деплоя
без ручного разбора compose.

**Why this priority**: Compose — самый наглядный вход в system-слой;
без него ландшафт не «склеивается» в сервисы.

**Independent Test**: Fixture compose с двумя сервисами и `depends_on` →
после прогона в каноне есть узлы `service` и рёбра `depends_on`.

**Acceptance Scenarios**:

1. **Given** `docker-compose.yml` с сервисами `api` и `worker`, где
   `api` зависит от `worker`, **When** завершён успешный анализ с
   парсером `compose`, **Then** в каноне есть узлы сервисов `api` и
   `worker` и ребро `depends_on` от `api` к `worker`.
2. **Given** тот же fixture, **When** пользователь открывает «Граф» с
   фильтром `system`, **Then** видны только system-узлы/рёбра (без
   code-символов).
3. **Given** compose без `depends_on`, **When** анализ, **Then**
   узлы сервисов создаются; лишних рёбер `depends_on` нет; прогон
   успешен.

---

### User Story 2 — HTTP-контракты из OpenAPI (Priority: P1)

Как **разработчик**, я вижу узлы **HTTP-эндпоинтов** из OpenAPI-спеки
репозитория и связь «сервис **публикует** эндпоинт», чтобы сопоставить
контракты с сервисами.

**Why this priority**: OpenAPI — второй столп system-ландшафта для
интеграций и review API.

**Independent Test**: Fixture с `openapi.yaml` и операциями → узлы
`http_endpoint` и рёбра `exposes` / `documents`.

**Acceptance Scenarios**:

1. **Given** OpenAPI-файл с операцией `GET /api/v1/weather/forecast`,
   **When** анализ с парсером `openapi`, **Then** в каноне есть узел
   `http_endpoint` с осмысленным `qualified_name` (метод + путь) и
   ребро `documents` от спеки к эндпоинту (или эквивалент по канону).
2. **Given** известная привязка эндпоинта к сервису из compose/имени
   модуля (правила ingest), **When** ingest, **Then** есть ребро
   `exposes` от узла `service` к `http_endpoint`.
3. **Given** невалидный или пустой OpenAPI, **When** анализ, **Then**
   парсер фиксирует ошибку в `parser_results`; прогон остаётся
   `partial` или `success` для остальных парсеров; ingest не падает
   целиком.

---

### User Story 3 — Подключения к БД из конфигурации (Priority: P1)

Как **разработчик**, я вижу, что сервис **подключается** к логической
**базе данных**, извлечённой из `appsettings` / connection strings,
чтобы понять зависимости данных без поиска по всем config-файлам.

**Why this priority**: БД — ключевой элемент ландшафта рядом с compose
и API.

**Independent Test**: Fixture `appsettings.json` с
`ConnectionStrings__DefaultConnection` → узел `database` и ребро
`connects_to`.

**Acceptance Scenarios**:

1. **Given** `appsettings.json` с именованной connection string,
   **When** анализ с парсером `appsettings`, **Then** в каноне есть
   узел `database` (логическое имя) и ребро `connects_to` от сервиса
   или конфиг-контекста к БД.
2. **Given** несколько connection strings (`DefaultConnection`, `Redis`, …),
   **When** ingest `appsettings`, **Then** для **каждой** распознанной
   строки — отдельный узел `database` и ребро `connects_to`; при одном
   логическом имени у разных сервисов — **один** узел `database`,
   несколько `connects_to`.
3. **Given** секреты / placeholder без разрешимого engine,
   **When** анализ, **Then** ложные рёбра к несуществующим узлам
   не создаются.

---

### User Story 4 — Ссылки между .NET-проектами (Priority: P2)

Как **разработчик** в .NET-monorepo, я вижу узлы **проектов** (`dotnet_project`)
и рёбра **ссылок** между `.csproj`, чтобы понять граф сборки.

**Why this priority**: Дополняет compose и config; важен для крупных
monorepo, но не блокирует US1–US3.

**Independent Test**: Два `.csproj` с `ProjectReference` → ребро
`project_reference`.

**Acceptance Scenarios**:

1. **Given** `Service.csproj` со ссылкой на `Contracts.csproj`,
   **When** анализ `dotnet-project`, **Then** узлы обоих проектов и
   ребро `project_reference` от потребителя к зависимости.
2. **Given** solution без project references, **When** анализ, **Then**
   узлы проектов из `.sln`/каталога MAY создаваться; лишних рёбер нет.

---

### User Story 5 — Сообщения на шине (Priority: P2)

Как **разработчик**, я вижу, кто **потребляет** или **публикует**
сообщения на шине: детектор до spawn выбирает `bus-rabbit` или
`bus-kafka` по сигналам в репозитории (при обоих — Rabbit),
чтобы проследить асинхронные интеграции.

**Why this priority**: Bus — обязательный минимум черновика §B;
детектор разрешает профиль до парсера; оба модуля в registry.

**Independent Test**: Fixture с consumer/handler выбранной шины →
ребро `consumes` (и при наличии — `publishes`) к `message_topic` /
`message_type`.

**Acceptance Scenarios**:

1. **Given** код/конфиг с однозначным consumer очереди или topic,
   **When** анализ выбранным bus-парсером, **Then** в каноне есть
   ребро `consumes` от сервиса/handler к узлу `message_topic` (или
   `message_type`).
2. **Given** два handler/сервиса в репозитории ссылаются на один стабильный
   `message_type` (имя DTO/schema), **When** ingest **одного** bus-парсера,
   выбранного детектором в **этом** прогоне (`bus-rabbit` или `bus-kafka`),
   **Then** MAY быть cross-link между потребителями и общим узлом
   `message_type` по правилам канона (research R6); второй bus-парсер в том
   же прогоне **не** запускается.
3. **Given** признаки и Rabbit, и Kafka в одном репозитории, **When**
   детектор формирует `artifacts[]`, **Then** `parser_id` = `bus-rabbit`
   и spawn только `bus-rabbit` (без `bus-kafka` в том же прогоне).
4. **Given** фрагмент кода без разрешимого topic/queue, **When**
   анализ, **Then** ребро не создаётся; прогон не падает.

---

### User Story 6 — Фильтр слоя на экране «Граф» (Priority: P1)

Как **пользователь портала**, я переключаю отображение графа:
**только код**, **только system** или **всё**, чтобы не смешивать
сотни символов с десятками сервисов.

**Why this priority**: Без фильтра system-слой непригоден для
ежедневного использования на крупных репозиториях.

**Independent Test**: Проект с code + system узлами → переключение
фильтра меняет списки узлов/рёбер без перезапуска анализа.

**Acceptance Scenarios**:

1. **Given** проект с успешным анализом code и system, **When**
   пользователь выбирает фильтр `system`, **Then** в списках узлов
   и рёбер видны только документы с `metadata.layer = system` и рёбра
   **system↔system** (смешанные code↔system скрыты).
2. **Given** фильтр `code`, **When** просмотр, **Then** видны code-
   узлы и рёбра **code↔code**; system-узлы и system↔system скрыты.
3. **Given** фильтр `all`, **When** просмотр, **Then** оба слоя и
   **все** рёбра (включая смешанные code↔system); поиск (`007`)
   согласован с активным фильтром.
4. **Given** проект без system-данных (только code), **When**
   фильтр `system`, **Then** понятное пустое состояние, без ошибки.

---

### Edge Cases

- В репозитории нет compose / openapi / appsettings — успешный прогон;
  соответствующие записи в `artifacts[]` отсутствуют или
  `parser_status: missing`; `languages[]` и code-граф не затронуты.
- Несколько compose-файлов в monorepo — все релевантные обрабатываются
  или scope ограничивается правилами детектора; дубликаты service id
  стабильно разрешаются (суффикс path/file).
- OpenAPI без `operationId` — эндпоинт всё равно создаётся по
  method+path; стабильный id.
- Переменные окружения в compose (`${VAR}`) — узел сервиса создаётся;
  неразрешимые внешние зависимости без ложных рёбер.
- Инкрементальный анализ: при изменении config-файла старые system-
  узлы/рёбра этого файла заменяются по правилам ingest `006`.
- Повторный полный прогон — идемпотентность id system-узлов в пределах
  одного `analysis_run_id`.
- Смешанные сигналы Rabbit + Kafka в одном repo — детектор выбирает
  `bus-rabbit`; `bus-kafka` в этом прогоне не spawn.
- Рёбра code↔system в каноне — видны только в фильтре `all`; в
  `system` и `code` скрыты (оба конца должны совпадать со слоем).
- Смешанный репозиторий: code + system в одном прогоне — оба слоя в
  каноне; удаление проекта каскадно чистит оба слоя.
- Очень крупный monorepo — в MVP анализ **всего repo**; ограничение
  поддерева (`path prefix`) — follow-up в plan; эталонный fixture —
  полный mini-monorepo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Платформа MUST расширить канон графа типами узлов
  system-слоя: как минимум `service`, `dotnet_project`, `http_endpoint`,
  `database`, `message_topic`, `broker` (и другие из `json-model`
  C02, где применимо к MVP-парсерам).
- **FR-002**: Платформа MUST расширить канон типами рёбер system-слоя:
  как минимум `depends_on`, `project_reference`, `exposes`, `documents`,
  `connects_to`, `consumes` (и `publishes` при поддержке bus-парсера).
- **FR-003**: Ingest system-слоя MUST записывать узлы и рёбра в те же
  индексы `ods-graph-nodes` / `ods-graph-edges`, что и code-слой,
  без регрессии существующих code-документов.
- **FR-004**: У всех **новых** узлов и рёбер, создаваемых ingest в
  рамках `009`, MUST быть `metadata.layer = system`.
- **FR-005**: Платформа MUST зарегистрировать модульные парсеры (envelope)
  MVP: `compose`, `appsettings`, `openapi`, `dotnet-project`, **`bus-rabbit`**
  и **`bus-kafka`**; оркестратор MUST spawn **не более одного** bus-парсера
  за прогон — `parser_id` из `artifacts[]` (детектор); при сигналах обоих
  профилей — **`bus-rabbit`**.
- **FR-006**: Детектор (`005`) MUST дополнять language report массивом
  **`artifacts[]`** (отдельно от `languages[]`); каждая запись MUST
  содержать `artifact_type`, `file_count`, `sample_paths`, `parser_id`,
  `parser_status` и определять, какие system-парсеры запускать
  (compose, appsettings, openapi, dotnet-project, bus). Для bus: оба
  парсера в registry; детектор выставляет `parser_id` до spawn; при
  признаках Rabbit **и** Kafka — `parser_id` = `bus-rabbit`.
- **FR-007**: Оркестратор анализа MUST запускать system-парсеры в том
  же прогоне, что и code-парсеры, с сохранением одного
  `analysis_run_id`.
- **FR-008**: UI экрана «Граф» MUST предоставить фильтр слоя:
  `code` | `system` | `all`; **`system`** — узлы и рёбра system↔system;
  **`code`** — узлы и рёбра code↔code; **`all`** — всё включая
  смешанные code↔system; выбор сохраняется в сессии или локальном
  состоянии (детали UX — в plan).
- **FR-009**: Поиск и просмотр связей (`007`) MUST учитывать активный
  фильтр слоя (те же правила видимости рёбер, что FR-008) и отображать
  человекочитаемые метки типов system-рёбер.
- **FR-010**: При отсутствии разрешимой цели связи (сервис, topic, БД)
  ingest MUST пропускать ребро, а не создавать узел-заглушку; прогон
  анализа не MUST падать целиком.
- **FR-011**: Стабильные id system-узлов MUST следовать схеме
  `{parser_id}:{kind}:{stable_key}` (см. `canonical-node-system.schema.json`).
- **FR-012**: JSON-схемы native и canonical system-слоя в
  `ods-help/requirements/json-model/` MUST быть синхронизированы со
  спекой и отмечены `implementation_status: done` к закрытию этапа.
- **FR-013**: Типы и узлы БД (`database`, `metadata.engine`) MUST
  извлекаться **только** парсером `appsettings` при ingest; детектор
  MUST NOT перечислять engine в `artifacts[]`; для каждой распознанной
  connection string — отдельный узел `database` (дедуп по стабильному
  логическому имени в пределах прогона).
- **FR-014**: В MVP анализ system- и code-парсеров MUST охватывать
  **весь** working copy репозитория; фильтр `path prefix` для прогона —
  вне MVP `009` (follow-up).

### Key Entities

- **System node (канон)**: архитектурная сущность (сервис, эндпоинт,
  БД, topic, проект .NET и т.д.) с `kind`, `name`, `path` к исходному
  артефакту, `metadata.layer = system`.
- **System edge (канон)**: связь между system-узлами (или system ↔ code,
  если явно поддержано plan) с типом `depends_on`, `connects_to`, …
- **Parser envelope (system)**: обёртка `005` с `parser_id` system-
  модуля и native `model` по схеме P01–P07.
- **Artifact entry (детектор)**: элемент `artifacts[]` в language report —
  `artifact_type` (напр. `compose`, `openapi`, `bus`), `file_count`,
  `sample_paths`, `parser_id`, `parser_status`; не смешивается с
  `languages[]` code-слоя.
- **Artifact type (детектор)**: логический тип файла/паттерна в WC,
  определяющий какие system-парсеры запускать.
- **Layer filter (UI)**: пользовательская настройка отображения
  `code` | `system` | `all` на экране графа.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: На пилотном fixture mini-monorepo (compose + appsettings +
  openapi + csproj + bus) после одного прогона анализа пользователь
  видит не менее **10** system-узлов и **8** system-рёбер с корректными
  типами в фильтре `system`.
- **SC-002**: На том же проекте переключение фильтра `code` / `system`
  / `all` меняет состав списка узлов за **≤ 2 с** без повторного анализа
  (перцептивно мгновенно на пилотном объёме).
- **SC-003**: Повторный анализ code-only репозитория (без system-
  артефактов) даёт **идентичный** code-граф до `009` (0 регрессий по
  количеству code-узлов/рёбер на эталонном fixture `008`).
- **SC-004**: Не менее **90%** заранее размеченных связей на эталонном
  fixture (compose depends_on, openapi endpoint, connection string,
  project reference, bus consume) присутствуют в каноне после ingest.
- **SC-005**: Все схемы system-слоя в `json-model/` для MVP-парсеров
  имеют статус реализации `done` и проходят валидацию примеров
  (example JSON против schema).

## Assumptions

- Language report (`005`) хранит **`languages[]`** (code) и **`artifacts[]`**
  (system) в одном документе. Окно 1 подтверждения после sync (`005` modal):
  список языков **без изменения семантики** `languages[]` плюс сводка
  `artifacts[]` (до одной строки на `artifact_type`; см.
  `contracts/detector-artifacts.md`). В модалке **не** перечисляются отдельные
  БД, engine и connection strings — только artifact `appsettings` с
  `file_count` (детали БД — в графе после парсера `appsettings`).
- Оба bus-парсера (`bus-rabbit`, `bus-kafka`) в registry; в одном прогоне
  spawn **одного** по решению детектора; tie-break → **`bus-rabbit`**.
- Типы БД (postgres, mssql, …) извлекает парсер **`appsettings`**, не
  детектор (в `artifacts[]` только artifact `appsettings`, без списка
  engine); несколько connection strings → несколько узлов `database`.
- Один прогон анализа объединяет code и system (не раздельные run).
- Cross-link сообщений между сервисами — по стабильному имени типа
  сообщения / schema name; детали резолюции — в `plan.md`.
- `dotnet-api-routes` отложен после MVP.
- Анализ в MVP — **весь репозиторий**; `path prefix` — follow-up (plan).
- Язык UI и меток типов рёбер — русский, по аналогии с `008`.
- Backend платформы остаётся на TypeScript; system-парсеры — модульные
  CLI (как `005`), включая .NET subprocess где уместно.

## Связанные материалы

- Видение: `specs/001-ods-vision/spec.md` (этап **8** — `009-system-landscape`)
- Черновик: `ods-help/requirements/008-code-graph-and-system-landscape-draft.md` §B
- JSON-модели: `ods-help/requirements/json-model/README.md`
- Code-слой: `specs/008-code-graph-depth/spec.md`
- Канон baseline: `specs/006-project-graph/contracts/canonical-schemas.json`
