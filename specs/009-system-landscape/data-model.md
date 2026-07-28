# Data Model: 009-system-landscape

**Date**: 2026-07-14  
**Spec**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)

Indexes `ods-graph-*` **do not change** (the same documents, advanced enum kind/type).
New: nested `artifacts[]` in `ods-language-reports`.

## 1. Language Report (extension 005)

Document `ods-language-reports` — how `005`, plus:

| Field | Type | Description |
|------|-----|----------|
| `languages[]` | nested[] | Without changing the semantics code |
| `artifacts[]` | nested[] | **New** — system artifacts |

### ArtifactEntry

| Field | Type | Description |
|------|-----|----------|
| `artifact_type` | keyword | `compose`, `appsettings`, `openapi`, `dotnet-project`, `bus` |
| `file_count` | integer | Number of matched files |
| `sample_paths` | keyword[] | Up to 5 examples of paths |
| `parser_id` | keyword | `compose`, `appsettings`, …, `bus-rabbit` |
| `parser_status` | keyword | `available` \| `missing` \| `failed` |

Sort: `file_count` desc, `artifact_type` asc.

ES mapping: add nested `artifacts` (bootstrap additive; old documents —
`artifacts` missing = `[]`).

## 2. System NodeKind (Canon)

Extension union `NodeKind` in `backend/src/domain/graph-node.ts`:

`service` \| `dotnet_project` \| `http_endpoint` \| `external_api` \|
`message_topic` \| `message_type` \| `database` \| `broker` \| `cache` \| `storage` \| `search`

MVP extractors use a subset; the rest are groundwork schemes C02.

Scheme: [contracts/canonical-node-system.schema.json](./contracts/canonical-node-system.schema.json).

### Required fields system-of the node

How code-node (`006`) + MUST `metadata.layer = "system"`.

| Field | The rule |
|------|---------|
| `id` | `{parser_id}:{kind}:{stable_key}` |
| `language` | `infra`, `yaml`, `json`, `csharp` — source type |
| `path` | Source file WC |

## 3. System EdgeType (canon)

Extension union `EdgeType`:

`depends_on` \| `project_reference` \| `http_calls` \| `exposes` \|
`publishes` \| `consumes` \| `connects_to` \| `rpc_handles` \| `documents`

Scheme: [contracts/canonical-edge-system.schema.json](./contracts/canonical-edge-system.schema.json).

| Field | The rule |
|------|---------|
| `metadata.layer` | MUST `"system"` edge system ingest |
| `from` / `to` | id nodes Canon; cross-layer MAY in MVP (visibility `all`) |

## 4. Native models (envelope.model)

Every system `parser_id` — your native JSON (`schema_version: "1"`).

| parser_id | Schema |
|-----------|--------|
| `compose` | [native-compose.schema.json](./contracts/native-compose.schema.json) |
| `appsettings` | [native-appsettings.schema.json](./contracts/native-appsettings.schema.json) |
| `openapi` | [native-openapi.schema.json](./contracts/native-openapi.schema.json) |
| `dotnet-project` | [native-dotnet-project.schema.json](./contracts/native-dotnet-project.schema.json) |
| `bus-rabbit` | [native-bus-rabbit.schema.json](./contracts/native-bus-rabbit.schema.json) |
| `bus-kafka` | [native-bus-kafka.schema.json](./contracts/native-bus-kafka.schema.json) |

## 5. Entity relationships

```text
Sync → LanguageDetector
  ├─ languages[]  ──► orchestrator ──► code parsers ──► ingest (layer=code)
  └─ artifacts[]  ──► orchestrator ──► system parsers ──► ingest (layer=system)
                              └─► ods-parser-envelopes
                                      └─► ods-graph-nodes / ods-graph-edges
```

## 6. Incremental analysis

For artifact parsers: `affected_paths` / `deleted_paths` at glob rules
artifact type (see [contracts/detector-rules.md](./contracts/detector-rules.md)).
Delete-before-upsert per path as `006`.

## 7. UI layer filter (condition)

| Meaning | Nodes | The edges |
|----------|------|-------|
| `code` | layer absent or `code` | Both ends code |
| `system` | layer `system` | Both ends system |
| `all` | all | all |

Storage: `sessionStorage` / React state on `GraphPage` (as panel widths `007`).

## 8. State / lifecycle

Without new statuses `analysis_run`. `parser_results` includes system parser_id.
DELETE project — cascade graph nodes/edges both layers (already `006`/`005`).
