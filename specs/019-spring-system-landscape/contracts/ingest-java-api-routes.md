# Ingest: java-api-routes (019)

**Spec**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)  
**Pattern**: `specs/013-api-routes-from-code/contracts/ingest-api-routes.md`

## Adapter

| parser_id | File |
|-----------|------|
| `java-api-routes` | `backend/src/services/ingest/adapters/java-api-routes.ingest.ts` |

`supported_schema_versions`: `["1"]`.

## Transform

For each `routes[]`:

1. Normalize METHOD + http_path (full path — preferably in the parser
2. Resolve `serviceStable` (module path / hint → merged service).
3. Node `http_endpoint` id:
   `java-api-routes:http_endpoint:{serviceStable}|{METHOD}|{path}`;
   `metadata.layer=system`, `metadata.source=code`, `language=java`.
4. At service — edge `exposes`.
5. Gateway routes (`route_kind=gateway`) — same path; absence is not an error.

## Errors

Empty `routes[]` → success. Do not fail run.

## Do not do

- Merge/delete OpenAPI endpoints.
- Require Gateway for success.
- Write to `parsers/java` symbols.
