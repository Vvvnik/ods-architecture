# Data Model: 014-graph-view-ux

**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

There are no new ES- indexes. Kanon — `ods-graph-nodes` / `ods-graph-edges`.

## Entities

### HTTP-endpoint (`kind: http_endpoint`)

Already from `009`/`013`. In `014` **not create** from client URL.

| Field | Usage in 014 |
|------|---------------------|
| `id` | the purpose `http_calls` |
| `metadata.http_path` / `name` | match path |
| `signature` / `metadata.http_method` | match METHOD |
| `metadata.source` | `code` \| openapi-ish — prefer code; UI badge |

### Service (`kind: service`)

Compose-node. Caller = frontend (DoD); provider = backend (already `exposes`).

### Calling API (edge)

| Field | The rule |
|------|---------|
| `type` | `http_calls` |
| `from` | service id customer |
| `to` | http_endpoint id |
| `parser_id` | `ts-http-calls` |
| `metadata.layer` | `system` |
| `metadata.source` | `code` (client extract) |
| `path` | client file (source_path) |

### UI-only (not ES)

| Entity | Meaning |
|----------|--------|
| A cross-section of the scheme | `focus` (+ `layer`) on GraphView |
| Context of the analysis | GraphPage `select` + breadcrumbs |
| Progress overlay | condition sync/analysis in AnalysisProvider |

## Relationships (canon)

| type | from → to | Role UI |
|------|-----------|---------|
| `exposes` | service → http_endpoint | **Publishes** |
| `http_calls` | service → http_endpoint | **Calls** |
| `documents` | external_api → http_endpoint | describes (not a challenge) |
| `depends_on` | service → service | Not HTTP-call |

## Native envelope (logical)

`routes[]` / `calls[]`: `{ method, path, source_path, service_hint? }` —
see [contracts/native-ts-http-calls.schema.json](./contracts/native-ts-http-calls.schema.json).

## Validation

- Do not create `http_endpoint` from client-only URL.
- Match target endpoint **stable id** (code prefer:
  `ts-api-routes:…|METHOD|path`; otherwise openapi `METHOD:path`) — without ES lookup
  in pure transform and without creating nodes.
- Idempotent upsert edges over stable id.
