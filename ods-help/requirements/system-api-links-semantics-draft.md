# Черновик: семантика связей system (перед `014`)

**Статус:** заметка / backlog — **не канон**, не FR `013`.  
**Дата:** 2026-07-18  
**Зачем:** перед specify `014` зафиксировать, **как помечать** «кто зависит /
кто зависит от кого», «кто вызывает / кто реализует API», и что API бывают
разных видов (не только HTTP из кода).

**Связь:** канон рёбер `009` —
`specs/009-system-landscape/contracts/canonical-edge-types-system.md`;
черновик UX+client HTTP — `014-graph-view-ux-draft.md`.

---

## 1. Два направления на одном эндпоинте

| Роль | Ребро (канон `009`) | Смысл | Откуда данные сейчас |
|------|---------------------|--------|----------------------|
| **Реализует / публикует** | `exposes` | service → endpoint | compose+OpenAPI (`009`), **код** (`013`) |
| **Вызывает / зависит как клиент** | `http_calls` | service/code → endpoint | почти нет (follow-up → **`014`**) |
| **Описывает контракт** | `documents` | OpenAPI spec → endpoint | openapi parser (`009`) |

На схеме / в inspector важно не смешивать подписи:

- «публикует API» = provider (`exposes`);
- «HTTP-вызов» = consumer (`http_calls`);
- «описывает (OpenAPI)» = документация (`documents`), **не** runtime.

`depends_on` (compose) — **инфра/оркестрация** сервисов, не «вызов метода API».

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

## 3. Что помечать в UI (идея для `014`+)

Без ломки canvas `011`/`012`:

1. На ребре — уже есть русские labels (`exposes` / `http_calls` / …).
2. На узле endpoint — бейдж источника: **код** / **OpenAPI** (`metadata.source`).
3. В inspector сервиса — две секции: **Публикует** (`exposes` out) и
   **Вызывает** (`http_calls` out) — даже если одна пуста.
4. Не рисовать «frontend публикует API», если есть только client calls.

Детальный UX кнопок/крошек — в `014-graph-view-ux-draft.md`; этот файл —
про **семантику связей и виды API**.

---

## 4. Кандидаты в scope следующих спек

| Тема | Куда |
|------|------|
| Client `http_calls` (frontend → backend endpoints) | **`014`** (уже в черновике) |
| Подписи/секции provider vs consumer в inspector | **`014`** (UX) |
| Дедуп / пространство docs: OpenAPI vs code endpoints | позже (`015` docs?) — не `013` |
| gRPC / GraphQL extract | отдельный этап после `014` или расширение system |
| Усиление async (AsyncAPI yaml?) | follow-up bus / docs |

---

## 5. Не делать

- Не расширять FR/DoD **`013`** этим файлом.
- Не заменять `depends_on` на `http_calls`.
- Не считать OpenAPI единственным «настоящим» API после `013`.

---

## Связанные файлы

- `014-graph-view-ux-draft.md` — UX + первый `http_calls`
- `013-api-routes-from-code-draft.md` — CP1/CP2 split
- `specs/009-…/canonical-edge-types-system.md` — канон типов рёбер
- `specs/001-ods-vision/spec.md` — карта: следующий = `014`
