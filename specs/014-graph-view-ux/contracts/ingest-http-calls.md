# Ingest: ts-http-calls (014)

**Spec**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

## Adapter

| parser_id | File |
|-----------|------|
| `ts-http-calls` | `backend/src/services/ingest/adapters/ts-http-calls.ingest.ts` |

`supported_schema_versions`: `["1"]`.

## Transform

For each `calls[]`:

1. Resolve **caller** service id (`service_hint` / path → `frontend`, compose file
   heuristic as `013` `api-routes-ids`).
2. Normalize METHOD + http_path.
3. Resolve **target** `http_endpoint` **id without creating a node**:
   - Prefer code id: `ts-api-routes:http_endpoint:{backendStable}|{METHOD}|{path}`
     (callee_service_hint default `backend` on ods-arch / path heuristics).
   - Else openapi id: `openapi:http_endpoint:{METHOD}:{path}` if code id
     not applicable.
   - If in doubt — **pass** call (not stub endpoint).
4. Edge `http_calls` caller → target; `metadata.layer=system`, `source=code`.

## In order analysis run

Parser MAY be executed before/after `ts-api-routes`. The edges refer to
stable id; nodes endpoint appear from `013`/`openapi` in the same run.
View loader tightens missing ends at incident edges (as of now).

## Mistakes

Empty `calls[]` → success, 0 edges. Do not remove run (FR module isolation).

## Do not do

- Create `http_endpoint`.
- Merge/delete openapi or code endpoints.
- `exposes` / `documents` / `depends_on` substitute `http_calls`.
