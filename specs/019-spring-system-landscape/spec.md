# Спецификация: Spring system landscape (petclinic)

**Фича**: `019-spring-system-landscape`

**Создано**: 2026-07-19

**Статус**: ✅ реализовано (2026-07-19, dogfood petclinic + fixture;
SC-001…008; follow-up Java — §ниже, кросс-стек — Post-MVP `001`)


**Вход**: Черновик `ods-help/requirements/019-spring-system-landscape-draft.md`;
dogfood [spring-petclinic-microservices](https://github.com/spring-petclinic/spring-petclinic-microservices.git)
(`project_id` `c736c364-96b1-442b-8bd4-3a8c2ea05d2d`) после закрытия `018`
(Java symbols `available`).

**Родительская спека**: `specs/001-ods-vision/spec.md` (этап 15)

**Зависимость**: `specs/009-system-landscape/spec.md` (system-канон, compose,
ingest); `specs/013-api-routes-from-code/spec.md` (паттерн API-из-кода →
`http_endpoint` + `exposes`); `specs/014-graph-view-ux/spec.md` (паттерн
`http_calls` consumer); `specs/018-parser-extension-playbook/spec.md`
(чеклист новых artifact-модулей); language-модуль `java` (`018`) —
**не** расширять HTTP/Feign.

## Clarifications

### Session 2026-07-19

- Q: Что считается закрытием DoD `019`? → A: **A+B+C+D все вместе**
  (полный аналог набора извлечений C#/TS; как `014` с блоками A+B).
  Поэтапная приёмка только A+C **не** закрывает фичу.
- Q: Какие Maven-модули становятся сервисами? → A: **Только deployable /
  Spring Boot application**-модули → `service`; parent, library, test — нет
  (паритет с `dotnet-project`: web/worker, не classlib/test).
- Q: Какие клиентские вызовы обязательны для CP-D (DoD)? → A: **Feign и
  WebClient оба обязательны** (два разных паттерна клиента; не дубликаты).
  Приёмка MUST явно покрывать оба стиля (один или два сценария/fixture).
- Q: Gateway routes — обязательны ли для DoD CP-C? → A: **DoD = Spring MVC /
  WebFlux** (контроллеры / RouterFunction); **Gateway — SHOULD**, не блокирует
  закрытие (узкий DoD как у `ts-api-routes`).
- Q: Если Maven-модуль и compose-сервис — «один и тот же» сервис, что делать?
  → A: **Склеивать в один** `service` при однозначном match; display-имя —
  **compose** (без массовой склейки при неоднозначности).

### Session 2026-07-19 (RestClient dogfood)

- Q: На petclinic genai → customers через `RestClient` +
  `DiscoveryClient.getInstances("customers-service")` — извлекать?
  → A: **Да.** Это рабочие межсервисные вызовы эталона; `java-http-calls`
  MUST извлекать **RestClient** при статически разрешимых method+path и
  callee (в т.ч. service-id из `getInstances("…")` / литерал hostname).
  Feign+WebClient остаются обязательными стилями SC-007; RestClient —
  обязателен для закрытия dogfood petclinic (SC-008). RestTemplate без
  call-site и raw HttpURLConnection — по-прежнему вне DoD.

## Краткое описание

После `018` на petclinic есть **code**-символы Java и **compose**-сервисы.
Нет Spring-специфики system-слоя: Maven-модули как сервисы, конфиг, HTTP
из Spring MVC / Gateway / Feign — «кто кого зовёт» в микросервисах.

Фича добавляет **отдельные** artifact-модули (по аналогии с .NET/TS), не
смешивая их с language-модулем `java` (как `typescript` ≠ `ts-api-routes`,
`csharp` ≠ `dotnet-api-routes`). Эталон приёмки — **petclinic**.

### Соответствие эталонам C# / TypeScript

| Возможность | C# / .NET | TypeScript | Spring / Java (`019`) |
|-------------|-----------|------------|------------------------|
| Модуль проекта → сервис / проект | `dotnet-project` (`009`) | сервисы в основном из compose; отдельного `ts-project` нет | **CP-A** `maven-project` → `service` (+ module identity) |
| Конфиг → порты / БД hints | `appsettings` (`009`) | `.env` / appsettings-паттерн | **CP-B** `spring-config` |
| HTTP API из кода → `http_endpoint` + `exposes` | `dotnet-api-routes` (`013`) | `ts-api-routes` (`013`) | **CP-C** `java-api-routes` |
| Клиент → API (`http_calls`) | вне DoD `014` | `ts-http-calls` (`014`) | **CP-D** `java-http-calls` (Feign **и** WebClient) |
| Символы языка (code) | `csharp` | `typescript` | `java` (`018`) — **вне** изменений `019` |

## Границы спеки

### Входит

Одна спека, несколько capability-пакетов (как `013`/`014`), эталон — petclinic.

| CP | Фокус | Приоритет DoD | Аналог |
|----|--------|---------------|--------|
| **A** | **Project modules** — Maven → system `service` (+ module identity); связь с compose где возможно | **P1 (обязательный DoD)** | `dotnet-project` |
| **B** | **Spring config** — `application*.yml` / `.properties`: порты, ключевые `connects_to` hints (БД); без полного Cloud | **P1 (обязательный DoD)** | `appsettings` |
| **C** | **Java API routes** — Spring MVC / WebFlux → `http_endpoint` + `exposes`; Gateway routes — SHOULD (не блокер DoD) | **P1 (обязательный DoD)** | `ts-api-routes` / `dotnet-api-routes` |
| **D** | **Java HTTP calls** — **Feign и WebClient** (оба в DoD) + **RestClient**
  на petclinic (SC-008) → `http_calls` | **P1 (обязательный DoD)** | `ts-http-calls` |

**Закрытие фичи:** DoD = **A+B+C+D** вместе (+ отключаемость, без регресса Java).
Частичная приёмка только A+C **не** достаточна.

Также входит:

- регистрация новых artifact-модулей в конвейере `005`/`009` без второго
  оркестратора;
- каждый новый модуль — по чеклисту
  `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`;
- выключение любого нового модуля → `missing` / нет артефакта, остальное ок;
- code-слой Java без регрессии (`018`).

### Кандидаты модулей (artifact)

| parser_id | Вход | Канон | CP |
|-----------|------|--------|-----|
| `maven-project` | `pom.xml` (и при наличии — multi-module reactor) | `service` (+ module identity); связь с compose где возможно | A |
| `spring-config` | `application*.yml`, `*.properties` | attrs / `connects_to` hints (порты, БД) | B |
| `java-api-routes` | `.java` с `@RequestMapping` / `@GetMapping` и аналогами; RouterFunction; Gateway route-определения (SHOULD, не DoD) | `http_endpoint`, `exposes` | C |
| `java-http-calls` | Feign, WebClient (оба в DoD SC-007) **и** RestClient при
  разрешимом target (petclinic SC-008) | `http_calls` | D |

**Запрет:** HTTP / Feign / Gateway routes внутри `parsers/java/` (language symbols).

### Не входит

- `015` docs / `016` RAG / `017` auth / `004` mvp-runtime (**пауза** до явной команды);
- углубление Java calls/usages (`008`) в language-парсере;
- symbols shell / build-scripts;
- merge OpenAPI ↔ code endpoints (отдельное решение; как в `013`);
- полный Spring Cloud (Config Server, Eureka UI, Circuit Breaker, full discovery UI…);
- отдельный модуль только для Gateway (маршруты Gateway — в `java-api-routes`
  как SHOULD при статически видимых путях; **не** обязательны для DoD CP-C;
  иначе — пропуск, без выдуманных path);
- Gradle как **обязательный** DoD (см. Assumptions: Maven = petclinic DoD;
  Gradle — best-effort MAY / follow-up);
- смена стека платформы ODS;
- изменение DoD / FR `013` / `014` / `018`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Сервисы из Maven-модулей (CP-A) (Priority: P1)

Как **архитектор**, после анализа petclinic я вижу system-сервисы не только
из compose, но и из **Maven-модулей** (deployable / application-модули),
чтобы ландшафт отражал структуру Spring-микросервисов.

**Why this priority**: закрывает главный пробел после `018` + compose;
аналог `dotnet-project` для .NET-monorepo.

**Independent Test**: petclinic → re-analysis → в system есть сервисы,
сопоставимые с Maven-модулями (не только compose-имена).

**Acceptance Scenarios**:

1. **Given** успешный анализ petclinic с `maven-project`, **When** фильтр /
   срез `system`, **Then** видны сервисы, соответствующие **deployable /
   Spring Boot application**-модулям эталона (узнаваемые имена); parent /
   library / test не представлены как `service`.
2. **Given** тот же прогон и compose-сервисы, **When** имя/path однозначно
   совпадают, **Then** Maven и compose дают **один** узел `service` с
   display-именем из compose; при неоднозначности — без массовой ложной
   склейки.
3. **Given** репозиторий без `pom.xml`, **When** анализ, **Then**
   `maven-project` отсутствует или `missing`; compose и code Java не ломаются.

---

### User Story 2 — HTTP API из Spring-контроллеров (CP-C) (Priority: P1)

Как **архитектор**, я вхожу в сервис petclinic на «Граф просмотр» (system)
и вижу HTTP-эндпоинты из **Spring MVC / WebFlux** (аннотации /
RouterFunction), без опоры на OpenAPI. Gateway routes желательны при
статическом path, но не обязательны для приёмки.

**Why this priority**: паритет с `013` (TS Fastify + C# controllers/minimal APIs);
без API-из-кода system-интерьер сервиса пуст для Java.

**Independent Test**: petclinic → dig-in сервиса с контроллерами → ≥1
эндпоинт method+path.

**Acceptance Scenarios**:

1. **Given** анализ petclinic с контроллерами `@RequestMapping` /
   `@GetMapping` (и аналоги), **When** system-интерьер связанного сервиса,
   **Then** видны HTTP-эндпоинты с методом и путём.
2. **Given** эндпоинт из кода и сопоставимый сервис, **When** смотрю связи,
   **Then** видно, что сервис **публикует** (`exposes`) этот эндпоинт.
3. **Given** сопоставление с сервисом невозможно, **When** анализ,
   **Then** эндпоинт сохранён без ложной привязки ко всем сервисам.
4. **Given** тот же проект, **When** code-слой («Код»), **Then** Java-символы
   `018` доступны без регресса.

---

### User Story 3 — Модули отключаемы / не ломают остальное (Priority: P1)

Как **команда платформы**, новые Spring system-модули съёмные: сбой или
отсутствие не роняют compose, OpenAPI, языковой Java-анализ и уже
существующие .NET/TS system-модули.

**Why this priority**: контракт платформы `005`/`009`/`018`; без этого
dogfood рискован.

**Independent Test**: прогон с выключенным новым модулем → остальные
результаты на месте; `parser_status: missing` / нет артефакта.

**Acceptance Scenarios**:

1. **Given** любой новый модуль `019` выключен или упал, **When** анализ
   завершён, **Then** compose-сервисы и code-символы Java доступны.
2. **Given** модуль включён, но релевантных файлов/сигналов нет, **When**
   анализ, **Then** без ложных узлов; прогон не падает целиком.
3. **Given** сбой одного нового модуля (например только `java-api-routes`),
   **When** анализ, **Then** остальные новые и старые модули MAY завершиться
   успешно.

---

### User Story 4 — Конфиг Spring: порты и БД hints (CP-B) (Priority: P1)

Как **разработчик**, я вижу из `application*.yml` / `.properties` полезные
hints: порт сервиса и ключевые подключения к БД (`connects_to`), без
полного разбора Spring Cloud.

**Why this priority**: паритет с `appsettings` (`009`); входит в полный
DoD A+B+C+D (clarify 2026-07-19).

**Independent Test**: fixture / petclinic config с datasource → узел
`database` и/или attrs порта у сервиса.

**Acceptance Scenarios**:

1. **Given** `application.yml` с `server.port` (или эквивалент), **When**
   анализ `spring-config`, **Then** порт отражён у связанного сервиса
   (attrs / отображение — по правилам plan) без ложных сервисов.
2. **Given** распознаваемый datasource / JDBC URL (или именованный hint),
   **When** ingest, **Then** есть `connects_to` к логической БД при
   разрешимом engine/имени; placeholder без цели — ребро не создаётся.
3. **Given** полный Spring Cloud Config / remote config, **When** анализ,
   **Then** MUST NOT требовать полный Cloud для DoD; достаточно локальных
   `application*` файлов в WC.

---

### User Story 5 — Кто вызывает API (Feign, WebClient, RestClient) (CP-D) (Priority: P1)

Как **архитектор**, на system-срезе petclinic я вижу, что сервис-клиент
**вызывает** уже известные HTTP-эндпоинты через **Feign**, **WebClient** и
**RestClient** (когда вызовы статически разрешимы), отдельно от того, что
другой сервис **публикует**.

**Why this priority**: паритет с `ts-http-calls` (`014`); Feign+WebClient в
DoD (clarify 2026-07-19); RestClient на petclinic — реальные вызовы genai→
customers (clarify RestClient dogfood); входит в полный DoD A+B+C+D.

**Independent Test**: (a) Feign → «Вызывает» / `http_calls`; (b) WebClient →
то же; (c) RestClient на petclinic → genai→customers; стили проверяются
явно (petclinic и/или доп. fixture).

**Acceptance Scenarios**:

1. **Given** анализ с **Feign** и уже извлечёнными эндпоинтами провайдера,
   **When** карточка сервиса-клиента, **Then** в **«Вызывает»** есть ≥1
   вызов к существующему HTTP-эндпоинту (или ребро `http_calls` при лимитах
   canvas).
2. **Given** анализ с **WebClient** и уже извлечёнными эндпоинтами,
   **When** карточка сервиса-клиента, **Then** виден ≥1 вызов к
   существующему эндпоинту (тот же критерий, что для Feign).
3. **Given** на petclinic `RestClient` + разрешимый callee
   (`getInstances("customers-service")` / эквивалент) и path, **When**
   анализ, **Then** ≥3 `http_calls` genai→customers к существующим
   эндпоинтам (SC-008).
4. **Given** клиентский URL/path не совпал ни с одним известным эндпоинтом,
   **When** ingest, **Then** связь не создаётся; новые эндпоинты только
   из клиента MUST NOT появляться.
5. **Given** сервис только вызывает API и сам их не публикует, **When**
   карточка, **Then** нет утверждения, что он «публикует API».

---

### Edge Cases

- При однозначном match Maven↔compose — один `service` с display-именем
  compose; при неоднозначности дубликаты допустимы лучше ложной склейки
  (clarify 2026-07-19).
- Нет Maven / нет Spring controllers — успешный прогон; соответствующие
  artifacts отсутствуют или `missing`; Java symbols и compose не затронуты.
- Multi-module reactor: **только** deployable / Spring Boot application-
  модули → кандидаты в `service`; parent POM, library и test-модули —
  без узлов `service` (clarify 2026-07-19; детали эвристик Spring Boot —
  в plan).
- Динамические path / SpEL / runtime-only Gateway — MAY отсутствовать; не
  выдумывать path.
- Префикс `@RequestMapping` на классе + метод — **полный** path, если оба
  литерала статически видны; иначе — литерал метода без угадывания по репо
  (как FR path в `013`).
- Несколько сервисов с одним method+path — **два** эндпоинта
  (сервис + method + path), как в `013`.
- Gateway routes: только при статически извлекаемом path в том же модуле
  `java-api-routes`; SHOULD, не блокер DoD CP-C (clarify 2026-07-19);
  отдельный parser_id не вводится.
- Gradle-only репозиторий — вне обязательного DoD petclinic; MAY best-effort
  или follow-up, без блокировки закрытия A+B+C+D на Maven-эталоне.
- Инкрементальный анализ: смена `pom.xml` / controller / Feign — обновление
  связанных system-узлов/рёбер по правилам ingest `006`/`009`.
- OpenAPI из `009` MAY по-прежнему писать в канон — **вне** приёмки merge
  с code endpoints (`013`-политика).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Платформа MUST извлекать из Maven (`pom.xml`, multi-module)
  кандидатов system-`service` отдельным artifact-модулем `maven-project`
  (не частью `parsers/java/`). В `service` MUST попадать **только**
  deployable / Spring Boot application-модули; parent POM, library и
  test-модули MUST NOT становиться сервисами (clarify 2026-07-19).
- **FR-002**: При однозначном сопоставлении Maven-сервиса с compose-сервисом
  ingest MUST склеивать их в **один** узел `service`; отображаемое имя MUST
  браться из **compose** (clarify 2026-07-19). При неоднозначности —
  MUST NOT массово склеивать «все со всеми»; детали match — в plan.
- **FR-003**: Платформа MUST извлекать HTTP-маршруты из **кода** Java /
  Spring для DoD: аннотации MVC (`@RequestMapping` / `@GetMapping` /
  `@PostMapping` и аналоги) и, где применимо на эталоне, WebFlux
  `RouterFunction` с литералом path — в узлы `http_endpoint` system-слоя.
- **FR-004**: Gateway route-определения SHOULD обрабатываться **в том же**
  модуле `java-api-routes`, только если path **статически** извлекаем;
  отсутствие Gateway routes MUST NOT блокировать закрытие CP-C
  (clarify 2026-07-19). Отдельный artifact-модуль только для Gateway
  MUST NOT вводиться в `019`.
- **FR-005**: Извлечение API и HTTP-клиентов MUST быть **отдельными**
  сменными artifact-модулями (`java-api-routes`, `java-http-calls`), не
  частью language-модуля `java`.
- **FR-006**: Источник HTTP API для DoD CP-C MUST быть **только код**.
  OpenAPI MUST NOT требоваться для приёмки; merge с yaml — вне scope `019`.
- **FR-007**: Эндпоинт MUST связываться с сервисом через `exposes` при
  возможном сопоставлении. Уникальность узла MUST быть
  **сервис + method + path** (как в `013`).
- **FR-008**: Отображаемый path MUST быть **полным**, когда class-level и
  method-level литералы (или эквивалент) статически извлекаемы; иначе —
  литерал хендлера без выдуманного префикса.
- **FR-009**: Платформа MUST извлекать из локальных
  `application*.yml` / `.properties` порт и ключевые `connects_to` hints
  к БД модулем `spring-config` (без полного Spring Cloud).
- **FR-010**: Платформа MUST отражать consumer-связи **Feign**, **WebClient**
  и **RestClient** (при статически разрешимых method+path и callee) как
  `http_calls` к **уже существующим** эндпоинтам модулем `java-http-calls`;
  Feign **и** WebClient оба в DoD SC-007 (clarify 2026-07-19); RestClient —
  MUST на эталоне petclinic (SC-008). MUST NOT создавать эндпоинты только
  из клиентских URL. RestTemplate без call-site и raw HttpURLConnection
  MUST NOT требоваться для DoD.
- **FR-011**: Сбой или отключение любого модуля `019` MUST NOT ломать
  остальные модули анализа (compose, `java` symbols, существующие
  TS/C# artifact-модули) в смысле контракта платформы.
- **FR-012**: Реализация MUST встраиваться в существующий конвейер
  (`005` оркестратор, `artifacts[]`, ingest `009`/`013`/`014`) без второго
  оркестратора и без параллельного дублирующего канона.
- **FR-013**: Каждый новый parser_id MUST пройти применимые пункты чеклиста
  `018` (детектор, CLI, native schema, ingest, registry, отключаемость).
- **FR-014**: Code-слой Java (`018`) MUST сохранять поведение symbols без
  регресса; HTTP/Feign MUST NOT добавляться в `parsers/java/`.
- **FR-015**: DoD `019` MUST быть выполним на **Maven**-эталоне petclinic
  **без** парсера Gradle. Отсутствие `gradle-project` / разбора
  `build.gradle*` MUST NOT блокировать закрытие фичи. Поддержка Gradle —
  отдельный follow-up (MAY), не часть приёмки A+B+C+D.
- **FR-016**: На «Граф просмотр» в system-интерьере сервиса пользователь
  MUST видеть эндпоинты CP-C (срез `011`/`014` UX); для CP-D — секции
  «Публикует» / «Вызывает» по семантике `014`, без изменения DoD `014`.

### Key Entities

- **Maven module / service**: deployable / Spring Boot application-модуль
  как system-`service` (identity: group/artifact или path/name по plan);
  parent / library / test — не сервисы.
- **HTTP-эндпоинт (system)**: method + path из **Spring-кода**; идентичность
  **сервис + method + path**.
- **Spring config hint**: порт / datasource из локальных `application*` файлов.
- **Вызов API (http_calls)**: связь сервиса-клиента с уже известным
  эндпоинтом; источники клиента — **Feign**, **WebClient** (SC-007) и
  **RestClient** (SC-008 / petclinic).
- **Artifact entry**: запись в `artifacts[]` детектора с `parser_id` одного
  из модулей `019`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: На petclinic после одного успешного анализа в фильтре /
  срезе `system` пользователь видит сервисы из Maven Boot-модулей
  (**CP-A**): **не менее 5** узлов `service`, среди которых узнаваемы как
  минимум `customers-service`, `vets-service`, `visits-service`,
  `api-gateway` (имена после merge — как в compose, если match); parent /
  library-модули не представлены как `service`.
- **SC-002**: На petclinic после анализа при dig-in в сервис с
  контроллерами виден **≥1** HTTP-эндпоинт из кода (MVC/WebFlux) с
  узнаваемым method+path (**CP-C**); OpenAPI не обязателен; отсутствие
  Gateway routes не нарушает SC-002.
- **SC-003**: Code-слой Java тех же сервисов сохраняет symbols (`018`) —
  smoke без регресса количества/типов code-узлов на эталонном срезе.
- **SC-004**: Прогон с отключёнными модулями `019` оставляет compose-
  сервисы и code-граф Java доступными.
- **SC-005**: Audit переиспользования: нет второго конвейера анализа
  «сбоку»; новые модули учтены в `artifacts[]` и чеклисте `018`.
- **SC-006**: При включённом `spring-config` на petclinic / fixture —
  ≥1 полезный hint порта или `connects_to` к БД без ложных рёбер на
  placeholder (**CP-B**, обязателен для закрытия).
- **SC-007**: После анализа: (a) ≥1 связь «Вызывает» / `http_calls` из
  **Feign** и (b) ≥1 из **WebClient** к существующим эндпоинтам — либо
  petclinic покрывает оба стиля, либо два сценария/fixture; каждый стиль
  проверяется явно; без эндпоинтов, созданных только из клиента (**CP-D**).
- **SC-008**: На petclinic после анализа ≥3 `http_calls` из **RestClient**
  (genai → customers: `/owners`, `/owners/{ownerId}/pets`) к существующим
  эндпоинтам; без создания endpoint только из клиента.

## Assumptions

- Имя фичи и каталог: **`019-spring-system-landscape`** (как в `001` и
  конституции).
- **DoD закрытия** = **CP-A + CP-B + CP-C + CP-D** вместе (+ отключаемость,
  без регресса Java). Полный аналог набора извлечений C#/TS в одной спеке;
  частичная приёмка только A+C **не** закрывает фичу (clarify 2026-07-19).
- Эталон — **spring-petclinic-microservices**; Maven — обязательный стек DoD.
  Кандидаты `service` из Maven — только deployable / Spring Boot application
  (clarify 2026-07-19).
- CP-D DoD: **Feign и WebClient** оба обязательны (SC-007); при нехватке
  одного стиля на petclinic — доп. fixture. **RestClient** обязателен для
  dogfood petclinic (SC-008), когда вызовы статически разрешимы.
  RestTemplate без call-site / raw HttpURLConnection — вне DoD.
- Gradle: вне обязательного DoD; отдельный `gradle-project` — follow-up,
  если понадобится паритет.
- Gateway: не отдельный модуль; статические routes — SHOULD в
  `java-api-routes`, не обязательны для DoD CP-C (clarify 2026-07-19).
- Runtime парсеров routes/calls: отдельный CLI artifact-модуль; reuse
  JDK/JavaParser tooling с `parsers/java/` допустим на уровне shared libs
  в plan, без смешения symbols+HTTP в одном `parser_id`.
- Привязка эндпоинт→сервис / модуль→compose — эвристики в духе `009`/`013`
  (имя, path); при однозначном match Maven↔compose — **один** `service`,
  display-имя из compose (clarify 2026-07-19); детали match в plan.
- Семантика «Публикует» / «Вызывает» и UI graph-view уже заданы `014`;
  `019` заполняет данные для Java/Spring, не переписывает UX-DoD.
- Приоритет относительно паузы: **`019` раньше** `015`–`017` и `004`, пока
  пользователь явно не снимет паузу.
- Язык UI и артефактов — русский.

## Follow-up (не в DoD `019`, не отдельный проект)

**Java/Spring**-частности после A+B+C+D (+ SC-008). Общая модель для **C# /
Python / Go / Kotlin / …** — в Post-MVP `001` (§покрытие стеков) и конституции
(Post-MVP: capability-слои); не дублировать сюда очередь языков.

| Тема (Java) | Заметка |
|-------------|---------|
| Gradle → `service` | паритет Maven; отдельная спека при эталоне |
| RestTemplate / сырой HTTP | расширить `java-http-calls` при эталоне |
| gRPC / RSocket / SOAP | нет в модулях `019` |
| Bus из Java-кода | паритет слоя messaging из `001` |
| Framework-only API | Config/Eureka/Admin — пустой dig-in OK |
| OpenAPI merge с code routes | вне scope `019` |

Канон JSON **не требует** расширения ради этих хвостов — упираемся в парсеры
и эталоны (как на любом другом стеке).

## Связанные материалы

- Черновик: `ods-help/requirements/019-spring-system-landscape-draft.md`
- Эталоны модулей: `dotnet-project` (`009`), `ts-api-routes` /
  `dotnet-api-routes` (`013`), `ts-http-calls` (`014`)
- Чеклист: `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`
- Live dogfood: `http://localhost:8080/projects/c736c364-96b1-442b-8bd4-3a8c2ea05d2d/graph-view`
- Видение: `specs/001-ods-vision/spec.md` (этап **15**)
