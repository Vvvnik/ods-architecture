# Canonical Edge Types — system layer (009)

**Спека**: [spec.md](../spec.md)  
**Schema**: [canonical-edge-system.schema.json](./canonical-edge-system.schema.json)  
**Domain**: `backend/src/domain/graph-edge.ts` — расширить union `EdgeType`

## EdgeType (system)

| type | Описание | MVP parser |
|------|----------|------------|
| `depends_on` | service → service (compose) | compose |
| `project_reference` | dotnet_project → dotnet_project | dotnet-project |
| `http_calls` | service/code → http_endpoint / external_api | follow-up / appsettings URL |
| `exposes` | service → http_endpoint | openapi (+ heuristic) |
| `publishes` | handler/service → message_topic / message_type | bus-* |
| `consumes` | handler/service → message_topic / message_type | bus-* |
| `connects_to` | service → database / broker / storage | appsettings, compose infra |
| `rpc_handles` | handler → message_type | bus-* (RPC role) |
| `documents` | openapi spec → http_endpoint | openapi |

## metadata.layer

MUST `"system"` для всех рёбер, создаваемых ingest system-адаптеров.

## UI labels (русский)

Добавить в `frontend/src/i18n/ru.ts` (по аналогии `EDGE_TYPE_LABELS` `008`):

| type | label |
|------|-------|
| `depends_on` | зависимость (сервис) |
| `project_reference` | ссылка на проект |
| `exposes` | публикует API |
| `documents` | описывает (OpenAPI) |
| `connects_to` | подключение к |
| `consumes` | потребляет |
| `publishes` | публикует |
| `http_calls` | HTTP-вызов |
| `rpc_handles` | RPC-обработчик |

## Совместимость с code-слоем

Code types (`imports`, `calls`, `injects`, …) **не удаляются**. `isEdgeType`
allowlist объединяет оба набора.

## Фильтр слоя (рёбра)

- `system`: оба конца `metadata.layer === 'system'`
- `code`: оба конца code (layer absent или `code`)
- `all`: без фильтра
