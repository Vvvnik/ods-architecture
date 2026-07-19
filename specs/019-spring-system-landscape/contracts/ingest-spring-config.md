# Ingest: spring-config (019)

**Спека**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

## Adapter

| parser_id | File |
|-----------|------|
| `spring-config` | `backend/src/services/ingest/adapters/spring-config.ingest.ts` |

`supported_schema_versions`: `["1"]`.

## Transform

Для каждого `configs[]`:

1. Resolve service (hint / path → module → merged service).
2. Если `port` — записать на service (`metadata.port` / attrs).
3. Для каждого datasource с разрешимым `engine` (или стабильным именем):
   - upsert `database` (дедуп по логическому имени в run);
   - edge `connects_to` service → database.
4. Placeholder / без engine → **skip** ребро и узел-заглушку.

## Ошибки

Пустой configs → success. Не валить run. Паритет политики `appsettings` (`009`).

## Не делать

- Remote Config Server.
- Создание service только из config.
