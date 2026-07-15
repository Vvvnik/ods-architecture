# UI-контракт: «Граф просмотр» (011)

**Спека**: [spec.md](../spec.md)  
**API**: [openapi-graph-view.yaml](./openapi-graph-view.yaml)  
**Списки (регресс)**: `specs/007-portal-scale-ux/contracts/graph-ui-scale.md`

## Меню

| Пункт | Route |
|-------|-------|
| **Граф анализ** | `/projects/:projectId/graph` |
| **Граф просмотр** | `/projects/:projectId/graph-view` |

Пункта «Граф» без уточнения MUST NOT остаться.

## Маршрут просмотра

`/projects/:projectId/graph-view`

Query (черновик):

| Param | Значение |
|-------|----------|
| `focus` | id фокуса; нет = Система |
| `resolve_from` | id узла из анализа (опц.) |

## Макет

```text
┌──────────────────────────────────────────────────────────────┐
│ Граф просмотр     Система › Api › …     [К системе]          │
│ [баннер усечения / resolve?]                                 │
├────────────────────────────────────────────┬─────────────────┤
│                                            │ Inspector       │
│         React Flow canvas                  │ имя / kind      │
│         (pan / zoom / fit)                 │ связи кратко    │
│                                            │ [Войти]         │
│                                            │ [В анализе]     │
└────────────────────────────────────────────┴─────────────────┘
```

- Полный холст + боковой inspector (не три колонки дерева).
- Поиска на экране нет (FR-018).

## Взаимодействие

| Действие | Результат |
|----------|-----------|
| Клик по узлу | selection + inspector; фокус **не** меняется |
| «Войти» или double-click | `focus` = узел; перезагрузка среза |
| Клик по canvas background | снять selection |
| «Наверх» / крошка | focus = предок / null |
| «К системе» | focus = null |
| «Показать в анализе» | navigate `/projects/:id/graph?select=<nodeId>` |
| Wheel / pinch / buttons zoom | viewport only |

Внешние узлы (`role=external`) — визуально отличимы (стиль stub).

Узлы: визуал по `kind` (FR-020). Рёбра: подпись типа (i18n) на **hover** и/или
когда ребро/инцидентный узел selected; не обязательно подписывать все рёбра
одновременно на плотной карте.

## Связка «Показать в анализе» (deep-link)

| Часть | Контракт |
|-------|----------|
| URL | `/projects/:projectId/graph?select=<encodeURIComponent(nodeId)>` |
| GraphPage | при монтировании/смене query: если `select` задан — раскрыть путь к узлу (ancestors) и выбрать его, как клик из поиска `007`; неизвестный id — ignore + без ошибки-тупика |
| Очистка | после успешного select MAY снять query (`replace`) чтобы F5 не дёргал повторно |

Не использовать устаревшие имена `node` / `from=analysis` на просмотре.

## Empty / error

| Ситуация | UI |
|----------|-----|
| graph 404 / нет анализа | как GraphEmptyState анализа + workspace |
| `empty_reason=no_system_participants` | «Карта системы пока пуста» + ссылка «Граф анализ» |
| `truncated` | баннер: показана часть участников; сузьте фокус |
| `resolve_status=system_fallback` | баннер: «Узел кода на схеме в MVP не показываем; открыта карта системы» |

Все тексты — русский (`i18n/ru.ts`).

## Связка из «Граф анализ»

Кнопка/пункт «Открыть на схеме» при выбранном узле →
`/projects/:projectId/graph-view?resolve_from=<id>`  
(для заведомо system-участника допускается `?focus=<id>` без resolve).

## Вне UI scope MVP

- Text search на просмотре
- Code drill до метода
- Edit / context menu delete
- Persist layout в ES
- Minimap — MAY если не бьёт perf
