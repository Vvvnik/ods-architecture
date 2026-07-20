# Elasticsearch index  project graph (006)

**Model**: [data-model.md]
**Basic indexes**: [002-domain-model/contracts/elasticsearch-indices.md](../../002-domain-model/contracts/elasticsearch-indices.md)
**Analysis index (005) **: [005-code-analysis/contracts/elasticsearch-indices.md](../../005-code-analysis/contracts/elasticsearch-indices.md)

Indexes are created when the backend (bootstrap) is started if they are not present.
Pilot policy: `number_of_shards: 1`, `number_of_replicas: 0`.

## `ods-graph-nodes`

**Name:** canonical nodes of the code column (level 3).

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "project_id": { "type": "keyword" },
      "analysis_run_id": { "type": "keyword" },
      "parser_id": { "type": "keyword" },
      "kind": { "type": "keyword" },
      "name": { "type": "keyword" },
      "qualified_name": { "type": "keyword" },
      "language": { "type": "keyword" },
      "path": { "type": "keyword" },
      "location": {
        "properties": {
          "start_line": { "type": "integer" },
          "start_col": { "type": "integer" },
          "end_line": { "type": "integer" },
          "end_col": { "type": "integer" }
        }
      },
      "element_id": { "type": "keyword" },
      "parent_id": { "type": "keyword" },
      "signature": { "type": "text" },
      "metadata": { "type": "object", "enabled": true },
      "ingested_at": { "type": "date" }
    }
  }
}
```

**Questions:**

- The file nodes are: `project_id` + `analysis_run_id` + `path`
- The node is id: `project_id` + `id` + `analysis_run_id`
- List of projects: `project_id` + `analysis_run_id`, sort `path`, `name`

** Uniqueness:** `(project_id, analysis_run_id, id)`  upsert on `_id = id` within the run
(or composite `_id = {analysis_run_id}:{id}` if you need the run history in one index).

**Recommendation for the implementation of:** `_id` document = `{analysis_run_id}:{id}` for storage
I've got a couple of photos without collisions.

## `ods-graph-edges`

**Name:** canonical edges of the count.

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "project_id": { "type": "keyword" },
      "analysis_run_id": { "type": "keyword" },
      "parser_id": { "type": "keyword" },
      "language": { "type": "keyword" },
      "from": { "type": "keyword" },
      "to": { "type": "keyword" },
      "type": { "type": "keyword" },
      "path": { "type": "keyword" },
      "location": {
        "properties": {
          "start_line": { "type": "integer" },
          "start_col": { "type": "integer" },
          "end_line": { "type": "integer" },
          "end_col": { "type": "integer" }
        }
      },
      "metadata": { "type": "object", "enabled": true },
      "ingested_at": { "type": "date" }
    }
  }
}
```

**Questions:**

- The following results: `project_id` + `analysis_run_id` + `from`
- Inbound: `project_id` + `analysis_run_id` + `to`
- By the file: `project_id` + `analysis_run_id` + `path`

**Recommendation `_id`:** `{analysis_run_id}:{id}`

## Indices `005` (read only / patch)

| The index | The action `006` |
|--------|----------------|
| `ods-parser-envelopes` | Read  input ingest |
| `ods-analysis-runs` | Read + UPDATE `ingest_*` fields |
| `ods-language-reports` | Not used ingest |
| `ods-elements` | READ — resolve `element_id` |

Schemes  in [005/contracts/elasticsearch-indices.md](../../005-code-analysis/contracts/elasticsearch-indices.md).

## The cascade DELETE

When `DELETE /api/v1/projects/{id}` (`002` FR-013), after/with the cascade `005`:

1. `delete_by_query` `ods-graph-edges` where `project_id = :id`
2. `delete_by_query` `ods-graph-nodes` where `project_id = :id`

## The ES version

Elasticsearch **8.x** (as in `002` / `005`).

## Link to the drawing

Logical names `graph_nodes` / `graph_edges` from `canonical-graph-model.md` =
the physical indices `ods-graph-nodes` / `ods-graph-edges` (research R1).
