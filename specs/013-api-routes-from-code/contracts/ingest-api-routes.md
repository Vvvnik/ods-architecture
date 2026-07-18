# Ingest: API routes from code (013)

**Спека**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

## Adapters

| parser_id | Adapter |
|-----------|---------|
| `ts-api-routes` | `ts-api-routes.ingest.ts` |
| `dotnet-api-routes` | `dotnet-api-routes.ingest.ts` |

`supported_schema_versions`: `["1"]`.

## Transform

Для каждого `routes[]` в native model:

1. Нормализовать `METHOD`, `http_path` (уже собранный парсером или
   дособрать prefix по R3 в ingest — предпочтительно **в парсере**).
2. Resolve `service_id` (R5); `serviceStable` для id.
3. Создать node `http_endpoint` с `metadata.layer=system`, `metadata.source=code`.
4. Если service_id — edge `exposes` service → endpoint.
5. Заполнить optional `metadata.handler_*` (R6).

## Идемпотентность

Upsert по стабильному `id` (R2). Повторный анализ не плодит дубли с тем же
ключом.

## Ошибки

Пустой `routes[]` → success, 0 nodes. Битая model → partial/error как у
прочих adapters; оркестратор не падает целиком (FR-009).

## Не делать в 013

- Merge/delete openapi endpoints.
- Создание service узлов.
- Новый EdgeType для handler (CP1).
