# Ingest: python-http-calls

**parser_id**: `python-http-calls`  
**Native**: [native-python-http-calls.schema.json](./native-python-http-calls.schema.json)  
**Canon**: [data-model.md](../data-model.md)

## Transform

1. For each `model.calls[]` with statically known `path` or `url`:
   - Resolve target: prefer existing `http_endpoint` (especially from
     `python-api-routes` in the same ODS project) when unique; else
     `external_api` for absolute external URL; else **skip**.
   - Upsert edge `type=http_calls`, `metadata.layer=system`, HTTP protocol
     (not `grpc`).
2. Unresolved / ambiguous → skip; run continues.
3. `client_kind` (`httpx` | `requests` | `aiohttp`) is metadata for DoD
   assertions; does not invent new edge types.

## Registration

- Adapter: `backend/src/services/ingest/adapters/python-http-calls.ingest.ts`
  (peer of `ts-http-calls` / `java-http-calls` / `dotnet-http-calls`).
- Register in `ingest-registry.service.ts`.
- Add `python-http-calls` to `ARTIFACT_PARSER_IDS`.

## DoD notes

Fixture must yield ≥1 `http_calls` edge attributable to **each** of httpx,
requests, and aiohttp.
