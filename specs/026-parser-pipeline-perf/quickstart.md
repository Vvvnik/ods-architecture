# Quickstart: Parser and tree import/sync performance (`026`)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

No mandatory timing tables or product timing UI. SC-001 / SC-007 use
operator stopwatch.

## Vocabulary

- **Tree import** — cold first full element write (minutes-class on very
  large trees; write-bound).
- **Tree sync** (warm) — later Sync action after import; full WC walk +
  skip unchanged (day-to-day; should be tens of seconds class on large
  trees after this feature).
- Portal still says **Import** (create project) and **Sync** (runs both
  cold and warm tree index).

## Prerequisites

- Docker Compose `--profile full` with prebuilt C# / Java / .NET modules
- ODS `large-repo` under `docker/fixtures/repos` (same class as `010`)
- Optional semantic-`calls` smoke fixture for SC-002

## Knobs

- `ANALYSIS_MAX_PARALLEL_PARSERS=4`
- `ANALYSIS_PARSER_FILE_CHUNK_SIZE=500`
- `ANALYSIS_REQUIRE_PREBUILT=true` in Docker `full`

## Rebuild note (analysis partial)

Rebuild backend image so Release DLL/JAR exist for all gated modules
(`csharp`, `dotnet-api-routes`, `dotnet-http-calls`, `dotnet-grpc-calls`,
`java`). Worker failures fall back to oneshot.

## SC-007 — Tree index (≥30% on `large-repo`)

1. Baseline pre-`026` tree index wall-clock on `large-repo` (note import
   vs warm if known). Do **not** commit timings.
2. After this feature, re-measure on same host class.
3. Pass if ≥30% faster. Prefer reporting **warm sync** separately from
   **tree import**.
4. Optional confidence on a large local tree — not sole DoD; no
   path/UUID in tracked docs. Warm sync MUST be fast enough that
   operators are not blocked waiting tens of minutes to re-test analysis.

## SC-001 — Analysis (≥30% on `large-repo`)

Warm-sync first (fast path), then full analysis; compare to baseline.

## SC-002 … SC-006 / SC-008

See [spec.md](./spec.md). SC-008 covered by
`backend/tests/unit/sync.service.test.ts`.

## Related contracts

- [sync-element-hot-path.md](./contracts/sync-element-hot-path.md)
- [parser-worker-protocol.md](./contracts/parser-worker-protocol.md)
- [prebuilt-hot-path.md](./contracts/prebuilt-hot-path.md)
- [scale-knobs.md](./contracts/scale-knobs.md)
