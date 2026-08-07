# UI-contracts: screen Graph (006)

> **Superseded for UI `007`:** route and layout canon
> [`specs/007-portal-scale-ux/contracts/graph-ui-scale.md`](../../007-portal-scale-ux/contracts/graph-ui-scale.md)
> (`/projects/:projectId/graph`, `GraphNodeTree` with search; the flat `NodeList` is removed).
> Below is the historical MVP contract `006` (API summary/nodes/edges still basic).

**Spec**: [spec.md]
**User: `specs/003-portal-mvp` (substitute for `GraphStubPage`)
**API**: [openapi-graph.yaml](./openapi-graph.yaml)

## The route

Historically `/graph`. **Runtime `007`:** `/projects/:projectId/graph`
(`/graph` — redirect).

## The preamble

- Selected project in workspace (as for file tree).
- For the graph data , a completed analysis (`005`) with a successful ingest (`006`) is required .

## The layout of `GraphPage`

```text
┌─────────────────────────────────────────────────────────┐
│ Dependencies graph [Picture: run ... ▼] (option) │
├──────────────────┬──────────────────────────────────────┤
│ Nodes (lists) │ edge of selected node │
│ path / kind /    │ from → to | type | path              │
│ name             │                                      │
│ [page] │ │
└──────────────────┴──────────────────────────────────────┘
```

**Components:**

| The component | The assignment |
|-----------|------------|
| `GraphPage` | layout, download summary + nodes |
| `NodeList` | `GET .../graph/nodes`, click → select the node |
| `EdgeTable` | `GET .../graph/nodes/{id}/edges` |
| `GraphEmptyState` | No analysis / no data |
| `FileGraphPanel` | Optionally: when you select a file in the tree  `.../files/{path}/dependencies` |

## Uploading the data

1. `GET /projects/{id}/graph/summary`  if 404 → `GraphEmptyState`.
2. `GET /projects/{id}/graph/nodes?limit=50&offset=0`  list.
3. When you select the node  `GET .../graph/nodes/{nodeId}/edges?direction=both`.

Pagination of nodes: buttons Next / Back (`offset` += `limit`).

## Empty states (portal i18n)

| The situation | Title | The text | The action |
|----------|-----------|-------|----------|
| No analysis is needed. | Graph is not available | First, sync and analyze the code. | Link to workspace / sync |
| Ingest failed | Full-out error in the graph | Failed to convert the results of the analysis. | Repeat the analysis |
| No knots | The graph is empty. | No symbols to display in the project. | — |

## Integrate with the file tree

When clicking on a file in `WorkspacePage` (optional v1.1):

- sidebar or tab File dependencies
- `GET .../graph/files/{path}/dependencies`
- Compact list of nodes + edges (without full `GraphPage`)

MVP: The time in tasks is a separate `/graph`;

## Restrictions (not included)

- React Flow, drag-and-drop layout, zoom canvas
- Editing the column
- Exporting GraphML / DOT
- Show raw `model` from the envelope

## API error messages

Prefer portal i18n by `ApiError.code` (FR-014 / `002` FR-012). Fall back to the
API English `message` only when no locale entry exists for the code.

Examples (i18n / EN fallback):

- `graph_not_found` → The graph for the project is not yet built
- `analysis_run_not_found` → The specified analysis runway was not found

## Availability

- Listings are semantic `<table>` or `role="grid"` for the reber
- Keyboard navigation by the node list (shoot / enter)

## Replacing the shutter

Delete or replace `GraphStubPage` with `GraphPage` in the router `003`.
The text of the button «The dependency graph (Soon)» It 's not showing up .. The screen title: «Graph» / «The code graph» (See also. `008`).
