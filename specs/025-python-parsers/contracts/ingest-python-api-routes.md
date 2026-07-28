# Ingest: python-api-routes

**parser_id**: `python-api-routes`  
**Native**: [native-python-api-routes.schema.json](./native-python-api-routes.schema.json)  
**Canon**: [data-model.md](../data-model.md)

## Transform

1. For each `model.routes[]` with resolvable `method` + `path`:
   - Upsert node `kind=http_endpoint`, `parser_id=python-api-routes`,
     `metadata.layer=system`.
   - Stable id via shared `httpEndpointNodeId` helpers (same normalize rules as
     TS/Java/.NET api-routes).
2. When `service_hint` (or path/module heuristics) uniquely resolves to a
   `service` node → upsert `exposes` edge.
3. Incomplete / ambiguous routes → **skip** (no invent); do not fail the run.

## Registration

- Adapter: `backend/src/services/ingest/adapters/python-api-routes.ingest.ts`
  calling `transformApiRoutes(model, ctx, 'python')` from shared
  `api-routes.ingest.ts`. When native `framework` is present, copy it into
  endpoint `metadata.framework` (extend shared transform if needed).
- Register in `ingest-registry.service.ts`.
- Add `python-api-routes` to `ARTIFACT_PARSER_IDS`.

## DoD notes

Fixture must yield ≥1 `http_endpoint` for each of FastAPI, Flask, and Django,
including ≥1 Django endpoint with `path_complete=true` after resolved
`include()`.
