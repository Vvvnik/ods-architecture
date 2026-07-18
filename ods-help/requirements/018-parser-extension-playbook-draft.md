# Черновик: `018` — шаблон расширения парсеров (+ Java dogfood)

**Статус:** канон-черновик закрыт → `specs/018-parser-extension-playbook/spec.md`
(2026-07-19).  
**Дата:** 2026-07-19  
**Кандидат спеки:** `018-parser-extension-playbook`  
**Триггер:** dogfood на реальном репо
[spring-petclinic-microservices](https://github.com/spring-petclinic/spring-petclinic-microservices.git)
(`project_id` `c736c364-96b1-442b-8bd4-3a8c2ea05d2d`).

**Связь:** контракт модулей `005`; system-артефакты `009`; API-из-кода `013`;
канон графа `006`/`008`/`009`. Docs/RAG/auth (`015`–`017`) — **после** `018`.
Карта в `001` / constitution уже ставит **`018` следующим** после `014`.

---

## Зачем

Детектор уже **видит** языки без модуля (`parser_status: missing`) — это
нормально. Нет **единого проверяемого чеклиста**, что трогать при добавлении
нового парсера (language vs artifact, ingest, Docker, канон, тесты).

На petclinic сейчас (API
`GET /api/v1/projects/…/analysis/language-report/latest`):

| Слой | Что | count | parser | статус |
|------|-----|------:|--------|--------|
| language | `java` | 62 | — | **missing** |
| language | `javascript` | 22 | `typescript` | available |
| language | `shell` | 5 (`mvnw`, `scripts/*.sh`) | — | **missing** |
| artifact | `compose` | 1 | `compose` | available |

Вывод dogfood: **Java — реальный пробел**; **shell — шум wrappers/скриптов**,
не symbols-парсер. Compose уже работает; Spring-специфика (`application.yml`,
Maven, Feign/Gateway) — follow-up artifact-парсеры (как `appsettings` /
`dotnet-project` для .NET).

---

## Цель спеки `018` (зафиксировано)

Два блока в **одной** спеке (как CP в `013`/`014`):

| CP | Фокус | DoD-ориентир |
|----|--------|--------------|
| **A** | **Playbook** — нормативный шаблон «как добавить парсер» | `contracts/parser-extension-checklist.md` + проход по чеклисту на живом модуле |
| **B** | **Language `java`** (MVP symbols → code-слой) | petclinic: `java` → `available`; ingest типов/файлов в канон; без Spring landscape |

**Приоритет:** `018` **перед** `015` (dogfood).  
**Shell / Spring artifacts** — вне DoD (см. ниже); не раздувать до «весь Java».

---

## A. Максимальный шаблон: что трогать при новом парсере

### A0. Решение до кода (обязательно)

| Вопрос | Language (`languages[]`) | Artifact (`artifacts[]`) | Не парсер |
|--------|--------------------------|---------------------------|-----------|
| Что детектим? | расширения / shebang / манифест языка | basename / glob / content_hints | шум (lockfiles, wrappers) |
| Spawn из | `languages[]` + `parser_status=available` | `artifacts[]` + `parser_id` | — |
| Примеры | `typescript`, `csharp`, **`java`** | `compose`, `openapi`, `ts-api-routes` | `mvnw` как «shell symbols» |
| Канон | code-узлы (`008` symbols v2) | system-узлы/рёбра (`009`) | не создавать модуль |

**Правило:** если ценность — «структура сервиса / конфиг / контракт / HTTP»,
это **artifact** (даже если файлы `.java`/`.ts`). Symbols языка — отдельно.

**Shell (зафиксировано для `018`):**

- symbols-парсер shell **не** делаем;
- в DoD: детектор **игнорирует wrappers** `mvnw` / `gradlew` (и аналоги
  basename), чтобы не засорять отчёт;
- остальные `.sh` остаются в `languages[]` со статусом **`missing`**
  (честно, без графа); artifact `build-scripts` — только follow-up, не DoD.

### A1. Чеклист touchpoints (максимум)

Порядок = типичный путь `013` / `009`. Пропуск пункта — только с явным
обоснованием в spec/research.

#### 1. Спека и контракты

- [ ] Запись в `specs/001-ods-vision` (номер, статус, эталон dogfood)
- [ ] Дочерняя спека `specs/0NN-*/` (или раздел CP в `018`)
- [ ] `contracts/native-<parser_id>.schema.json` (+ example)
- [ ] При новых `NodeType`/`EdgeType` — обновить канон-контракты
  (`008` code / `009` system), **не** выдумывать типы в ingest
- [ ] Envelope: только обёртка `005`
  (`specs/005-code-analysis/contracts/envelope-schema.json`);
  `model` — свободный, валидирует **ingest-адаптер**

#### 2. Детекция

| Тип | Где |
|-----|-----|
| Language | `backend/src/services/language-detector.service.ts` — `EXTENSION_LANGUAGE_MAP` / shebang / манифесты |
| Artifact | `backend/src/config/detector-rules.json` (+ при необходимости логика в `artifact-detector.ts`) |

- [ ] Язык/артефакт попадает в language report
- [ ] `parser_id` + `parser_status` (`available` / `missing` / `failed`)
- [ ] Инкремент: `change-set` умеет отфильтровать файлы модуля
  (`ChangeSetService.pathsForArtifact` / language paths)

#### 3. CLI-модуль `parsers/<parser_id>/`

- [ ] `manifest.json` (`id`, `languages[]`, `schema_version`, `command`, `timeout_ms`, input/output docs) — см. `specs/005-code-analysis/contracts/parser-manifest.md`
- [ ] Entry: `run.mjs` / `run.sh` / .NET CLI — контракт argv `005`
- [ ] `README.md` (назначение, native model, эталон)
- [ ] Строка в `parsers/README.md` (статус: stub → available)
- [ ] Общий код — только через `parsers/_shared/` при реальном reuse

CLI **MUST**: exit 0 + валидный envelope; не требовать от оркестратора знания `model`.

#### 4. Ingest → канон ES

- [ ] Адаптер `backend/src/services/ingest/adapters/<parser_id>.ingest.ts`
- [ ] Регистрация в `registerBuiltinIngestAdapters`
  (`ingest-registry.service.ts`)
- [ ] При artifact — id в `ARTIFACT_PARSER_IDS` / paths helper в
  `ingest.service.ts` (как у compose/api-routes)
- [ ] Идемпотентные node/edge id; инкремент удаляет устаревшее по path
- [ ] Ошибка адаптера → `ingest_errors`, не валит весь run

#### 5. Оркестратор / registry

- [ ] `ParserRegistryService` подхватывает manifest из `PARSERS_ROOT`
  (обычно без кода — достаточно каталога)
- [ ] Порядок spawn: languages по `file_count`; artifacts — compose first,
  затем по count (уже в оркестраторе)
- [ ] Missing не блокирует остальные модули

#### 6. Docker / runtime

- [ ] `PARSERS_ROOT` + mount `parsers/` в `docker/docker-compose.dev.yml`
- [ ] `backend/Dockerfile`: `COPY parsers/`; `npm ci` / `dotnet build` /
  `chmod +x` для **нового** модуля (как typescript/compose/csharp)
- [ ] Тяжёлые runtime deps (JDK, Roslyn) — явно в образе или sidecar; зафиксировать в plan

#### 7. Фикстуры и приёмка

- [ ] Fixture в `docker/fixtures/repos/` **или** внешний эталон (petclinic)
- [ ] Unit: extract + schema
- [ ] Integration: spawn → envelope → ingest → `graph` / `graph-view`
- [ ] Негатив: модуль выключен / отсутствует → `missing`, остальные ok
- [ ] Audit reuse: нет второго оркестратора, нет дубля канона

#### 8. UI (обычно уже есть)

- [ ] Модалка языков/артефактов показывает `missing` / `available` (005/007)
- [ ] Новые типы узлов — inspector/подписи только если канон расширен
  (иначе UI follow-up)

#### 9. Документация пилота

- [ ] При необходимости — коротко в `ods-help/user-guide/` (не вместо спеки)
- [ ] Обновить таблицу модулей в `parsers/README.md`

### A2. Анти-паттерны

- Парсить «всё» одним language-модулем (symbols + HTTP + bus) — ломает
  сменность (`013` специально отделил api-routes).
- Менять envelope оркестратора под native model.
- Новые NodeType/EdgeType без контракта канона.
- Считать `missing` багом детектора — это штатный сигнал «модуля нет».
- Тянуть shell/mvnw в code-граф «на всякий случай».

### A3. Deliverable CP-A (продукт playbook)

При specify зафиксировать **один** канонический артефакт, например:

- `specs/018-…/contracts/parser-extension-checklist.md`  
  (нормативный чеклист A1), и/или  
- обновление `parsers/README.md` + ссылка из `005` quickstart.

Цель: следующий язык (Go, Kotlin, …) добавляют **по тому же** чеклисту без
новой «мета-спеки».

---

## B. Java MVP (первый проход по шаблону)

### B1. Scope MVP

| Входит | Не входит (follow-up) |
|--------|------------------------|
| Детектор уже знает `.java` — только модуль + ingest | Полный Spring landscape |
| Symbols-совместимый native model: пакеты + типы (классы/интерфейсы/enum); методы — MAY | Вызовы/usages глубины `008` |
| `parser_id: java`, language `java` | Kotlin/Scala |
| Эталон: petclinic microservices (62 `.java`) + маленькая fixture | Парсер `pom.xml` / Gradle как отдельный artifact |
| | `application.yml` / Spring Cloud Gateway / Feign → system |
| | HTTP API из Java-кода (аналог `dotnet-api-routes`) |
| | shell-парсер |

### B2. Техстек (ориентир для plan / clarify)

Предпочтение черновика (можно уточнить в research, не блокирует specify):

- отдельный CLI в `parsers/java/` (как csharp), native model → symbols ingest;
- кандидаты extract: JavaParser / tree-sitter-java — выбрать в plan по
  простоте поставки в Docker;
- **JDK в backend image** допустим (уже есть .NET); sidecar — только если
  размер/сборка станут болью.

### B3. Глубина Java MVP (зафиксировано)

**DoD:** файлы + типы (классы/интерфейсы/enum) + пакеты как иерархия
code-слоя уровня python/cpp MVP.  
**Не DoD:** calls/usages глубины `008`, Spring HTTP, Feign.

### B4. Приёмка B (тест)

1. Re-sync / re-detect petclinic → `java.parser_status = available`;
   `mvnw`/`gradlew` **не** в `languages[]` (или не в shell-счётчике).
2. Анализ → envelope `parser_id=java` в ES; ingest → code-узлы (типы/файлы).
3. Выключение/удаление модуля → снова `missing`, compose/js не ломаются.
4. Чеклист A1 пройден и отмечен в tasks (доказательство playbook).

### B5. System для Spring — **не** DoD `018`, карта follow-up

После Java symbols (отдельные спеки):

| Artifact (идея) | Зачем на petclinic |
|-----------------|--------------------|
| `maven-project` / `gradle-project` | модули ≈ сервисы (как `dotnet-project`) |
| `spring-config` (`application*.yml`) | порты, datasource, cloud config |
| `java-api-routes` | Spring MVC / WebFlux routes → `http_endpoint` |
| `java-http-calls` | Feign / WebClient → `http_calls` |

Compose уже даёт контейнерный ландшафт — этого мало для «кто кого зовёт»
в Spring. Не смешивать symbols `java` и HTTP/Spring в одном модуле
(как `typescript` vs `ts-api-routes`).

---

## Вне scope `018`

- `015` docs / `016` RAG / `017` auth
- Express/Nest и прочие TS HTTP сверх уже сделанного
- Merge OpenAPI ↔ code endpoints
- Полный Spring system landscape (таблица B5)
- Symbols-парсер shell; artifact `build-scripts`
- Смена стека backend платформы

---

## Зафиксированные решения (вход для specify)

| # | Решение |
|---|---------|
| 1 | Имя: `018-parser-extension-playbook` |
| 2 | Приоритет: **после `014`, перед `015`** (уже в `001` / constitution) |
| 3 | Scope: **CP-A playbook + CP-B Java MVP** в одной спеке |
| 4 | Java DoD: типы/файлы/пакеты; без calls/`008` |
| 5 | Shell: ignore `mvnw`/`gradlew`; прочие `.sh` → `missing`; без shell-парсера |
| 6 | Spring system artifacts — follow-up, не DoD |
| 7 | Техстек Java / JDK — уточнить в plan, не блокирует specify |

Остаётся на clarify/plan только выбор библиотеки extract и детали Dockerfile.

---

## Заметки для dogfood / specify

1. UI «Парсер не установлен» = `parser_status: missing` (`005`), не баг импорта.
2. API: префикс **`/api/v1/`**.
3. После specify — сменить `.specify/feature.json` → `specs/018-parser-extension-playbook`
   (сейчас ещё `014`).
4. `javascript available` на petclinic — static scripts gateway; не путать с
   успехом Java-анализа.
5. Один compose ≠ готовый Spring system-граф.

---

## Следующий шаг (вы запускаете)

1. `/speckit-specify` на **этот** черновик → `specs/018-parser-extension-playbook/`.  
2. clarify (если нужно) → plan → tasks → implement.  
3. Re-analysis petclinic как главный SC.

## Ссылки

- Live report: `GET /api/v1/projects/c736c364-96b1-442b-8bd4-3a8c2ea05d2d/analysis/language-report/latest`
- `specs/005-code-analysis/contracts/parser-manifest.md`
- `specs/005-code-analysis/contracts/envelope-schema.json`
- `parsers/README.md`, эталон добавления: tasks `013` (T002–T030)
- `backend/src/config/detector-rules.json` — artifact rules
- `backend/src/services/ingest/ingest-registry.service.ts` — регистрация адаптеров
- `specs/001-ods-vision/spec.md` — дорожная карта (уже с `018`)
