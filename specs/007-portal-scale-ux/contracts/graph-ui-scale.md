# UI-contracts: Graph scale (007)

**Alters the behavior** [graph-ui.md](../../006-project-graph/contracts/graph-ui.md)
on the column screen in the part of the node list. API edges/summary/`FileGraphPanel`
They're still there.

**Rout UI (canon):** `/projects/:projectId/graph`
**Compatibility:** `/graph` → redirect to canon at `activeProjectId`.

## The layout of `GraphPage`

```text
┌──────────────────────────────────────────────────────────────┐
│ Graph [search: ________] [Find] │
│ [Nodes] [Edges] │
│ search results (scroll) │
│  ─ (height , localStorage) │
├────────────────────┬───┬─────────────────────────────────────┤
│ Tree of nodes │ │ edge / selected parts │
│ ▸ module…          │║  │ EdgeTable / empty                   │
│   function         │║  │                                     │
│ [more...] │ │ │ │
└────────────────────┴───┴─────────────────────────────────────┘
```

`║`  vertical splitter (width of nodes in `localStorage`).
`─`  horizontal splitter ** heights** list of search results
(common for the column Nodes / Edges).

**Banned:** flat `NodeList` all nodes as the main/alternative mode
(`NodeList` deleted; FileGraphPanel is drawing its list).

## The width of the graph panels

Between the columns of the UZL | edge  vertical divider (as workspace):

- drag → clamp: The nodes ≥ **220** px, the edges ≥ **260** px (right column  flex-residual);
- `localStorage` key `ods.graph.panelWidths.v1` = `{ "nodes": number }`;
- Hook `useGraphPanelWidths`; common util `startColumnResize`.

## High search results

Between the list of coincidences and the block below (pagina / empty)  horizontal
The splitter:

- drag down/up → height of the clamp list: ≥ **100** px, ≤ **60%** viewport;
- default **180** px;
- `localStorage` key `ods.graph.searchResultsHeight.v1` = `{ "list": number }`;
- hook `useGraphSearchResultsHeight`; util `startRowResize` (the same module that
  `startColumnResize`);
- the height is one on both tabs Nodes / Edges.

## The flow

### The hierarchy

1. `GET .../graph/summary`  as `006`.
2. `GET .../graph/nodes?parent_id=root&limit=50&offset=0`  roots.
3. The disclosure → `parent_id=<id>`; the load offset.
4. Select the node → edges as in `006`.
5. path `nodeId` may contain `/` → backend accepts wildcard
   `GET .../nodes/*/{edges|ancestors|}` (see openapi note); client
   `encodeURIComponent(nodeId)`.

### Searching

1. `q` ≥ 2 characters → `GET .../graph/search?q=&limit=50&offset=0`.
2. Input tabs Nodes / Edges; their total; **pagination** Back/Next by `offset`
   (limit=50) for active tab.
3. Click **node** → ancestors → to open the path (with the siblings page load) →
   `scrollIntoView` + select → edges.
4. Click **rebo** → to show in the links panel → to open/select **`from`**.

Empty/short `q`  localized message, without asking for the entire column.

## The components

| The component | The assignment |
|-----------|------------|
| `GraphPage` | layout, summary, selection, splitter |
| `GraphNodeTree` | lazy tree + expand path + focus scroll |
| `GraphSearch` | field + tab + resizable list height |
| `EdgeTable` | Zwithout  Changes contracts `006` |
| `GraphEmptyState` |  as  `006` |
| `useGraphPanelWidths` | width of nodes/rivers + localStorage |
| `useGraphSearchResultsHeight` | the height of the results list + localStorage |
| `reloadIfStaleBundle` | auto-reload when changing hash bundle |

## Outside the scope of UI

- Canvas / React Flow
- Editing the nodes/rebars
- Status/kind filters (not to draw controls)
