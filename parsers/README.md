# Parser modules (005+)

CLI modules invoked by the analysis orchestrator. Each module lives in
`parsers/<parser_id>/` with a `manifest.json` and entry script.

See `specs/005-code-analysis/contracts/parser-manifest.md` for the manifest
and CLI contract.

**How to add a parser:** follow the checklist
[`specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`](../specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md).

## Available modules

| parser_id | Role (short) |
|-----------|----------------|
| `typescript` | TS/JS code symbols |
| `csharp` | C# code symbols |
| `python` | Python code symbols |
| `cpp` | C++ code symbols |
| `java` | Java code symbols |
| `compose` | Docker Compose → system services |
| `appsettings` | .NET appsettings connections |
| `openapi` | OpenAPI → HTTP contracts |
| `dotnet-project` | .NET project / deployable |
| `maven-project` | Maven module graph |
| `gradle-project` | Gradle module graph |
| `spring-config` | Spring config landscape |
| `bus-rabbit` | RabbitMQ bus |
| `bus-kafka` | Kafka bus |
| `ts-api-routes` | TS HTTP routes |
| `dotnet-api-routes` | .NET HTTP routes |
| `java-api-routes` | Java HTTP routes |
| `python-api-routes` | Python HTTP routes |
| `ts-http-calls` | TS HTTP clients |
| `dotnet-http-calls` | .NET HTTP clients |
| `java-http-calls` | Java HTTP clients |
| `python-http-calls` | Python HTTP clients |
| `grpc-proto` | gRPC from `.proto` |
| `ts-grpc-calls` | TS gRPC clients |
| `dotnet-grpc-calls` | .NET gRPC clients |
| `java-grpc-calls` | Java gRPC clients |
| `python-grpc-calls` | Python gRPC clients |
| `react-ui` | React UI landscape |
| `angularjs-ui` | AngularJS UI landscape |
| `angular-ui` | Angular UI landscape |

Runtime spawn order comes from the language report (`file_count` descending),
not from this table. Each subdirectory may have its own README for module-specific
notes.
