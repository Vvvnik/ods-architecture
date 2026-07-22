# OpenAPI ↔ code routes merge (019 follow-up)

When `openapi` ingest runs after code route parsers (`java-api-routes`,
`ts-api-routes`, `dotnet-api-routes`, …), matching endpoints are **not**
duplicated as `openapi:http_endpoint:…`.

## Match

Unambiguous equality of HTTP **METHOD** + normalized **path**, optionally
scoped by `service_hint` when multiple code endpoints share the same path.

## Behavior

1. Keep the **code** `http_endpoint` node (`metadata.source=code`).
2. Emit `documents` from OpenAPI `external_api` → that code node
   (`metadata.merged_with_code=true`, plus operation_id / summary when present).
3. Do **not** emit a second `exposes` from OpenAPI for the merged path
   (code already exposes).
4. Unmatched OpenAPI operations still create `openapi:http_endpoint:…` with
   `metadata.source=openapi`.

## Ownership

Implemented in `openapi.ingest.ts` + `openapi-code-merge.ts`; context filled by
`IngestService.listCodeHttpEndpoints`. No new canon kinds.
