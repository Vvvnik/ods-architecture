# UI-контракт: ширины панелей workspace (007)

**Зависит от**: трёхколоночный layout `003` (`WorkspaceLayout` / `WorkspacePage`).

## Поведение

Разметка колонок и splitters workspace — **только** в layout workspace
(`WorkspaceLayout` + `workspace.css`), не в странице проекта.

Ширины колонок экрана «Граф» — отдельно: `useGraphPanelWidths` /
`ods.graph.panelWidths.v1`; высота списка поиска — `useGraphSearchResultsHeight` /
`ods.graph.searchResultsHeight.v1` (см. `graph-ui-scale.md`). Общий drag —
`startColumnResize` / `startRowResize`.

1. Между колонками «Дерево | Файл | Свойства» — вертикальные разделители
   (drag по `pointerdown`/`pointermove`/`pointerup`).
2. При drag ширины clamp к минимумам:
   - дерево ≥ **180** px
   - основная (файл) ≥ **240** px (резерв при clamp соседних колонок;
     колонка **flex: 1**, явную ширину `main` в px layout **не** задаёт)
   - свойства ≥ **220** px
   - max tree/props дополнительно ограничивается шириной контейнера
     (`usePanelWidths` + `panelsRef.clientWidth`), чтобы `main` не сжимался
     ниже минимума
3. После отпускания — запись в `localStorage`:

```text
key: ods.workspace.panelWidths.v1
value: JSON { "tree": number, "main": number, "props": number }
```

   Поле `main` — **маркер** flex-остатка (в runtime часто `0`); persisted для
   совместимости schema, на ширину колонки не влияет.
4. При mount workspace — чтение ключа; при отсутствии/битом JSON — defaults
   `tree=260`, `props=280`, `main` = маркер остатка (обычно `0`).
5. Погрешность после reload ≤ **5%** (SC-004) для tree/props.

## A11y / UX

- Разделители с `role="separator"`, `aria-orientation="vertical"`,
  `aria-valuenow` (px) по возможности.
- Сообщения ошибок storage не нужны (fail-soft → defaults).

## Вне scope

- Синхронизация ширин между браузерами / сервером.
- Горизонтальный mobile breakpoint redesign.
