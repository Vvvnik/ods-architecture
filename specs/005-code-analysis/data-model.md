# Data model: code analysis (005)

**Spec**: [spec.md] | **Plan**: [plan.md]

## The review

| The essence | The storage room | The ES index |
|----------|-----------|-----------|
| Language Report | ES | `ods-language-reports` |
| Analysis Run | ES | `ods-analysis-runs` |
| Parser Envelope | ES | `ods-parser-envelopes` |
| Sync Snapshot (internal) | ES | `ods-sync-snapshots` |
| Parser Registry | FS + memory | `parsers/*/manifest.json` |

Sources — only WC (`002`). Canon graph — `006`.

## Language Report

The detector's image after the sync.

| The field | Type of the | The description |
|------|-----|----------|
| `id` | uuid | document `_id` |
| `project_id` | keyword | FK → Project |
| `detected_at` | date | ISO-8601 |
| `sync_id` | keyword | optional: `last_sync_at` or uuid of the sync drive |
| `languages` | nested[] | See below |

### `languages[]` item

| The field | Type of the | The description |
|------|-----|----------|
| `language` | keyword | `typescript`, `python`, … |
| `file_count` | integer | ≥ 1 |
| `sample_paths` | keyword[] | up to 5 routes |
| `parser_id` | keyword \| null | From the registry |
| `parser_status` | keyword | `available` \| `missing` \| `failed` |

**Sorting:** `file_count` desc, `language` asc (FR-004).

## Analysis Run

A procession from user confirmation to orchestrator completion.

| The field | Type of the | The description |
|------|-----|----------|
| `id` | uuid | `analysis_run_id` |
| `project_id` | keyword | |
| `language_report_id` | keyword | The report on which it was launched |
| `status` | keyword | `pending`, `running`, `success`, `partial`, `failed`, `cancelled` |
| `started_at` | date | |
| `completed_at` | date \| null | |
| `incremental` | boolean | true if not first analysis |
| `change_set` | object | `added[]`, `modified[]`, `deleted[]` paths |
| `parser_results` | nested[] | `{ parser_id, status, error_message? }` |
| `last_error_message` | text | nullable |
| `ingest_status` | keyword | patch **`006`**: `pending`, `running`, `success`, `partial`, `failed` |
| `ingest_completed_at` | date | nullable, patch **`006`** |
| `ingest_errors` | nested[] | patch **`006`**: `{ parser_id, message }` |

ES  `contracts/elasticsearch-indices.md` (including ingest fields)

**Blocking:** only one `running` on `project_id` (409 with repeated POST).

## Parser Envelope

One document for a couple (`analysis_run_id`, `parser_id`).

| The field | Type of the | The description |
|------|-----|----------|
| `id` | uuid | `_id` |
| `project_id` | keyword | |
| `analysis_run_id` | keyword | |
| `parser_id` | keyword | |
| `schema_version` | keyword | native model version |
| `generated_at` | date | |
| `files_analyzed` | keyword[] | The POSIX path |
| `model` | object | **not validated** by the orchestrator |
| `stored_at` | date | recording time in ES |

It is [envelope-schema.json](./contracts/envelope-schema.json).

## Sync Snapshot (helpful)

For the increments (change set).

| The field | Type of the | The description |
|------|-----|----------|
| `project_id` | keyword | `_id` = project_id |
| `captured_at` | date | After successful sync |
| `files` | nested[] | `{ path, mtime_ms, size }` |

## Parser Registry (manifest)

Not in the ES  files `parsers/<id>/manifest.json`. See [parser-manifest.md](./contracts/parser-manifest.md).

## Connections

```text
Project (002)
  ── LanguageReport (1..n, last for UI)
  ── SyncSnapshot (0..1 current)
  ├── AnalysisRun (0..n)
  │     └── ParserEnvelope (0..n per run)
  ── Element tree (002)  path source, not duplicated
```

## DELETE of the project (cascading 005)

In case of `DELETE /projects/{id}` (`002` FR-013) further:

1. `delete_by_query` `ods-language-reports` where `project_id`
2. `delete_by_query` `ods-analysis-runs`
3. `delete_by_query` `ods-parser-envelopes`
4. `delete` `ods-sync-snapshots` doc `_id=project_id`

The index `006`  in the speck `006` (the same `project_id`).

## The state of analysis (logic)

```text
sync success → detector → language report saved
  → UI modal 1 (read report)
  → user continue → compute change set → UI modal 2
  → user continue → create AnalysisRun(running)
  → for each language (file_count order, status=available):
        spawn parser → envelope → save → update parser_results
  → AnalysisRun → success|partial|failed
```

Cancellation to modal 1/2: AnalysisRun **not** is created; previous runs/envelopes are saved.
