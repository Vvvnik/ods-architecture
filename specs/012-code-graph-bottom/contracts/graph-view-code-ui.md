# UI-контракт: code-drill «Граф просмотр» (012)

**Спека**: [spec.md](../spec.md)  
**API**: [openapi-graph-view-code.yaml](./openapi-graph-view-code.yaml)  
**Базис UI**: `specs/011-ods-graph-viewer/contracts/graph-view-ui.md`

## Меню / маршруты

Без изменений имён пунктов `011`.  
Route: `/projects/:projectId/graph-view`

### Query (дельта)

| Param | Значение |
|-------|----------|
| `focus` | id фокуса; нет = Система |
| `layer` | `system` (default) \| `code` |
| `resolve_from` | id из анализа; code → exact_code |

## Макет

Как `011` (canvas + inspector + крошки). Дополнительно:

- в крошках отражается путь, включая переход в code;
- баннер `truncated` / `no_related_code` на русском.

## Взаимодействие (дельта)

| Действие | Результат |
|----------|-----------|
| Войти в service с Системы | `focus=service`, `layer=system` (интерьер `011`) |
| Inspector **«В код»** | `focus=service`, `layer=code` |
| Double-click / «Войти» на service | **не** открывает code (только system) |
| Войти в module/type/method | `focus=<id>` (code-срез) |
| Войти во внешнего соседа | `focus=<neighbor>` (любой компонент) |
| «К системе» | `focus` cleared, `layer=system` |
| «Открыть на схеме» (code в анализе) | `/graph-view?resolve_from=<codeId>` → focus на code |
| «Открыть на схеме» (system) | как `011` |

Клик = selection + inspector; смена фокуса только «Войти» / double-click /
«В код».

## Empty / banners

| Ситуация | UI |
|----------|-----|
| `empty_reason=no_related_code` | «Связанный код не найден» + остаться в контексте сервиса / вернуться |
| `resolve_status=exact_code` | без баннера «code не показываем» |
| `resolve_status=system_fallback` | баннер fallback как `011` (если code focus невозможен) |
| `truncated` | баннер усечения (как `011`) |

## i18n (обязательные ключи)

- `graphView.enterCode` — «В код»
- `graphView.emptyNoRelatedCode` — пояснение пустого code
- обновить/убрать текст, что code на схеме в MVP не показывают (для
  успешного exact_code)

## Вне scope UI

- Поиск на просмотре
- Edit канона
- Смешение system-детей и code-модулей на первом экране входа в сервис
