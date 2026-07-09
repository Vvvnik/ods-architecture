# Модель данных: Граф проекта (006)

**Спека**: [spec.md](./spec.md) | **План**: [plan.md](./plan.md)

## Обзор хранилищ

| Слой | Индекс ES | Владелец |
|------|-----------|----------|
| Envelope парсера | `ods-parser-envelopes` | `005` (read-only для ingest) |
| Прогон анализа | `ods-analysis-runs` | `005` (read + patch ingest metadata) |
| Канон — узлы | `ods-graph-nodes` | `006` |
| Канон — рёбра | `ods-graph-edges` | `006` |
| Дерево файлов | `ods-elements` | `002` (lookup `element_id`) |

## Graph Node (канон)

Документ в `ods-graph-nodes`. Поле `id` — стабильный логический ключ узла;
**`_id` документа ES** = `{analysis_run_id}:{id}` (несколько снимков в одном индексе).

| Поле | Тип ES | Обязательно | Описание |
|------|--------|-------------|----------|
| `id` | keyword | да | `{parser_id}:{path}:{kind}:{qualified_name}` |
| `project_id` | keyword | да | FK → Project |
| `analysis_run_id` | keyword | да | снимок прогона |
| `parser_id` | keyword | да | источник |
| `kind` | keyword | да | class, function, method, interface, … |
| `name` | keyword | да | короткое имя |
| `qualified_name` | keyword | нет | FQN / symbol path |
| `language` | keyword | да | typescript, csharp, … |
| `path` | keyword | да | POSIX путь файла |
| `location` | object | нет | `{ start_line, start_col, end_line, end_col }` |
| `element_id` | keyword | нет | FK → Element (`002`) |
| `parent_id` | keyword | нет | id родительского узла |
| `signature` | text | нет | сигнатура метода/функции |
| `metadata` | object | нет | расширения без смены схемы |
| `ingested_at` | date | да | время записи ingest |

## Graph Edge (канон)

Документ в `ods-graph-edges`. Поле `id` — уникальный id ребра;
**`_id` документа ES** = `{analysis_run_id}:{id}`.

| Поле | Тип ES | Обязательно | Описание |
|------|--------|-------------|----------|
| `id` | keyword | да | уникальный id ребра |
| `project_id` | keyword | да | |
| `analysis_run_id` | keyword | да | |
| `parser_id` | keyword | да | |
| `language` | keyword | да | |
| `from` | keyword | да | id узла |
| `to` | keyword | да | id узла |
| `type` | keyword | да | calls, imports, inherits, implements, references, … |
| `path` | keyword | нет | контекст (файл вызова) |
| `location` | object | нет | позиция в коде |
| `metadata` | object | нет | |
| `ingested_at` | date | да | |

## Ingest metadata на Analysis Run (patch `005`)

Поля **дописывает** `006` в документ `ods-analysis-runs` (см. также
`005/contracts/elasticsearch-indices.md` §Расширение ingest `006`):

| Поле | Тип | Описание |
|------|-----|----------|
| `ingest_status` | keyword | pending, running, success, partial, failed |
| `ingest_completed_at` | date | nullable |
| `ingest_errors` | nested[] | `{ parser_id, message }` |

## IngestContext (в памяти, не ES)

| Поле | Описание |
|------|----------|
| `project_id` | |
| `analysis_run_id` | |
| `parser_id` | |
| `schema_version` | из envelope |
| `files_analyzed` | paths из envelope |
| `incremental` | boolean |
| `affected_paths` | paths для delete-before-upsert |
| `deleted_paths` | из change set |

## Связи

```text
AnalysisRun (005)
  └── ParserEnvelope (005) × N
        └── IngestJob → GraphNode[] + GraphEdge[] (006)

Project (002)
  ├── Element tree → element_id lookup
  └── Graph snapshot (latest analysis_run_id)
```

## Запросы (логика)

### Узлы файла

```text
project_id = :id
AND analysis_run_id = :runId (или latest)
AND path = :filePath
```

### Рёбра узла (1 hop)

```text
project_id = :id
AND analysis_run_id = :runId
AND (from = :nodeId OR to = :nodeId)
```

### Latest run

Sort `ods-analysis-runs` by `completed_at` desc, filter:

- `status` ∈ {`success`, `partial`}
- `ingest_status` ∈ {`success`, `partial`}

Первый документ — «текущий» снимок графа по умолчанию (FR-007).

## DELETE проекта

Дополнительно к каскаду `005` (`specs/005-code-analysis/data-model.md`):

1. `delete_by_query` `ods-graph-nodes` where `project_id`
2. `delete_by_query` `ods-graph-edges` where `project_id`

См. также `specs/002-domain-model/data-model.md` (cross-ref).

## Kind и Edge type (начальный набор)

**Node kinds:** `file`, `module`, `namespace`, `class`, `interface`, `function`, `method`, `property`, `field`, `variable`, `enum`

**Edge types:** `imports`, `exports`, `calls`, `inherits`, `implements`, `references`, `contains`

Расширение через `metadata` без миграции ES.
