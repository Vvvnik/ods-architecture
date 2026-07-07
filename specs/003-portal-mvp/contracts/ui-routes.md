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
| Граф зависимостей | `/graph` | GraphStubPage | FR-010, заглушка |

## Маршруты React Router

```text
/                     → redirect /projects
/import               → ImportPage
/projects             → ProjectListPage
/projects/:projectId  → WorkspacePage (3 панели)
/graph                → GraphStubPage
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

- Список карточек: name, source, sync_status, last_sync_at.
- Клик по карточке → `/projects/:id`.

### WorkspacePage

- Без `selectedElementId`: центр — placeholder «Выберите файл».
- Файл выбран: FileViewer + ElementProperties.
- Папка выбрана: центр — сводка папки (путь, число детей если загружено).

### GraphStubPage

Текст: «Граф зависимостей будет доступен в этапах 5–7 (анализ кода и Graphify).»
Без вызовов API графа.

## Навигационные правила

1. Sync в меню активен только при `activeProjectId` на WorkspacePage.
2. Повторный импорт того же URL → redirect на существующий проект (002 идемпотентность).
3. При уходе с проекта `selectedElementId` сбрасывается.
