# Data Model: 009-system-landscape

**Дата**: 2026-07-14  
**Спека**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)

Индексы `ods-graph-*` **не меняются** (те же документы, расширенные enum kind/type).
Новое: nested `artifacts[]` в `ods-language-reports`.

## 1. Language Report (расширение 005)

Документ `ods-language-reports` — как `005`, плюс:

| Поле | Тип | Описание |
|------|-----|----------|
| `languages[]` | nested[] | Без изменения семантики code |
| `artifacts[]` | nested[] | **Новое** — system артефакты |

### ArtifactEntry

| Поле | Тип | Описание |
|------|-----|----------|
| `artifact_type` | keyword | `compose`, `appsettings`, `openapi`, `dotnet-project`, `bus` |
| `file_count` | integer | Число matched файлов |
| `sample_paths` | keyword[] | До 5 примеров путей |
| `parser_id` | keyword | `compose`, `appsettings`, …, `bus-rabbit` |
| `parser_status` | keyword | `available` \| `missing` \| `failed` |

Сортировка: `file_count` desc, `artifact_type` asc.

ES mapping: добавить nested `artifacts` (bootstrap additive; старые документы —
`artifacts` отсутствует = `[]`).

## 2. System NodeKind (канон)

Расширение union `NodeKind` в `backend/src/domain/graph-node.ts`:

`service` \| `dotnet_project` \| `http_endpoint` \| `external_api` \|
`message_topic` \| `message_type` \| `database` \| `broker` \| `storage`

MVP extractors используют подмножество; остальные — задел схемы C02.

Схема: [contracts/canonical-node-system.schema.json](./contracts/canonical-node-system.schema.json).

### Обязательные поля system-узла

Как code-узел (`006`) + MUST `metadata.layer = "system"`.

| Поле | Правило |
|------|---------|
| `id` | `{parser_id}:{kind}:{stable_key}` |
| `language` | `infra`, `yaml`, `json`, `csharp` — тип источника |
| `path` | Исходный файл WC |

## 3. System EdgeType (канон)

Расширение union `EdgeType`:

`depends_on` \| `project_reference` \| `http_calls` \| `exposes` \|
`publishes` \| `consumes` \| `connects_to` \| `rpc_handles` \| `documents`

Схема: [contracts/canonical-edge-system.schema.json](./contracts/canonical-edge-system.schema.json).

| Поле | Правило |
|------|---------|
| `metadata.layer` | MUST `"system"` для рёбер system ingest |
| `from` / `to` | id узлов канона; cross-layer MAY в MVP (видимость в `all`) |

## 4. Native models (envelope.model)

Каждый system `parser_id` — свой native JSON (`schema_version: "1"`).

| parser_id | Schema |
|-----------|--------|
| `compose` | [native-compose.schema.json](./contracts/native-compose.schema.json) |
| `appsettings` | [native-appsettings.schema.json](./contracts/native-appsettings.schema.json) |
| `openapi` | [native-openapi.schema.json](./contracts/native-openapi.schema.json) |
| `dotnet-project` | [native-dotnet-project.schema.json](./contracts/native-dotnet-project.schema.json) |
| `bus-rabbit` | [native-bus-rabbit.schema.json](./contracts/native-bus-rabbit.schema.json) |
| `bus-kafka` | [native-bus-kafka.schema.json](./contracts/native-bus-kafka.schema.json) |

## 5. Связи сущностей

```text
Sync → LanguageDetector
  ├─ languages[]  ──► orchestrator ──► code parsers ──► ingest (layer=code)
  └─ artifacts[]  ──► orchestrator ──► system parsers ──► ingest (layer=system)
                              └─► ods-parser-envelopes
                                      └─► ods-graph-nodes / ods-graph-edges
```

## 6. Incremental analysis

Для artifact parsers: `affected_paths` / `deleted_paths` по glob правилам
artifact type (см. [contracts/detector-rules.md](./contracts/detector-rules.md)).
Delete-before-upsert per path как `006`.

## 7. UI layer filter (состояние)

| Значение | Узлы | Рёбра |
|----------|------|-------|
| `code` | layer absent или `code` | оба конца code |
| `system` | layer `system` | оба конца system |
| `all` | все | все |

Хранение: `sessionStorage` / React state на `GraphPage` (как panel widths `007`).

## 8. State / lifecycle

Без новых статусов `analysis_run`. `parser_results` включает system parser_id.
DELETE проекта — каскад graph nodes/edges обоих слоёв (уже `006`/`005`).
