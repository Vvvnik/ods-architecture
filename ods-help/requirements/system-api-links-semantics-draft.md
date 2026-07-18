# Черновик: семантика связей system (перед / после `014`)

**Статус:** заметка / backlog — **не канон**, не FR `013`/`014`.  
**Дата:** 2026-07-18 (обновлено: backlog infra `connects_to`)  
**Зачем:** зафиксировать, **как помечать** «кто зависит / кто вызывает API»,
виды API и **подключения к хранилищам** (ES, MinIO, БД…) — чтобы не забыть
после HTTP-слоя.

**Связь:** канон рёбер `009` —
`specs/009-system-landscape/contracts/canonical-edge-types-system.md`;
UX+client HTTP — `014` / `014-graph-view-ux-draft.md`.

---

## 1. Два направления на одном эндпоинте

| Роль | Ребро (канон `009`) | Смысл | Откуда данные сейчас |
|------|---------------------|--------|----------------------|
| **Реализует / публикует** | `exposes` | service → endpoint | compose+OpenAPI (`009`), **код** (`013`) |
| **Вызывает / зависит как клиент** | `http_calls` | service/code → endpoint | **`014`** (ts-http-calls) |
| **Подключается к хранилищу** | `connects_to` | service → database / broker / storage | appsettings (`009`); **ES/MinIO/код — backlog §6** |
| **Описывает контракт** | `documents` | OpenAPI spec → endpoint | openapi parser (`009`) |

На схеме / в inspector важно не смешивать подписи:

- «публикует API» = provider (`exposes`);
- «HTTP-вызов» = consumer (`http_calls`);
- «описывает (OpenAPI)» = документация (`documents`), **не** runtime.

`depends_on` (compose) — **инфра/оркестрация** сервисов, не «вызов метода API»
и не замена `connects_to` (реальный клиент к хранилищу).

---

## 2. Виды API-поверхностей (не забыть)

Сейчас в графе по факту сильнее всего **HTTP sync** (код `013` + yaml OpenAPI).
Другие виды — помнить в карте, не пихать всё в один `http_endpoint` без метаданных.

| Вид | Узлы / рёбра (ориентир) | Статус в ODS |
|-----|-------------------------|--------------|
| **HTTP sync** (REST/JSON) | `http_endpoint` + `exposes` / `http_calls` | runtime из кода ✅ `013`; yaml ✅ `009` |
| **OpenAPI** (контракт) | `external_api` + `documents` → те же или параллельные endpoints | ✅; **не merge** с code в `013` (tech debt / docs-пространство) |
| **Async API** (Kafka/Rabbit events) | `message_topic` / `message_type` + `publishes` / `consumes` | ✅ bus-* (`009`) |
| **gRPC / RPC** | TBD: отдельные kind или `http_endpoint`+`metadata.protocol=grpc`? + вызов/handle | **нет extract**; `rpc_handles` есть для bus-RPC |
| **GraphQL** | TBD | нет |
| **WebSocket / SSE** | TBD | нет |

Правило на потом: в metadata эндпоинта держать как минимум
`protocol` / `source` (`code` | `openapi` | …), чтобы UI и фильтры не путали
«контракт» и «реализация».

---

## 3. UI-пометки (не дублировать UX-спеку)

Детали кнопок/крошек/оверлея — только в `014-graph-view-ux-draft.md` §A.

Здесь — семантика для inspector / рёбер (идея, уточнит specify `014`):

1. Labels рёбер уже в i18n (`exposes` / `http_calls` / …).
2. На endpoint — источник: код / OpenAPI (`metadata.source`), когда есть.
3. У сервиса: **Публикует** = исходящие `exposes`; **Вызывает** = исходящие `http_calls`.
4. Клиент без `exposes` не подписывать как «публикует API».

---

## 4. Куда класть темы (без повтора FR)

| Тема | Куда |
|------|------|
| `http_calls` extract + стыковка к endpoint | **`014` §B** (сделано) |
| Секции Публикует / Вызывает | **`014` UX** |
| OpenAPI vs code дедуп | не `013`/`014` DoD — позже (docs?) |
| gRPC / GraphQL / AsyncAPI yaml | отдельный этап |
| **ES / MinIO / прочие БД как клиент** | **§6 ниже** → будущая фича (не `http_calls`) |

---

## 5. Не делать

- Не расширять FR/DoD **`013`** / **`014`** этим файлом.
- Не заменять `depends_on` на `http_calls`.
- Не считать OpenAPI единственным «настоящим» API после `013`.
- **Не** моделировать Elasticsearch / S3 / JDBC как `http_endpoint` + `http_calls`
  только потому что «есть сеть» — это хранилища → **`connects_to`**.

---

## 6. Backlog: подключения к хранилищам (ES, MinIO, БД…)

**Зачем:** на схеме видно не только compose «лежит рядом», но и что сервис
**реально ходит** в хранилище (как backend → Elasticsearch в ods-arch).
То же понадобится для **MinIO/S3**, Postgres/Redis и др.

**Канон (уже есть в `009`):**

| | Ребро | Смысл |
|--|--------|--------|
| Оркестрация | `depends_on` | compose: поднять вместе |
| Клиент хранилища | `connects_to` | service → `database` / storage / broker |

**Не путать с** `http_calls` (потребитель **продуктового** HTTP API).

**Ориентир extract (будущая фича, после стабилизации `014`):**

| Источник | Примеры сигналов | Цель |
|----------|------------------|------|
| Env / compose | `ELASTICSEARCH_URL`, `MINIO_*`, connection strings | `connects_to` → узел infra |
| Код | `@elastic/elasticsearch`, `new Client(`, AWS S3 SDK, `pg`/`ioredis` | то же |
| appsettings | уже частично (`009`) | усилить покрытие |

**UI:** блок «Подключения» / «Связи» (`connects_to`), **не** секция «Вызывает».

**DoD-идея (когда specify):** на ods-arch у backend есть `connects_to` →
elasticsearch (из кода или env), отличимо от одного лишь `depends_on`.

**Статус:** ⏳ не в scope `014`; завести отдельный этап / фичу при планировании
после dogfood HTTP.

---

## Связанные файлы

- `014-graph-view-ux-draft.md` — UX + `http_calls`
- `013-api-routes-from-code-draft.md` — CP1/CP2 split
- `specs/009-…/canonical-edge-types-system.md` — канон типов рёбер
- `specs/001-ods-vision/spec.md` — дорожная карта этапов
