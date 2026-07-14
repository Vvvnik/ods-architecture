# Правила детектора: artifact types (009)

**Спека**: [spec.md](../spec.md)  
**Контракт**: [detector-artifacts.md](./detector-artifacts.md)

Канон правил для реализации: `backend/src/config/detector-rules.json` (или
эквивалент). Unit-тесты MUST покрывать каждую строку таблицы.

## Artifact types (MVP)

| artifact_type | parser_id | Glob / trigger | Примечание |
|---------------|-----------|----------------|------------|
| `compose` | `compose` | `docker-compose.yml`, `docker-compose.*.yml`, `compose.y*ml` | basename match |
| `appsettings` | `appsettings` | `**/appsettings*.json`, `**/.env`, `**/example.env` | case-sensitive path |
| `openapi` | `openapi` | `**/openapi*.y*ml`, `**/contracts/swagger/**` | только yaml/yml |
| `dotnet-project` | `dotnet-project` | `**/*.sln`, `**/*.csproj` | не путать с `language: csharp` |
| `bus` | *resolved* | см. Bus resolver | одна entry |

## Bus resolver

Сигналы **Rabbit** (любой → кандидат `bus-rabbit`):

- `appsettings*.json`: ключи `RabbitMQ`, `MassTransit`+Rabbit transport (если нет Kafka)
- `.cs`: атрибуты/базовые типы queue listener (эвристика парсера + лёгкий scan)
- `*.csproj`: `RabbitMQ.Client`, `MassTransit.RabbitMQ`

Сигналы **Kafka** (любой → кандидат `bus-kafka`):

- `appsettings`: `Kafka`, `BootstrapServers`, `AddKafka`
- `.csproj`: `Confluent.Kafka`, `MassTransit.Kafka`

**Tie-break:** оба кандидата → `parser_id = bus-rabbit`.

**Нет сигналов:** artifact `bus` не добавляется.

## Denylist

Наследуется `ANALYSIS_DETECTOR_DENYLIST` (`node_modules`, `dist`, …) — как для
languages walk.

## Incremental change-set

`change-set.service` MUST классифицировать пути по artifact globs для
`affected_paths` / `deleted_paths` system parsers (параллельно `pathsMatchingLanguage`).

## Примеры `artifacts[]` (фрагмент)

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
