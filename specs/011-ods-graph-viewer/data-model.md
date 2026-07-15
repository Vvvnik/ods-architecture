# Data model: 011-ods-graph-viewer

**Канон узлов/рёбер** не меняется (`006`/`008`/`009`). Ниже — модель **среза
просмотра** (read-model), которую отдаёт API и потребляет UI.

## 1. Существующий канон (read-only)

| Сущность | Индекс / источник | Использование в `011` |
|----------|-------------------|------------------------|
| Graph node | `ods-graph-nodes` | Участники, inside, resolve service |
| Graph edge | `ods-graph-edges` | Связи фокуса ↔ внешние / inside |
| Analysis run | как в `006` | `analysis_run_id` снимка |

Ключевые поля узла: `id`, `kind`, `name`, `qualified_name`, `path`,
`parent_id`, `metadata.layer`, `metadata.engine` (БД).

Ключевые поля ребра: `id`, `from`, `to`, `type`, `metadata.layer`.

## 2. GraphViewSlice (ответ API)

| Поле | Тип | Правило |
|------|-----|---------|
| `project_id` | string | MUST |
| `analysis_run_id` | string | MUST |
| `focus_id` | string \| null | `null` = уровень «Система» |
| `focus_kind` | string \| null | convenience |
| `nodes[]` | ViewNode | внутри + внешние stubs |
| `edges[]` | ViewEdge | только между узлами среза |
| `truncated` | boolean | MUST |
| `limits` | `{ max_nodes, max_edges }` | фактически применённые |
| `counts` | `{ nodes, edges, omitted_nodes?, omitted_edges? }` | для UI сообщения |

### ViewNode

| Поле | Правило |
|------|---------|
| все публичные поля graph node (как list API) | MUST для реальных узлов |
| `role` | `"inside"` \| `"external"` \| `"focus"` — `focus` может дублировать inside корня |
| `stub` | boolean — для external MAY true (без лишних полей) |

### ViewEdge

Как публичное ребро графа; оба конца MUST присутствовать в `nodes[]`.

## 3. Клиентское состояние (не ES)

| Состояние | Хранение | Правило |
|-----------|----------|---------|
| Selection | React state | клик; inspector |
| Focus stack / breadcrumbs | React state (+ URL `focus`) | «Войти» / «Наверх» |
| Viewport (zoom/pan) | React Flow + MAY session | не канон |
| Node positions | auto-layout; MAY sessionStorage | ключ `project+run+focus` |

## 4. Правила построения среза

### 4.1 focus = null (Система)

1. Кандидаты peer — R6 research.
2. Рёбра между кандидатами (system layer предпочтительно).
3. Усечение: services first → linked infra → rest (R3).
4. Все оставшиеся узлы: `role=inside` (или peer без focus); `stub=false`.

### 4.2 focus = service | broker | …

1. Узел focus → `role=focus`.
2. Inside set по R6.
3. External = соседи по рёбрам от focus∪inside, не входящие в inside;
   `role=external`, `stub=true` (без раскрытия их внутренностей).
4. Рёбра только между узлами среза (focus ∪ inside ∪ external), в пределах cap.
5. Усечение: всегда сохранять focus; при нехватке места предпочитать внешних
   и рёбра, сохраняющие видимость связей; `truncated=true`.

### 4.3 Resolve code → service

Алгоритм R5; результат либо `focus_id=service`, либо срез «Система» +
banner на UI (`resolve_status=system_fallback` в API).

## 5. Валидация

- `nodes.length` ≤ `limits.max_nodes`
- `edges.length` ≤ `limits.max_edges`
- Нет ребра с концом вне `nodes`
- External не содержит детей focus (нет «раскрытых» чужих внутренностей)
- Пустой peer set при существующем графе → HTTP 200 + пустые nodes + флаг
  для empty-state «нет system» (отличить от 404 graph_not_found)

## 6. Что не моделируем в `011`

- Новые kinds БД hierarchy
- Annotations / not_needed overlay
- Persisted layouts in ES
- Code-bottom drill tree (follow-up)
