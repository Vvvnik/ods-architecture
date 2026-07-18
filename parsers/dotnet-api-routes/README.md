# dotnet-api-routes parser (013)

ASP.NET controllers (`[HttpGet]` / `[Route]`) и minimal APIs
(`MapGet` / `MapPost` / …) → native model `routes[]` со `style`.

CLI: `run.sh` → Roslyn (`Ods.DotnetApiRoutesParser`).

Контракт: `specs/013-api-routes-from-code/contracts/native-dotnet-api-routes.schema.json`.

## Prerequisites

- .NET SDK 8+

```bash
cd parsers/dotnet-api-routes/Ods.DotnetApiRoutesParser
dotnet build -c Release
```
