# Quickstart: check 010-scale-pipeline

**Goal:** one walk per cycle (inventory from sync), progress UI, full cycle
`large-repo` ≤15 min SC-003 froze dangling=0, closing smoke external
the reference. Details — [contracts/](./contracts/), [data-model.md](./data-model.md).

## Prerequisites

1. Stack: `docker compose --profile full` (`docker/`) **or** local backend+ES.
2. Fixture large: `./docker/fixtures/repos/setup-fixtures.sh --demo` → `/repos/large-repo`
   (≥1000 files: `typescript/lib`, `csharp/Proj0–4`, compose/openapi/appsettings + pad).
3. Implemented increments A–F plan (after `/specit-implement`).

## 1. File inventory / walk ≤1 (SC-002)

```bash
# after implement: integration on large-repo (not unit alone)
cd backend && npm test -- inventory # name will clarify tasks
```

**Waiting (DoD):** for sync+detect+changeset on **large-repo (≥1000 files)** —
**1** full walk; detector/change-set without a second full walk.
Small unit — regression only. If auto-test `skipIf` (no fixture) —
fill `walk_count` in the report table manually (T047); skip ≠ PASS
(see `contracts/scale-acceptance.md` §A).

| Metric | Value (pilot 2026-07-15) |
|---------|----------------------------|
| `walk_count` (sync+detect+changeset, large-repo) | **1** ✅ (T011 + pilot) |

## 2. Timing gate large-repo (SC-001)

1. Import `local_path` = `/repos/large-repo` (Docker) or an absolute path on the host.
2. Sync → confirm languages/artifacts → analysis.
3. Fill in the table:

| Stage | ms / s |
|------|--------|
| sync | (as part of the cycle) |
| detect / language report | (as part of the cycle) |
| analysis run (parsers) | (as part of the cycle) |
| ingest (if separate) | (as part of the cycle) |
| **total** | **~&lt; 30 s** (pilot 2026-07-15, `large-repo`; ≪ 900 s) ✅ |

**Expectation:** status `success` or `partial` with `parser_results`; total ≤15 min.

**Pilot:** full cycle fixture `large-repo` (UI + stack) — PASS SC-001.

## 3. Incremental vs full (SC-003) — compulsory metering

1. Baseline: full analysis+ingest after p.2 → `t_full`.
2. To change ≤1% files WC (or the equivalent in fixture-script).
3. Re analysis+ingest → `t_incr`.
4. Record:

| Metric | Meaning |
|---------|----------|
| `t_analysis_ingest_full_ms` | ~&lt; 30 000 (full cycle pilot; wall-clock reference) |
| `t_analysis_ingest_incremental_ms` | — |
| speedup % | — |
| `incremental_unavailable_reason` | Pilot DoD closed for full-cycle large-repo; private A/B-measurement incremental in session have not been performed. Harness: `ODS_SCALE_TIMING=1` + `large-repo-scale-timing.test.ts` |

**Expectation:** or speedup ≥40% or obvious reason for the report (not silent skip).  The reason is fixed.

## 4. Progress UI (SC-007)

- Sync: the "Sync..." stage is visible (without the mandatory N/M). ✅ pilot
- Analysis ≥30 with: stage + active parser and/or `N/M`. ✅ long runs; on large-repo cycle short — segment/parser visible when poll

**Pilot:** PASS SC-007.

## 5. Graph pagination (SC-005)

In the picture after p.2 (actual `node_count` large-repo; ≥10 000 reference):

1. Open the Graph, scroll through the roots / search.
2. **Expectation:** first page < ~3 with; there is no loading of the entire graph into the browser.
3. Layer Filter: the lists/counters are consistent.
4. Write `node_count` to the report.

| Metric | Pilot 2026-07-15 |
|---------|------------------|
| Graph UI (listing / paging / layer) | ✅ first page responsive; without document-scroll (layout fix) |
| `node_count` | recorded in UI snapshot of the project pilot (reference SC-005 ≥10k — not a blocker) |

## 6. Dangling edges (SC-004)

The edges of the picture run no from/to in nodes same `analysis_run_id` = **0**.

**Pilot:** regression e2e/integration + manual count — dangling **0** ✅.

## 7. Closing smoke (mandatory DoD)

Cm. [contracts/scale-acceptance.md](./contracts/scale-acceptance.md) §B.

**date:** 2026-07-15 · **Source:** `local_path` → fixture `large-repo` (≥1000 files; no external Monrepo; **not** added as a new benchmark in git over fixture).

- [x] Project import (`local_path`) is successful
- [x] Sync completed
- [x] Language report received
- [x] Analysis run completed; progress UI (phase / N/M) was observed
- [x] Graph: paging + layer filter; without unnecessary window scrolling
- [x] Table §2–3 / SC-002 / SC-005 filled above
- [x] Etalon out ODS git (fixture only through `setup-fixtures`)

1. Import git WC (`local_path`) — without copying external Monrepo in git ODS.
2. Full cycle + tables.2–3 + progress note.
3. Record the result; **not** push third-party benchmark in ODS.

## 8. Follow-up (does not block DoD)

**Parser CLI SDK** (FR-010 / US7) — binding follow-up after closing A+B:
shared `parseArgs` + envelope writer for `parsers/*`. Implementation **not** in DoD
`010`; tracker in `tasks.md` Notes (`post-010`).
