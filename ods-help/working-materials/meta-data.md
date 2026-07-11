# Примеры метаданных в Elasticsearch

Документы, которые создаёт pipeline **005 → 006** после анализа.  
Источники: `backend/tests/fixtures/ingest/*`, `specs/006-project-graph/data-model.md`.

## Индексы

| Индекс | Кто пишет | Содержимое |
|--------|-----------|------------|
| `ods-language-reports` | 005 | Отчёт детектора языков |
| `ods-analysis-runs` | 005 (+ patch ingest от 006) | Прогон анализа |
| `ods-parser-envelopes` | 005 | Сырой JSON парсера (`model`) |
| `ods-graph-nodes` | 006 ingest | Канон — узлы |
| `ods-graph-edges` | 006 ingest | Канон — рёбра |
| `ods-elements` | 002 sync | Дерево файлов (`element_id` для узлов) |
| `ods-sync-snapshots` | 005 | Снимок путей для инкремента |

**`_id` в ES:** узлы и рёбра — `{analysis_run_id}:{id}`; envelope — UUID документа.

**Формат `id` узла:** `{parser_id}:{path}:{kind}:{qualified_name}`  
**Формат `id` ребра:** `{parser_id}:{path}:{type}:{from}:{to}`

---

## Общий envelope (все парсеры)

Парсеры TS / C# / Python / C++ пишут **symbols model v1** в поле `model`.  
В `ods-parser-envelopes` сохраняется полный envelope + `id`, `stored_at`.

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "project_id": "4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a",
  "analysis_run_id": "78664ac3-01a0-4cd2-be17-bd55ae31c8e9",
  "parser_id": "typescript",
  "schema_version": "1",
  "generated_at": "2026-07-09T21:54:10.000Z",
  "files_analyzed": ["src/main.ts", "lib/util.ts"],
  "stored_at": "2026-07-09T21:54:10.500Z",
  "model": {
    "symbols": []
  }
}
```

---

## TypeScript (`parser_id: typescript`)

### Envelope → `ods-parser-envelopes`

```json
{
  "parser_id": "typescript",
  "schema_version": "1",
  "project_id": "00000000-0000-4000-8000-000000000001",
  "analysis_run_id": "00000000-0000-4000-8000-000000000002",
  "generated_at": "2026-01-01T00:00:00.000Z",
  "files_analyzed": ["src/main.ts", "lib/util.ts"],
  "model": {
    "symbols": [
      {
        "name": "main",
        "kind": "function",
        "path": "src/main.ts",
        "qualified_name": "main",
        "location": { "start_line": 1, "start_col": 0, "end_line": 1, "end_col": 25 },
        "refs": [
          {
            "type": "imports",
            "name": "util",
            "kind": "function",
            "path": "lib/util.ts",
            "qualified_name": "util"
          }
        ]
      },
      {
        "name": "util",
        "kind": "function",
        "path": "lib/util.ts",
        "qualified_name": "util",
        "location": { "start_line": 1, "start_col": 0, "end_line": 1, "end_col": 25 }
      }
    ]
  }
}
```

### Канон → `ods-graph-nodes`

```json
[
  {
    "_id": "00000000-0000-4000-8000-000000000002:typescript:src/main.ts:function:main",
    "id": "typescript:src/main.ts:function:main",
    "project_id": "00000000-0000-4000-8000-000000000001",
    "analysis_run_id": "00000000-0000-4000-8000-000000000002",
    "parser_id": "typescript",
    "kind": "function",
    "name": "main",
    "qualified_name": "main",
    "language": "typescript",
    "path": "src/main.ts",
    "location": { "start_line": 1, "start_col": 0, "end_line": 1, "end_col": 25 },
    "element_id": "5409ae4c-fd30-4542-8e94-7633657ec377",
    "parent_id": null,
    "signature": null,
    "metadata": null,
    "ingested_at": "2026-01-01T00:00:02.000Z"
  },
  {
    "_id": "00000000-0000-4000-8000-000000000002:typescript:lib/util.ts:function:util",
    "id": "typescript:lib/util.ts:function:util",
    "project_id": "00000000-0000-4000-8000-000000000001",
    "analysis_run_id": "00000000-0000-4000-8000-000000000002",
    "parser_id": "typescript",
    "kind": "function",
    "name": "util",
    "qualified_name": "util",
    "language": "typescript",
    "path": "lib/util.ts",
    "location": { "start_line": 1, "start_col": 0, "end_line": 1, "end_col": 25 },
    "element_id": null,
    "parent_id": null,
    "signature": null,
    "metadata": null,
    "ingested_at": "2026-01-01T00:00:02.000Z"
  }
]
```

### Канон → `ods-graph-edges`

```json
[
  {
    "_id": "00000000-0000-4000-8000-000000000002:typescript:src/main.ts:imports:typescript:src/main.ts:function:main:typescript:lib/util.ts:function:util",
    "id": "typescript:src/main.ts:imports:typescript:src/main.ts:function:main:typescript:lib/util.ts:function:util",
    "project_id": "00000000-0000-4000-8000-000000000001",
    "analysis_run_id": "00000000-0000-4000-8000-000000000002",
    "parser_id": "typescript",
    "language": "typescript",
    "from": "typescript:src/main.ts:function:main",
    "to": "typescript:lib/util.ts:function:util",
    "type": "imports",
    "path": "src/main.ts",
    "location": null,
    "metadata": null,
    "ingested_at": "2026-01-01T00:00:02.000Z"
  }
]
```

---

## C# (`parser_id: csharp`)

### Envelope → `ods-parser-envelopes`

```json
{
  "parser_id": "csharp",
  "schema_version": "1",
  "project_id": "4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a",
  "analysis_run_id": "87f7066a-6f9d-4d3f-bedd-b212cbeb3563",
  "generated_at": "2026-07-09T19:43:24.000Z",
  "files_analyzed": ["Program.cs", "WeatherForecast.cs", "Controllers/WeatherForecastController.cs"],
  "model": {
    "symbols": [
      {
        "name": "WebApplication1",
        "kind": "namespace",
        "path": "WeatherForecast.cs",
        "qualified_name": "WebApplication1",
        "location": { "start_line": 1, "start_col": 0, "end_line": 13, "end_col": 1 }
      },
      {
        "name": "WeatherForecast",
        "kind": "class",
        "path": "WeatherForecast.cs",
        "qualified_name": "WebApplication1.WeatherForecast",
        "parent_qualified_name": "WebApplication1",
        "location": { "start_line": 3, "start_col": 4, "end_line": 12, "end_col": 5 }
      },
      {
        "name": "WeatherForecastController",
        "kind": "class",
        "path": "Controllers/WeatherForecastController.cs",
        "qualified_name": "WebApplication1.Controllers.WeatherForecastController",
        "parent_qualified_name": "WebApplication1.Controllers",
        "location": { "start_line": 5, "start_col": 4, "end_line": 32, "end_col": 5 },
        "refs": [
          {
            "type": "inherits",
            "name": "ControllerBase",
            "kind": "class",
            "qualified_name": "ControllerBase"
          },
          {
            "type": "imports",
            "name": "Mvc",
            "kind": "namespace",
            "qualified_name": "Microsoft.AspNetCore.Mvc"
          }
        ]
      }
    ]
  }
}
```

### Канон → `ods-graph-nodes` (фрагмент)

```json
[
  {
    "_id": "87f7066a-6f9d-4d3f-bedd-b212cbeb3563:csharp:WeatherForecast.cs:class:WebApplication1.WeatherForecast",
    "id": "csharp:WeatherForecast.cs:class:WebApplication1.WeatherForecast",
    "project_id": "4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a",
    "analysis_run_id": "87f7066a-6f9d-4d3f-bedd-b212cbeb3563",
    "parser_id": "csharp",
    "kind": "class",
    "name": "WeatherForecast",
    "qualified_name": "WebApplication1.WeatherForecast",
    "language": "csharp",
    "path": "WeatherForecast.cs",
    "location": { "start_line": 3, "start_col": 4, "end_line": 12, "end_col": 5 },
    "element_id": "dc836126-3899-45c5-833f-ffbf5f264d1f",
    "parent_id": "csharp:WeatherForecast.cs:namespace:WebApplication1",
    "signature": null,
    "metadata": { "parent_qualified_name": "WebApplication1" },
    "ingested_at": "2026-07-09T19:43:25.000Z"
  },
  {
    "_id": "87f7066a-6f9d-4d3f-bedd-b212cbeb3563:csharp:Controllers/WeatherForecastController.cs:class:WebApplication1.Controllers.WeatherForecastController",
    "id": "csharp:Controllers/WeatherForecastController.cs:class:WebApplication1.Controllers.WeatherForecastController",
    "project_id": "4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a",
    "analysis_run_id": "87f7066a-6f9d-4d3f-bedd-b212cbeb3563",
    "parser_id": "csharp",
    "kind": "class",
    "name": "WeatherForecastController",
    "qualified_name": "WebApplication1.Controllers.WeatherForecastController",
    "language": "csharp",
    "path": "Controllers/WeatherForecastController.cs",
    "location": { "start_line": 5, "start_col": 4, "end_line": 32, "end_col": 5 },
    "element_id": null,
    "parent_id": null,
    "signature": null,
    "metadata": { "parent_qualified_name": "WebApplication1.Controllers" },
    "ingested_at": "2026-07-09T19:43:25.000Z"
  }
]
```

### Канон → `ods-graph-edges` (фрагмент)

```json
[
  {
    "_id": "87f7066a-6f9d-4d3f-bedd-b212cbeb3563:csharp:Controllers/WeatherForecastController.cs:inherits:csharp:Controllers/WeatherForecastController.cs:class:WebApplication1.Controllers.WeatherForecastController:csharp:Controllers/WeatherForecastController.cs:class:ControllerBase",
    "id": "csharp:Controllers/WeatherForecastController.cs:inherits:csharp:Controllers/WeatherForecastController.cs:class:WebApplication1.Controllers.WeatherForecastController:csharp:Controllers/WeatherForecastController.cs:class:ControllerBase",
    "project_id": "4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a",
    "analysis_run_id": "87f7066a-6f9d-4d3f-bedd-b212cbeb3563",
    "parser_id": "csharp",
    "language": "csharp",
    "from": "csharp:Controllers/WeatherForecastController.cs:class:WebApplication1.Controllers.WeatherForecastController",
    "to": "csharp:Controllers/WeatherForecastController.cs:class:ControllerBase",
    "type": "inherits",
    "path": "Controllers/WeatherForecastController.cs",
    "location": null,
    "metadata": null,
    "ingested_at": "2026-07-09T19:43:25.000Z"
  },
  {
    "_id": "87f7066a-6f9d-4d3f-bedd-b212cbeb3563:csharp:Controllers/WeatherForecastController.cs:imports:csharp:Controllers/WeatherForecastController.cs:class:WebApplication1.Controllers.WeatherForecastController:csharp:Controllers/WeatherForecastController.cs:namespace:Microsoft.AspNetCore.Mvc",
    "id": "csharp:Controllers/WeatherForecastController.cs:imports:csharp:Controllers/WeatherForecastController.cs:class:WebApplication1.Controllers.WeatherForecastController:csharp:Controllers/WeatherForecastController.cs:namespace:Microsoft.AspNetCore.Mvc",
    "project_id": "4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a",
    "analysis_run_id": "87f7066a-6f9d-4d3f-bedd-b212cbeb3563",
    "parser_id": "csharp",
    "language": "csharp",
    "from": "csharp:Controllers/WeatherForecastController.cs:class:WebApplication1.Controllers.WeatherForecastController",
    "to": "csharp:Controllers/WeatherForecastController.cs:namespace:Microsoft.AspNetCore.Mvc",
    "type": "imports",
    "path": "Controllers/WeatherForecastController.cs",
    "location": null,
    "metadata": null,
    "ingested_at": "2026-07-09T19:43:25.000Z"
  }
]
```

---

## Python (`parser_id: python`)

### Envelope → `ods-parser-envelopes`

```json
{
  "parser_id": "python",
  "schema_version": "1",
  "project_id": "4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a",
  "analysis_run_id": "78664ac3-01a0-4cd2-be17-bd55ae31c8e9",
  "generated_at": "2026-07-09T21:54:10.000Z",
  "files_analyzed": ["my-test.py"],
  "model": {
    "symbols": [
      {
        "name": "my-test.py",
        "kind": "module",
        "path": "my-test.py",
        "qualified_name": "my-test",
        "location": { "start_line": 1, "start_col": 0, "end_line": 1, "end_col": 0 }
      }
    ]
  }
}
```

### Канон → `ods-graph-nodes`

```json
[
  {
    "_id": "78664ac3-01a0-4cd2-be17-bd55ae31c8e9:python:my-test.py:module:my-test",
    "id": "python:my-test.py:module:my-test",
    "project_id": "4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a",
    "analysis_run_id": "78664ac3-01a0-4cd2-be17-bd55ae31c8e9",
    "parser_id": "python",
    "kind": "module",
    "name": "my-test.py",
    "qualified_name": "my-test",
    "language": "python",
    "path": "my-test.py",
    "location": { "start_line": 1, "start_col": 0, "end_line": 1, "end_col": 0 },
    "element_id": "6f41e288-2165-4b01-a174-8e52fbf30ae2",
    "parent_id": null,
    "signature": null,
    "metadata": null,
    "ingested_at": "2026-07-09T21:54:10.914Z"
  }
]
```

### Канон → `ods-graph-edges`

```json
[]
```

*(для одного модуля без `refs` рёбер нет)*

**Пример с refs** (файл `app.py`):

```json
{
  "parser_id": "python",
  "schema_version": "1",
  "project_id": "00000000-0000-4000-8000-000000000001",
  "analysis_run_id": "00000000-0000-4000-8000-000000000002",
  "generated_at": "2026-01-01T00:00:00.000Z",
  "files_analyzed": ["app.py"],
  "model": {
    "symbols": [
      {
        "name": "app.py",
        "kind": "module",
        "path": "app.py",
        "qualified_name": "app",
        "location": { "start_line": 1, "start_col": 0, "end_line": 10, "end_col": 0 }
      },
      {
        "name": "main",
        "kind": "function",
        "path": "app.py",
        "qualified_name": "app.main",
        "parent_qualified_name": "app",
        "signature": "()",
        "location": { "start_line": 4, "start_col": 0, "end_line": 8, "end_col": 0 },
        "refs": [
          {
            "type": "imports",
            "name": "os",
            "kind": "module",
            "qualified_name": "os"
          }
        ]
      }
    ]
  }
}
```

---

## C++ (`parser_id: cpp`)

### Envelope → `ods-parser-envelopes`

```json
{
  "parser_id": "cpp",
  "schema_version": "1",
  "project_id": "00000000-0000-4000-8000-000000000001",
  "analysis_run_id": "00000000-0000-4000-8000-000000000002",
  "generated_at": "2026-01-01T00:00:00.000Z",
  "files_analyzed": ["src/main.cpp"],
  "model": {
    "symbols": [
      {
        "name": "main.cpp",
        "kind": "module",
        "path": "src/main.cpp",
        "qualified_name": "src/main.cpp",
        "location": { "start_line": 1, "start_col": 0, "end_line": 12, "end_col": 0 }
      },
      {
        "name": "main",
        "kind": "function",
        "path": "src/main.cpp",
        "qualified_name": "main",
        "signature": "()",
        "location": { "start_line": 3, "start_col": 0, "end_line": 6, "end_col": 1 },
        "refs": [
          {
            "type": "imports",
            "name": "iostream",
            "kind": "namespace",
            "qualified_name": "std"
          }
        ]
      }
    ]
  }
}
```

### Канон → `ods-graph-nodes`

```json
[
  {
    "_id": "00000000-0000-4000-8000-000000000002:cpp:src/main.cpp:module:src/main.cpp",
    "id": "cpp:src/main.cpp:module:src/main.cpp",
    "project_id": "00000000-0000-4000-8000-000000000001",
    "analysis_run_id": "00000000-0000-4000-8000-000000000002",
    "parser_id": "cpp",
    "kind": "module",
    "name": "main.cpp",
    "qualified_name": "src/main.cpp",
    "language": "cpp",
    "path": "src/main.cpp",
    "location": { "start_line": 1, "start_col": 0, "end_line": 12, "end_col": 0 },
    "element_id": null,
    "parent_id": null,
    "signature": null,
    "metadata": null,
    "ingested_at": "2026-01-01T00:00:02.000Z"
  },
  {
    "_id": "00000000-0000-4000-8000-000000000002:cpp:src/main.cpp:function:main",
    "id": "cpp:src/main.cpp:function:main",
    "project_id": "00000000-0000-4000-8000-000000000001",
    "analysis_run_id": "00000000-0000-4000-8000-000000000002",
    "parser_id": "cpp",
    "kind": "function",
    "name": "main",
    "qualified_name": "main",
    "language": "cpp",
    "path": "src/main.cpp",
    "location": { "start_line": 3, "start_col": 0, "end_line": 6, "end_col": 1 },
    "element_id": null,
    "parent_id": null,
    "signature": "()",
    "metadata": null,
    "ingested_at": "2026-01-01T00:00:02.000Z"
  }
]
```

### Канон → `ods-graph-edges`

```json
[
  {
    "_id": "00000000-0000-4000-8000-000000000002:cpp:src/main.cpp:imports:cpp:src/main.cpp:function:main:cpp:src/main.cpp:namespace:std",
    "id": "cpp:src/main.cpp:imports:cpp:src/main.cpp:function:main:cpp:src/main.cpp:namespace:std",
    "project_id": "00000000-0000-4000-8000-000000000001",
    "analysis_run_id": "00000000-0000-4000-8000-000000000002",
    "parser_id": "cpp",
    "language": "cpp",
    "from": "cpp:src/main.cpp:function:main",
    "to": "cpp:src/main.cpp:namespace:std",
    "type": "imports",
    "path": "src/main.cpp",
    "location": null,
    "metadata": null,
    "ingested_at": "2026-01-01T00:00:02.000Z"
  }
]
```

---

## Сопутствующие документы (005 / 002)

### `ods-language-reports`

```json
{
  "id": "08d0bcfe-6759-461e-b908-ae477fbdd18e",
  "project_id": "4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a",
  "detected_at": "2026-07-09T21:54:06.000Z",
  "sync_id": "2026-07-09T21:54:00.000Z",
  "languages": [
    {
      "language": "csharp",
      "file_count": 8,
      "sample_paths": ["Program.cs", "WeatherForecast.cs"],
      "parser_id": "csharp",
      "parser_status": "available"
    },
    {
      "language": "python",
      "file_count": 1,
      "sample_paths": ["my-test.py"],
      "parser_id": "python",
      "parser_status": "available"
    }
  ]
}
```

### `ods-analysis-runs`

```json
{
  "id": "78664ac3-01a0-4cd2-be17-bd55ae31c8e9",
  "project_id": "4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a",
  "language_report_id": "08d0bcfe-6759-461e-b908-ae477fbdd18e",
  "status": "success",
  "started_at": "2026-07-09T21:54:06.815Z",
  "completed_at": "2026-07-09T21:54:09.903Z",
  "incremental": true,
  "change_set": {
    "project_id": "4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a",
    "incremental": true,
    "added": ["my-test.py"],
    "modified": [],
    "deleted": []
  },
  "parser_results": [
    { "parser_id": "csharp", "status": "skipped", "error_message": null },
    { "parser_id": "python", "status": "success", "error_message": null }
  ],
  "last_error_message": null,
  "ingest_status": "success",
  "ingest_completed_at": "2026-07-09T21:54:10.914Z",
  "ingest_errors": []
}
```

### `ods-elements` (lookup для `element_id`)

```json
{
  "id": "6f41e288-2165-4b01-a174-8e52fbf30ae2",
  "project_id": "4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a",
  "path": "my-test.py",
  "parent_path": "",
  "type": "file",
  "status": "auto_found",
  "is_active": true,
  "status_manually_set": false
}
```

### `ods-sync-snapshots`

```json
{
  "project_id": "4fb02eb0-ac26-4b95-958e-92a1dbcdcf4a",
  "analysis_run_id": "78664ac3-01a0-4cd2-be17-bd55ae31c8e9",
  "captured_at": "2026-07-09T21:54:10.914Z",
  "paths": [
    "Program.cs",
    "WeatherForecast.cs",
    "Controllers/WeatherForecastController.cs",
    "my-test.py"
  ]
}
```

---

## Native `model` v1 (общая схема всех парсеров)

```json
{
  "symbols": [
    {
      "name": "string",
      "kind": "class | function | method | namespace | module | interface | ...",
      "path": "posix/path/to/file",
      "qualified_name": "string",
      "parent_qualified_name": "string (optional)",
      "signature": "string (optional)",
      "location": {
        "start_line": 1,
        "start_col": 0,
        "end_line": 10,
        "end_col": 0
      },
      "refs": [
        {
          "type": "imports | inherits | implements | calls | references | exports | contains",
          "name": "string",
          "kind": "string (optional)",
          "path": "string (optional, target file)",
          "qualified_name": "string (optional)",
          "location": { "start_line": 0, "start_col": 0, "end_line": 0, "end_col": 0 }
        }
      ]
    }
  ]
}
```

Фикстуры в репозитории: `backend/tests/fixtures/ingest/*-model-v1.json`, `envelope-typescript-v1.json`.
