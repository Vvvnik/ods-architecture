# Черновик: 008-code-graph-depth + 009-system-landscape

> **Статус:** черновик для `/speckit-specify` → `specs/008-code-graph-depth/`, `specs/009-system-landscape/`
> **Обновлено:** 2026-07-12
> **Зависимости:** `005-code-analysis`, `006-project-graph` (✅), **`007-portal-scale-ux`** (следующий шаг)
> **Блокирует:** `010-ods-graph-viewer` (canvas — только после ingest 008+009)
> **JSON-модели (обязательны для спек):** [`json-model/`](./json-model/README.md)
> **Источники идей:** `arch-from-gpt.md`, обсуждение enterprise monorepo (Rabbit vs Kafka)

## Порядок работ (жёсткий)

```text
007-portal-scale-ux          ← следующий (/speckit-specify уже есть черновик)
        ↓
008-code-graph-depth         ← calls, usages, semantic extract (этот черновик §A)
        ↓
009-system-landscape         ← API, шина, БД, compose, OpenAPI (этот черновик §B)
        ↓
010-ods-graph-viewer         ← canvas React Flow (только после 008+009)
        ↓
011-project-docs … 013-auth  ← без изменения смысла, см. `001-ods-vision` roadmap
```

**Правило:** в `010-ods-graph-viewer` **не переходим**, пока `008` и `009` не реализованы
(ingest + API + минимальный UI-фильтр слоёв `code` / `system`).

---

## Зачем (проблема)

Сейчас `005`/`006` дают **граф символов** (class, method, imports, inherits) внутри файлов.
Для крупного enterprise monorepo (10k+ файлов, десятки сервисов) этого **недостаточно**:

| Нужно понять | Сейчас | После 008 | После 009 |
|--------------|--------|-----------|-----------|
| Кто кого вызывает в коде | ❌ | ✅ `calls`, DI | ✅ |
| REST endpoint сервиса | ❌ | частично (Route) | ✅ + OpenAPI |
| Kafka / Rabbit потоки | ❌ | ❌ | ✅ |
| Зависимости сервисов (compose) | ❌ | ❌ | ✅ |
| Postgres / MSSQL / Redis | ❌ | ❌ | ✅ |
| Monorepo 10k+ файлов | ⚠️ | ⚠️ | ✅ с 007 |

**Не переписываем** `005`/`006` — **расширяем** канон, парсеры и ingest-адаптеры.

---

## §A — `008-code-graph-depth`

### Цель

Довести **code-слой** до семантического графа (как в `arch-from-gpt.md`):
вызовы методов, ссылки, DI — не только imports/inherits.

### Границы

**Входит:**

- Native model **v2** (`schema_version: "2"`) для `typescript`, `csharp` (минимум); опционально `python`, `cpp`
- Поле `usages[]` или расширенные `refs[]` с типами `calls`, `references`, `creates`, `injects`
- Ingest-адаптеры v1 + v2 (обратная совместимость)
- Рёбра канона: `calls`, `references`, `contains` (если ещё не заполнены)
- C#: обход `InvocationExpression`, constructor injection (эвристика)
- TS: вызовы функций/методов через type checker где возможно
- `metadata.layer = "code"` на узлах/рёбрах code-слоя (опционально, для UI 007/010)

**Не входит:**

- Kafka, Rabbit, compose, OpenAPI (→ `009`)
- Canvas (→ `010`)
- RAG

### User stories (черновик)

**US1 — Calls в C#:** Given метод `Create` вызывает `_repo.Save`, When ingest, Then ребро `calls` from→to.

**US2 — Calls в TypeScript:** Given `userService.create()` вызывает `repo.save`, When ingest, Then ребро `calls`.

**US3 — Совместимость v1:** Given envelope `schema_version: "1"`, When ingest, Then результат как сейчас (imports/inherits).

**US4 — Поиск по calls (007):** Given ребро `calls`, When `GET .../graph/search?type=calls`, Then находится в ES.

### Критерии готовности 008

- [ ] C# parser v2 с `calls` на пилотном fixture
- [ ] TS parser v2 с `calls` на пилотном fixture
- [ ] Ingest v2 → `ods-graph-edges` type=`calls`
- [ ] Unit + integration тесты
- [ ] JSON-схемы в `json-model/` актуальны (`implementation_status: done`)

---

## §B — `009-system-landscape`

### Цель

**System-слой** — единый канон для ландшафта: сервисы, HTTP, message bus, БД, внешние API.
Один ES-канон (`ods-graph-nodes` / `ods-graph-edges`), **нейтральные** kind/type — без привязки
к одному стеку или одному заказчику.

### Типовые профили monorepo (пилот)

| Аспект | Профиль A (Rabbit / .NET) | Профиль B (Kafka / contracts) |
|--------|---------------------------|-------------------------------|
| Шина | RabbitMQ, queue listeners | Kafka + MassTransit |
| HTTP API | `[Route]`, Refit | `[Route]` + **`contracts/swagger/*.yaml`** |
| Infra | `docker-compose.yml` (единый) | несколько compose |
| БД | MSSQL, Redis | Postgres, CouchDB, Redis, object storage |
| Структура | `.csproj`, папки сервисов | модули по доменам, отдельные backend-пакеты |

### Новые `parser_id` (модульные CLI, как 005)

| parser_id | Входные файлы | Статус |
|-----------|---------------|--------|
| `compose` | `docker-compose*.yml`, `*.yaml` | planned |
| `appsettings` | `appsettings*.json`, `.env`, `example.env` | planned |
| `openapi` | `**/openapi*.yaml`, `contracts/swagger/**` | planned |
| `dotnet-project` | `*.sln`, `*.csproj` | planned |
| `bus-rabbit` | C#: queue listeners, handlers | planned |
| `bus-kafka` | C#: `AddKafkaBus`, consumers, topic config | planned |
| `dotnet-api-routes` | C#: `[Route]`, `[HttpGet]`, Refit registration | planned |

Каждый → envelope → ingest-адаптер → **те же** индексы `ods-graph-*`.

### Расширение канона (NodeKind)

**Code (есть, 006):** `file`, `module`, `namespace`, `class`, `interface`, `function`, `method`, …

**System (новое, 009):**

| kind | Описание |
|------|----------|
| `service` | Deployable / logical service (compose name, module folder) |
| `dotnet_project` | `.csproj` / project reference unit |
| `http_endpoint` | REST route (method + path) |
| `external_api` | Внешний HTTP API (URL из config) |
| `message_topic` | Kafka topic или Rabbit queue/exchange (нейтрально) |
| `message_type` | Тип сообщения (DTO из contracts/code) |
| `database` | Logical DB (connection string name → engine) |
| `broker` | kafka / rabbit / redis |
| `storage` | object/file storage (S3-compatible, CouchDB, …) |

### Расширение канона (EdgeType)

| type | Описание |
|------|----------|
| `depends_on` | service → service (compose) |
| `project_reference` | csproj → csproj |
| `http_calls` | service/code → http_endpoint / external_api |
| `exposes` | service → http_endpoint |
| `publishes` | service/handler → message_topic / message_type |
| `consumes` | service/handler → message_topic / message_type |
| `connects_to` | service → database / broker / storage |
| `rpc_handles` | handler → message_type (request/response) |
| `documents` | openapi spec → http_endpoint |

`metadata.layer = "system"` для фильтрации в UI.

### Детектор (005, расширение)

Распознавать **artifact types** помимо расширений файлов:

- `docker-compose.yml` → trigger `compose`
- `appsettings*.json` → `appsettings`
- `contracts/swagger/**` → `openapi`
- C# файлы с `[Route]` / queue listeners → доп. extractors в `dotnet-api-routes`, `bus-*`

### Scope monorepo

- Анализ **всего repo** или **подпапки** (`src/`, `backend/`, `services/api/`) — параметр прогона
- Обязательно опирается на **007** (поиск, фильтр path prefix)

### User stories (черновик)

**US1 — Compose graph:** Given `docker-compose.yml` с `api` depends_on `worker`, When ingest compose, Then узлы `service` + ребро `depends_on`.

**US2 — OpenAPI:** Given `contracts/openapi/weather_forecast.yaml`, When ingest openapi, Then узлы `http_endpoint` + `exposes` от service.

**US3 — Kafka:** Given consumer worker class, When ingest bus-kafka, Then `consumes` → topic из config.

**US4 — Rabbit:** Given queue listener + message DTO type, When ingest bus-rabbit, Then `consumes` + cross-link по имени типа между сервисами.

**US5 — Connection strings:** Given `appsettings` с `ConnectionStrings__DefaultConnection`, When ingest, Then `connects_to` → `database`.

**US6 — UI filter:** On `/graph`, filter `layer=system|code|all`.

### Критерии готовности 009

- [ ] Минимум 4 parser_id: `compose`, `appsettings`, `openapi`, `dotnet-project`
- [ ] Минимум 1 bus parser: `bus-kafka` **или** `bus-rabbit` (второй — follow-up)
- [ ] Расширенный канон в ES + ingest без поломки 006 code nodes
- [ ] Пилот: крупный monorepo (scope подпапки) — осмысленный system subgraph
- [ ] Все JSON-схемы `json-model/` для system-слоя: `implementation_status: done`

### Phase 2 (не блокирует закрытие 009 MVP)

- gRPC
- Cross-repo (несколько ODS-проектов)

---

## §C — Влияние на `010`–`013`

| Спека | Изменение |
|-------|-----------|
| `010-ods-graph-viewer` | Canvas для **code + system** слоёв; фильтр kind/layer; layout по `service` |
| `011-project-docs` | Без изменения смысла |
| `012-rag-mcp` | RAG MAY индексировать canonical nodes (code + system) |
| `013-auth` | Без изменения |

---

## Архитектура (не менять)

```text
Working copy (002)
  → Language / artifact detector (005+)
  → UX confirm
  → Parser CLI × N  → envelope (native model) → ES
  → Ingest adapter × parser_id → canonical nodes/edges → ES
  → API + UI (006, 007, 010)
```

- AST **не** храним
- Envelope общий, `model` свой у каждого `parser_id`
- Канон **один** в `ods-graph-nodes` / `ods-graph-edges`
- Дерево файлов — только `ods-elements` (002), не дублировать

---

## JSON-модели

Все структуры данных — **обязательный** артеfact для будущих `spec.md` / `plan.md` / `contracts/`:

→ **[`json-model/README.md`](./json-model/README.md)** — индекс, статус реализации, ссылки на `.schema.json` и `.example.json`.

При `/speckit-specify` для `008`/`009` MUST скопировать/сослаться на схемы из `json-model/`.

---

## Открытые вопросы (решить в specify)

1. **Нумерация id system-узлов:** `{parser_id}:{kind}:{stable_key}` vs привязка к compose service name?
2. **Cross-service message link:** match по `qualified_name` типа сообщения / schema name из OpenAPI?
3. **Один analysis run** на code+system или раздельные прогоны?

## Связанные материалы

- `ods-help/working-materials/arch-from-gpt.md`
- `ods-help/working-materials/meta-data.md` (примеры ES, code-слой)
- `ods-help/requirements/canonical-graph-model.md`
- `specs/006-project-graph/contracts/canonical-schemas.json` (code v1, baseline)
- `ods-help/requirements/007-portal-scale-ux-draft.md`
