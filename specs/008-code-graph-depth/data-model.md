# Data Model: 008-code-graph-depth

**Date**: 2026-07-14  
**Spec**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)

Indexes ES and nature of the project/`005` **do not change**. Below are extensions
native model and canonical edges.

## 1. Native Symbols Model v2 (envelope.model)

Version envelope: `schema_version = "2"` (parsers typescript / csharp).

| Field | Mandatory | Description |
|------|----------------|----------|
| `symbols[]` | MUST | How v1: name, kind, path, qualified_name, parent_*, signature, location, refs (imports/...) |
| `usages[]` | MAY (empty/absent = no semantics) | Semantic MVP: `calls`, `injects` |

### Usage (element `usages[]`)

| Field | Mandatory | Description |
|------|----------------|----------|
| `from` | MUST | `qualified_name` symbol of the source in the same `symbols[]` |
| `to` | MUST | `qualified_name` character goals in the same `symbols[]` |
| `type` | MUST | MVP: `calls` \| `injects`; other enum-value of the scheme — touched without extract |
| `path` | SHOULD | The file where ⟪usage is recorded |
| `location` | MAY | Position in `path` |
| `metadata` | MAY | Eg. `parameter`, `constructor: true` for DI |

Scheme: [contracts/native-symbols-v2.schema.json](./contracts/native-symbols-v2.schema.json).

### Validation

- `type` ∈ valid enum scheme; ingest MVP only handles `calls` and
  `injects` (ignores the rest without error).
- Mixed/unresolved challenge **not** gets into `usages` (parser).
- v1 model: only `symbols` — valid for ingest.

## 2. Canonical GraphEdge (extension)

Document `ods-graph-edges` — how `006`, plus:

| Change | The rule |
|-----------|---------|
| `type` | Valid values `006` **and** **`injects`** |
| `metadata.layer` | When writing ingest after `008`: MUST `"code"` |
| id | `{parser_id}:{path}:{type}:{from}:{to}` — how `006` / json-model |

Mapping: usage → edge, see [contracts/ingest-symbols-v2.md](./contracts/ingest-symbols-v2.md).

### EdgeType (full list after 008)

`imports` \| `exports` \| `calls` \| `inherits` \| `implements` \| `references` \|
`contains` \| **`injects`**

## 3. Canonical GraphNode (layer)

Without shift kind/id. When upsert ingest symbols after `008`:

| Field | The rule |
|------|---------|
| `metadata.layer` | MUST `"code"` (merge with existing keys metadata) |

Legacy no `layer` — read as code-layer by default in the future UI; migration
is required.

## 4. Entity relationships

```text
Envelope (005, schema_version 1|2)
  └─ model.symbols[]  ──ingest──► GraphNode (ods-graph-nodes)
  └─ model.symbols[].refs[] ──► GraphEdge (imports/…)
  └─ model.usages[] (v2) ──► GraphEdge (calls|injects)
```

## 5. State / lifecycle

Without new run states. Increment `006`: the ribs of the file (including calls/
injects with `path`) are deleted/overwritten with the nodes file.

## 6. Outside the model MVP

- Filling `creates` / `references` / `reads` / `writes`
- System kinds (`009`)
- Python/C++ v2
