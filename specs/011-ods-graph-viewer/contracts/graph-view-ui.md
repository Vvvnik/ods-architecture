# UI-contract: "Graph view" (011)

**Spec**: [spec.md](../spec.md)  
**API**: [openapi-graph-view.yaml](./openapi-graph-view.yaml)  
**Lists (regression)**: `specs/007-portal-scale-ux/contracts/graph-ui-scale.md`

## Menu

| Point | Route |
|-------|-------|
| **Graph analysis** | `/projects/:projectId/graph` |
| **Graph view** | `/projects/:projectId/graph-view` |

Item "Graph" without specification MUST NOT to remain.

## Viewing route

`/projects/:projectId/graph-view`

Query (draft):

| Param | Meaning |
|-------|----------|
| `focus` | id Focus; No = System |
| `resolve_from` | id node from analysis (optional) |

## Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ Graph view System " Api " ... [To the system]          │
│ [truncation banner / resolve?]                                 │
├────────────────────────────────────────────┬─────────────────┤
│                                            │ Inspector       │
│ React Flow canvas │ name / kind │
│         (pan / zoom / fit)                 │ regard briefly │
, [Log in]         │
│                                            │ [In the analysis]     │
└────────────────────────────────────────────┴─────────────────┘
```

- Full canvas + side inspector (not three columns of the tree).
- There is no search on the screen (FR-018).

## Interaction

| Action | Result |
|----------|-----------|
| Click on a node | selection + inspector; focus **not** changes |
| "Log in" or double-click | `focus` = node; reset slice |
| Click on canvas background | Remove selection |
| "Upstairs" / baby | focus = ancestor / null |
| "To the system" | focus = null |
| "Show in analysis" | navigate `/projects/:id/graph?select=<nodeId>` |
| Wheel / pinch / buttons zoom | viewport only |

External nodes (`role=external`) — visible (style stub).

Nodes: visual at `kind` (FR-020). Fin: type signature (i18n) on **hover** and/or
when edge/incident node selected; it is not necessary to sign all edges
simultaneously on a dense map.

## The "Show in analysis" bundle (deep-link)

| Part | Contract |
|-------|----------|
| URL | `/projects/:projectId/graph?select=<encodeURIComponent(nodeId)>` |
| GraphPage | when mounting/changing query: if `select` is set to reveal the path to the node (ancestors) and choose it from click the search `007`; unknown id — ignore + without error deadlock |
| Clearing | after a successful select MAY remove query (`replace`) to F5 pulled again |

Not to use the deprecated names `node` / `from=analysis` watching.

## Empty / error

| Situation | UI |
|----------|-----|
| graph 404 / no analysis | how GraphEmptyState analysis + workspace |
| `empty_reason=no_system_participants` | "The system map is still empty" + link "Graph analysis" |
| `truncated` | banner: part of the participants is shown; narrow the focus |
| `resolve_status=system_fallback` | banner: "code Host in the diagram in MVP not shown; open map system" |

Inspector **Relationships**: show first 8 edges; if more remain, a control
«N more» / «Ещё N» expands the rest (hub nodes e.g. brokers).

**Loading / cache:** first open may wait on `GET .../graph/view`; remount within
~5 min MUST reuse the client cache (no full-page loader if slice is cached).
Invalidate after a successful analysis run. Pan/zoom MUST restore from the last
viewport for that focus/layer (session); do not force fitView on every remount.

All texts are in Russian (`i18n/ru.ts`).

## A bunch of "Graph Analysis"

The button/item "Open in the diagram" with the selected node →
`/projects/:projectId/graph-view?resolve_from=<id>`  
(for a known system-participant, is ` allowed?focus=<id>` no resolve).

## Outside UI scope MVP

- Text search on view
- Code drill before the method
- Edit / context menu delete
- Persist layout in ES
- Minimap — MAY if not beat perf
