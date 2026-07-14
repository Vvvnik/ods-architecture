# Parser modules (005)

CLI modules invoked by the analysis orchestrator. Each module lives in `parsers/<parser_id>/` with a `manifest.json` and entry script.

See `specs/005-code-analysis/contracts/parser-manifest.md` for the manifest and CLI contract.

## Target modules

| parser_id        | Status    |
|------------------|-----------|
| `typescript`     | available |
| `csharp`         | available |
| `python`         | available |
| `cpp`            | available |
| `compose`        | available |
| `appsettings`    | available |
| `openapi`        | available |
| `dotnet-project` | available |
| `bus-rabbit`     | available |
| `bus-kafka`      | available |

Runtime spawn order comes from the language report (`file_count` descending), not from this table.
