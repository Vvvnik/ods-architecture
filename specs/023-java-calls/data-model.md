# Data Model: 023-java-calls

**Date**: 2026-07-27  
**Spec**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)

Elasticsearch indexes and project/`005` run lifecycle **do not change**.
This feature extends **Java** native emit to the shared symbols **v2** model
already defined in `008`.

## 1. Native Symbols Model v2 (Java envelope.model)

Envelope: `parser_id = java`, `schema_version = "2"`.

| Field | Mandatory | Description |
|-------|-----------|-------------|
| `symbols[]` | MUST | v1 Java symbols **plus** `kind: method` for all methods on top-level production types |
| `usages[]` | MAY (empty OK) | DoD: `type: "calls"` only |

Schema (canonical):  
[`../008-code-graph-depth/contracts/native-symbols-v2.schema.json`](../008-code-graph-depth/contracts/native-symbols-v2.schema.json)

### Symbol kinds (Java DoD)

| Kind | Rule |
|------|------|
| `module` | One per parsed `.java` file (`018`) |
| `namespace` | Package FQN (`018`) |
| `class` / `interface` / `enum` | Top-level only (`018`) |
| `method` | **New DoD:** every method on those top-level types (any visibility); not constructors |

### Usage (`usages[]` element)

| Field | Mandatory | Description |
|-------|-----------|-------------|
| `from` | MUST | Caller method `qualified_name` in same `symbols[]` |
| `to` | MUST | Callee method `qualified_name` in same `symbols[]` |
| `type` | MUST | `"calls"` for DoD |
| `path` | SHOULD | Production file of the call site |
| `location` | MAY | Position in `path` |

### Validation (Java)

- Emit usage only when both ends resolve uniquely in-project (FR-006).
- Interface/abstract static receiver → `to` is the interface/abstract method
  symbol QN (FR-014); never a concrete implementing method QN chosen by heuristic.
- No usage rows for test-only sites under `**/src/test/**` (FR-003).
- v1 envelopes (symbols only, no usages) remain valid for ingest.

## 2. Canonical GraphEdge

No new edge types. Mapping:

| Native | Canon `type` | `metadata.layer` |
|--------|--------------|------------------|
| usage `calls` | `calls` | `code` |

Id / indexes: same as `006`/`008`
(`{parser_id}:{path}:{type}:{from}:{to}` via existing `buildEdgeId`).

## 3. Canonical GraphNode

| Change | Rule |
|--------|------|
| Method nodes | New nodes from `kind: method` symbols |
| `metadata.layer` | MUST `"code"` on upsert from this ingest path |
| Parentage | Method `parent_qualified_name` → owning type; ingest parent resolve as `018` (path key + unique QN fallback) |

## 4. Entity relationships

```text
Envelope (java, schema_version 1|2)
  └─ model.symbols[]  ──ingest──► GraphNode (module|namespace|type|method)
  └─ model.symbols[].refs[] ──► GraphEdge (imports/implements/… if present)
  └─ model.usages[] (v2 calls) ──► GraphEdge (calls, layer=code)
```

## 5. Lifecycle

Incremental re-analysis: replace nodes/edges for changed file `path` including
`calls` with that path (same policy as `008` / `006`). Full re-run: stable ids.

## 6. Outside this feature’s model

- Java `injects` / `creates` / `references` fill
- HTTP / system edges (`http_calls`, `exposes`, …)
- Nested type method symbols
