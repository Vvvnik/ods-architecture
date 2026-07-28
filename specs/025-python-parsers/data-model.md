# Data Model: 025-python-parsers

**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

System layer only (`metadata.layer = "system"`). Same ES indexes as `009`.
**No new** node or edge kinds — reuse `013` / `014` / `024`.

## Node kinds (existing)

| kind | Use in this feature |
|------|---------------------|
| `service` | Target of `exposes` when matched to a module/compose service |
| `http_endpoint` | From `python-api-routes` (and peer targets for HTTP clients) |
| `external_api` | Fallback target for absolute external HTTP URLs |
| `grpc_method` | Existing from `grpc-proto` (`024`); target of Python gRPC binds |

## Edge types (existing enum only)

| type | protocol | Meaning in this feature |
|------|----------|-------------------------|
| `exposes` | http / unset | `service` exposes Python `http_endpoint` |
| `http_calls` | http / unset | Python HTTP client → `http_endpoint` / `external_api` |
| `http_calls` | `grpc` | Python gRPC client → `grpc_method` |

### Edge / node identity

| Artifact | `id` pattern |
|----------|----------------|
| endpoint | `python-api-routes:http_endpoint:{METHOD}:{path}` (stable normalize per shared helpers) |
| exposes | `python-api-routes:exposes:{service_stable}|{endpoint_key}` |
| HTTP http_calls | `python-http-calls:http_calls:{from_stable}|{METHOD}|{path}` |
| gRPC http_calls | `python-grpc-calls:http_calls:{from_stable}|{method_key}` |

`metadata.layer = system` on all. gRPC edges: `metadata.protocol = "grpc"`.

## Native models (parser envelopes)

Envelope wrapper remains `005` (`parser_id`, `schema_version`, `project_id`,
`analysis_run_id`, `files_analyzed`, `model`).

### `python-api-routes` (`schema_version` 1)

```text
routes[]: {
  method,           # HTTP verb UPPER
  path,             # full path when statically known (incl. {id} / <int:pk>)
  source_path,
  handler_name?,
  service_hint?,
  path_complete?,   # true if prefix/include fully resolved
  framework?        # fastapi | flask | django | other
}
```

Transform → `http_endpoint` + `exposes` when service_hint resolves.

### `python-http-calls` (`schema_version` 1)

```text
calls[]: {
  method,           # HTTP verb UPPER
  path | url,
  source_path,
  client_kind,      # httpx | requests | aiohttp | other
  service_hint?,
  callee_service_hint?,
  location?
}
```

Transform → `http_calls` → `http_endpoint` / `external_api`; skip if unresolved.

### `python-grpc-calls` (`schema_version` 1)

**Reuse** shared model from
`specs/024-grpc-from-proto/contracts/native-grpc-calls.schema.json`:

```text
calls[]: {
  target_service,   # package.Service
  target_method,    # Method
  source_path,
  service_hint?,
  location?
}
```

Transform → `http_calls` → existing `grpc_method`; skip if missing/ambiguous.

## Validation rules

- Unresolved / ambiguous route or call-site → **omit** from Canon; do not fail
  the analysis run solely for that site.
- Django unresolved `include()` / i18n → omit; fixture still proves ≥1
  resolved `include()` endpoint.
- Do not invent `grpc_method` from Python stubs alone.
- Idempotent ids across re-analysis; incremental cleanup by path as peers.

## Relationships (summary)

```text
service --exposes--> http_endpoint     (python-api-routes)
caller  --http_calls--> http_endpoint  (python-http-calls, HTTP)
caller  --http_calls--> grpc_method    (python-grpc-calls, protocol=grpc)
grpc-proto --documents--> grpc_method  (existing 024; not rewritten)
```
