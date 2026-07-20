# Research: 010-scale-pipeline

**Date**: 2026-07-15 (sync after clarify walk-scope / SC gates)  
**Spec**: [spec.md](./spec.md)

## R1 — Single bypass filesystem (file inventory)

**Decision:** The cycle **sync + preparation analysis** — **exactly one** full
walk WC. standard way: **sync** builds **File Inventory** (`path` + `mtime` +
`size`); `LanguageDetectorService`, `ChangeSetService` and ways Orchestrator
(`listAllFilePaths` / spawn sets) **MUST** read this picture **MUST NOT**
perform an independent repeated full walk in the same cycle (clarify
walk-scope = Option A; FR-001 / SC-002).

**Rationale:** Today walk is in sync (elements), `walkDirectory`,
`listAllFilePaths`, `scanFiles` — extra main I/O on large repo.
"Ignore sync walk and count ≤1 only detect+CS" rejected —
closes SC-002 ("sync+preparation ≤ 1").

**Alternatives considered:** (B) sync walk separately + another shared walk
detect/CS — to 2 crawls, the failure SC-002; cache only memory process —
it is lost during restart.

**Check DoD:** assert walk-count **on large-repo (≥1000 files)**; unit on
smaller WC — only regression (clarify SC-002 gate).

## R2 — Progress for the operator

**Decision:** to Expand public model `AnalysisRun` fields of progress.
Canon `progress_phase`: `queued` \| `parsing` \| `ingest` \| `done`
(**no** `detecting` in public API; without `sync` on run). Sync UI - only
stage "Syncing..." through `project.sync_status` (without N/M files)
(clarify FR-013). Analysis — phase + `active_parser` / N from M.

**Rationale:** Clarify progress + elimination drift data-model vs contract
(analyze I2).

**Alternatives considered:** WebSocket/SSE; % file; N/M on sync.

## R3 — Limits of the orchestrator and C#

**Decision:** MVP = **timeout** + **max parallel**. Hard RAM cap — out MVP.
`parser_results` are updated as the modules are completed.

**Rationale:** Clarify Q5 first session.

**Alternatives considered:** cgroup/docker memory per child.

## R4 — Incremental and SC-003

**Decision:** Policy bootstrap/increment `006`/`P0` saved.
**DoD SC-003:** mandatory **measurement** wall-clock analysis+ingest on
`large-repo`: after changing ≤1% files incremental ≥ **40%** faster
full baseline **or** manifest entry in quickstart/why increment
unavailable (then 40% is not required, but fallback MUST can be written)
(clarify Session 2).

**Rationale:** Path classification alone closes SC-003 (analyze C1).

**Alternatives considered:** 40% only landmark without measuring — rejected.

## R5 — Closing smoke

**Decision:** DoD = fixture gates + **hand** smoke external benchmark
operator (`local_path`). Not committing Etalon; not CI.

**Rationale:** Clarify Q1 first session.

## R6 — Graph UI on high volume

**Decision:** Server pagination + consistency layer filter.
**SC-005 DoD:** first page on the graph after analyzing **large-repo**
(actual `node_count`); the goal is ≥10 000 — **landmark** not hard blocker
(clarify Session 2). Do not enter `layer` query in graph API in `010`.

**Rationale:** Do not inflate fixture for the sake of artificial 10k nodes.

## R7 — Parser CLI SDK

**Decision:** **Outside DoD `010`**; compulsory follow-up (FR-010 / US7).

**Rationale:** Clarify Q4 first session.

## R8 — Timing gate ≤15 min

**Decision:** Auto/script `large-repo` (~≥1000 files); SC-001 =
**900 with** wall-clock sync→detect→analysis→ingest.

**Rationale:** Clarify Q2 first session.

## Resolved unknowns

All NEEDS CLARIFICATION closed (clarify ×2 + research R1–R8). Analyze
deferred I2 (enum) closed R2.

## R9. Code reuse audit (010 implement)

| Component | Path | Role in 010 |
|-----------|------|-------------|
| Sync + inventory publish | `backend/src/services/sync.service.ts` | One WC walk → `FileInventoryService.publishFromSyncWalk` |
| Inventory helper | `backend/src/services/file-inventory.service.ts` | Cache + walk counter |
| Detector | `backend/src/services/language-detector.service.ts` | `detectLanguages` / artifacts from inventory paths |
| Change-set | `backend/src/services/change-set.service.ts` | Reuse cached files; no rescan when cache hit |
| Orchestrator | `backend/src/services/analysis-orchestrator.service.ts` | Paths from `changeSet.added`; progress; max parallel |
| Domain / API | `analysis-run.ts`, `analysis.schemas.ts` | progress_* fields |
| Frontend | `useAnalysis.ts`, `WorkspacePage.tsx`, `GraphPage.tsx`, `ru.ts` | stage + N/M |
