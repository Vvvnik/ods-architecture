# Draft: Analysis / parser pipeline performance

**Status**: entry draft for **`specs/026-parser-pipeline-perf/`** (Implemented
2026-07-29 — analysis + tree import/sync ES hot path; canonical
requirements in child `spec.md`; vocabulary tree import vs warm sync)  
**Parent**: `001-ods-vision`  
**Depends on**: `005` (orchestrator + parser spawn), `010` (timeout / max
parallel / file chunks), `008` (semantic `calls` depth — cost driver),
`018` (modular parsers; host runtime per stack already correct)  
**Related (not a dependency)**: closed `024-grpc-from-proto`, closed
`025-python-parsers` — must not absorb this work into extract DoD; modules
SHOULD keep native host per stack (TS→Node, C#→.NET, Java→JVM).  
**Created**: 2026-07-28  
**Priority note**: Promoted to **`026-parser-pipeline-perf`**. Builds on
closed `010`; does not reopen `010` scope casually. Former filename
`025-parser-pipeline-perf-draft.md` was renamed so `025` stayed free for
Python parsers.

## Problem

Large-repo analysis feels slow compared with lightweight **syntax-only** scan
tools that collect names/endpoints in one process. ODS already matches host to
stack (`typescript` → Node + TS API; `csharp` → Roslyn/.NET; `java` → JVM), but
wall-clock is dominated by:

1. **Semantic depth** — `Compilation` / `SemanticModel` (C#), TS program +
   call resolution, Java symbol solver — required for trustworthy `calls`, not
   for a name inventory.
2. **Orchestration** — subprocess per parser (and again per **file chunk**,
   default 500); cold start of `node` / `dotnet` / `java` multiplies cost.
3. **Parallelism** — `ANALYSIS_MAX_PARALLEL_PARSERS` default **2** (`010`);
   many language + artifact jobs queue behind the limit.
4. **Pipeline breadth** — language + system/UI artifact parsers + ingest to ES;
   “parser finished” ≠ “run finished”.
5. **Packaging footguns** — e.g. C# falling back to `dotnet run` when Release
   DLL is missing → extra build latency.

This is **not** fixed by rewriting C# extract in Node or TS extract in .NET.

## Goal (sketch)

1. Cut end-to-end analysis time on large ODS fixtures / pilot trees without
   dropping Canon quality for DoD paths that need semantic `calls`.
2. Keep modular `018` parsers and **native host per stack** (TS↔Node, C#↔.NET,
   Java↔JVM); optimize spawn, reuse, and optional depth — do not unify into one
   polyglot process for its own sake.
3. Make operator knobs / defaults explicit (parallelism, chunking, prebuilt
   binaries, optional “symbols-fast / calls-deep” modes if specified).
4. Measure before/after with the same fixture set (wall-clock + per-parser
   phases); no foreign path hardcodes.

## Suggested levers (priority order — lock in specify/clarify)

| Lever | Idea | Notes |
|-------|------|--------|
| P0 Parallel defaults | Raise safe default / document `ANALYSIS_MAX_PARALLEL_PARSERS` for multi-core hosts | Already in `010`; ops + maybe smarter default |
| P0 Prebuilt runtimes | Image/CI MUST ship Release DLL / JAR / `node_modules`; never `dotnet run` / `mvn` on hot path | Packaging, not algorithm |
| P1 Long-lived workers | One process per `parser_id` per run (or warm pool): chunks over stdin/RPC, not new OS process each chunk | Biggest spawn win |
| P1 Chunk policy | Tune `ANALYSIS_PARSER_FILE_CHUNK_SIZE`; avoid tiny last chunks; consider per-parser sizes | Trade RAM vs spawn count |
| P2 Optional depth | Symbols / surface syntax-fast path; semantic `calls` on demand, incremental-only, or second phase | Must not invent false `calls` |
| P2 Skip waste | Ensure empty/irrelevant artifact parsers stay skipped; confirm modal honesty | Detector + orchestrator |
| P3 Ingest profile | Separate timings for parse vs ES bulk; batch/tuning if parse is not the bottleneck | May stay out of parser modules |
| P3 Incremental first | Prefer change-set analysis for day-to-day; full rescan as explicit choice | Already partially present |

## Non-goals

- Absorbing this into extract features (`024`, `025` Python parsers, …)
- Rewriting language parsers onto the “wrong” host for micro-benchmarks
- Matching syntax-only docs generators feature-for-feature (different product)
- Hard RAM caps (still out per `010` unless newly specified)
- S1 AI import, MCP, auth, color legend

## Dogfood acceptance (sketch)

1. Same ODS-owned large-ish fixture before/after: measurable wall-clock
   improvement on full analysis (threshold locked at specify).
2. Semantic `calls` (or agreed deep path) still meets existing quality bar on
   a smoke fixture — no false edges to “go faster”.
3. TS/C#/Java still run on their native hosts; prebuilt binaries used in
   Docker smoke.
4. No regression on `010` timeout / parallel safety invariants.

## Suggested next step

Canonical: `specs/026-parser-pipeline-perf/spec.md`. Next:
`/speckit-clarify` (optional — e.g. revise ≥30% threshold) then
`/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.

## Related

- Scale baseline: `specs/010-scale-pipeline/`
- Orchestrator: `backend/src/services/analysis-orchestrator.service.ts`
- Config: `ANALYSIS_MAX_PARALLEL_PARSERS`, `ANALYSIS_PARSER_FILE_CHUNK_SIZE`,
  `ANALYSIS_PARSER_TIMEOUT_MS`
- Vision stock/large-repo memory: `specs/001-ods-vision/spec.md`
- Closed extract work (orthogonal): `specs/024-grpc-from-proto/`
