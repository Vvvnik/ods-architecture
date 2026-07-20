# Detector: ts-http-calls (014)

**Spec**: [spec.md](../spec.md)  
**Base**: content_hints pattern from `013` / `artifact-detector.ts`

## Artifact

| artifact_type | parser_id | The trigger |
|---------------|-----------|---------|
| `ts-http-calls` | `ts-http-calls` | `.ts`/`.tsx`/`.js`/`.jsx` + content hints: `apiFetch`, `API_BASE`, `'/api/v1'`, `"/api/v1"` |

## Rules

- Does not replace `languages[]`; parallel `artifacts[]`.
- `parser_status` available/missing like the others.
- Incremental change-set: path_suffix match (over-include OK; parser filters).
- The presence `language: typescript` **not** AutoPlay — need hints client.
