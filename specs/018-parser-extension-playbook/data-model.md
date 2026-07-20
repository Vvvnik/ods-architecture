# Data Model: 018-parser-extension-playbook

**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Canon remains in ES `ods-graph-nodes` / `ods-graph-edges`. New indexes and
NodeType/EdgeType **none**.

## Entities (canon code)

### File (`kind: module`, `metadata.layer: code`) — MUST

How typescript / python / csharp / cpp: **one `module` on each**
parsed `.java`.

| Field | Rule |
|------|---------|
| `name` | basename file |
| `qualified_name` | relative path WC (as csharp) |
| `path` | same path `.java` |
| `language` / `parser_id` | `java` |

### Package (`kind: namespace`, `metadata.layer: code`) — MUST

Same role as a **csharp namespace**. DoD uniqueness: **one node per FQN**
(do not duplicate copies per file; csharp sometimes duplicates — we do not)

| Field | Rule |
|------|---------|
| `id` | stable from parser_id + path + kind + qualified_name |
| `name` | last segment FQN |
| `qualified_name` | FQN package |
| `path` | synthetic `java-package/<FQN-with-slashes>` |
| `language` / `parser_id` | `java` |

### Type (`kind: class` \| `interface` \| `enum`) — MUST (top-level)

| Field | Rule |
|------|---------|
| `name` | simple type name |
| `qualified_name` | `FQNpackage.Type` or `Type` (default package) |
| `path` | path `.java` (same as module file) |
| `parent_qualified_name` | FQN package (`namespace`) |
| `language` / `parser_id` | `java` |

Only **top-level**. Nested / anonymous / local — do not emit.

## Relationships

| type | from → to | When |
|------|-----------|--------|
| parent_id / hierarchy UI | package → type | via parent resolve (R3) |
| `contains` | MAY via refs | not required if parent_id set |

Ribs `calls` / `injects` — **not** in detector, DoD `018`.

## Native envelope

See [contracts/native-java-symbols.schema.json](./contracts/native-java-symbols.schema.json).

Logic:

```text
symbols[]:
  { kind: module, path: …/Foo.java, qualified_name: …/Foo.java }
  { kind: namespace, qualified_name: FQN, path: java-package/... }
  { kind: class|interface|enum, path: …/Foo.java,
    qualified_name, parent_qualified_name?: FQN }
```

`files_analyzed` in detector, envelope — only actually parsed main-paths.

## Validation

- Path type MUST match `**/src/main/java/**` (after filter CLI).
- Do not emit nested/local/anonymous.
- Default package: type without parent; namespace MAY omit.
- Idempotent upsert by id within `analysis_run_id`.
- Single file error — skip/log; do not fail the entire CLI (best-effort, exit 0
  on partial success—as is standard elsewhere modules; else failed only
  at total crash).

## Detector

Wrappers — [contracts/detector-java-wrappers.md](./contracts/detector-java-wrappers.md).
Language `java` already in EXTENSION_LANGUAGE_MAP (`.java`).

## Ingest

[contracts/ingest-java.md](./contracts/ingest-java.md) — thin adapter + parent
qn fallback.
