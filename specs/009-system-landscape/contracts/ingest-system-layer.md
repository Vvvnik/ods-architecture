# Ingest: system-layer (009)

**Spec**: [spec.md](../spec.md)  
**Basic pipeline**: [006-project-graph/contracts/ingest-pipeline.md](../../006-project-graph/contracts/ingest-pipeline.md)

## Appointment

Converting envelope system-parsers to canonical nodes/edges with
`metadata.layer = system`.

## General rules

1. **Layer:** every node/edge MUST `metadata.layer = 'system'`.
2. **Id node:** `{parser_id}:{kind}:{stable_key}` — see [research.md](../research.md) R5.
3. **Id ribs:** `{parser_id}:{type}:{from}:{to}` (stable; path optional suffix with collisions).
4. **Skipping a goal:** if `to` node will not resolvida in batch — edge is not created.
5. **Indexes:** `ods-graph-nodes`, `ods-graph-edges` — how `006`.
6. **Registration:** `ingest-registry.service.ts` — by `parser_id`.

## Adapters MVP

| parser_id | Native → canon (short) |
|-----------|-------------------------|
| `compose` | `services[]` → `service`; `depends_on` → `depends_on` |
| `appsettings` | `bindings` database→`database`; broker→`broker`; cache→`cache`; storage→`storage`; search→`search` + `connects_to`; `other`/provider-only skipped; structured `*Settings` coalesce to one infra node |
| `openapi` | `operations[]` → `http_endpoint`; `documents`; `exposes` when match service |
| `dotnet-project` | projects → `dotnet_project`; refs → `project_reference` |
| `bus-rabbit` | handlers → `consumes`/`publishes` → `message_topic`/`message_type` |
| `bus-kafka` | consumers → `consumes` → `message_topic` |

The detailed fields are JSON schemas in this folder.

## Cross-parser edges (MVP)

Allowed in one `analysis_run_id` if target node id this
`IngestTransformResult` aggregate **or** created earlier in the same run ingest
service (in-memory registry per run — recommended implement).

Minimum for fixture:

- compose `service` ← appsettings `connects_to` → `database`
- compose `service` ← openapi `exposes` → `http_endpoint`

## Dual schema

System parsers MVP: only `schema_version: "1"`.

## Incremental

How `006`: delete nodes/edges by `affected_paths` / `deleted_paths` per parser
before upsert.

## Mistakes

Invalid native model → `ingest_errors[]`, run `partial`; code ingest not rolled back.
