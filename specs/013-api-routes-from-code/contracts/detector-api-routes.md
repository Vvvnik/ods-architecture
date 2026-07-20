# Detector: API routes from code (013)

**Spec**: [spec.md](../spec.md)  
**Base**: `specs/009-system-landscape/contracts/detector-artifacts.md`

## New artifact types

| artifact_type | parser_id | The trigger |
|---------------|-----------|---------|
| `ts-api-routes` | `ts-api-routes` | Files `.ts`/`.js` (not denylist) with signals Fastify: import/require `fastify` and/or challenges `.get(`/`.post(`/`.put(`/`.patch(`/`.delete(`/`.route(` with a literal path or template+const prefix |
| `dotnet-api-routes` | `dotnet-api-routes` | Files `.cs` with `[HttpGet`/`[HttpPost`/`[HttpPut`/`[HttpDelete`/`[Route` or `MapGet`/`MapPost`/`MapPut`/`MapDelete` |

## Rules

- `file_count` / `sample_paths` — like other artifacts.
- `parser_status`: `available` if the module is in registry, otherwise `missing`.
- Do not replace `languages[]`; parallel list `artifacts[]`.
- Incremental: change-set klassificeret paths for the same signal/globs.

## Note

The presence `language: typescript` **not** means AutoPlay `ts-api-routes` —
We need router signals.
