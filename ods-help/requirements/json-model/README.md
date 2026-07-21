# JSON-models ODS

> **Purpose:** mandatory templates and JSON Schema for spec `008`, `009`, UI landscape, and so on.
> **Requirements drafts:** [`../020-ui-landscape-from-code-draft.md`](../020-ui-landscape-from-code-draft.md) (UI); older code/system drafts may be archived or absorbed into `specs/**`

## How to use

| File | Purpose |
|------|------------|
| `*.schema.json` | **JSON Schema** — field descriptions in `"description": "..."` (standard JSON Schema; not `//` comments, as JSON they do not support) |
| `*.example.json` | Only **sample data** for tests/fixtures; field descriptions missing — see paired `.schema.json` |
| `_shared.schema.json` | Common types (`Location`, `ProjectId`, …) for `$ref` |

**How to read:** opening contract template, `canonical-edge-code.schema.json` → in detector, `properties` each attribute has `description`.  
Pair `canonical-edge-code.example.json` — ready document for ES without schema metadata.

At `/speckit-specify` copy or `$ref` from this folder to `specs/*/contracts/`.

## Implementation status

| ID | Schema | Example | Layer | Status |
|----|--------|---------|------|--------|
| E01 | `envelope.schema.json` | `envelope.example.json` | 005 envelope | ✅ implemented |
| N01 | `native-symbols-v1.schema.json` | `native-symbols-v1.example.json` | code native | ✅ implemented |
| N02 | `native-symbols-v2.schema.json` | `native-symbols-v2.example.json` | code native | ✅ implemented (008) |
| C01 | `canonical-node-code.schema.json` | `canonical-node-code.example.json` | ES canon | ✅ implemented |
| C02 | `canonical-node-system.schema.json` | `canonical-node-system.example.json` | ES canon | ✅ implemented (009) |
| C03 | `canonical-edge-code.schema.json` | `canonical-edge-code.example.json` | ES canon | ✅ implemented (calls/injects — 008) |
| C04 | `canonical-edge-system.schema.json` | `canonical-edge-system.example.json` | ES canon | ✅ implemented (009) |
| ES1 | `es-language-report.schema.json` | `es-language-report.example.json` | ES 005 | ✅ implemented |
| ES2 | `es-analysis-run.schema.json` | `es-analysis-run.example.json` | ES 005/006 | ✅ implemented |
| ES3 | `es-parser-envelope-storage.schema.json` | `es-parser-envelope-storage.example.json` | ES 005 | ✅ implemented |
| P01 | `native-compose.schema.json` | `native-compose.example.json` | system native | ✅ implemented (009) |
| P02 | `native-appsettings.schema.json` | `native-appsettings.example.json` | system native | ✅ implemented (009) |
| P03 | `native-openapi.schema.json` | `native-openapi.example.json` | system native | ✅ implemented (009) |
| P05 | `native-bus-kafka.schema.json` | `native-bus-kafka.example.json` | system native | ✅ implemented (009, heuristics) |
| P06 | `native-bus-rabbit.schema.json` | `native-bus-rabbit.example.json` | system native | ✅ implemented (009) |
| P07 | `native-dotnet-project.schema.json` | `native-dotnet-project.example.json` | system native | ✅ implemented (009) |
| P08 | `native-dotnet-api-routes.schema.json` | `native-dotnet-api-routes.example.json` | system/code | 📋 planned (008/009) |
| U01 | `native-ui-tree.schema.json` | `native-ui-tree.example.json` | UI native | 📋 planned (`020` draft) |
| U02 | `canonical-node-ui.schema.json` | `canonical-node-ui.example.json` | ES canon UI | 📋 planned (`020` draft) |
| U03 | `canonical-edge-ui.schema.json` | `canonical-edge-ui.example.json` | ES canon UI | 📋 planned (`020` draft) |

**Legend:** ✅ implemented — at feature endES today; 📋 planned — in a draft, pending implement.

## Indexes Elasticsearch

| Index | Documents |
|--------|-----------|
| `ods-language-reports` | ES1 |
| `ods-analysis-runs` | ES2 |
| `ods-parser-envelopes` | ES3 (wrapper) + E01 + native * |
| `ods-graph-nodes` | C01 + C02 |
| `ods-graph-edges` | C03 + C04 |
| `ods-elements` | see `specs/002-domain-model/data-model.md` |
| `ods-sync-snapshots` | see `005` |

## Stable formats id

| Entity | Format |
|----------|--------|
| Node code | `{parser_id}:{path}:{kind}:{qualified_name}` |
| Edge code | `{parser_id}:{path}:{type}:{from}:{to}` |
| Node system | `{parser_id}:{kind}:{stable_key}` — `stable_key` = service name, topic, route path, … |
| ES `_id` node/edge | `{analysis_run_id}:{id}` |

## Data stream

```text
Parser CLI → envelope (E01 + native N*/P*)
          → ods-parser-envelopes (ES3)
          → ingest → ods-graph-nodes / ods-graph-edges (C*)
```
