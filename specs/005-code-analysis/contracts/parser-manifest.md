# The Parser Module Manifesto

**Spec**: [spec.md] | **Envelope**: [envelope-schema.json](./envelope-schema.json)

## Location

```text
parsers/
  <parser_id>/
    manifest.json
    run.mjs | run.sh | …
    README.md
```

## manifest.json

| The field | Type of the | Required | The description |
|------|-----|-------------|----------|
| `id` | string | Yes | `typescript`, `csharp`, `python`, `cpp` |
| `languages` | string[] | Yes | detector languages that serve the module |
| `schema_version` | string | Yes | native version `model` |
| `command` | string[] | Yes | argv for spawn; first element  executable file |
| `timeout_ms` | number | No | default 600000 (10 min) |
| `input` | object | Yes | description of the CLI-arguments (documentation) |
| `output` | object | Yes | Where the envelope says |

### Example of `parsers/typescript/manifest.json`

```json
{
  "id": "typescript",
  "languages": ["typescript", "javascript"],
  "schema_version": "1",
  "command": ["node", "run.mjs"],
  "timeout_ms": 600000,
  "input": {
    "project_id": "uuid",
    "working_copy_root": "absolute path",
    "files": "path[] relative to WC",
    "analysis_run_id": "uuid",
    "output_path": "absolute path to write envelope JSON"
  },
  "output": {
    "envelope_path": "JSON file matching envelope-schema.json"
  }
}
```

## CLI-contracts (normative)

The orchestrator calls:

```text
<command...> \
  --project-id <uuid> \
  --working-copy-root <path> \
  --analysis-run-id <uuid> \
  --files <json-array-paths> \
  --output <envelope-output-path>
```

- **Exit code 0**  success; envelope file exists and is validated.
- **Exit code ≠ 0** — `parser_status: failed`  for  Z language; log stderr v `analysis_run`.
- The parser **MUST NOT** require the orchestrator to know the structure `model`.

## The target modules (supply)

| parser_id | The increment | The technology (orientation) |
|-----------|-----------|------------------------|
| `typescript` | C | TS Compiler API (Node) |
| `csharp` | D | Roslyn CLI (.NET) |
| `python` | E | ast / libcst (TBD in tasks) |
| `cpp` | F | libclang / tree-sitter (TBD) |

### System landscape (`009`)

| parser_id | The assignment | `languages` in the manifest |
|-----------|------------|------------------------|
| `compose` | docker-compose | `["compose"]` |
| `appsettings` | appsettings / .env | `["appsettings"]` |
| `openapi` | OpenAPI / Swagger | `["openapi"]` |
| `dotnet-project` | `.sln` / `.csproj` | `["dotnet-project"]` |
| `bus-rabbit` | RabbitMQ / MassTransit | `["bus-rabbit"]` |
| `bus-kafka` | Kafka / Confluent | `["bus-kafka"]` |

Spawn for artifacts  from `artifacts[]` language report (not from `languages[]`).
Order: compose first, then by `file_count`.

The order **start code-parseers**  from the report (`file_count`), not from the table above.
