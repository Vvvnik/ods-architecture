# Research: 019-spring-system-landscape

**Дата**: 2026-07-19  
**Спека**: [spec.md](./spec.md) | **План**: [plan.md](./plan.md)

## R1 — Четыре отдельных parser_id

**Decision:** `maven-project`, `spring-config`, `java-api-routes`,
`java-http-calls` — отдельные каталоги `parsers/<id>/` + ingest adapters.
**Не** расширять `parsers/java/` HTTP/Feign/config.

**Rationale:** FR-005/014; паритет `typescript` ≠ `ts-api-routes`,
`csharp` ≠ `dotnet-api-routes`; чеклист `018`.

**Alternatives considered:** Один mega Spring-parser; вшивание в `java`.

## R2 — Какие Maven-модули → service

**Decision:** Кандидат в `service` только если модуль **deployable Spring Boot
application**:

1. Есть `spring-boot-maven-plugin` **или** зависимость
   `spring-boot-starter*` + `main` класс / `SpringBootApplication` в module path
   (эвристика implement: plugin достаточно для petclinic).
2. Исключить: packaging `pom` (parent/aggregator), `*-api`/`*-client` libraries
   без Boot plugin, test-only модули, modules с `skip`/`none` как app.

Детали точного detector — в implement; DoD проверяется на application-
микросервисах petclinic (customers, vets, visits, api-gateway, …).

**Rationale:** Clarify Q2; паритет `dotnet-project` web/worker ≠ classlib.

**Alternatives considered:** Все листовые jar; только compose-matched.

## R3 — Merge Maven ↔ compose

**Decision:**

1. Normalize имена: compose service name vs Maven `artifactId` / directory
   name (lowercase, strip `-service`/`_service` suffix для сравнения).
2. При **ровно одном** однозначном match → **один** канонический `service`:
   - стабильный id остаётся **compose**-ключом (`compose:…`), если compose-узел
     уже есть в run;
   - Maven пишет `metadata.maven_*` (groupId, artifactId, module_path) на
     тот же узел (или через ingest merge pass).
3. Display `name` = **compose** service name.
4. Нет match / несколько кандидатов → Maven MAY создать отдельный
   `service` с id `maven-project:service:{artifactId}` **без** ложной склейки.

Порядок: compose и maven в одном run; merge в ingest maven (или shared
post-pass) после появления compose nodes — как affiliation в `013`.

**Rationale:** Clarify Q5; FR-002.

**Alternatives considered:** Всегда два узла; Maven только attrs без service.

## R4 — spring-config scope

**Decision:** Только локальные файлы в WC:

- `application.yml` / `application-*.yml` / `.yaml`
- `application.properties` / `application-*.properties`
- profile-файлы рядом с модулем

Извлекать:

- `server.port` → `metadata.port` (или attrs) связанного сервиса
- datasource: `spring.datasource.url` / `jdbc:` hints → `database` +
  `connects_to` (паритет `appsettings` / FR-013 из `009`: без engine —
  без узла)

Без: Config Server remote, full Cloud, secrets placeholders → skip edge.

**Rationale:** FR-009; clarify DoD B.

**Alternatives considered:** Полный Spring Cloud; только ports без DB.

## R5 — java-api-routes extract

**Decision:** DoD-паттерны (JavaParser / annotation scan):

- Class `@RequestMapping` + method `@GetMapping`/`@PostMapping`/… /
  `@RequestMapping(method=…)`
- Собрать **полный path** = class prefix + method path при обоих литералах
- `RouterFunction` / `route()` с литералом path — если встречается на эталоне
- Gateway YAML/`RouteLocator` статически — **SHOULD**, не блокер DoD

Id эндпоинта: как `013` —
`java-api-routes:http_endpoint:{serviceStable}|{METHOD}|{path}`.

`exposes`: service → endpoint при affiliation (module path → service).

**Rationale:** Clarify Q4; FR-003/004/007/008.

**Alternatives considered:** Gateway в DoD; только Gateway.

## R6 — java-http-calls: Feign + WebClient + RestClient

**Decision:**

| Стиль | Extract |
|-------|---------|
| **Feign** | `@FeignClient` interface + method mapping annotations → method + path (или path от name/url атрибутов при статике) |
| **WebClient** | цепочки `.method().uri("…")` / `hostname + "path"` с разрешимым литералом |
| **RestClient** | цепочки `.method().uri(…)` как у WebClient; callee из литерала hostname **или** `DiscoveryClient.getInstances("service-id")` внутри helper-метода; path из concat литералов + `{param}` для идентификаторов |

Feign+WebClient **MUST** в приёмке (SC-007). RestClient **MUST** на petclinic
(SC-008) — genai `AIDataProvider` → customers. Если на petclinic нет
WebClient/Feign — fixture `java-http-webclient-demo`.

Стыковка: только к существующим `http_endpoint` (prefer
`java-api-routes:…`, иначе openapi); иначе skip. Ребро `http_calls`.
Не создавать endpoint из клиента.

RestTemplate без call-site / raw HttpURLConnection — вне DoD.

**Rationale:** Clarify Q3 + RestClient dogfood; FR-010; паритет `014` шире.

**Alternatives considered:** Только Feign; любой HTTP-клиент; RestClient вне scope.

## R7 — Detector artifacts

**Decision:**

| artifact_type | parser_id | Триггер |
|---------------|-----------|---------|
| `maven-project` | `maven-project` | `pom.xml` (root или modules) |
| `spring-config` | `spring-config` | `application*.yml`/`yaml`/`properties` |
| `java-api-routes` | `java-api-routes` | `.java` + content hints: `@RestController`, `@Controller`, `@RequestMapping`, `@GetMapping`, `RouterFunction` |
| `java-http-calls` | `java-http-calls` | `.java` + `@FeignClient` / `WebClient` / `webClient.` / `RestClient` |

Наличие `language: java` **не** автозапуск routes/calls — нужны hints.
Incremental: globs + change-set как `009`/`013`.

**Alternatives considered:** Spawn routes на все `.java`.

## R8 — Runtime spring-config

**Decision:** Предпочтительно **Node CLI** (yaml + properties) в
`parsers/spring-config/` — проще deps; Maven/Java CLI допустим, если
удобнее единый JDK-образ. Не влияет на канон.

**Rationale:** Минимальный friction; аналог `appsettings` (TS).

**Alternatives considered:** Только Java CLI для всех четырёх.

## R9 — Shared JavaParser libs

**Decision:** Общий код extract MAY жить в `parsers/_shared/java-ast/`
(или аналог) для `java-api-routes` / `java-http-calls`; **не** менять
выход/контракт `parsers/java/` symbols.

**Rationale:** Constitution reuse; запрет смешения symbols+HTTP в одном id.

**Alternatives considered:** Полный copy-paste; один JAR на symbols+HTTP.

## R10 — Порядок в analysis run

**Decision:** Оркестратор без жёсткого DAG: стабильные id. Практический
порядок SHOULD: compose → maven-project (merge) → spring-config →
java-api-routes → java-http-calls (как `014` после endpoints). View loader
уже подтягивает missing ends по edges.

**Rationale:** FR-012; опыт `014`.

## R11 — UI

**Decision:** Без изменений DoD `014`. Карточка «Публикует»/`exposes` и
«Вызывает»/`http_calls` уже есть; данные Java заполняют те же типы.

**Rationale:** FR-016.

## R12 — SC-001 число сервисов

**Decision:** DoD: **≥5** `service` на petclinic после merge; обязательный
минимум узнаваемых имён: `customers-service`, `vets-service`,
`visits-service`, `api-gateway` (+ ≥1 ещё Boot-сервис из WC: config /
discovery / admin / genai). Display после merge — compose. Parent/library —
не сервисы. Чеклист — в `quickstart.md`.

**Rationale:** измеримый SC-001; имена эталона spring-petclinic-microservices.

---

Все пункты Technical Context закрыты; NEEDS CLARIFICATION не осталось.
