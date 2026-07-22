# Ingest: java-http-calls (019)

**Spec**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)  
**Pattern**: `specs/014-graph-view-ux/contracts/ingest-http-calls.md`

## Adapter

| parser_id | File |
|-----------|------|
| `java-http-calls` | `backend/src/services/ingest/adapters/java-http-calls.ingest.ts` |

`supported_schema_versions`: `["1"]`.

## Transform

For each `calls[]` (`client_kind`: `feign` | `webclient` | `restclient` |
`resttemplate` | `httpurlconnection`):

1. Resolve **caller** service (hint / path).
2. Normalize METHOD + path.
3. Resolve **target** `http_endpoint` id **without node creation**:
   - Prefer `java-api-routes:http_endpoint:{calleeStable}|{METHOD}|{path}`;
   - Else openapi id at applicability;
   - In case of doubt — **skip**.
4. Edge `http_calls` caller → target; `metadata.layer=system`,
   `metadata.client_kind` as above.

## Order

MAY before/after `java-api-routes`; stable id. View loader fetches ends.

## Errors

Empty `calls[]` → success. Do not fail run.

## Do not do

- Create `http_endpoint` from client.
- Override `exposes` / `depends_on`.
- Invent destinations when URL/method are not statically resolvable.
