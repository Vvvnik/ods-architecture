# Research: The UX scale of the portal (007)

**Date**: 2026-07-13

## R1. The atomic cascade in Elasticsearch

**Decision:** One `update_by_query` on `project_id` + active documents of the branch
(`path` = The folder path **or** `path` with prefix `The folder/`), Fields
`status` + `status_manually_set: true`, `conflicts=abort`, `refresh=wait_for`.
Success = `failures` empty and the operation is complete without an API error.
estimate of the number of offspring; with **> 5000** active offspring  ** rejection 422** without
The mass migration of old projects is not done.

**Rationale:** ES does not give ACID of multi-doc transactions; one `update_by_query`
The pilot and the test SC-003 have a practical equivalent .
Clarifies  Complete success or complete failure

**Alternatives considered:**

- Scroll + bulk + manual rollback  more difficult, not ACID either.
- Asynchronous job with progress  deviated clarify (synchronously).
- Updating the folder separately, then the descendants are more likely to be half a branch.

## R2. When the cascade, and when the folder

**Decision:**

| The situation | The behavior |
|----------|-----------|
| `type=file` | Just the element . |
| `type=directory`, new status ** from** `not_needed` → other | Only the folder (FR-012) |
| `type=directory`, any other transition (incl. → `not_needed`, → `needed`, ...) | Cascade of folders + active descendants |

**Rationale:** Comply with US1/FR-010013 and clarify.

**Alternatives:** Cascade only for `not_needed`  rejected spec (symmetry for `needed`).

## R3. Inheritance `not_needed` at sync

**Decision:** In `resolveStatusOnSync`: if the element does not have `status_manually_set`,
pass the ancestral chain along the `parent_path` / path; if an ancestor is found
`status=not_needed` **and** `status_manually_set=true`, assign to the new/updated
`not_needed` and **`status_manually_set=false`** (inherited, not your own hand)
 until the user sets the status.
`status_manually_set`, the status is maintained.

**Rationale:** FR-014; new file under `not_needed`-vet is immediately hidden from needed
A branch without a false flag on each leaf.

**Alternatives:** Set `status_manually_set=true` when inheriting  cannot
distinguish your own mark from the inherited mark; lift the folder from `not_needed`
I'd have left a false flag.

*Clarification to the FR-014 wording:* the heir receives the status `not_needed`;
A handwritten mark on the heir to the false until his PATCH.

## R4. Hierarchy of nodes: `parent_id`

**Decision:** Expand `GET .../graph/nodes`: query `parent_id`

- is missing / empty / special `root` → nodes with `parent_id` null/missing
  (the upper level of current `analysis_run_id`);
- Otherwise → direct children with `parent_id=<id>`.

Pagination `limit` (default 50, max 100) + `offset`. Optionally field
`has_children` (boolean or count) through secondary agg/`exists` children  is recommended
For UX shooters without any exposure.

Flat list without `parent_id` on UI **no** is used (`007`); API without filter
It can be left for debugging/FileGraphPanel, but `GraphPage` doesn't show it.

**Rationale:** There is already `parent_id` in the `006`; lazy load = FR-004/005.

**Alternatives:** Tree only by `qualified_name` prefix  fragile for different
parser; It 's worse ., than the obvious `parent_id`.

## R5. Find the nodes and the edges

**Decision:** `GET .../graph/search?q=&limit=&offset=&analysis_run_id?`

- `q` trim, length ≥ 2; otherwise 400 with Russian.
- One query → two independent ES multi-match (nodes + edges), each page
   with   with your  `total`.
- Nodes: `name`, `path`, `kind`, `qualified_name` (and if there is a `signature`).
- Edges: `type`, `from`, `to`, `path` ( Context ).
- Answer: `{ nodes: Page, edges: Page }` (always both blocks).
- **Trade (not to be executed in `007`):** to reserve query parameters
  `filter.*` / future faces in OpenAPI comments; server `007` will ignore them ****
  or 400 is not supported. Preferably ignored without error.
  So the intelligence clients don't break.

**Rationale:** Clarify A; SC-002; filters are removed.

**Alternatives:** Two endpoints / scope enum  complicates the UI without winning.

## R6. UX click on the result

**Decision:**

- Node: load the ancestor chain (following `GET` / `ancestors` helper
  or client walk `parent_id`), open the nodes, scrollIntoView + selected.
- edge: to show the links in `EdgeTable`/panels; the anchor of the hierarchy = node `from`.

Optional API helper `GET .../graph/nodes/{id}/path` (list of ancestors from the root)
 **recommended** in contracts not to N+1 from the client.

**Rationale:** Clarify B / A for the edge.

## R7. width of workspace panels

**Decision:** Client-only: `localStorage` key `ods.workspace.panelWidths.v1` =
`{ tree, main, props }` in px. Defaults: tree **260**, main **flex**, props **280**.
Minimum: tree **180**, main **240**, props **220**. Drag on the vertical
SC-004: error ≤5% after reload.

**Rationale:** Pilot without auth; FR-001003; without server API.

**Alternatives:** Server user prefs  overloaded to `013-auth`.

## R7b. The height of the search results in the Graph

**Decision:** Client-only: `ods.graph.searchResultsHeight.v1` = `{ list }` px.
Default **180**, min **100**, max **60vh**. Horizontal splitter under the list;
`startRowResize` next to `startColumnResize`. One height on the nodes of the node/rye.

**Rationale:** Fixed `max-height` is uncomfortable with a large number of coincidences
On the page; the same prefs pattern as the dashboards (without API).

## R8. Compatibility with `002`/`003` texts

**Decision:** We do not use `spec.md` `002`/`003` whole; PATCH/sync semantics and
API scale  in contracts **`007`** (`openapi-portal-scale.yaml`,
`status-cascade.md`, `graph-ui-scale.md`). OpenAPI canon `002` **not** is required
contain cascade/`search`/`parent_id`: extension YAML `007`  the same style as
`006` for graph. Mirror in the `002`/`api-consumer` — Optionally (T033), not part of the DoD.

**Rationale:** Clear boundary in spec `007`; one source of truth for scale UX.

## R9. Code reuse audit

> It is filled with the tasks **T001/T003** when implementing.
> (analyze remediation) so you don't have to wait for a blank pattern.

**Rules (fixed before code):**

| The theme | The decision |
|------|---------|
| `GraphPage` | Only `GraphNodeTree` + search; route `/projects/:id/graph` |
| `EdgeTable` | Reuse with `006` |
| `NodeList` | **Deleted** (2026-07-14); FileGraphPanel  your list |
| Splitters | `WorkspaceLayout` + `GraphPage`; util `startColumnResize` |
| Cascade | Extend `element.repository` / thin service; not second ElementRepository |
| The API graph | `nodes/*` wildcard + decode; ingest TS → `symbols-model-v1` thin |
| Map of files | List of paths  **in this section R9**, not a new file in `contracts/` |
| DoD (T030) | No migration job; no canvas / edit-delete nodes and edges |

**Statute:** R9 done + post-implement cleanup (2026-07-14)  see `spec.md`
«Post-implement notes».

**T001 file map:**

- `backend/src/repositories/element.repository.ts`
- `backend/src/services/element.service.ts`
- `backend/src/services/sync.service.ts`
- `backend/src/api/routes/elements.ts`, `graph.ts`
- `backend/src/services/graph.service.ts`
- `backend/src/repositories/graph-node.repository.ts`, `graph-edge.repository.ts`
- `backend/src/services/ingest/adapters/symbols-model-v1.ingest.ts`, `typescript.ingest.ts`
- `frontend/src/pages/GraphPage.tsx`, `frontend/src/app/GraphRoutes.tsx`
- `frontend/src/layouts/WorkspaceLayout.tsx`, `frontend/src/styles/workspace.css`
- `frontend/src/components/graph/GraphNodeTree.tsx`, `GraphSearch.tsx`, `EdgeTable.tsx`
- `frontend/src/hooks/usePanelWidths.ts`, `useGraphPanelWidths.ts`,
  `useGraphSearchResultsHeight.ts`
- `frontend/src/utils/startColumnResize.ts` (`startColumnResize` + `startRowResize`),
  `reloadIfStaleBundle.ts`
