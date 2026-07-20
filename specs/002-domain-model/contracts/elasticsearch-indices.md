# Elasticsearch index

**Model**: [data-model.md]

## `ods-projects`

**Name:** Project document (1:1).

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "source_type": { "type": "keyword" },
      "source_value": { "type": "keyword" },
      "working_copy_root": { "type": "keyword" },
      "created_at": { "type": "date" },
      "last_sync_at": { "type": "date" },
      "sync_status": { "type": "keyword" },
      "last_error_message": { "type": "text" }
    }
  }
}
```

**Bootstrap:** is created when the backend is started, if it is not.

## `ods-elements`

**Name:** the tree nodes of ProjectElement.

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "project_id": { "type": "keyword" },
      "path": { "type": "keyword" },
      "parent_path": { "type": "keyword" },
      "type": { "type": "keyword" },
      "status": { "type": "keyword" },
      "is_active": { "type": "boolean" },
      "status_manually_set": { "type": "boolean" }
    }
  }
}
```

**Questions:**

- Children of the folder: `bool.filter` on `project_id`, `parent_path`, `is_active=true`.
- Upsert at sync: `term` to `project_id` + `path`.

## The MVP index policy

- Without charring: `number_of_shards: 1`, `number_of_replicas: 0` (dev/pilot).
- ** Delete the project:** hard-delete through `delete_by_query` on `project_id` in
  `ods-elements` + delete the document in `ods-projects` (FR-013).
  It's not changing.

## The ES version

Elasticsearch **8.x** (compatible with docker image `elasticsearch:8.11.0`).
