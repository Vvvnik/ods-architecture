# The contract for ingest pipeline (006)

**Spec**: [spec.md]
**Input**: [005 envelope-schema.json](../../005-code-analysis/contracts/envelope-schema.json)
**Exit**: [canonical-schemas.json](./canonical-schemas.json) → [elasticsearch-indices.md](./elasticsearch-indices.md)

## The assignment

Converting the ** one** preserved parser envelope (`005`) into canonical
Nodes and edges (`006`). orchestrator `005` **does not** clears the field `model`.

## Trigger

```text
analysis-orchestrator (005) saved the document in ods-parser-envelopes
  → IngestService.ingestEnvelope({ envelopeId | envelope })
  → adapter by parser_id
  → bulk upsert ods-graph-nodes / ods-graph-edges
  → patch ods-analysis-runs.ingest_*
```

**Synchrony (pilot):** ingest in the same backend process, await after each
envelope; when the adapter is wrong  `ingest_errors[]`, the drive is `partial`.

## The interface of the adapter

```typescript
interface IngestContext {
  project_id: string;
  analysis_run_id: string;
  parser_id: string;
  schema_version: string;
  files_analyzed: string[];
  incremental: boolean;
  affected_paths: string[]; // for delete-before-upsert
  deleted_paths: string[]; // only delete
}

interface IngestAdapter {
  readonly parser_id: string;
  readonly supported_schema_versions: string[];
  transform(model: unknown, ctx: IngestContext): {
    nodes: GraphNodeInput[];
    edges: GraphEdgeInput[];
  };
}
```

Registration: `backend/src/services/ingest/ingest-registry.service.ts`  analogue
`ParserRegistryService` in `005`.

## Algorithm `IngestService.ingestEnvelope`

```text
1. Download the envelope (parser_id, schema_version, model, files_analyzed, ...)
2. Find the adapter; if not → ingest_errors, return (do not throw)
3. If schema_version is not supported → ingest_errors, return
4. Build IngestContext (affected_paths / deleted_paths from analysis_run.change_set)
5. INCREMENT / paths:
   a. delete_by_query edges: project_id + analysis_run_id + parser_id + path ∈ affected ∪ deleted
   b. delete_by_query nodes:  The same filters
   c. for deleted_paths  skip transform (only delete)
6. adapter.transform(model, ctx) → nodes[], edges[]
7. Resolve element_id: lookup ods-elements (project_id, path) for each unique path
8. Bulk index nodes (_id = analysis_run_id + ':' + node.id)
9. Bulk index edges (_id = analysis_run_id + ':' + edge.id)
10. Updating ingest_status to analysis_run (partial if there were errors in the adapters earlier)
```

## Order for multiple envelope of one run

The orchestrator `005` calls in the ingest **after each** successful module, in order
The adapters **no** are rewritten by a stranger `parser_id`.

## Contract native `model` (per adapter)

Each adapter documents the expected structure `model` for `schema_version`
In `backend/src/services/ingest/adapters/<parser_id>.ingest.ts` (commentary + fixture JSON in tests).

| parser_id | schema_version | Minimum entities in the model |
|-----------|----------------|------------------------------|
| `typescript` | `1` \| `2` | symbols (+ `usages[]` with `calls` at v2, stage `008`) |
| `csharp` | `1` \| `2` | symbols (+ `usages[]` with `calls`/`injects` at v2, `008`) |
| `python` | `1` | symbols: name, kind, path, location, refs[] (ast/libcst); ingest takes and `2` |
| `cpp` | `1` | symbols: name, kind, path, location, refs[] (libclang/tree-sitter); ingest takes and `2` |
| `compose` | `1` | services[], depends_on; `metadata.layer=system` (`009`) |
| `appsettings` | `1` | bindings database/broker → `database`/`broker` + `connects_to` (`009`) |
| `openapi` | `1` | specs[], endpoints → `http_endpoint`, `documents`, `exposes` (`009`) |
| `dotnet-project` | `1` | projects[], references → `dotnet_project`, `project_reference` (`009`) |
| `bus-rabbit` | `1` | handlers[] → `message_type`/`message_topic`, `consumes`/`publishes` (`009`) |
| `bus-kafka` | `1` | handlers[], publish_sites[] → Kafka bus edges (`009`, MVP stub/heuristics) |

Shared factory: `backend/src/services/ingest/adapters/symbols-model.ingest.ts`.
System layer helper: `backend/src/services/ingest/system-layer.ts` (`withSystemLayer`, stable ids).

The public API/UI **no** only exhibits `model`  canon.

## What happened ?

| The situation | The behavior |
|----------|-----------|
| No adapter . | `ingest_errors += { parser_id, message }`; continue |
| transform throw | log + `ingest_errors`; continue |
| ES bulk partial failure | retry 1x; otherwise `ingest_status=failed` |
| DELETE of project in progress | skip ingest, log warning |

Messages to the user  Russian (via API graph / run status).

## Hook in `005` (point of integration)

The file is `backend/src/services/analysis-orchestrator.service.ts`

```text
after saveParserEnvelope(envelope):
  await ingestService.ingestEnvelope(envelope.id)
```

`IngestService` is injected into the orchestrator; the module `006` does not change the contract envelope.

## Not included

- Starting of the parser, detector, UX model (`005`)
- Published raw `model` through REST

## Testing

- Unit: fixture `model` → expected nodes/edges (typescript v1)
- Integration: envelope doc in ES → ingest → assert `ods-graph-nodes` count
- Contract: the output corresponds to `canonical-schemas.json`
