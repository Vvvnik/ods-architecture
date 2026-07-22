# UI contract: Graph UI portal (020)

**Spec**: [spec.md](./spec.md)  
**API**: [openapi-graph-ui.yaml](./openapi-graph-ui.yaml)

## Routes (portal)

| Path | Page |
|------|------|
| `/projects/:projectId/graph-ui` | Graph UI overview / drill |

Menu item sibling to Graph view; user-facing label **Graph UI** (i18n en/ru,
same string in both locales unless product copy differs).

## Layout

- Shared **page-chrome** (left-aligned project title, tokens).
- **Center**: React Flow viewport (same pan/zoom/fit Controls pattern as Graph
  view) with **fixed non-draggable** schematic frame nodes (screens/flows);
  not the system Graph view node types or slice algorithms.
- **Right**: inspector (selected UI entity properties, API binds, source path).
- **Tabs or equivalent filter** when multiple `ui_module`s / large page sets
  need grouping (FR-005). For dogfood with a modest page count, a **scrollable
  non-overlapping frame layout without tabs** is acceptable if all pages remain
  reachable in overview.
- Overview → drill (double-click or inspector Enter) → single page structure;
  Up / back to overview.

## Graph view inspector

When selected node id is target of `binds_service` from a `ui_app`, show action
**Graph UI** (label via i18n) → navigate to `/projects/:id/graph-ui` (optionally
`?app=<ui_app_id>`). Hidden/disabled otherwise. Does not change Graph view slice
logic (Code / System / View in analysis unchanged).

## Modal window 1

Frontend section per [detector-frontend-ui.md](./detector-frontend-ui.md).

## Style alignment (in scope)

Audit/fix Workspace, Graph analysis, Graph view to shared tokens/`page-chrome`
as part of this feature (FR-010). Graph UI must not be the only compliant screen.

## Empty / loading / error

- No UI landscape: clear empty state (SC-007).
- Loading: same density as Graph view loading.
- Errors: i18n messages; do not break other graph screens.
