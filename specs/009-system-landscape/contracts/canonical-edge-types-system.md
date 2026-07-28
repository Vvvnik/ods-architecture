# Canonical Edge Types — system layer (009)

**Spec**: [spec.md](../spec.md)  
**Schema**: [canonical-edge-system.schema.json](./canonical-edge-system.schema.json)  
**Domain**: `backend/src/domain/graph-edge.ts` — expand union `EdgeType`

## EdgeType (system)

| type | Description | MVP parser |
|------|----------|------------|
| `depends_on` | service → service (compose) | compose |
| `project_reference` | dotnet_project → dotnet_project | dotnet-project |
| `http_calls` | service/code → http_endpoint / external_api | follow-up / appsettings URL |
| `exposes` | service → http_endpoint | openapi (+ heuristic) |
| `publishes` | handler/service → message_topic / message_type | bus-* |
| `consumes` | handler/service → message_topic / message_type | bus-* |
| `connects_to` | service → database / broker / cache / storage / search | appsettings, compose infra |
| `rpc_handles` | handler → message_type | bus-* (RPC role) |
| `documents` | openapi spec → http_endpoint | openapi |

## metadata.layer

MUST `"system"` all edges created ingest system-adapters.

## UI labels (Russian)

Add to `frontend/src/i18n/ru.ts` (similar `EDGE_TYPE_LABELS` `008`):

| type | label |
|------|-------|
| `depends_on` | dependency (service) |
| `project_reference` | project link |
| `exposes` | publishes API |
| `documents` | describes (OpenAPI) |
| `connects_to` | connection to |
| `consumes` | consumes |
| `publishes` | publishes |
| `http_calls` | HTTP-challenge |
| `rpc_handles` | RPC-handler |

## Compatible with the code- layer

Code types (`imports`, `calls`, `injects`, ...) **not removed**. `isEdgeType`
allowlist combines both sets.

## Layer filter (edges)

- `system`: both ends `metadata.layer === 'system'`
- `code`: both ends code (layer absent or `code`)
- `all`: without filter
