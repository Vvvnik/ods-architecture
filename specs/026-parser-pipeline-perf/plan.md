# Implementation Plan: Parser and tree import/sync performance

**Branch**: `026-parser-pipeline-perf` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/026-parser-pipeline-perf/spec.md`
(clarify: DoD fixture `large-repo`; max parallel default **4**; no depth
modes; SC-001 / SC-007 ≥30% operator-measured; no timing UX; tree index in
DoD; vocabulary **tree import** (cold) vs **tree sync** (warm); full WC
walk always; skip unchanged on warm sync).

**Dependencies**: `001`, `002` (elements/sync), `005`, `008`, `010`, `018`

**Out of this plan**: depth modes; timing UX; extract DoD; wrong-host
rewrites; portal/API rename of Sync → Import; change-only tree walks.

## Summary

| Lever | Approach |
| ------ | ---------- |
| P0 Tree index | Preload path map; in-memory status; bulk upsert **changed** only; bulk soft-delete; throttled progress; full WC walk |
| Vocabulary | **Tree import** = cold full write; **tree sync** = warm re-run (specs/dogfood only) |
| P0 Parallel | Default max parallel parsers **4** |
| P0 Prebuilt | Release DLL/JAR; image builds gated modules; worker → oneshot fallback |
| P1 Workers | One OS process per `parser_id` per run; NDJSON chunks |
| P1 Chunks | Global **500** + tiny-remainder merge |

## Technical Context

**Touched**: `sync.service.ts`, `element.repository.ts`, analysis
orchestrator / workers / config, `backend/Dockerfile`, parser run.sh +
`--ods-worker`, specs under `026`, user-guide knobs.

**Contracts**: sync-element-hot-path, parser-worker-protocol,
prebuilt-hot-path, scale-knobs.

## Complexity Tracking

N/A — extends existing sync + orchestrator; no new product surface; no
UI rename.
