# Data model: Parser pipeline performance (`026`)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

No new Elasticsearch indexes or Canon node/edge kinds. This feature
refines **runtime orchestration entities** already implied by `005`/`010`.

## Entities

### Analysis run (existing)

Unchanged persisted shape. **MUST NOT** add wall-clock / stage-duration
fields for this feature (clarify).

Relationships: owns many **parser jobs**.

### Parser job (runtime)

One scheduled unit for a `parser_id` within a run (language or artifact).

| Attribute | Notes |
| ----------- | ----- |
| `parser_id` | Registry id |
| `files[]` | Paths for this job (may be chunked) |
| `status` | success / partial / failed / skipped / missing (existing) |
| `chunk_count` | After chunking (existing metadata) |
| `worker_mode` | `oneshot` \| `ods_worker` (runtime only; optional persist in envelope meta if useful for dogfood verification — **not** a timing field) |

### File chunk (runtime)

Bounded subset of `files[]` after `chunkFiles` + tiny-remainder merge.

| Attribute | Notes |
| ----------- | ----- |
| `index` | 0-based |
| `files[]` | Paths |
| `merged_remainder` | bool — true if last tiny chunk was folded into previous |

### Parser worker session (runtime, new)

Long-lived OS process for one `parser_id` for the duration of one run’s
chunks (when worker supported).

| Attribute | Notes |
| ----------- | ----- |
| `parser_id` | |
| `pid` / handle | Backend-only |
| `protocol` | `ods-worker` NDJSON |
| `chunks_completed` | For progress N/M (existing progress fields OK; **not** durations) |
| Terminal | shutdown ack + process exit; MUST NOT orphan after run |

State: `starting` → `ready` → `busy` → `ready` → … → `shutting_down` →
`exited` | `failed`.

### Scale knobs (config)

| Knob | Default (026) | Override |
| ------ | --------------- | ---------- |
| `ANALYSIS_MAX_PARALLEL_PARSERS` | **4** | env |
| `ANALYSIS_PARSER_FILE_CHUNK_SIZE` | **500** | env |
| `ANALYSIS_PARSER_TIMEOUT_MS` | 600000 (unchanged) | env / manifest |
| `ANALYSIS_REQUIRE_PREBUILT` | **true** in Docker `full`; **false** bare local | env |

Per-parser chunk overrides are **out of DoD** for this feature.

### Prebuilt parser artifact (packaging)

Expected on-disk artifact for a stack (Release DLL, JAR, `node_modules` /
entry script). Absence under `ANALYSIS_REQUIRE_PREBUILT=true` → parser job
`failed` with explicit reason (not silent source-build).

### Sync path map (runtime)

In-memory `path → ElementDocument` built once per tree import/sync via
`loadByProjectPathMap` (includes inactive for id reuse). Used for status
resolve, skip-unchanged decisions, and soft-delete candidates.

### Tree import vs tree sync (vocabulary)

| | Tree import (cold) | Tree sync (warm) |
| --- | --- | --- |
| Walk | Full WC | Full WC |
| ES writes | Typically all paths | Changed docs only |
| Soft-delete | Yes | Yes |

No new ES mapping fields. Portal/API labels unchanged in this feature.

## Validation rules

- Max parallel ≥ 1; timeouts still apply per chunk request and/or session
  idle policy (implement: per-request timeout ≥ existing per-spawn timeout).
- Worker session MUST shut down on run end, cancel, or fatal error.
- Worker start failure MUST fall back to oneshot for that parser.
- Envelope merge across chunks MUST preserve Canon honesty (same as today).
- No false `calls` introduced by worker vs oneshot path.
- Sync MUST NOT use per-path ES find/upsert/ancestor on the scan hot path.

## Out of model

- Stage duration / wall-clock persistence
- Depth-mode flags
- Cross-run warm pools
