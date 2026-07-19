# Ingest: java-http-calls (019)

**Спека**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)  
**Паттерн**: `specs/014-graph-view-ux/contracts/ingest-http-calls.md`

## Adapter

| parser_id | File |
|-----------|------|
| `java-http-calls` | `backend/src/services/ingest/adapters/java-http-calls.ingest.ts` |

`supported_schema_versions`: `["1"]`.

## Transform

Для каждого `calls[]` (`client_kind`: `feign` | `webclient` | `restclient`):

1. Resolve **caller** service (hint / path).
2. Нормализовать METHOD + path.
3. Resolve **target** `http_endpoint` id **без создания узла**:
   - Prefer `java-api-routes:http_endpoint:{calleeStable}|{METHOD}|{path}`;
   - Else openapi id при применимости;
   - При сомнении — **пропуск**.
4. Edge `http_calls` caller → target; `metadata.layer=system`,
   `metadata.client_kind` = feign|webclient|restclient.

## Порядок

MAY до/после `java-api-routes`; стабильные id. View loader подтягивает ends.

## Ошибки

Пустой `calls[]` → success. Не валить run.

## Не делать

- Создавать `http_endpoint` из клиента.
- Подменять `exposes` / `depends_on`.
- Требовать RestTemplate / raw HttpURLConnection для DoD.
