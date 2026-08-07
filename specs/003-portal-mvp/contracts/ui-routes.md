# UI routes: MVP portal

**Spec**: [spec.md]
**Plan**: [plan.md]

## App header and main navigation

- Header: ODS brand on the left; EN/RU language selector on the right.
- UI locales: `en` (default) and `ru`.

| Point | The route | The component | Notes from the |
|-------|---------|-----------|------------|
| Import | `/import` | ImportPage | FR-003 |
| Projects | `/projects` | ProjectListPage | FR-004 |
| File structure | `/projects/:projectId` | WorkspacePage | FR-006, mode files |
| Graph | `/projects/:projectId/graph` | GraphPage | FR-010; UI `007` (`graph-ui-scale.md`); `/graph` → redirect |

Sync is not a main-navigation item. It is available only as a project-row action
on `ProjectListPage`.

## Routes of the React Router

```text
/                     → redirect /projects
/import               → ImportPage
/projects             → ProjectListPage
/projects/:ProjectId → WorkspacePage (3 panels)
/projects/:ProjectId/graph → GraphPage (007; tree + search)
/graph → redirect to canon with activeProjectId
*                     → NotFound (portal i18n)
```

## WorkspacePage  three panels

```text
┌─────────────────────────────────────────────────────────────┐
│ MainMenu (AppLayout)                                        │
├──────────────┬────────────────────────────┬─────────────────┤
│ FileTree     │ FileViewer                 │ ElementProperties│
│ (left) │ (central , read-only) │ (right) │
│ 25% min 240px│ flex 1                     │ 280px            │
└──────────────┴────────────────────────────┴─────────────────┘
```

- **≥ 1280px:** three columns in a row (SC-003).
- **< 1280px:** left + central in the column; properties  under the content or drawer
  (details in tasks).

## The condition of the screen

### ImportPage

- `idle`  form (source type, value, button Import).
- `submitting` — loader.
- `success` — redirect `/projects/:id` or `/projects` highlighting the new project.
- `error`  message from the API (localized / portal i18n).

### ProjectListPage

Table with columns (headings in UI):

| Name of the place | The source | Sync status | Last sync | This is an error | The action |
|-----|----------|-------------|----------------|--------|----------|

- **name**  `name`; **source**  `source_type` + `source_value`;
  **Status sync**  `sync_status`; **Last sync**  `last_sync_at`;
  **Error**  `last_error_message`; **Actions**  icon-only **Open**, **Delete**, **Sync**.
- **Open** uses an open-folder icon, **Delete** uses a trash icon, and **Sync**
  uses a circular-arrows icon.
- Every action has a mandatory tooltip and `aria-label` with the exact value
  `Open`, `Delete`, or `Sync`.
- Open → `/projects/:id` (+ `activeProjectId` in the session).
- The current line `activeProjectId` **lighted** (marked open)
  So that the list shows which project the Sync/menu belongs to.
- Delete → confirm → `DELETE` → update the list.
- Sync → `POST /projects/:id/sync`; disable the row action while `running`.
- Sync toasts and modals are rendered in the Projects context.
- `ConnectionBanner` remains global.

**Confirm (FR-013):** Delete the project?  Source can be imported again.

**Conditions of removal:**

| The state | The behavior |
|-----------|-----------|
| confirm open | OK / Cancel is waiting |
| deleting | disabled / loader button |
| error | Toast/alert (`sync_in_progress`, network) |
| success | The line is missing from the list |

### WorkspacePage

- Without `selectedElementId`: center  placeholder Pick the file.
- The file is selected: FileViewer + ElementProperties + FileGraphPanel (006).
- The folder is selected: center  folder summary (path, number of children if loaded).

### GraphPage

The screen of the graph is `specs/007-portal-scale-ux/contracts/graph-ui-scale.md`
(historical MVP: `006` `graph-ui.md`): tree, search, edge, empty states.

## Navigation rules

1. Sync is available only from the relevant row on `/projects`; it never appears
   in the main menu.
2. Re-importing the same URL → redirect to an existing project (002 emptiness).
3. When the project leaves `selectedElementId` is discarded.
4. After successful deletion of the project from `/projects/:id` → redirect `/projects`,
   `activeProjectId` = null.
5. `GET /projects/:id` → 404 (Project Deleted) → redirect `/projects` zZ with a message.
