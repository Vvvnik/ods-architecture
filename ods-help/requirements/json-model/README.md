# JSON-модели ODS

> **Назначение:** обязательные шаблоны и JSON Schema для спек `008`, `009` и далее.
> **Черновик требований:** [`../008-code-graph-and-system-landscape-draft.md`](../008-code-graph-and-system-landscape-draft.md)

## Как пользоваться

| Файл | Назначение |
|------|------------|
| `*.schema.json` | **JSON Schema** — здесь описания полей в `"description": "..."` (стандарт JSON Schema; не `//` комментарии, т.к. JSON их не поддерживает) |
| `*.example.json` | Только **пример данных** для тестов/fixtures; описаний полей нет — смотри парный `.schema.json` |
| `_shared.schema.json` | Общие типы (`Location`, `ProjectId`, …) для `$ref` |

**Как читать:** открой `canonical-edge-code.schema.json` → в `properties` у каждого атрибута есть `description`.  
Парный `canonical-edge-code.example.json` — готовый документ для ES без метаданных схемы.

При `/speckit-specify` копировать или `$ref` из этой папки в `specs/*/contracts/`.

## Статус реализации

| ID | Schema | Example | Слой | Статус |
|----|--------|---------|------|--------|
| E01 | `envelope.schema.json` | `envelope.example.json` | 005 envelope | ✅ implemented |
| N01 | `native-symbols-v1.schema.json` | `native-symbols-v1.example.json` | code native | ✅ implemented |
| N02 | `native-symbols-v2.schema.json` | `native-symbols-v2.example.json` | code native | 📋 planned (008) |
| C01 | `canonical-node-code.schema.json` | `canonical-node-code.example.json` | ES канон | ✅ implemented |
| C02 | `canonical-node-system.schema.json` | `canonical-node-system.example.json` | ES канон | 📋 planned (009) |
| C03 | `canonical-edge-code.schema.json` | `canonical-edge-code.example.json` | ES канон | ✅ partial (calls — 008) |
| C04 | `canonical-edge-system.schema.json` | `canonical-edge-system.example.json` | ES канон | 📋 planned (009) |
| ES1 | `es-language-report.schema.json` | `es-language-report.example.json` | ES 005 | ✅ implemented |
| ES2 | `es-analysis-run.schema.json` | `es-analysis-run.example.json` | ES 005/006 | ✅ implemented |
| ES3 | `es-parser-envelope-storage.schema.json` | `es-parser-envelope-storage.example.json` | ES 005 | ✅ implemented |
| P01 | `native-compose.schema.json` | `native-compose.example.json` | system native | 📋 planned (009) |
| P02 | `native-appsettings.schema.json` | `native-appsettings.example.json` | system native | 📋 planned (009) |
| P03 | `native-openapi.schema.json` | `native-openapi.example.json` | system native | 📋 planned (009) |
| P04 | `native-catalog-info.schema.json` | `native-catalog-info.example.json` | system native | 📋 planned (009) |
| P05 | `native-bus-kafka.schema.json` | `native-bus-kafka.example.json` | system native | 📋 planned (009) |
| P06 | `native-bus-rabbit.schema.json` | `native-bus-rabbit.example.json` | system native | 📋 planned (009) |
| P07 | `native-dotnet-project.schema.json` | `native-dotnet-project.example.json` | system native | 📋 planned (009) |
| P08 | `native-dotnet-api-routes.schema.json` | `native-dotnet-api-routes.example.json` | system/code | 📋 planned (008/009) |

**Легенда:** ✅ implemented — в коде/ES сегодня; 📋 planned — в черновике, ждёт implement.

## Индексы Elasticsearch

| Индекс | Документы |
|--------|-----------|
| `ods-language-reports` | ES1 |
| `ods-analysis-runs` | ES2 |
| `ods-parser-envelopes` | ES3 (обёртка) + E01 + native * |
| `ods-graph-nodes` | C01 + C02 |
| `ods-graph-edges` | C03 + C04 |
| `ods-elements` | см. `specs/002-domain-model/data-model.md` |
| `ods-sync-snapshots` | см. `005` |

## Форматы стабильных id

| Сущность | Формат |
|----------|--------|
| Узел code | `{parser_id}:{path}:{kind}:{qualified_name}` |
| Ребро code | `{parser_id}:{path}:{type}:{from}:{to}` |
| Узел system | `{parser_id}:{kind}:{stable_key}` — `stable_key` = service name, topic, route path, … |
| ES `_id` узла/ребра | `{analysis_run_id}:{id}` |

## Поток данных

```text
Parser CLI → envelope (E01 + native N*/P*)
          → ods-parser-envelopes (ES3)
          → ingest → ods-graph-nodes / ods-graph-edges (C*)
```
