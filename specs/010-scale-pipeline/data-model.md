# Data model: 010-scale-pipeline

**Spec**: [spec.md](./spec.md) | **Contracts**: [contracts/](./contracts/)  
**Research**: R1–R2

Changes **additive** models `005`/`006`. There are no new graph indexes.

## File inventory snapshot

A consistent snapshot of the WC files for the sync+analysis preparation cycle.

| Field | Type | Description |
|------|-----|----------|
| `project_id` | uuid | Project |
| `captured_at` | datetime | Snapshot Moment |
| `files[]` | object | Elements of inventory |
| `files[].path` | string | POSIX relative path |
| `files[].mtime_ms` | number | mtime |
| `files[].size` | number | size bytes |
| `source` | enum | `sync_walk` \| `reuse` (prefer `sync_walk` full cycle) |

**Rules:**

- Sync **builds** inventory one full walk (or publishes equivalent).
- Detector languages/artifacts and change-set **MUST** read this inventory
  (`source: reuse` / in-memory handoff) and **MUST NOT** to do a second
  full walk (FR-001 / R1).
- Can match with sync-snapshot (`006`/`005`) — separate index
  is required.

## Analysis run progress (extension)

Additive to `AnalysisRunDocument` / public GET run:

| Field | Type | Description |
|------|-----|----------|
| `progress_phase` | string \| null | Canon: `queued` \| `parsing` \| `ingest` \| `done` |
| `progress_active_parser_id` | string \| null | Current subprocess |
| `progress_parsers_completed` | int | Completed modules |
| `progress_parsers_total` | int | Planned modules |
| `progress_updated_at` | datetime \| null | Latest progress update |

**Rules:**

- **Sync not** written in `progress_phase` — UI sync through `project.sync_status`
  ("Sync..." without N/M) (FR-013).
- Phase `detecting` **not** included in public Canon (R2).
- The Orchestrator patch metadata run; frontend — phase + N/M on analysis.
- When terminal status — `done` (or save last values to audit).

## Scale run report (operating, do not have ES)

| Field | Description |
|------|----------|
| `fixture_or_source` | `large-repo` or "external smoke" |
| `t_sync_ms` | duration sync |
| `t_detect_ms` | The detector |
| `t_analysis_ms` | orchestrator+parsers |
| `t_ingest_ms` | ingest (if separate) |
| `t_total_ms` | wall-clock cycle |
| `t_analysis_ingest_full_ms` | baseline full (SC-003) |
| `t_analysis_ingest_incremental_ms` | incremental after ≤1% changes |
| `incremental_speedup_pct` | or `incremental_unavailable_reason` |
| `node_count` / `edge_count` | from graph summary |
| `run_status` | success/partial/failed |
| `walk_count` | assert ≤1 on large-repo |

## Relationships

```text
Project --captures--> FileInventory / SyncSnapshot
Project --has--> AnalysisRun (+ progress)
AnalysisRun --produces--> Graph nodes/edges (unchanged)
```

## Validation

- `progress_parsers_completed` ≤ `progress_parsers_total`
- dangling edges in the picture run = 0 (FR-007)
- SC-001: `t_total_ms` ≤ 900_000 on large-repo
- SC-002: `walk_count` ≤ 1 on large-repo (≥1000 files)
- SC-003: speedup ≥40% **or** filled `incremental_unavailable_reason`
