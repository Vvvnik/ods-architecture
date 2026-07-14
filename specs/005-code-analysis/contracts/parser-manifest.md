# Манифест парсер-модуля

**Спека**: [spec.md](../spec.md) | **Envelope**: [envelope-schema.json](./envelope-schema.json)

## Расположение

```text
parsers/
  <parser_id>/
    manifest.json
    run.mjs | run.sh | …
    README.md
```

## manifest.json

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `id` | string | да | `typescript`, `csharp`, `python`, `cpp` |
| `languages` | string[] | да | языки детектора, которые обслуживает модуль |
| `schema_version` | string | да | версия native `model` |
| `command` | string[] | да | argv для spawn; первый элемент — исполняемый файл |
| `timeout_ms` | number | нет | default 600000 (10 min) |
| `input` | object | да | описание CLI-аргументов (документация) |
| `output` | object | да | куда пишется envelope |

### Пример `parsers/typescript/manifest.json`

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

## CLI-контракт (нормативный)

Оркестратор вызывает:

```text
<command...> \
  --project-id <uuid> \
  --working-copy-root <path> \
  --analysis-run-id <uuid> \
  --files <json-array-paths> \
  --output <envelope-output-path>
```

- **Exit code 0** — успех; envelope файл существует и проходит валидацию обёртки.
- **Exit code ≠ 0** — `parser_status: failed` для языка; лог stderr в `analysis_run`.
- Парсер **MUST NOT** требовать от оркестратора знания структуры `model`.

## Целевые модули (поставка)

| parser_id | Инкремент | Технология (ориентир) |
|-----------|-----------|------------------------|
| `typescript` | C | TS Compiler API (Node) |
| `csharp` | D | Roslyn CLI (.NET) |
| `python` | E | ast / libcst (TBD в tasks) |
| `cpp` | F | libclang / tree-sitter (TBD) |

### System landscape (`009`)

| parser_id | Назначение | `languages` в manifest |
|-----------|------------|------------------------|
| `compose` | docker-compose | `["compose"]` |
| `appsettings` | appsettings / .env | `["appsettings"]` |
| `openapi` | OpenAPI / Swagger | `["openapi"]` |
| `dotnet-project` | `.sln` / `.csproj` | `["dotnet-project"]` |
| `bus-rabbit` | RabbitMQ / MassTransit | `["bus-rabbit"]` |
| `bus-kafka` | Kafka / Confluent | `["bus-kafka"]` |

Spawn для артефактов — из `artifacts[]` language report (не из `languages[]`).
Порядок: compose первым, затем по `file_count`.

Порядок **запуска code-парсеров** — из отчёта (`file_count`), не из таблицы выше.
