# C# parser module (`005`)

CLI parser for C# sources using **Roslyn** (`Microsoft.CodeAnalysis.CSharp`). Writes a parser envelope with native `model` schema version **`2`** (`symbols[]` + optional `usages[]` with `calls` / `injects`, 008).

## Prerequisites

- [.NET SDK 8+](https://dotnet.microsoft.com/download)

## Setup

```bash
cd parsers/csharp/Ods.CSharpParser
dotnet build -c Release
```

Or from parser root:

```bash
cd parsers/csharp
chmod +x run.sh
./run.sh --help  # requires full CLI args
```

## Local run

```bash
chmod +x parsers/csharp/run.sh

parsers/csharp/run.sh \
  --project-id 00000000-0000-4000-8000-000000000001 \
  --working-copy-root /path/to/WebApplication1 \
  --analysis-run-id 00000000-0000-4000-8000-000000000002 \
  --files '["Program.cs","Controllers/WeatherForecastController.cs"]' \
  --output /tmp/envelope-csharp.json
```

## Example output (`model` excerpt)

```json
{
  "symbols": [
    {
      "name": "Program.cs",
      "kind": "module",
      "path": "Program.cs",
      "qualified_name": "Program.cs",
      "refs": [{ "type": "imports", "name": "Microsoft", "qualified_name": "Microsoft.AspNetCore.Builder" }]
    },
    {
      "name": "WeatherForecastController",
      "kind": "class",
      "path": "Controllers/WeatherForecastController.cs",
      "qualified_name": "WeatherForecastController"
    }
  ]
}
```

## Docker

Backend image installs **.NET SDK 8** and pre-builds this project (`backend/Dockerfile`).
По умолчанию compose использует парсеры из образа (без mount хоста). Live-mount: `docker/docker-compose.parsers-dev.yml`.

## Native model (schema 1 + 2)

| Field | Description |
|-------|-------------|
| `symbols[]` | module, namespace, class, interface, enum, method, property, field |
| `symbols[].refs[]` | `imports`, `inherits`, `implements` |
| `usages[]` (v2) | Semantic links; MVP: `calls`, `injects` (ctor DI) |

Ingest: `backend/src/services/ingest/adapters/csharp.ingest.ts` → shared `symbols-model.ingest.ts`

See `specs/005-code-analysis/contracts/parser-manifest.md` for the orchestrator CLI contract.
