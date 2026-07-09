# Индексы Elasticsearch — граф проекта (006)

**Модель**: [data-model.md](../data-model.md)  
**Базовые индексы**: [002-domain-model/contracts/elasticsearch-indices.md](../../002-domain-model/contracts/elasticsearch-indices.md)  
**Индексы анализа (005)**: [005-code-analysis/contracts/elasticsearch-indices.md](../../005-code-analysis/contracts/elasticsearch-indices.md)

Индексы создаются при старте backend (bootstrap), если отсутствуют.  
Политика pilot: `number_of_shards: 1`, `number_of_replicas: 0`.

## `ods-graph-nodes`

**Назначение:** канонические узлы графа кода (уровень 3).

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "project_id": { "type": "keyword" },
      "analysis_run_id": { "type": "keyword" },
      "parser_id": { "type": "keyword" },
      "kind": { "type": "keyword" },
      "name": { "type": "keyword" },
      "qualified_name": { "type": "keyword" },
      "language": { "type": "keyword" },
      "path": { "type": "keyword" },
      "location": {
        "properties": {
          "start_line": { "type": "integer" },
          "start_col": { "type": "integer" },
          "end_line": { "type": "integer" },
          "end_col": { "type": "integer" }
        }
      },
      "element_id": { "type": "keyword" },
      "parent_id": { "type": "keyword" },
      "signature": { "type": "text" },
      "metadata": { "type": "object", "enabled": true },
      "ingested_at": { "type": "date" }
    }
  }
}
```

**Запросы:**

- Узлы файла: `project_id` + `analysis_run_id` + `path`
- Узел по id: `project_id` + `id` + `analysis_run_id`
- Список проекта: `project_id` + `analysis_run_id`, sort `path`, `name`

**Уникальность:** `(project_id, analysis_run_id, id)` — upsert по `_id = id` в рамках run
(или composite `_id = {analysis_run_id}:{id}` если нужна история run в одном индексе).

**Рекомендация реализации:** `_id` документа = `{analysis_run_id}:{id}` для хранения
нескольких снимков без коллизий.

## `ods-graph-edges`

**Назначение:** канонические рёбра графа.

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "project_id": { "type": "keyword" },
      "analysis_run_id": { "type": "keyword" },
      "parser_id": { "type": "keyword" },
      "language": { "type": "keyword" },
      "from": { "type": "keyword" },
      "to": { "type": "keyword" },
      "type": { "type": "keyword" },
      "path": { "type": "keyword" },
      "location": {
        "properties": {
          "start_line": { "type": "integer" },
          "start_col": { "type": "integer" },
          "end_line": { "type": "integer" },
          "end_col": { "type": "integer" }
        }
      },
      "metadata": { "type": "object", "enabled": true },
      "ingested_at": { "type": "date" }
    }
  }
}
```

**Запросы:**

- Исходящие: `project_id` + `analysis_run_id` + `from`
- Входящие: `project_id` + `analysis_run_id` + `to`
- По файлу: `project_id` + `analysis_run_id` + `path`

**Рекомендация `_id`:** `{analysis_run_id}:{id}`

## Индексы `005` (только чтение / patch)

| Индекс | Действие `006` |
|--------|----------------|
| `ods-parser-envelopes` | READ — вход ingest |
| `ods-analysis-runs` | READ + UPDATE `ingest_*` полей |
| `ods-language-reports` | не используется ingest |
| `ods-elements` | READ — resolve `element_id` |

Схемы — в [005/contracts/elasticsearch-indices.md](../../005-code-analysis/contracts/elasticsearch-indices.md).

## Каскад DELETE

При `DELETE /api/v1/projects/{id}` (`002` FR-013), после/вместе с каскадом `005`:

1. `delete_by_query` `ods-graph-edges` where `project_id = :id`
2. `delete_by_query` `ods-graph-nodes` where `project_id = :id`

## Версия ES

Elasticsearch **8.x** (как в `002` / `005`).

## Связь с черновиком

Логические имена `graph_nodes` / `graph_edges` из `canonical-graph-model.md` =
физические индексы `ods-graph-nodes` / `ods-graph-edges` (research R1).
