# Data Model: 013-api-routes-from-code

**Спека**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Канон остаётся в ES `ods-graph-nodes` / `ods-graph-edges`. Новых индексов нет.

## Entities (канон)

### HTTP-эндпоинт (`kind: http_endpoint`, `metadata.layer: system`)

| Поле | Правило |
|------|---------|
| `id` | `{parser_id}:http_endpoint:{serviceStable}\|{METHOD}\|{path}` |
| `name` | path (или короткий хвост) |
| `qualified_name` | `{METHOD} {path}` |
| `signature` | METHOD (UPPER) |
| `path` | путь **исходника** (файл роута), не HTTP path |
| `language` | `typescript` / `javascript` / `csharp` |
| `parser_id` | `ts-api-routes` \| `dotnet-api-routes` |
| `metadata.http_path` | полный HTTP path (после сборки префикса) |
| `metadata.http_method` | UPPER |
| `metadata.source` | `code` (отличие от openapi yaml) |
| `metadata.handler_*` | optional (R6) |
| `metadata.service_name` | optional hint |

**Уникальность:** сервис + method + http_path (clarify).

### Сервис (`kind: service`)

Существующий compose-узел. Новых сервисов парсер API **не** создаёт.

### Обработчик (code)

Существующие `function` / `method` из языковых парсеров. Связь в CP1 —
через metadata на эндпоинте (R6), не обязательное новое ребро.

## Relationships

| type | from → to | Когда |
|------|-----------|--------|
| `exposes` | service → http_endpoint | сопоставление сервиса успешно |

OpenAPI `documents` / legacy endpoints — без изменений.

## Native envelope (логическое)

См. [contracts/native-ts-api-routes.schema.json](./contracts/native-ts-api-routes.schema.json),
[contracts/native-dotnet-api-routes.schema.json](./contracts/native-dotnet-api-routes.schema.json).

Общая форма маршрута:

```text
routes[]: { method, path, source_path, handler_name?, service_hint? }
```

## Validation

- method ∈ известный набор HTTP или UPPER token из кода.
- path не пустой; не выдумывать динамику.
- Не создавать `exposes` ко всем сервисам при сомнении.
- Идемпотентный upsert по `id` в рамках `analysis_run_id` (как прочий ingest).

## Detector artifacts

Новые `artifact_type`: `ts-api-routes`, `dotnet-api-routes` — см.
[contracts/detector-api-routes.md](./contracts/detector-api-routes.md).
