# Detector: ts-http-calls (014)

**Спека**: [spec.md](../spec.md)  
**База**: content_hints pattern из `013` / `artifact-detector.ts`

## Artifact

| artifact_type | parser_id | Триггер |
|---------------|-----------|---------|
| `ts-http-calls` | `ts-http-calls` | `.ts`/`.tsx`/`.js`/`.jsx` + content hints: `apiFetch`, `API_BASE`, `'/api/v1'`, `"/api/v1"` |

## Правила

- Не заменяет `languages[]`; параллельный `artifacts[]`.
- `parser_status` available/missing как у прочих.
- Incremental change-set: path_suffix match (over-include OK; parser filters).
- Наличие `language: typescript` **не** автозапуск — нужны hints клиента.
