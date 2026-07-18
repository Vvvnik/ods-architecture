# Ingest: Java symbols

**Спека**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

## Adapter

```text
parser_id: java
factory: createSymbolsModelIngestAdapter('java', 'java')
supported_schema_versions: ['1', '2']  # emit только 1 в MVP
```

Регистрация в `registerBuiltinIngestAdapters`. **Не** в
`ARTIFACT_PARSER_IDS`.

## Parent resolve (R3)

Дополнение shared `symbols-model.ingest`:

1. Как сейчас: `parent_id` по ключу `path:parent_qualified_name`.
2. Fallback: если не найден и существует **ровно один** узел с
   `qualified_name === parent_qualified_name` — использовать его id
   (пакет `namespace` с синтетическим path).

## Канон

- `metadata.layer = code`
- Без обязательных `usages` / `calls`
- Инкремент / delete по path — как у прочих language adapters

## Изоляция

Отсутствие адаптера/манифеста → `parser_status: missing`; прогон остальных
модулей без падения (FR-008).
