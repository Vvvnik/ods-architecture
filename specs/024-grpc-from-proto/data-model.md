# Data Model: 024-grpc-from-proto

**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

System layer only (`metadata.layer = "system"`). Same ES indexes as `009`.

## Node kinds

### Existing (unchanged semantics)

| kind | Use in this feature |
|------|---------------------|
| `service` | Target of `exposes` when matched to a module/compose service |
| `http_endpoint` | Target of .NET HTTP `http_calls` (not gRPC) |
| `external_api` | Fallback target for absolute external HTTP URLs |

### New

| kind | Description |
|------|-------------|
| `grpc_method` | One RPC method from `.proto` (`package.Service/Method`) |

**`grpc_method` fields (Canon):**

| Field | Rule |
|-------|------|
| `id` | `grpc-proto:grpc_method:{package}.{Service}/{Method}` |
| `kind` | `grpc_method` |
| `name` | Method simple name |
| `qualified_name` | `{package}.{Service}/{Method}` |
| `signature` | Same as qualified_name (or full `/package.Service/Method`) |
| `path` | Source `.proto` relative path |
| `language` | `protobuf` |
| `parser_id` | `grpc-proto` |
| `parent_id` | Optional: owning `service` node id when `exposes` matched |
| `metadata.layer` | `system` |
| `metadata.protocol` | `grpc` |
| `metadata.grpc_service` | `{package}.{Service}` |
| `metadata.streaming` | optional: `unary` \| `client` \| `server` \| `bidi` (listing only) |

## Edge types (existing enum only)

| type | protocol | Meaning in this feature |
|------|----------|-------------------------|
| `documents` | `grpc` | `.proto` (or contract anchor) describes `grpc_method` |
| `exposes` | `grpc` | `service` exposes `grpc_method` |
| `http_calls` | `grpc` | Caller binds to `grpc_method` (gRPC clients) |
| `http_calls` | http / unset | .NET HTTP client → `http_endpoint` / `external_api` |

**Never** use `rpc_handles` for protobuf/gRPC.

### Edge identity

| Edge | `id` pattern |
|------|----------------|
| documents | `grpc-proto:documents:{proto_rel}|{method_key}` |
| exposes | `grpc-proto:exposes:{service_stable}|{method_key}` (or provider parser prefix if compose-owned service) |
| gRPC http_calls | `{ts\|java\|dotnet}-grpc-calls:http_calls:{from_stable}|{method_key}` |
| .NET HTTP http_calls | `dotnet-http-calls:http_calls:{from_stable}|{METHOD}|{path}` |

`metadata.layer = system` on all. gRPC edges: `metadata.protocol = "grpc"`.

## Native models (parser envelopes)

### `grpc-proto` (`schema_version` 1)

```text
services[]: { package, name, methods[] }
methods[]: { name, client_streaming?, server_streaming?, source_path, location? }
```

Transform → `grpc_method` nodes + `documents` (+ `exposes` when service_hint
resolves).

### `*-grpc-calls` (shared shape, `schema_version` 1)

```text
calls[]: {
  target_service,   # package.Service
  target_method,    # Method
  source_path,
  service_hint?,    # caller
  location?
}
```

Transform → `http_calls` → existing `grpc_method` id; skip if missing/ambiguous.

### `dotnet-http-calls` (`schema_version` 1)

```text
calls[]: {
  method,           # HTTP verb
  path | url,
  source_path,
  client_kind,      # httpclient | refit | generated | other
  service_hint?,
  location?
}
```

Transform → `http_calls` → `http_endpoint` / `external_api`; skip unresolved.

## Validation rules

1. No `grpc_method` without evidence in `.proto` content analyzed this run.
2. No gRPC `http_calls` without unique target `grpc_method` in Canon (or same
   envelope set for ordered ingest — prefer surface parser before clients in
   spawn order, similar to OpenAPI after routes).
3. Ambiguous → no edge; parser status success/partial allowed; run must not
   fail solely for skips.
4. OpenAPI / HTTP-only trees must not emit `grpc_method`.

## State / lifecycle

No new analysis-run states. Modules participate in existing detector → confirm
→ spawn → ingest flow (`005`).

## Domain code touchpoints

- `backend/src/domain/graph-node.ts` — add `'grpc_method'` to `NodeKind`
- System schema copies under `specs/009` / `ods-help/requirements/json-model`
  MAY be updated in tasks to include `grpc_method` in enum (keep docs aligned)
- Edge schema enum **unchanged**
