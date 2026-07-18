# Data Model: 014-graph-view-ux

**Спека**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Новых ES-индексов нет. Канон — `ods-graph-nodes` / `ods-graph-edges`.

## Entities

### HTTP-эндпоинт (`kind: http_endpoint`)

Уже из `009`/`013`. В `014` **не создаём** из client URL.

| Поле | Использование в 014 |
|------|---------------------|
| `id` | цель `http_calls` |
| `metadata.http_path` / `name` | match path |
| `signature` / `metadata.http_method` | match METHOD |
| `metadata.source` | `code` \| openapi-ish — prefer code; UI badge |

### Сервис (`kind: service`)

Compose-узел. Caller = frontend (DoD); provider = backend (уже `exposes`).

### Вызов API (ребро)

| Поле | Правило |
|------|---------|
| `type` | `http_calls` |
| `from` | service id клиента |
| `to` | http_endpoint id |
| `parser_id` | `ts-http-calls` |
| `metadata.layer` | `system` |
| `metadata.source` | `code` (client extract) |
| `path` | файл клиента (source_path) |

### UI-only (не ES)

| Сущность | Смысл |
|----------|--------|
| Срез схемы | `focus` (+ `layer`) на GraphView |
| Контекст анализа | GraphPage `select` + крошки |
| Progress overlay | состояние sync/analysis в AnalysisProvider |

## Relationships (канон)

| type | from → to | Роль UI |
|------|-----------|---------|
| `exposes` | service → http_endpoint | **Публикует** |
| `http_calls` | service → http_endpoint | **Вызывает** |
| `documents` | external_api → http_endpoint | описывает (не вызов) |
| `depends_on` | service → service | не HTTP-вызов |

## Native envelope (логическое)

`routes[]` / `calls[]`: `{ method, path, source_path, service_hint? }` —
см. [contracts/native-ts-http-calls.schema.json](./contracts/native-ts-http-calls.schema.json).

## Validation

- Не создавать `http_endpoint` из client-only URL.
- Match target endpoint **по стабильному id** (code prefer:
  `ts-api-routes:…|METHOD|path`; иначе openapi `METHOD:path`) — без ES lookup
  в pure transform и без создания узлов.
- Идемпотентный upsert ребра по стабильному id.
