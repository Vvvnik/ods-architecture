# UI Routes Contract: ODS Portal MVP

Единый SPA (FR-004). Язык UI: русский.

**Доступ MVP**: все маршруты ниже доступны **без входа**. Маршруты с «admin» в пути —
экран регистрации/sync проекта, **не** защищённая зона и **не** роль пользователя
(spec v1.5.0, FR-001, FR-006).

| Route | Раздел | FR / US |
|-------|--------|---------|
| `/` | Список проектов + форма «Новый проект» (регистрация) | FR-001 |
| `/projects/:id` | Обзор проекта (контекст) | US-2 |
| `/projects/:id/tree` | Дерево файлов (фильтр по статусу — query или UI) | US-1, FR-002, FR-005 |
| `/projects/:id/file` | Просмотр/редактор (`?path=`) | FR-002, FR-003, FR-011 |
| `/projects/:id/docs` | Раздел «Документация» | FR-009, US-2 |
| `/projects/:id/admin` | Настройки проекта: источник (path/Git URL) + **Sync** | FR-001 |

## Layout

- **Header**: название ODS, активный проект, навигация (Дерево | Документация).
- **Sidebar** (optional): оглавление текущего раздела (FR-004, T059).
- **Main**: контент маршрута.

## Поведение

1. **Conflict dialog** (FR-011): modal «Файл изменился на диске» → Перезаписать | Отмена.
2. **Linked document** (FR-010): на странице файла кода — кнопка «Открыть связанный документ» если link exists.
3. **Status badge**: на элементе дерева — текущий статус + dropdown смены (FR-005).
4. **Sync status**: banner при `last_sync_status=failed` и текст `last_sync_error` (edge case, T058).

## Post-MVP routes (не реализуются в 001)

| Route | Назначение |
|-------|------------|
| `/projects/:id/graph` | Граф зависимостей (User Story 4, post-MVP) |

*Снято (spec v1.5.0):* `/projects/:id/ask` (Q&A / RAG).
