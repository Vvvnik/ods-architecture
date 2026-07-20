# Contract: artifacts[] in Language Report (009)

**Spec**: [spec.md](../spec.md)  
**Model**: [data-model.md](../data-model.md)  
**Rules**: [detector-rules.md](./detector-rules.md)

## Appointment

Extension report of the detector (`005`) to start **system-parsers** no
mixing with `languages[]` code-layer.

## API

`GET /api/v1/projects/:projectId/analysis/language-report/latest` in the body
The response array is added `artifacts` (may be empty).

```typescript
interface ArtifactEntry {
  artifact_type: string;   // compose | appsettings | openapi | dotnet-project | bus
  file_count: number;
  sample_paths: string[];
  parser_id: string | null;
  parser_status: 'available' | 'missing' | 'failed';
}
```

## Detector behavior

1. After building `languages[]` perform artifact scan at WC.
2. For each matched `artifact_type` — one entry (aggregation file_count).
3. `parser_id` from rules or bus resolver (see research R3).
4. `parser_status` — like languages (`ParserRegistryService` + failed carryover).

## Orchestrator Behavior

1. Spawn code parsers from `languages[]` (no change of order/semantics).
2. Spawn system parsers from `artifacts[]` with the same `spawnedParserIds`.
3. Skipping while `missing` / `file_count=0` / duplicate `parser_id`.

## UI (005 modals, extension 009)

**Window 1** (`LanguagesConfirmModal`) MUST show **two lists** one
dialog (the same visual pattern as languages):

1. **Languages** — `languages[]` (no change `005`).
2. **System artifacts** — summary `artifacts[]`: **no more than one row on the
   `artifact_type`** (`compose`, `appsettings`, `openapi`, `dotnet-project`,
   `bus`).

String artifact: human-readable type `file_count`, `sample_paths[0]`, badge
`parser_status`. For `artifact_type=bus` signature profile `parser_id`
(`bus-rabbit` → "RabbitMQ", `bus-kafka` → "Kafka") — **one** line, not both.

A separate database services compose, HTTP-operations and tops **not** are listed in
The modal is only after ingest in the graph.

Trigger window 1: `languages.length > 0` **or** `artifacts.length > 0`. Toast
"there are no analyzed languages" — only if **both** arrays are empty.

Window 2 (change set) unchanged — the path of the code, without detailing system-graph.

## Elasticsearch

Add nested mapping `artifacts` in bootstrap `ods-language-reports`
(see `005/contracts/elasticsearch-indices.md` — update implement).

## Backward compatibility

- Old reports without `artifacts` → read how `[]`.
- Clients that ignore the field continue to work with `languages[]`.
