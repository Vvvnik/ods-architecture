# Parser modules (005)

CLI modules invoked by the analysis orchestrator. Each module lives in `parsers/<parser_id>/` with a `manifest.json` and entry script.

See `specs/005-code-analysis/contracts/parser-manifest.md` for the manifest and CLI contract.

**How to add a parser:** follow the checklist
[`specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`](../specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md).

## Target modules

| parser_id        | Status    |
|------------------|-----------|
| `typescript`     | available |
| `csharp`         | available |
| `python`         | available |
| `cpp`            | available |
| `java`           | available |
| `compose`        | available |
| `appsettings`    | available |
| `openapi`        | available |
| `dotnet-project` | available |
| `bus-rabbit`     | available |
| `bus-kafka`      | available |
| `ts-api-routes`  | available |
| `dotnet-api-routes` | available |
| `ts-http-calls`  | available |
| `maven-project`  | available |
| `spring-config`  | available |
| `java-api-routes` | available |
| `java-http-calls` | available |
| `react-ui`         | available |

Runtime spawn order comes from the language report (`file_count` descending), not from this table.
