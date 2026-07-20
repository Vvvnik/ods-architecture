# Elasticsearch index  code analysis (005)

**Model**: [data-model.md]
**Basic indexes**: [002-domain-model/contracts/elasticsearch-indices.md](../../002-domain-model/contracts/elasticsearch-indices.md)

New indexes are created when the backend (bootstrap) is started if they are not present.
Pilot policy: `number_of_shards: 1`, `number_of_replicas: 0`.

## `ods-language-reports`

**Name:** reports from Language Detector.

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

**Questions:** last report  sort `detected_at` desc, size 1, filter `project_id`.

## `ods-analysis-runs`

**Name:** test runs after UX confirmation.

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

**Extension of ingest (`006`):** field `ingest_status`, `ingest_completed_at`, `ingest_errors`
records `IngestService` (`006`); bootstrap mapping includes them for `ods-analysis-runs`.
Details  [`006/data-model.md`](../../006-project-graph/data-model.md) §Ingest metadata.

## `ods-parser-envelopes`

**Name:** raw envelope + native `model` (ingest `006`).

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

**Unique:** the app guarantees one document on `(analysis_run_id, parser_id)`.

## `ods-sync-snapshots`

**Name:** snapshot of files for change set (increement).

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

## The cascade DELETE

When project (`002` FR-013) is deleted  `delete_by_query` on `project_id` in each
The above index is + delete `ods-sync-snapshots` on `_id`.

The index `006` (`ods-graph-nodes`, `ods-graph-edges`)  see also
[`006-project-graph/contracts/elasticsearch-indices.md`](../../006-project-graph/contracts/elasticsearch-indices.md);
The cascade DELETE — `005` T057 + `006` T053.

## The ES version

Elasticsearch **8.x** (as in `002`).
