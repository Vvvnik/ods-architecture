# Черновик: `019` — Spring system landscape (petclinic)

**Статус:** **устарел** — канон после `/speckit-specify` + clarify + plan + tasks:
`specs/019-spring-system-landscape/`. Не использовать как источник DoD
(в т.ч. устаревшее «A+C P1 / B+D P2» — в спеке DoD = **A+B+C+D**).  
**Дата черновика:** 2026-07-19  
**Кандидат спеки:** `019-spring-system-landscape`  
**Триггер:** dogfood
[spring-petclinic-microservices](https://github.com/spring-petclinic/spring-petclinic-microservices.git)
(`project_id` `c736c364-96b1-442b-8bd4-3a8c2ea05d2d`) после закрытия `018`
(Java symbols `available`).

**Связь:** playbook `018`; system `009`; API-из-кода `013` / `http_calls` `014`;
symbols Java — `parsers/java/` (не трогать DoD `018`).  
**Пауза:** `015`–`017` (docs/RAG/auth) и `004` (mvp-runtime) — **не начинать**,
пока пользователь не скажет после полного dogfood-теста.

---

## Зачем

После `018` на petclinic есть **code**-символы Java и **compose**-сервисы.
Нет Spring-специфики system-слоя: Maven-модули как сервисы, конфиг, HTTP
из Spring MVC / Gateway / Feign — «кто кого зовёт» в микросервисах.

Аналог .NET: `dotnet-project` + `dotnet-api-routes` + (TS) `ts-http-calls`.
Не смешивать с language-модулем `java` (как `typescript` ≠ `ts-api-routes`).

Текущий пробел (ориентир):

| Есть | Нет (цель `019`) |
|------|------------------|
| `java` symbols → code | Maven/Gradle module → `service` |
| `compose` → контейнеры | `application*.yml` → порты / datasource hints |
| | Spring MVC / WebFlux → `http_endpoint` + `exposes` |
| | Feign / WebClient / Gateway routes → `http_calls` |

---

## Цель спеки `019` (предложение)

Одна спека, несколько CP (как `013`/`014`), эталон — **petclinic**.

| CP | Фокус | DoD-ориентир |
|----|--------|--------------|
| **A** | **Project modules** — Maven/Gradle → system `service` (как `dotnet-project`) | модули petclinic видны как сервисы; связь с compose где возможно |
| **B** | **Spring config** — `application*.yml` / `.properties` | порты, ключевые connects_to hints (БД); без полного Cloud |
| **C** | **Java API routes** — Spring MVC / WebFlux (+ Gateway?) → `http_endpoint` | эндпоинты в system у сервисов; паттерн `013` |
| **D** | **Java HTTP calls** — Feign / WebClient → `http_calls` | клиент→API на graph-view; паттерн `014` |

**MVP минимум для specify:** уточнить в clarify — A+C обязательны; B/D P2
внутри той же спеки или follow-up. Не раздувать до «весь Spring Cloud».

**Playbook:** каждый новый artifact-модуль — по чеклисту
`specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`.

---

## Кандидаты модулей (artifact)

| parser_id (рабочее имя) | Вход | Канон |
|-------------------------|------|--------|
| `maven-project` (или `gradle-project`) | `pom.xml` / `build.gradle*` | `service` (+ module identity) |
| `spring-config` | `application*.yml`, `*.properties` | attrs / `connects_to` hints |
| `java-api-routes` | `.java` с `@RequestMapping` / RouterFunction / Gateway | `http_endpoint`, `exposes` |
| `java-http-calls` | Feign interfaces, WebClient | `http_calls` |

Имена финализировать в specify; запрет: HTTP/Feign внутри `parsers/java/`.

---

## Приёмка (dogfood petclinic)

1. Re-analysis → system: сервисы из Maven-модулей (не только compose).
2. У сервисов видны HTTP endpoints из Spring controllers (CP-C).
3. Где есть Feign/клиенты — рёбра `http_calls` (CP-D, если в DoD).
4. Code-слой Java без регрессии (`018`).
5. Выключение любого нового модуля → `missing`/нет артефакта, остальное ок.
6. Audit: reuse оркестратора `005`, ingest `009`/`013`/`014`; чеклист `018`.

---

## Вне scope `019`

- `015` docs / `016` RAG / `017` auth / `004` mvp-runtime (**пауза**)
- Углубление Java calls/usages (`008`) в language-парсере
- Symbols shell / build-scripts
- Merge OpenAPI ↔ code endpoints (отдельное решение)
- Полный Spring Cloud (Config Server, Eureka UI, Circuit Breaker…)
- Смена стека платформы ODS

---

## Зафиксировать на specify / clarify

| # | Вопрос |
|---|--------|
| 1 | Имя: `019-spring-system-landscape`? |
| 2 | Какие CP в MVP (A+C vs A+B+C+D)? |
| 3 | Maven only для petclinic или сразу Gradle? |
| 4 | Gateway routes — в `java-api-routes` или отдельный модуль? |
| 5 | JDK/JavaParser reuse vs отдельный runtime для routes |
| 6 | Приоритет vs пауза `015`–`017`/`004` — **уже:** сначала `019` |

---

## Следующий шаг

1. Пользователь тестирует текущий пилот (`018` + graph-view petclinic).  
2. По готовности: `/speckit-specify` на **этот** черновик →
   `specs/019-spring-system-landscape/`.  
3. clarify → plan → tasks → implement.  
4. **Не** стартовать `015`–`017` / `004`, пока явно не сказано.

## Ссылки

- Live: `http://localhost:8080/projects/c736c364-96b1-442b-8bd4-3a8c2ea05d2d/graph-view`
- Report: `GET /api/v1/projects/c736c364-96b1-442b-8bd4-3a8c2ea05d2d/analysis/language-report/latest`
- Follow-up из `018`: §B5 `018-parser-extension-playbook-draft.md`
- Эталоны модулей: `dotnet-project`, `ts-api-routes`, `dotnet-api-routes`,
  `ts-http-calls`
- Чеклист: `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`
- Карта: `specs/001-ods-vision/spec.md`
