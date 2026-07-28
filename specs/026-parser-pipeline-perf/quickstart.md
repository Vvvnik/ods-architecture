# Quickstart: Parser pipeline performance (`026`)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Validation guide — **no** mandatory timing tables or product timing UI
(clarify). SC-001 uses operator stopwatch.

## Prerequisites

- Docker Compose `--profile full` (or equivalent pilot) with parsers image
  that **prebuilds** C# / Java artifacts
- ODS fixture `large-repo` via `docker/fixtures/repos` setup scripts
  (same class as `010`, ≥1000 files)
- Optional: existing semantic-`calls` smoke fixture (e.g. code-graph-depth
  demo) for SC-002

## Knobs (see [contracts/scale-knobs.md](./contracts/scale-knobs.md))

Confirm defaults after implement:

- `ANALYSIS_MAX_PARALLEL_PARSERS=4`
- `ANALYSIS_PARSER_FILE_CHUNK_SIZE=500`
- `ANALYSIS_REQUIRE_PREBUILT=true` in Docker `full`

## SC-001 — Wall-clock (≥30% on `large-repo`)

1. **Before** material `026` changes (or on a known pre-change build): import
   / sync `large-repo`, run **full** analysis once. Measure end-to-end
   analysis wall-clock with an external clock (operator). Remember the
   number privately — do **not** commit timings into the repo.
2. After `026` is implemented on the **same machine class**, repeat the same
   full analysis on the same fixture.
3. Pass if after ≤ 70% of before (i.e. ≥30% faster).
4. Optional confidence: repeat on a large local project — not sole DoD; no
   path/UUID in tracked docs.

## SC-002 — No false `calls`

Run analysis on an existing semantic-`calls` smoke fixture. Spot-check:
no new false call edges vs pre-change expectation / fixture notes.

## SC-003 — Prebuilt hot path

In Docker `full` with `ANALYSIS_REQUIRE_PREBUILT=true`:

1. Exercise stacks that actually ship compiled artifacts / Node entry:
   - **C# / .NET**: language or artifact module with Release DLL (e.g.
     analysis including `csharp` and/or `dotnet-*` on an ODS fixture that
     contains those sources — not necessarily `large-repo` alone)
   - **Java**: `java` (or JVM module) with JAR present
   - **TypeScript**: `typescript` via `node` entry with image-baked deps
     (no mid-run `npm install`)
2. Confirm jobs use DLL/JAR/node entry — no mid-run `mvn package` /
   `dotnet run` build.
3. Optionally remove/rename a DLL in a throwaway container and confirm the
   job **fails loudly** instead of building.

Note: SC-001 wall-clock stays on `large-repo`. SC-003 may use additional
ODS fixtures so all three stacks are covered.

## SC-004 — Worker reuse

1. Force a multi-chunk job (chunk size small enough or fixture large enough
   that `typescript` / `csharp` / `java` gets ≥2 chunks).
2. Verify (debug/logs/process watch during dogfood) **one** OS process per
   `parser_id` for those chunks — not one process per chunk.
3. Confirm timeouts still apply; process exits after run.

## SC-005 / SC-006 — Docs and safety

1. Read `.env.example` + user-guide: defaults **4** / **500** and when to
   raise parallel.
2. Override parallel to a higher safe value; observe more concurrent jobs.
3. Confirm timeout / cap behavior unchanged in spirit of `010`.

## Related contracts

- [parser-worker-protocol.md](./contracts/parser-worker-protocol.md)
- [prebuilt-hot-path.md](./contracts/prebuilt-hot-path.md)
- [scale-knobs.md](./contracts/scale-knobs.md)
