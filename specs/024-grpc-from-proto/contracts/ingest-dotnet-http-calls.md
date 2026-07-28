# Ingest: `dotnet-http-calls`

**parser_id**: `dotnet-http-calls`  
**schema_version**: `1`  
**Native**: [native-dotnet-http-calls.schema.json](./native-dotnet-http-calls.schema.json)

## Transform

Mirror `ts-http-calls` / `java-http-calls` docking:

1. Normalize HTTP `METHOD` + path (from `path` or path part of `url`).
2. Resolve target:
   - Prefer `dotnet-api-routes:http_endpoint:…` / OpenAPI
     `openapi:http_endpoint:{METHOD}:{path}` when METHOD+path match
   - Absolute external URL without in-project endpoint → `external_api` node
     (create if that is existing HTTP-client policy; else skip)
3. Resolve `from` via `service_hint` / module rules.
4. Upsert `http_calls` with `metadata.layer = system` (HTTP; do **not** set
   `protocol=grpc`).

## Policy

Unresolved / ambiguous → skip. Do not rewrite or call into
`ts-http-calls` / `java-http-calls` modules.
