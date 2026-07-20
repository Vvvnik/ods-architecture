# UI-contracts: widths of workspace panels (007)

**Depends on**: three-column layout `003` (`WorkspaceLayout` / `WorkspacePage`).

## The behavior

Column and splitter workspace tag  **only** in the layout workspace
(`WorkspaceLayout` + `workspace.css`), not on the project page.

Screen column widths Graph  separately: `useGraphPanelWidths` /
`ods.graph.panelWidths.v1`; the height of the search list  `useGraphSearchResultsHeight` /
`ods.graph.searchResultsHeight.v1` (see `graph-ui-scale.md`). General drag
`startColumnResize` / `startRowResize`.

Between the columns, a tree | The file | Properties of vertical dividers
   (drag on the `pointerdown`/`pointermove`/`pointerup`).
2. With drag the width of the clamp is at least:
   - tree ≥ **180** px
   - the main (file) ≥ **240** px (reserve at the clamp of adjacent columns;
     column **flex: 1**, the apparent width `main` in the px layout **not** sets)
   - properties ≥ **220** px
   - Max tree/props is further limited to the width of the container
     (`usePanelWidths` + `panelsRef.clientWidth`), so that `main` does not shrink
     below the minimum
3. After release  write to `localStorage`:

```text
key: ods.workspace.panelWidths.v1
value: JSON { "tree": number, "main": number, "props": number }
```

   Field `main`  **marker** flex-residual (in runtime often `0`); persisted for
   The width of the column is not affected.
4. In the mount workspace  read the key; in the absence of JSON/bit  defaults
   `tree=260`, `props=280`, `main` = marker of the remainder (usually `0`).
5. Error after reload ≤ **5%** (SC-004) for tree/props.

## A11y / UX

- The separators are from `role="separator"`, `aria-orientation="vertical"`,
  `aria-valuenow` (px) as much as possible.
- Storage error reports are not required (fail-soft → defaults).

## Outside the scope

- Browser/server width sync.
- A horizontal mobile breakpoint redesign.
