# Contract: Analysis scale knobs (`026`)

**Spec**: [../spec.md](../spec.md) | **Research**: R2, R3, R4

## Environment variables

| Name | Type | Default | Meaning |
| ------ | ------ | --------- | --------- |
| `ANALYSIS_MAX_PARALLEL_PARSERS` | positive int | **4** | Max concurrent parser **jobs** (not chunks inside a job) |
| `ANALYSIS_PARSER_FILE_CHUNK_SIZE` | positive int | **500** | Max files per chunk before merge rule |
| `ANALYSIS_PARSER_TIMEOUT_MS` | positive int | `600000` | Per chunk request / spawn timeout (unchanged semantics from `010`) |
| `ANALYSIS_REQUIRE_PREBUILT` | bool | Docker `full`: **true**; bare local: **false** | When true, missing DLL/JAR fails the job; no `dotnet run` / `mvn package` on hot path |

Per-parser chunk size env/manifest overrides are **out of DoD** for `026`
(future MAY). DoD = global chunk size + tiny-remainder merge.

## Documentation MUST

- `docker/.env.example` lists parallel + chunk (+ require-prebuilt) with
  short comments
- `ods-help/user-guide` (commands or scale section) states defaults and
  when to raise parallel further

## MUST NOT

- Auto-detect CPU for default parallel
- Persist stage durations for these knobs’ dogfood
