# Data model: Project graph (006)

**Spec**: [spec.md] | **Plan**: [plan.md]

## A look at the storage

| The layer | The ES index | The owner |
|------|-----------|----------|
| The Parser Envelope | `ods-parser-envelopes` | `005` (read-only for ingest) |
| The analysis drive | `ods-analysis-runs` | `005` (read + patch ingest metadata) |
| The canon of knots | `ods-graph-nodes` | `006` |
| The canon of the edge | `ods-graph-edges` | `006` |
| File tree | `ods-elements` | `002` (lookup `element_id`) |

## Graph Node (canon)

Document in `ods-graph-nodes`. Field `id`  stable logical key of the node;
**`_id` document ES** = `{analysis_run_id}:{id}` (several shots in one index).

| The field | Type of ES | Required | The description |
|------|--------|-------------|----------|
| `id` | keyword | Yes | Prefer `{parser_id}:{path}:{kind}:{qualified_name}`; if UTF-8 length would make ES `_id` (`{analysis_run_id}:{id}`) exceed **512 bytes**, use stable hash form `{parser_id}:h:{sha256…}` (`fitLogicalIdForEs`, research R3) |
| `project_id` | keyword | Yes | FK → Project |
| `analysis_run_id` | keyword | Yes | A photo of the driveway . |
| `parser_id` | keyword | Yes | The source |
| `kind` | keyword | Yes | class, function, method, interface, … |
| `name` | keyword | Yes | short name |
| `qualified_name` | keyword | No | FQN / symbol path |
| `language` | keyword | Yes | typescript, csharp, … |
| `path` | keyword | Yes | POSIX file path |
| `location` | object | No | `{ start_line, start_col, end_line, end_col }` |
| `element_id` | keyword | No | FK → Element (`002`) |
| `parent_id` | keyword | No | Parent node id |
| `signature` | text | No | Signature of the method/function |
| `metadata` | object | No | Expansion without change of scheme |
| `ingested_at` | date | Yes | ingest recording time |

## Graph Edge (canon)

Document in `ods-graph-edges`. Field `id`  unique id of the edge;
**`_id` document ES** = `{analysis_run_id}:{id}`.

| The field | Type of ES | Required | The description |
|------|--------|-------------|----------|
| `id` | keyword | Yes | Unique edge id (same ES `_id` 512-byte rule as nodes; hashed via `fitLogicalIdForEs` when needed) |
| `project_id` | keyword | Yes | |
| `analysis_run_id` | keyword | Yes | |
| `parser_id` | keyword | Yes | |
| `language` | keyword | Yes | |
| `from` | keyword | Yes | The node id |
| `to` | keyword | Yes | The node id |
| `type` | keyword | Yes | calls, imports, inherits, implements, references, … |
| `path` | keyword | No | context (call file) |
| `location` | object | No | position in the code |
| `metadata` | object | No | |
| `ingested_at` | date | Yes | |

## Ingest metadata on Analysis Run (patch `005`)

The field **writes** `006` in the document `ods-analysis-runs` (see also
`005/contracts/elasticsearch-indices.md` §Extending ingest `006`):

| The field | Type of the | The description |
|------|-----|----------|
| `ingest_status` | keyword | pending, running, success, partial, failed |
| `ingest_completed_at` | date | nullable |
| `ingest_errors` | nested[] | `{ parser_id, message }` |

## IngestContext (in memory, not ES)

| The field | The description |
|------|----------|
| `project_id` | |
| `analysis_run_id` | |
| `parser_id` | |
| `schema_version` | From the envelope |
| `files_analyzed` | paths from envelope |
| `incremental` | boolean |
| `affected_paths` | paths for delete-before-upsert |
| `deleted_paths` | from change set |

## Connections

```text
AnalysisRun (005)
  └── ParserEnvelope (005) × N
        └── IngestJob → GraphNode[] + GraphEdge[] (006)

Project (002)
  ├── Element tree → element_id lookup
  └── Graph snapshot (latest analysis_run_id)
```

## Requests (logic)

### The file nodes

```text
project_id = :id
AND analysis_run_id = :runId (or latest)
AND path = :filePath
```

### The edge of the knot (1 hop)

```text
project_id = :id
AND analysis_run_id = :runId
AND (from = :nodeId OR to = :nodeId)
```

### Latest run

Sort `ods-analysis-runs` by `completed_at` desc, filter:

- `status` ∈ {`success`, `partial`}
- `ingest_status` ∈ {`success`, `partial`}

The first document is a default image of the column (FR-007).

## Delete the project

Additionally to the cascade `005` (`specs/005-code-analysis/data-model.md`):

1. `delete_by_query` `ods-graph-nodes` where `project_id`
2. `delete_by_query` `ods-graph-edges` where `project_id`

See also `specs/002-domain-model/data-model.md` (cross-ref).

## Kind and Edge type (initial set)

**Node kinds:** `file`, `module`, `namespace`, `class`, `interface`, `function`, `method`, `property`, `field`, `variable`, `enum`

**Edge types:** `imports`, `exports`, `calls`, `inherits`, `implements`,
`references`, `contains`, **`injects`** (implementation of the DI  stage `008`)

Expansion through `metadata` without ES migration (`metadata.layer=code`  `008`).
