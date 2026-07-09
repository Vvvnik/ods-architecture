# Модель данных: Анализ кода (005)

**Спека**: [spec.md](./spec.md) | **План**: [plan.md](./plan.md)

## Обзор

| Сущность | Хранилище | Индекс ES |
|----------|-----------|-----------|
| Language Report | ES | `ods-language-reports` |
| Analysis Run | ES | `ods-analysis-runs` |
| Parser Envelope | ES | `ods-parser-envelopes` |
| Sync Snapshot (internal) | ES | `ods-sync-snapshots` |
| Parser Registry | FS + memory | `parsers/*/manifest.json` |

Исходники — только WC (`002`). Канон графа — `006`.

## Language Report

Снимок детектора после sync.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | document `_id` |
| `project_id` | keyword | FK → Project |
| `detected_at` | date | ISO-8601 |
| `sync_id` | keyword | optional: `last_sync_at` или uuid прогона sync |
| `languages` | nested[] | см. ниже |

### `languages[]` item

| Поле | Тип | Описание |
|------|-----|----------|
| `language` | keyword | `typescript`, `python`, … |
| `file_count` | integer | ≥ 1 |
| `sample_paths` | keyword[] | до 5 путей |
| `parser_id` | keyword \| null | из registry |
| `parser_status` | keyword | `available` \| `missing` \| `failed` |

**Сортировка:** `file_count` desc, `language` asc (FR-004).

## Analysis Run

Прогон от подтверждения пользователя до завершения оркестратора.

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | `analysis_run_id` |
| `project_id` | keyword | |
| `language_report_id` | keyword | отчёт, на основе которого запущен |
| `status` | keyword | `pending`, `running`, `success`, `partial`, `failed`, `cancelled` |
| `started_at` | date | |
| `completed_at` | date \| null | |
| `incremental` | boolean | true если не первый анализ |
| `change_set` | object | `added[]`, `modified[]`, `deleted[]` paths |
| `parser_results` | nested[] | `{ parser_id, status, error_message? }` |
| `last_error_message` | text | nullable |
| `ingest_status` | keyword | patch **`006`**: `pending`, `running`, `success`, `partial`, `failed` |
| `ingest_completed_at` | date | nullable, patch **`006`** |
| `ingest_errors` | nested[] | patch **`006`**: `{ parser_id, message }` |

Схема ES — `contracts/elasticsearch-indices.md` (включая поля ingest).

**Блокировка:** только один `running` на `project_id` (409 при повторном POST).

## Parser Envelope

Один документ на пару (`analysis_run_id`, `parser_id`).

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | uuid | `_id` |
| `project_id` | keyword | |
| `analysis_run_id` | keyword | |
| `parser_id` | keyword | |
| `schema_version` | keyword | версия native model |
| `generated_at` | date | |
| `files_analyzed` | keyword[] | пути POSIX |
| `model` | object | **не валидируется** оркестратором |
| `stored_at` | date | время записи в ES |

Соответствует [envelope-schema.json](./contracts/envelope-schema.json).

## Sync Snapshot (вспомогательный)

Для инкремента (change set).

| Поле | Тип | Описание |
|------|-----|----------|
| `project_id` | keyword | `_id` = project_id |
| `captured_at` | date | после успешного sync |
| `files` | nested[] | `{ path, mtime_ms, size }` |

## Parser Registry (manifest)

Не в ES — файлы `parsers/<id>/manifest.json`. См. [parser-manifest.md](./contracts/parser-manifest.md).

## Связи

```text
Project (002)
  ├── LanguageReport (1..n, последний для UI)
  ├── SyncSnapshot (0..1 актуальный)
  ├── AnalysisRun (0..n)
  │     └── ParserEnvelope (0..n per run)
  └── Element tree (002) — источник путей, не дублируется
```

## DELETE проекта (каскад 005)

При `DELETE /projects/{id}` (`002` FR-013) дополнительно:

1. `delete_by_query` `ods-language-reports` where `project_id`
2. `delete_by_query` `ods-analysis-runs`
3. `delete_by_query` `ods-parser-envelopes`
4. `delete` `ods-sync-snapshots` doc `_id=project_id`

Индексы `006` — в спеке `006` (тот же `project_id`).

## Состояния анализа (логика)

```text
sync success → detector → language report saved
  → UI modal 1 (read report)
  → user continue → compute change set → UI modal 2
  → user continue → create AnalysisRun(running)
  → for each language (file_count order, status=available):
        spawn parser → envelope → save → update parser_results
  → AnalysisRun → success|partial|failed
```

Отмена на modal 1/2: AnalysisRun **не** создаётся; предыдущие runs/envelopes сохраняются.
