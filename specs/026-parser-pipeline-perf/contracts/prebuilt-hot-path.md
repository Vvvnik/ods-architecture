# Contract: Prebuilt parser hot path

**Spec**: [../spec.md](../spec.md) | **Research**: R4

## Goal

Pilot/Docker analysis MUST NOT pay silent source-build latency when a
release artifact is expected.

## Expected artifacts (examples)

| Family | Expected on hot path |
| -------- | --------------------- |
| C# / .NET modules | Release DLL under `bin/Release/...` then `dotnet <dll>` |
| Java modules | `target/*.jar` then `java -jar` |
| TypeScript / Node | `node` entry (`run.mjs`) with deps installed — no compile step mid-analysis |

Exact paths remain those already used by each `run.sh` / `run.mjs`.

## Behavior

| `ANALYSIS_REQUIRE_PREBUILT` | Missing DLL/JAR | Behavior |
| ----------------------------- | ----------------- | ---------- |
| `true` | yes | Fail parser job immediately; message names missing path; **no** `dotnet run` / `mvn package` |
| `false` | yes | Existing local fallback MAY run (dev only); document as footgun |

Shared implementation: `parsers/_common/require-prebuilt.sh` sourced by
`.NET` / Java `run.sh` entrypoints (not a TypeScript backend helper).

## Docker / CI

- Image build MUST produce artifacts before runtime.
- Compose profile `full` SHOULD set `ANALYSIS_REQUIRE_PREBUILT=true`.
- Smoke: TS + C# + Java paths exercise prebuilt (SC-003).

## MUST NOT

- Rewrite parsers onto wrong host
- Treat fallback build success as “healthy pilot packaging”
