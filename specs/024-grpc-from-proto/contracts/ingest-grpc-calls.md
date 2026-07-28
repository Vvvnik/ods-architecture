# Ingest: `*-grpc-calls`

**parser_id**: `ts-grpc-calls` | `java-grpc-calls` | `dotnet-grpc-calls`  
**schema_version**: `1`  
**Native**: [native-grpc-calls.schema.json](./native-grpc-calls.schema.json)

## Transform

For each `calls[]` row:

1. Normalize `method_key` from `target_service` + `target_method` to the same
   form as `grpc-proto` (`package.Service/Method`).
2. Target id = `grpc-proto:grpc_method:{method_key}`.
3. If the target method was not produced by `grpc-proto` in this analysis
   (adapter MAY skip existence check if ordered after surface and relies on
   id docking only — prefer skip when known-missing), **skip** the edge.
4. Resolve `from`:
   - Prefer existing `service` id from `service_hint` (compose / project
     module merge rules as in `009`/`014`)
   - Else synthetic caller anchor documented in adapter (stable, no invent of
     endpoints)
5. Upsert edge:
   - `type = http_calls`
   - `metadata.layer = system`
   - `metadata.protocol = grpc`
   - `path = source_path`

## Policy

Ambiguous service hint or unresolvable method → **no edge**; do not fail ingest
of other calls. Never create `grpc_method` nodes from client parsers.
