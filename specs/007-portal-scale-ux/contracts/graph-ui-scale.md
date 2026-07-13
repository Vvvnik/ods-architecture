# UI-контракт: Graph scale (007)

**Заменяет поведение** [graph-ui.md](../../006-project-graph/contracts/graph-ui.md)
на экране графа в части списка узлов. API edges/summary/`FileGraphPanel` —
сохраняются.

**Маршрут UI (канон):** `/projects/:projectId/graph`  
**Совместимость:** `/graph` → редирект на канон при `activeProjectId`.

## Макет `GraphPage`

```text
┌──────────────────────────────────────────────────────────────┐
│ Граф          [поиск: ________] [Найти]                      │
│ [Узлы] [Рёбра]                                               │
│ результаты поиска (scroll)                                   │
│ ═══════════════════ ─  (высота, localStorage)                │
├────────────────────┬───┬─────────────────────────────────────┤
│ Дерево узлов       │║  │ Рёбра / детали выбранного           │
│ ▸ module…          │║  │ EdgeTable / empty                   │
│   function         │║  │                                     │
│   [ещё…]           │║  │                                     │
└────────────────────┴───┴─────────────────────────────────────┘
```

`║` — вертикальный splitter (ширина узлов в `localStorage`).  
`─` — горизонтальный splitter **высоты** списка результатов поиска
(общая для вкладок «Узлы» / «Рёбра»).

**Запрещено:** плоский `NodeList` всех узлов как основной/альтернативный режим
(`NodeList` удалён; FileGraphPanel рисует свой список).

## Ширины панелей Графа

Между колонками «Узлы | Рёбра» — вертикальный разделитель (как workspace):

- drag → clamp: узлы ≥ **220** px, рёбра ≥ **260** px (правая колонка — flex-остаток);
- `localStorage` key `ods.graph.panelWidths.v1` = `{ "nodes": number }`;
- hook `useGraphPanelWidths`; общий util `startColumnResize`.

## Высота результатов поиска

Между списком совпадений и блоком ниже (пагинация / пусто) — горизонтальный
разделитель:

- drag вниз/вверх → высота списка clamp: ≥ **100** px, ≤ **60%** viewport;
- default **180** px;
- `localStorage` key `ods.graph.searchResultsHeight.v1` = `{ "list": number }`;
- hook `useGraphSearchResultsHeight`; util `startRowResize` (тот же модуль, что
  `startColumnResize`);
- высота одна на обе вкладки «Узлы» / «Рёбра».

## Потоки

### Иерархия

1. `GET .../graph/summary` — как `006`.
2. `GET .../graph/nodes?parent_id=root&limit=50&offset=0` — корни.
3. Раскрытие → `parent_id=<id>`; догрузка offset.
4. Выбор узла → edges как в `006`.
5. path `nodeId` может содержать `/` → backend принимает wildcard
   `GET .../nodes/*/{edges|ancestors|}` (см. openapi note); клиент —
   `encodeURIComponent(nodeId)`.

### Поиск

1. `q` ≥ 2 символа → `GET .../graph/search?q=&limit=50&offset=0`.
2. Вкладки «Узлы» / «Рёбра»; свои total; **пагинация** Назад/Далее по `offset`
   (limit=50) для активной вкладки.
3. Клик **узел** → ancestors → раскрыть путь (с догрузкой страниц siblings) →
   `scrollIntoView` + select → edges.
4. Клик **ребро** → показать в панели связей → раскрыть/select **`from`**.

Пустой/короткий `q` — сообщение на русском, без запроса «всего графа».

## Компоненты

| Компонент | Назначение |
|-----------|------------|
| `GraphPage` | layout, summary, selection, splitter |
| `GraphNodeTree` | lazy tree + expand path + focus scroll |
| `GraphSearch` | поле + вкладки + resizable высота списка |
| `EdgeTable` | без изменений контракта `006` |
| `GraphEmptyState` | как `006` |
| `useGraphPanelWidths` | ширины узлов/рёбер + localStorage |
| `useGraphSearchResultsHeight` | высота списка результатов + localStorage |
| `reloadIfStaleBundle` | auto-reload при смене hash бандла |

## Вне scope UI

- Canvas / React Flow
- Редактирование узлов/рёбер
- Фильтры по статусу/kind (задел — не рисовать контролы)
