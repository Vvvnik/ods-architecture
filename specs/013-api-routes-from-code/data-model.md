# Data Model: 013-api-routes-from-code

**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Canon remains ES `ods-graph-nodes` / `ods-graph-edges`. There are no new indexes.

## Entities (canon)

### HTTP-endpoint (`kind: http_endpoint`, `metadata.layer: system`)

| Field | The rule |
|------|---------|
| `id` | `{parser_id}:http_endpoint:{serviceStable}\|{METHOD}\|{path}` |
| `name` | path (or short tail) |
| `qualified_name` | `{METHOD} {path}` |
| `signature` | METHOD (UPPER) |
| `path` | the way **source** file (roat), not HTTP path |
| `language` | `typescript` / `javascript` / `csharp` |
| `parser_id` | `ts-api-routes` \| `dotnet-api-routes` |
| `metadata.http_path` | full HTTP path (after prefix assembly) |
| `metadata.http_method` | UPPER |
| `metadata.source` | `code` (contrast openapi yaml) |
| `metadata.handler_*` | optional (R6) |
| `metadata.service_name` | optional hint |

**Unique:** service + method + http_path (clarify).

### Service (`kind: service`)

The existing compose-node. The API ** parser does not**create new services.

### Handler (code)

Existing `function` / `method` language parsers. Communication in CP1 —
through metadata at the endpoint (R6), an optional new edge.

## Relationships

| type | from → to | When |
|------|-----------|--------|
| `exposes` | service → http_endpoint | service matching is successful |

OpenAPI `documents` / legacy endpoints — no change.

## Native envelope (logical)

Cm. [contracts/native-ts-api-routes.schema.json](./contracts/native-ts-api-routes.schema.json),
[contracts/native-dotnet-api-routes.schema.json](./contracts/native-dotnet-api-routes.schema.json).

The general form of the route:

```text
routes[]: { method, path, source_path, handler_name?, service_hint? }
```

## Validation

- method ∈ a known set HTTP or UPPER token from your code.
- path is not empty; do not invent dynamics.
- Do not add `exposes` to all services in case of doubt.
- Idempotent upsert at `id` within `analysis_run_id` (as other ingest).

## Detector artifacts

New `artifact_type`: `ts-api-routes`, `dotnet-api-routes` — see
[contracts/detector-api-routes.md](./contracts/detector-api-routes.md).
