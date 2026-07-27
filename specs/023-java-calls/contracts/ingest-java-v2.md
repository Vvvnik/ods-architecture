# Ingest: Java symbols v1 + v2 (`calls`)

**Spec**: [../spec.md](../spec.md)  
**Data model**: [../data-model.md](../data-model.md)  
**Shared algorithm**: [`../../008-code-graph-depth/contracts/ingest-symbols-v2.md`](../../008-code-graph-depth/contracts/ingest-symbols-v2.md)

## Adapter

```text
parser_id: java
factory: createSymbolsModelIngestAdapter('java', 'java')
supported_schema_versions: ['1', '2']
```

Registration unchanged (`registerBuiltinIngestAdapters`). Normal parser runs
**emit** `schema_version: "2"`. Stored / fixture envelopes with `"1"` remain
valid (FR-004).

## Transform (Java)

1. `model.symbols[]` → nodes (module / namespace / type / **method**).
2. Parent resolve: keep `018` fallback (path:`parent_qn`, else unique QN).
3. `symbols[].refs[]` → edges when `isEdgeType` (unchanged).
4. When `schema_version === '2'` or `model.usages` present:
   - for each usage with `type === 'calls'`:
     - resolve `from` / `to` QNs in the current transform map;
     - if either missing or ambiguous → **skip** (not an ingest error);
     - else create edge `type: calls`, `metadata.layer: code`.
   - `injects` / other usage types: ignore for Java DoD (may appear empty).
5. All written nodes/edges: `metadata.layer = code`.

## Isolation

Missing Java module → `parser_status: missing`; other modules unaffected.

## Explicit non-mapping

| Source | Not this adapter |
|--------|------------------|
| `java-http-calls` usages / HTTP edges | Artifact HTTP ingest |
| System landscape edges | `019` / `009` adapters |

## Fixtures (backend)

| File | Purpose |
|------|---------|
| `backend/tests/fixtures/ingest/java-model-v1.json` | Regression symbols-only |
| `backend/tests/fixtures/ingest/java-model-v2.json` | Methods + `usages` `calls` → edges |
