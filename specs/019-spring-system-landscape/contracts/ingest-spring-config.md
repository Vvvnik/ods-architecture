# Ingest: spring-config (019)

**Spec**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

## Adapter

| parser_id | File |
|-----------|------|
| `spring-config` | `backend/src/services/ingest/adapters/spring-config.ingest.ts` |

`supported_schema_versions`: `["1"]`.

## Transform

For each `configs[]`:

1. Resolve service (hint / path → module → merged service).
2. If `port` — write to service (`metadata.port` / attrs).
3. For each datasource with resolvable `engine` (or a stable name):
   - upsert `database` (dedup by logical name in run);
   - edge `connects_to` service → database.
4. Placeholder / without engine → **skip** edge and node-stub.

## Errors

Empty configs → success. Do not fail run. Policy parity `appsettings` (`009`).

## Do not do

- Remote Config Server.
- Creation service only from config.
