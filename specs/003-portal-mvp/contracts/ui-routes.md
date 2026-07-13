# UI-маршруты: Портал MVP

**Спека**: [spec.md](../spec.md)  
**План**: [plan.md](../plan.md)

## Главное меню

| Пункт | Маршрут | Компонент | Примечание |
|-------|---------|-----------|------------|
| Импорт | `/import` | ImportPage | FR-003 |
| Проекты | `/projects` | ProjectListPage | FR-004 |
| Sync | действие | — | Требует `activeProjectId`; вызывает API sync |
| Файловая структура | `/projects/:projectId` | WorkspacePage | FR-006, режим files |
| Граф | `/projects/:projectId/graph` | GraphPage | FR-010; UI `007` (`graph-ui-scale.md`); `/graph` → redirect |

## Маршруты React Router

```text
/                     → redirect /projects
/import               → ImportPage
/projects             → ProjectListPage
/projects/:projectId  → WorkspacePage (3 панели)
/projects/:projectId/graph → GraphPage (007; дерево + поиск)
/graph                → redirect на канон при activeProjectId
*                     → NotFound (русское сообщение)
```

## WorkspacePage — три панели

```text
┌─────────────────────────────────────────────────────────────┐
│ MainMenu (AppLayout)                                        │
├──────────────┬────────────────────────────┬─────────────────┤
│ FileTree     │ FileViewer                 │ ElementProperties│
│ (левая)      │ (центральная, read-only)   │ (правая)         │
│ 25% min 240px│ flex 1                     │ 280px            │
└──────────────┴────────────────────────────┴─────────────────┘
```

- **≥ 1280px:** три колонки в один ряд (SC-003).
- **< 1280px:** левая + центральная в столбец; свойства — под контентом или drawer
  (деталь в tasks).

## Состояния экранов

### ImportPage

- `idle` — форма (тип источника, значение, кнопка «Импортировать»).
- `submitting` — loader.
- `success` — redirect `/projects/:id` или `/projects` с подсветкой нового.
- `error` — сообщение из API (русский).

### ProjectListPage

Таблица со столбцами (заголовки в UI):

| Имя | Источник | Статус sync | Последний sync | Ошибка | Действия |
|-----|----------|-------------|----------------|--------|----------|

- **Имя** — `name`; **Источник** — `source_type` + `source_value`;
  **Статус sync** — `sync_status`; **Последний sync** — `last_sync_at`;
  **Ошибка** — `last_error_message`; **Действия** — **Открыть**, **Удалить** (FR-013).
- Клик по «Открыть» → `/projects/:id`.
- «Удалить» → confirm → `DELETE` → обновление списка.

**Confirm (FR-013):** «Удалить проект? Источник можно будет импортировать заново.»

**Состояния удаления:**

| Состояние | Поведение |
|-----------|-----------|
| confirm open | ждёт OK/Cancel |
| deleting | кнопка disabled / loader |
| error | тост/алерт (`sync_in_progress`, сеть) |
| success | строка исчезает из списка |

### WorkspacePage

- Без `selectedElementId`: центр — placeholder «Выберите файл».
- Файл выбран: FileViewer + ElementProperties + FileGraphPanel (006).
- Папка выбрана: центр — сводка папки (путь, число детей если загружено).

### GraphPage

Экран графа по `specs/007-portal-scale-ux/contracts/graph-ui-scale.md`
(исторический MVP: `006` `graph-ui.md`): дерево, поиск, рёбра, empty states.

## Навигационные правила

1. Sync в меню активен при выбранном `activeProjectId` (workspace или граф).
2. Повторный импорт того же URL → redirect на существующий проект (002 идемпотентность).
3. При уходе с проекта `selectedElementId` сбрасывается.
4. После успешного удаления проекта с `/projects/:id` → redirect `/projects`,
   `activeProjectId` = null.
5. `GET /projects/:id` → 404 (проект удалён) → redirect `/projects` с сообщением.
