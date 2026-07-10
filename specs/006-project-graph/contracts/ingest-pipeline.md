# Контракт ingest pipeline (006)

**Спека**: [spec.md](../spec.md)  
**Вход**: [005 envelope-schema.json](../../005-code-analysis/contracts/envelope-schema.json)  
**Выход**: [canonical-schemas.json](./canonical-schemas.json) → [elasticsearch-indices.md](./elasticsearch-indices.md)

## Назначение

Преобразование **одного** сохранённого envelope парсера (`005`) в канонические
узлы и рёбра (`006`). Оркестратор `005` **не** разбирает поле `model`.

## Триггер

```text
analysis-orchestrator (005) сохранил документ в ods-parser-envelopes
  → IngestService.ingestEnvelope({ envelopeId | envelope })
  → адаптер по parser_id
  → bulk upsert ods-graph-nodes / ods-graph-edges
  → patch ods-analysis-runs.ingest_*
```

**Синхронность (pilot):** ingest в том же процессе backend, await после каждого
envelope; при ошибке адаптера — `ingest_errors[]`, прогон `partial`.

## Интерфейс адаптера

```typescript
interface IngestContext {
  project_id: string;
  analysis_run_id: string;
  parser_id: string;
  schema_version: string;
  files_analyzed: string[];
  incremental: boolean;
  affected_paths: string[];   // для delete-before-upsert
  deleted_paths: string[];    // только delete
}

interface IngestAdapter {
  readonly parser_id: string;
  readonly supported_schema_versions: string[];
  transform(model: unknown, ctx: IngestContext): {
    nodes: GraphNodeInput[];
    edges: GraphEdgeInput[];
  };
}
```

Регистрация: `backend/src/services/ingest/ingest-registry.service.ts` — аналог
`ParserRegistryService` в `005`.

## Алгоритм `IngestService.ingestEnvelope`

```text
1. Загрузить envelope (parser_id, schema_version, model, files_analyzed, …)
2. Найти адаптер(parser_id); если нет → ingest_errors, return (не throw)
3. Если schema_version не поддерживается → ingest_errors, return
4. Построить IngestContext (affected_paths / deleted_paths из analysis_run.change_set)
5. INCREMENT / paths:
   a. delete_by_query edges: project_id + analysis_run_id + parser_id + path ∈ affected ∪ deleted
   b. delete_by_query nodes:  те же фильтры
   c. для deleted_paths — skip transform (только delete)
6. adapter.transform(model, ctx) → nodes[], edges[]
7. Resolve element_id: lookup ods-elements (project_id, path) для каждого уникального path
8. Bulk index nodes (_id = analysis_run_id + ':' + node.id)
9. Bulk index edges (_id = analysis_run_id + ':' + edge.id)
10. Обновить ingest_status на analysis_run (partial если были ошибки адаптеров ранее)
```

## Порядок при нескольких envelope одного run

Оркестратор `005` вызывает ingest **после каждого** успешного модуля, в порядке
запуска парсеров (file_count). Адаптеры **не** перезаписывают чужой `parser_id`.

## Контракт native `model` (per adapter)

Каждый адаптер документирует ожидаемую структуру `model` для `schema_version`
в `backend/src/services/ingest/adapters/<parser_id>.ingest.ts` (комментарий + fixture JSON в tests).

| parser_id | schema_version | Минимальные сущности в model |
|-----------|----------------|------------------------------|
| `typescript` | `1` | symbols: name, kind, path, location, refs[] |
| `csharp` | `1` | symbols: name, kind, path, location, refs[] (Roslyn) |
| `python` | `1` | symbols: name, kind, path, location, refs[] (ast/libcst) |
| `cpp` | `1` | symbols: name, kind, path, location, refs[] (libclang/tree-sitter) |

Публичный API/UI **не** экспонирует `model` — только канон.

## Ошибки

| Ситуация | Поведение |
|----------|-----------|
| Нет адаптера | `ingest_errors += { parser_id, message }`; continue |
| transform throw | log + `ingest_errors`; continue |
| ES bulk partial failure | retry 1x; иначе `ingest_status=failed` |
| DELETE проекта in progress | skip ingest, log warning |

Сообщения пользователю — русский (через API graph / run status).

## Hook в `005` (точка интеграции)

Файл: `backend/src/services/analysis-orchestrator.service.ts`

```text
after saveParserEnvelope(envelope):
  await ingestService.ingestEnvelope(envelope.id)
```

`IngestService` инжектируется в orchestrator; модуль `006` не меняет контракт envelope.

## Не входит

- Запуск парсеров, детектор, UX модали (`005`)
- Публикация raw `model` через REST

## Тестирование

- Unit: fixture `model` → ожидаемые nodes/edges (typescript v1)
- Integration: envelope doc в ES → ingest → assert `ods-graph-nodes` count
- Contract: выход соответствует `canonical-schemas.json`
