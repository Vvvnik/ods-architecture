# Detector: API routes from code (013)

**Спека**: [spec.md](../spec.md)  
**База**: `specs/009-system-landscape/contracts/detector-artifacts.md`

## Новые artifact types

| artifact_type | parser_id | Триггер |
|---------------|-----------|---------|
| `ts-api-routes` | `ts-api-routes` | Файлы `.ts`/`.js` (не denylist) со сигналами Fastify: import/require `fastify` и/или вызовы `.get(`/`.post(`/`.put(`/`.patch(`/`.delete(`/`.route(` с литералом пути или template+const prefix |
| `dotnet-api-routes` | `dotnet-api-routes` | Файлы `.cs` с `[HttpGet`/`[HttpPost`/`[HttpPut`/`[HttpDelete`/`[Route` или `MapGet`/`MapPost`/`MapPut`/`MapDelete` |

## Правила

- `file_count` / `sample_paths` — как у прочих artifacts.
- `parser_status`: `available` если модуль в registry, иначе `missing`.
- Не заменять `languages[]`; параллельный список `artifacts[]`.
- Incremental: change-set классифицирует пути по тем же сигналам/globs.

## Примечание

Наличие `language: typescript` **не** означает автозапуск `ts-api-routes` —
нужны сигналы роутов.
