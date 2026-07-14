# Data Model: 008-code-graph-depth

**Дата**: 2026-07-14  
**Спека**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)

Индексы ES и сущности проекта/`005` **не меняются**. Ниже — расширения
native model и канонических рёбер.

## 1. Native Symbols Model v2 (envelope.model)

Версия envelope: `schema_version = "2"` (парсеры typescript / csharp).

| Поле | Обязательность | Описание |
|------|----------------|----------|
| `symbols[]` | MUST | Как v1: name, kind, path, qualified_name, parent_*, signature, location, refs (imports/…) |
| `usages[]` | MAY (пустой/absent = нет семантики) | Семантические связи MVP: `calls`, `injects` |

### Usage (элемент `usages[]`)

| Поле | Обязательность | Описание |
|------|----------------|----------|
| `from` | MUST | `qualified_name` символа-источника в том же `symbols[]` |
| `to` | MUST | `qualified_name` символа-цели в том же `symbols[]` |
| `type` | MUST | MVP: `calls` \| `injects`; прочие enum-значения схемы — задел без extract |
| `path` | SHOULD | Файл, где зафиксирован usage |
| `location` | MAY | Позиция в `path` |
| `metadata` | MAY | Напр. `parameter`, `constructor: true` для DI |

Схема: [contracts/native-symbols-v2.schema.json](./contracts/native-symbols-v2.schema.json).

### Validation

- `type` ∈ допустимом enum схемы; ingest MVP обрабатывает только `calls` и
  `injects` (остальные игнорирует без ошибки).
- Неоднозначный/неразрешённый вызов **не** попадает в `usages` (парсер).
- v1 model: только `symbols` — валидно для ingest.

## 2. Canonical GraphEdge (расширение)

Документ в `ods-graph-edges` — как `006`, плюс:

| Изменение | Правило |
|-----------|---------|
| `type` | Допустимы значения `006` **и** **`injects`** |
| `metadata.layer` | При записи ingest после `008`: MUST `"code"` |
| id | `{parser_id}:{path}:{type}:{from}:{to}` — как `006` / json-model |

Маппинг: usage → ребро, см. [contracts/ingest-symbols-v2.md](./contracts/ingest-symbols-v2.md).

### EdgeType (полный список после 008)

`imports` \| `exports` \| `calls` \| `inherits` \| `implements` \| `references` \|
`contains` \| **`injects`**

## 3. Canonical GraphNode (слой)

Без смены kind/id. При upsert ingest symbols после `008`:

| Поле | Правило |
|------|---------|
| `metadata.layer` | MUST `"code"` (мерж с существующими ключами metadata) |

Legacy без `layer` — читать как code-слой по умолчанию в будущем UI; миграция не
обязательна.

## 4. Связи сущностей

```text
Envelope (005, schema_version 1|2)
  └─ model.symbols[]  ──ingest──► GraphNode (ods-graph-nodes)
  └─ model.symbols[].refs[] ──► GraphEdge (imports/…)
  └─ model.usages[] (v2) ──► GraphEdge (calls|injects)
```

## 5. State / lifecycle

Без новых состояний прогона. Инкремент `006`: рёбра файла (включая calls/
injects с `path`) удаляются/перезаписываются вместе с узлами файла.

## 6. Вне модели MVP

- Наполнение `creates` / `references` / `reads` / `writes`
- System kinds (`009`)
- Python/C++ v2
