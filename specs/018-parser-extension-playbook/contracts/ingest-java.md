# Ingest: Java symbols

**Spec**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

## Adapter

```text
parser_id: java
factory: createSymbolsModelIngestAdapter('java', 'java')
supported_schema_versions: ['1', '2']  # emit only 1 in MVP
```

Registration in `registerBuiltinIngestAdapters`. **Not** in detector,
`ARTIFACT_PARSER_IDS`.

## Parent resolve (R3)

Supplement shared `symbols-model.ingest`:

1. Current state: `parent_id` by key `path:parent_qualified_name`.
2. Fallback: if not found and exists **exactly one** node with
   `qualified_name === parent_qualified_name` — use it id
   (package `namespace` with synthetic path).

## Canon

- `metadata.layer = code`
- Without mandatory `usages` / `calls`
- Increment / delete by path — how others language adapters

## Isolation

Adapter/manifest absence → `parser_status: missing`; run of the rest
modules without failure (FR-008).
