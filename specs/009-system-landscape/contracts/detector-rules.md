# Detector rules: artifact types (009)

**Spec**: [spec.md](../spec.md)  
**Contract**: [detector-artifacts.md](./detector-artifacts.md)

The canon of rules for implementation: `backend/src/config/detector-rules.json` (or
the equivalent). Unit-tests MUST cover each row of the table.

## Artifact types (MVP)

| artifact_type | parser_id | Glob / trigger | Note |
|---------------|-----------|----------------|------------|
| `compose` | `compose` | `docker-compose.yml`, `docker-compose.*.yml`, `compose.y*ml` | basename match |
| `appsettings` | `appsettings` | `**/appsettings*.json`, `**/.env`, `**/example.env` | case-sensitive path |
| `openapi` | `openapi` | `**/openapi*.y*ml`, `**/contracts/swagger/**` | only yaml/yml |
| `dotnet-project` | `dotnet-project` | `**/*.sln`, `**/*.csproj` | not to be confused with `language: csharp` |
| `bus` | *resolved* | see Bus resolver | One entry |

## Bus resolver

Signals **Rabbit** (any → candidate `bus-rabbit`):

- `appsettings*.json`: keys `RabbitMQ`, `MassTransit`+Rabbit transport (if not Kafka)
- `.cs`: attributes/base types queue listener (heuristic parser + easy scan)
- `*.csproj`: `RabbitMQ.Client`, `MassTransit.RabbitMQ`

Signals **Kafka** (any → candidate `bus-kafka`):

- `appsettings`: `Kafka`, `BootstrapServers`, `AddKafka`
- `.csproj`: `Confluent.Kafka`, `MassTransit.Kafka`

**Tie-break:** both candidates → `parser_id = bus-rabbit`.

**There are no signals:** artifact `bus` not added.

## Denylist

Inherited `ANALYSIS_DETECTOR_DENYLIST` (`node_modules`, `dist`, ...) — like
languages walk.

## Incremental change-set

`change-set.service` MUST classify ways artifact globs for
`affected_paths` / `deleted_paths` system parsers (parallel `pathsMatchingLanguage`).

## Examples `artifacts[]` (fragment)

```json
{
  "artifacts": [
    {
      "artifact_type": "compose",
      "file_count": 1,
      "sample_paths": ["docker-compose.yml"],
      "parser_id": "compose",
      "parser_status": "available"
    },
    {
      "artifact_type": "bus",
      "file_count": 12,
      "sample_paths": ["src/Api/Listeners/OrderListener.cs"],
      "parser_id": "bus-rabbit",
      "parser_status": "available"
    }
  ]
}
```
