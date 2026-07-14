# Data model: 010-scale-pipeline

**Спека**: [spec.md](./spec.md) | **Contracts**: [contracts/](./contracts/)  
**Research**: R1–R2

Изменения **additive** к моделям `005`/`006`. Новых индексов графа нет.

## File inventory snapshot

Согласованный снимок файлов WC на цикл sync+подготовки анализа.

| Поле | Тип | Описание |
|------|-----|----------|
| `project_id` | uuid | Проект |
| `captured_at` | datetime | Момент снимка |
| `files[]` | object | Элементы inventory |
| `files[].path` | string | POSIX relative path |
| `files[].mtime_ms` | number | mtime |
| `files[].size` | number | size bytes |
| `source` | enum | `sync_walk` \| `reuse` (предпочитать `sync_walk` на полном цикле) |

**Правила:**

- Sync **строит** inventory одним полным walk (или публикует equivalent).
- Детектор languages/artifacts и change-set **MUST** читать этот inventory
  (`source: reuse` / in-memory handoff) и **MUST NOT** делать второй
  полный walk (FR-001 / R1).
- Может совпадать с sync-snapshot (`006`/`005`) — отдельный индекс не
  обязателен.

## Analysis run progress (расширение)

Additive к `AnalysisRunDocument` / public GET run:

| Поле | Тип | Описание |
|------|-----|----------|
| `progress_phase` | string \| null | Канон: `queued` \| `parsing` \| `ingest` \| `done` |
| `progress_active_parser_id` | string \| null | Текущий subprocess |
| `progress_parsers_completed` | int | Завершено модулей |
| `progress_parsers_total` | int | Запланировано модулей |
| `progress_updated_at` | datetime \| null | Последнее обновление прогресса |

**Правила:**

- **Sync не** пишется в `progress_phase` — UI sync через `project.sync_status`
  («Синхронизация…» без N/M) (FR-013).
- Фаза `detecting` **не** входит в public канон (R2).
- Оркестратор патчит metadata run; frontend — этап + N/M на analysis.
- При terminal status — `done` (или сохранить last values для аудита).

## Scale run report (операционный, не обязательно ES)

| Поле | Описание |
|------|----------|
| `fixture_or_source` | `large-repo` или «external smoke» |
| `t_sync_ms` | длительность sync |
| `t_detect_ms` | детектор |
| `t_analysis_ms` | orchestrator+parsers |
| `t_ingest_ms` | ingest (если отдельно) |
| `t_total_ms` | wall-clock цикла |
| `t_analysis_ingest_full_ms` | baseline full (SC-003) |
| `t_analysis_ingest_incremental_ms` | incremental после ≤1% изменений |
| `incremental_speedup_pct` | или `incremental_unavailable_reason` |
| `node_count` / `edge_count` | из graph summary |
| `run_status` | success/partial/failed |
| `walk_count` | assert ≤1 на large-repo |

## Relationships

```text
Project --captures--> FileInventory / SyncSnapshot
Project --has--> AnalysisRun (+ progress)
AnalysisRun --produces--> Graph nodes/edges (unchanged)
```

## Validation

- `progress_parsers_completed` ≤ `progress_parsers_total`
- dangling edges в снимке run = 0 (FR-007)
- SC-001: `t_total_ms` ≤ 900_000 на large-repo
- SC-002: `walk_count` ≤ 1 на large-repo (≥1000 files)
- SC-003: speedup ≥40% **или** заполнен `incremental_unavailable_reason`
