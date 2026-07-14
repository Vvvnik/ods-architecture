# Ingest: system-слой (009)

**Спека**: [spec.md](../spec.md)  
**Базовый pipeline**: [006-project-graph/contracts/ingest-pipeline.md](../../006-project-graph/contracts/ingest-pipeline.md)

## Назначение

Преобразование envelope system-парсеров в канонические узлы/рёбра с
`metadata.layer = system`.

## Общие правила

1. **Слой:** каждый node/edge MUST `metadata.layer = 'system'`.
2. **Id узла:** `{parser_id}:{kind}:{stable_key}` — см. [research.md](../research.md) R5.
3. **Id ребра:** `{parser_id}:{type}:{from}:{to}` (стабильный; path optional suffix при коллизии).
4. **Пропуск цели:** если `to` node не резолвится в batch — ребро не создаётся.
5. **Индексы:** `ods-graph-nodes`, `ods-graph-edges` — как `006`.
6. **Регистрация:** `ingest-registry.service.ts` — по `parser_id`.

## Адаптеры MVP

| parser_id | Native → канон (кратко) |
|-----------|-------------------------|
| `compose` | `services[]` → `service`; `depends_on` → `depends_on` |
| `appsettings` | `bindings` type=database → `database` + `connects_to`; broker → `broker` |
| `openapi` | `operations[]` → `http_endpoint`; `documents`; `exposes` при match service |
| `dotnet-project` | projects → `dotnet_project`; refs → `project_reference` |
| `bus-rabbit` | handlers → `consumes`/`publishes` → `message_topic`/`message_type` |
| `bus-kafka` | consumers → `consumes` → `message_topic` |

Детальные поля — JSON schemas в этой папке.

## Cross-parser edges (MVP)

Разрешены в одном `analysis_run_id` если target node id уже в текущем
`IngestTransformResult` aggregate **или** создан ранее в том же run ingest
service (in-memory registry per run — рекомендуется в implement).

Минимум для fixture:

- compose `service` ← appsettings `connects_to` → `database`
- compose `service` ← openapi `exposes` → `http_endpoint`

## Dual schema

System parsers MVP: только `schema_version: "1"`.

## Incremental

Как `006`: delete nodes/edges by `affected_paths` / `deleted_paths` per parser
before upsert.

## Ошибки

Невалидный native model → `ingest_errors[]`, run `partial`; code ingest не откатывается.
