# Canonical Edge Types — extension 008

**Spec**: [../spec.md](../spec.md)  
**Data model**: [../data-model.md](../data-model.md)

## EdgeType after 008

Values code-layer (backend `domain/graph-edge.ts` + `isEdgeType`):

| type | A source | MVP 008 |
|------|----------|---------|
| `imports` | symbols.refs / v1 | how `006` |
| `exports` | symbols.refs / v1 | how `006` |
| `inherits` | symbols.refs / v1 | how `006` |
| `implements` | symbols.refs / v1 | how `006` |
| `calls` | usages[] v2 | **MUST** extract+ingest |
| `injects` | usages[] v2 (C#) | **MUST** extract+ingest |
| `references` | — | touched; ingest MAY ignore |
| `contains` | — | as `006` (if available) |

## `injects`

- **Semantics:** class/consumer type → constructor parameter type (heuristic DI).
- **Native:** `usages[].type = "injects"` usually `from` = class qn, `to` = interface/class qn.
- **Canon:** `GraphEdge.type = "injects"` (separate type, not `references`).

## `metadata.layer`

When upsert of nodes and edges ingest symbols after turning `008`:

```json
"metadata": { "layer": "code", "...": "other keys are saved" }
```

Documents without `layer` (legacy) is valid for reading.

## Matching with schemas

- Draft `ods-help/requirements/json-model/canonical-edge-code.schema.json` —
  when implement add `injects` in enum `type` and update
  `implementation_note`.
- OpenAPI `006`/`007`: `GraphEdge.type` already `string` — changes API no
  required; if you want an example `calls`/`injects` in the description.
