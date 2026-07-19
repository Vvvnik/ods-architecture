# Ingest: java-api-routes (019)

**Спека**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)  
**Паттерн**: `specs/013-api-routes-from-code/contracts/ingest-api-routes.md`

## Adapter

| parser_id | File |
|-----------|------|
| `java-api-routes` | `backend/src/services/ingest/adapters/java-api-routes.ingest.ts` |

`supported_schema_versions`: `["1"]`.

## Transform

Для каждого `routes[]`:

1. Нормализовать METHOD + http_path (полный path — предпочтительно в парсере).
2. Resolve `serviceStable` (module path / hint → merged service).
3. Node `http_endpoint` id:
   `java-api-routes:http_endpoint:{serviceStable}|{METHOD}|{path}`;
   `metadata.layer=system`, `metadata.source=code`, `language=java`.
4. При service — edge `exposes`.
5. Gateway routes (`route_kind=gateway`) — тот же путь; отсутствие не ошибка.

## Ошибки

Пустой `routes[]` → success. Не валить run.

## Не делать

- Merge/delete OpenAPI endpoints.
- Требовать Gateway для success.
- Писать в `parsers/java` symbols.
