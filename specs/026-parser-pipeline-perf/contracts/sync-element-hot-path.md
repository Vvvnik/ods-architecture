# Contract: Tree import / sync element hot path (`026`)

**Feature**: `026-parser-pipeline-perf`  
**Implements**: FR-013, FR-014, FR-015, SC-007, SC-008

## Vocabulary

| Term | Meaning |
| ---- | ------- |
| **Tree import** | Cold first full write of WC paths into Elasticsearch |
| **Tree sync** (warm) | Later full WC walk; skip unchanged element docs; soft-delete missing |
| API | Same `SyncService.runSync` / `POST` sync for both; portal Sync label unchanged |

## Problem

Per-path Elasticsearch `findByPath` + `upsert` + `hasManualNotNeededAncestor`
during scan dominated wall-clock on large trees.

## Required behavior

| Step | MUST |
| ---- | ---- |
| Preload | `loadByProjectPathMap` (search_after; include inactive for id reuse). |
| Scan | **Full** WC walk (MUST NOT change-only walk — that previously broke the tree). Queue changed docs; throttled progress without per-path await. |
| Status | In-memory: preserve `status_manually_set`; inherit `not_needed` from manual ancestors. |
| Bulk upsert | Index **changed** elements only (skip active docs with same type/parent/status/manual). |
| Soft-delete | Bulk deactivate active paths not seen; MAY reuse preload map. |
| Refresh | Only if upserts or soft-deletes occurred. |

## Forbidden on scan hot path

- Per-path `findByPath` / single-doc upsert / ancestor ES lookups
- Soft-delete without bulk batching
- Change-only / diff-only tree assembly

## Verification

- Unit: preload + bulk; skip unchanged; no per-path upsert/ancestor on hot path.
- Unit: manual status preserve; `not_needed` inherit.
- Operator SC-007: ≥30% on `large-repo`; label import vs warm sync.
- Confidence: warm sync usable for day-to-day parser/graph debugging.
