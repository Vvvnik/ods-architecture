# Индексы Elasticsearch — анализ кода (005)

**Модель**: [data-model.md](../data-model.md)  
**Базовые индексы**: [002-domain-model/contracts/elasticsearch-indices.md](../../002-domain-model/contracts/elasticsearch-indices.md)

Новые индексы создаются при старте backend (bootstrap), если отсутствуют.
Политика pilot: `number_of_shards: 1`, `number_of_replicas: 0`.

## `ods-language-reports`

**Назначение:** отчёты Language Detector.

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "project_id": { "type": "keyword" },
      "detected_at": { "type": "date" },
      "sync_id": { "type": "keyword" },
      "languages": {
        "type": "nested",
        "properties": {
          "language": { "type": "keyword" },
          "file_count": { "type": "integer" },
          "sample_paths": { "type": "keyword" },
          "parser_id": { "type": "keyword" },
          "parser_status": { "type": "keyword" }
        }
      }
    }
  }
}
```

**Запросы:** последний отчёт — sort `detected_at` desc, size 1, filter `project_id`.

## `ods-analysis-runs`

**Назначение:** прогоны анализа после UX-подтверждения.

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "project_id": { "type": "keyword" },
      "language_report_id": { "type": "keyword" },
      "status": { "type": "keyword" },
      "started_at": { "type": "date" },
      "completed_at": { "type": "date" },
      "incremental": { "type": "boolean" },
      "change_set": {
        "properties": {
          "added": { "type": "keyword" },
          "modified": { "type": "keyword" },
          "deleted": { "type": "keyword" }
        }
      },
      "parser_results": {
        "type": "nested",
        "properties": {
          "parser_id": { "type": "keyword" },
          "status": { "type": "keyword" },
          "error_message": { "type": "text" }
        }
      },
      "last_error_message": { "type": "text" },
      "ingest_status": { "type": "keyword" },
      "ingest_completed_at": { "type": "date" },
      "ingest_errors": {
        "type": "nested",
        "properties": {
          "parser_id": { "type": "keyword" },
          "message": { "type": "text" }
        }
      }
    }
  }
}
```

**Расширение ingest (`006`):** поля `ingest_status`, `ingest_completed_at`, `ingest_errors`
записывает `IngestService` (`006`); bootstrap mapping включает их для `ods-analysis-runs`.
Детали — [`006/data-model.md`](../../006-project-graph/data-model.md) §Ingest metadata.

## `ods-parser-envelopes`

**Назначение:** сырые envelope + native `model` (ingest `006`).

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "project_id": { "type": "keyword" },
      "analysis_run_id": { "type": "keyword" },
      "parser_id": { "type": "keyword" },
      "schema_version": { "type": "keyword" },
      "generated_at": { "type": "date" },
      "files_analyzed": { "type": "keyword" },
      "model": { "type": "object", "enabled": true },
      "stored_at": { "type": "date" }
    }
  }
}
```

**Уникальность:** приложение гарантирует один документ на `(analysis_run_id, parser_id)`.

## `ods-sync-snapshots`

**Назначение:** snapshot файлов для change set (инкремент).

```json
{
  "mappings": {
    "properties": {
      "project_id": { "type": "keyword" },
      "captured_at": { "type": "date" },
      "files": {
        "type": "nested",
        "properties": {
          "path": { "type": "keyword" },
          "mtime_ms": { "type": "long" },
          "size": { "type": "long" }
        }
      }
    }
  }
}
```

Document `_id` = `project_id`.

## Каскад DELETE

При удалении проекта (`002` FR-013) — `delete_by_query` по `project_id` в каждом
индексе выше + delete `ods-sync-snapshots` по `_id`.

Индексы `006` (`ods-graph-nodes`, `ods-graph-edges`) — см.
[`006-project-graph/contracts/elasticsearch-indices.md`](../../006-project-graph/contracts/elasticsearch-indices.md);
каскад DELETE — `005` T057 + `006` T053.

## Версия ES

Elasticsearch **8.x** (как в `002`).
