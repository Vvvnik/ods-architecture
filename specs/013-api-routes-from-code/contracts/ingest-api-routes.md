# Ingest: API routes from code (013)

**Spec**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

## Adapters

| parser_id | Adapter |
|-----------|---------|
| `ts-api-routes` | `ts-api-routes.ingest.ts` |
| `dotnet-api-routes` | `dotnet-api-routes.ingest.ts` |

`supported_schema_versions`: `["1"]`.

## Transform

For each `routes[]` in native model:

1. To normalize `METHOD`, `http_path` (already assembled by the parser or
   dosobirat prefix at R3 in ingest preferably **in the parser**).
2. Resolve `service_id` (R5); `serviceStable` for id.
3. Create node `http_endpoint` with `metadata.layer=system`, `metadata.source=code`.
4. If service_id — edge `exposes` service → endpoint.
5. Fill optional `metadata.handler_*` (R6).

## Idempotence

Upsert stable `id` (R2). Repeated analysis does not produce duplicates with the same
with the key.

## Mistakes

Empty `routes[]` → success, 0 nodes. Broken model → partial/error like
other adapters; the Orchestrator does not fall entirely (FR-009).

## Do not do in 013

- Merge/delete openapi endpoints.
- Creating service nodes.
- New EdgeType for handler (CP1).
