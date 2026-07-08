# Индексы Elasticsearch

**Модель**: [data-model.md](../data-model.md)

## `ods-projects`

**Назначение:** документ Project (1:1).

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

**Bootstrap:** создаётся при старте backend, если отсутствует.

## `ods-elements`

**Назначение:** узлы дерева ProjectElement.

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

**Запросы:**

- Дети папки: `bool.filter` на `project_id`, `parent_path`, `is_active=true`.
- Upsert при sync: `term` на `project_id` + `path`.

## Политика индексов MVP

- Без шардирования: `number_of_shards: 1`, `number_of_replicas: 0` (dev/pilot).
- **Удаление проекта:** hard-delete через `delete_by_query` по `project_id` в
  `ods-elements` + delete документа в `ods-projects` (FR-013). Схема индексов
  не меняется.

## Версия ES

Elasticsearch **8.x** (совместимо с docker image `elasticsearch:8.11.0`).
