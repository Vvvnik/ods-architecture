# Research: Parser pipeline performance (`026`)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Date**: 2026-07-28

## R1 — Long-lived worker protocol

**Decision**: Add optional **`--ods-worker`** mode: one OS process per
`parser_id` per analysis run. Orchestrator sends **NDJSON requests on
stdin** (each line = one chunk: file-list path + output path + ids);
worker writes one NDJSON ack per request on stdout (`ok` / `error`);
orchestrator sends a final `{"op":"shutdown"}` and waits for exit.
Parsers without worker support keep today’s one-shot CLI (process per
chunk) until upgraded.

**Rationale**: Current `stdio: ['ignore', …]` + process-per-chunk multiplies
cold starts (`node` / `dotnet` / `jvm`). NDJSON over stdin works across
bash wrappers and native hosts without a new RPC stack. Compat path avoids
big-bang rewrite of every artifact module.

**Alternatives considered**:

| Option | Why rejected |
| -------- | -------------- |
| Always process-per-chunk; only raise parallel | Misses largest spawn multiplier (FR-005) |
| gRPC/HTTP worker sidecar | Overkill vs stdin; new infra surface |
| One polyglot mega-process | Violates native-host / `018` non-goal |
| Warm pool across analysis runs | Lifetime/orphan risk; out of first cut |

**Priority parsers for worker in DoD**: `typescript`, `csharp`, `java`
(language extract). Other modules SHOULD get worker when multi-chunk is
common; MAY stay one-shot if typically single-chunk.

---

## R2 — Chunk policy

**Decision**: Keep global default `ANALYSIS_PARSER_FILE_CHUNK_SIZE=500`.
**Merge** a trailing remainder chunk into the previous chunk when the
remainder size is **&lt; 10% of chunk size** (and remainder &gt; 0), so tiny
last chunks do not force an extra round-trip even with workers.

**Per-parser chunk override** (`manifest.chunk_size` /
`ANALYSIS_PARSER_CHUNK_SIZE_<PARSER_ID>`): **out of DoD** for `026`
(future MAY). Global size + merge satisfy FR-006.

**Rationale**: Spec DoD locked to global + merge after analyze remediation;
avoids optional half-implemented per-parser path.

**Alternatives considered**: Drop chunking entirely (RAM risk on huge
trees); auto chunk from RAM (out — no hard RAM caps / heuristics DoD);
per-parser in first cut (deferred — not required for SC-001).

---

## R3 — Max parallel default

**Decision**: Change code default **2 → 4** (`ANALYSIS_MAX_PARALLEL_PARSERS`).
Document in `docker/.env.example` and `ods-help/user-guide` when to raise
further (more cores / many artifact jobs). Keep `Math.max(1, n)` and
timeouts from `010`.

**Rationale**: Clarify locked fixed **4** (not CPU auto-detect).

---

## R4 — Prebuilt hot path

**Decision**:

1. Docker/image build MUST continue to produce Release DLL / JAR (and
   install Node deps) before analysis is offered.
2. On hot path: if expected artifact missing → **fail that parser job
   explicitly** (`failed` with clear stderr); **MUST NOT** run
   `dotnet run` / `mvn package` during analysis when
   `ANALYSIS_REQUIRE_PREBUILT=true` (default **true** in Docker Compose
   profile `full`; default **false** on bare local so developers can still
   iterate — document both).
3. When `ANALYSIS_REQUIRE_PREBUILT=false`, existing fallback MAY remain for
   local dx only — still counted as a footgun to avoid in pilot smoke.

**Rationale**: Spec FR-004 / SC-003 — no silent source-build latency on
pilot hot path; local dx needs an escape hatch.

**Alternatives considered**: Always remove fallbacks (hurts local first-run);
always require prebuilt everywhere (friction for parser authors).

---

## R5 — Skip waste (light)

**Decision**: Audit only. Detector already omits zero-count artifacts;
orchestrator skips `file_count===0` / empty file lists. Confirm analysis
confirm modal honesty unchanged. Fix only if audit finds a concrete leak
(parser claimed available with zero work). No new extract semantics.

**Rationale**: Spec P2 light; avoid scope creep into detector redesign.

---

## R6 — Dogfood / timing surfaces

**Decision**: SC-001 = operator stopwatch on
`docker/fixtures/repos/large-repo` (setup via existing fixture scripts).
Quickstart lists **steps** to measure, **not** a required timing table or
API fields. Optional operator smoke on a large local project is
confidence-only (no path/UUID in tracked files).

**Rationale**: Clarify — nowhere write times in product.

---

## R7 — Quality / depth

**Decision**: No parser extract algorithm changes for speed. Worker and
chunking MUST produce the same envelope semantics as one-shot CLI for the
same file set (merge envelopes across chunks as today). SC-002 smoke on
existing semantic-`calls` fixture.

**Rationale**: Clarify — no quality cut; depth modes out.

---

## Current baseline (code facts)

| Item | Today (pre-026 complete) |
| ------ | ------ |
| Parallel default | **4** after 026 |
| Chunk size | 500 + tiny-remainder merge; worker when supported |
| Sync hot path | preload + bulk upsert / soft-delete (026 US0) |
| C# / .NET modules | DLL else fail when require-prebuilt |
| Java | jar else fail when require-prebuilt |
| Empty skip | detector + orchestrator |

---

## R7 — Sync ES chatty loop (2026-07-29)

**Decision**: Replace per-path `findByPath` + `upsert` +
`hasManualNotNeededAncestor` during scan with: `loadByProjectPathMap`,
in-memory status resolve, `bulkUpsert`, bulk soft-delete, refresh only
when writes occurred.

**Rationale**: Operator large trees spent tens of minutes in ES
round-trips; analysis wins are useless if warm re-index blocks re-test.

## R8 — Tree import vs warm sync + skip unchanged (2026-07-29)

**Decision**: Spec vocabulary — **tree import** = cold full element write;
**tree sync** = warm re-run. Always **full WC walk** (never change-only
tree assembly — that previously broke the tree). On warm sync, **skip
unchanged** element docs in bulk. No portal/API rename in `026`.

**Rationale**: Cold import is inherently write-bound; day-to-day debugging
needs fast warm sync. Skip unchanged must not become a partial walk.

**Alternatives considered**:

| Option | Why rejected |
| -------- | -------------- |
| Change-only walk | Previously broke tree assembly |
| Rename UI Sync → Import | Out of scope; vocabulary-only in specs |
| Always full ES rewrite | Leaves warm sync minutes-class |

---

## Open for tasks (not blocking plan)

- Exact NDJSON schema → [contracts/parser-worker-protocol.md](./contracts/parser-worker-protocol.md)
- Formal SC-001 / SC-007 stopwatch on ODS `large-repo` if close paperwork
  requires fixture numbers beyond operator confidence
