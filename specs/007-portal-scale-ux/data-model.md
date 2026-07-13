# Data Model: 007-portal-scale-ux

**Дата**: 2026-07-13  
**Спека**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)

Существующие сущности `002`/`006` **не дублируются**; ниже — поля и правила,
существенные для `007`.

## 1. Element (дерево, `ods-elements`)

| Поле | Роль в `007` |
|------|----------------|
| `id`, `project_id`, `path`, `parent_path`, `type` | Идентификация; каскад по префиксу `path` |
| `status` | Цель каскада / наследования |
| `status_manually_set` | Ручная пометка; при **наследовании sync** у потомка = `false` |
| `is_active` | Каскад только по активным |

### Правила каскада

См. [contracts/status-cascade.md](./contracts/status-cascade.md).

Кратко:

- Directory PATCH (кроме выхода из `not_needed`) → одна операция для папки +
  потомков с префиксом пути.
- File PATCH → один документ.
- Soft-limit: >5000 потомков → отказ без записи.

### Sync inheritance

Новый/обновлённый элемент без своей ручной пометки под предком
`not_needed` + `status_manually_set` → `status=not_needed`,
`status_manually_set=false`.

## 2. GraphNode / GraphEdge (`006`)

Без смены схемы индексов. Для UI:

| Поле узла | Использование |
|-----------|----------------|
| `parent_id` | Дерево / lazy children |
| `name`, `path`, `kind`, `qualified_name` | Поиск + отображение |
| `id` | Выбор, путь предков |

| Поле ребра | Использование |
|------------|----------------|
| `type`, `from`, `to`, `path` | Поиск + панель связей |

## 3. GraphSearchResult (логическое DTO)

```text
GraphSearchResult
  nodes: { items: GraphNode[], total, limit, offset }
  edges: { items: GraphEdge[], total, limit, offset }
  q: string
```

Фильтры/фасеты — **не** часть модели `007` (reserved в OpenAPI).

## 4. GraphNodeAncestors (опциональный DTO)

```text
{ node_id, ancestors: GraphNode[] }  // от корня к родителю
```

Для клика из поиска без N+1.

## 5. WorkspacePanelWidths (client-only)

```text
{
  tree: number,   // px
  main: number,   // px (или вычисляемый flex)
  props: number   // px
}
```

Ключ storage: `ods.workspace.panelWidths.v1`. Не хранится в ES.

## 5b. GraphSearchResultsHeight (client-only)

Высота списка результатов поиска на экране «Граф» (общая для вкладок Узлы/Рёбра):

```text
{ list: number }  // px
```

Ключ: `ods.graph.searchResultsHeight.v1`. Default **180**, min **100**,
max **60%** viewport. См. [graph-ui-scale.md](./contracts/graph-ui-scale.md).

## 6. State transitions (статус папки)

```text
                  cascade down (*)
  [any] ──────────────────────────► [target]  (directory, * except lift from not_needed)

  not_needed ──(lift to needed|auto_found|…)──► only folder changes; children unchanged
```

`(*)` target ∈ ElementStatus enum `002`; все активные потомки = target +
`status_manually_set=true`.
