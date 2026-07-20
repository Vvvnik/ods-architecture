# Data Model: 007-portal-scale-ux

**Date**: 2026-07-13
**Spec**: [spec.md]
**Research**: [research.md](./research.md)

Existing entities `002`/`006` ** are not duplicated**; below  fields and rules,
The most important   for  `007`.

## 1. Element (tree, `ods-elements`)

| The field | The role in `007` |
|------|----------------|
| `id`, `project_id`, `path`, `parent_path`, `type` | Identification; cascade by prefix `path` |
| `status` | The purpose of the cascade / inheritance |
| `status_manually_set` | Handwriting; if the child is sync** = `false` |
| `is_active` | Cascade only on active |

### The rules of the cascade

See also [contracts/status-cascade.md]

In short:

- Directory PATCH (except exit from `not_needed`) → one operation for the folder +
  offspring with a prefix for the path.
- File PATCH → one document.
- Soft-limit: >5000 descendants → refusal without record.

### Sync inheritance

New/updated element without its own hand mark under the forehead
`not_needed` + `status_manually_set` → `status=not_needed`,
`status_manually_set=false`.

## 2. GraphNode / GraphEdge (`006`)

No changes to the index scheme.

| The field of the node | Use of the |
|-----------|----------------|
| `parent_id` | The tree / lazy children |
| `name`, `path`, `kind`, `qualified_name` | Search + display |
| `id` | Choice, Path of the Ancestors |

| The edge field | Use of the |
|------------|----------------|
| `type`, `from`, `to`, `path` | Search + link panel |

## 3 . GraphSearchResult (logical DTO)

```text
GraphSearchResult
  nodes: { items: GraphNode[], total, limit, offset }
  edges: { items: GraphEdge[], total, limit, offset }
  q: string
```

Filters/facetes  **not** part of the `007` model (reserved in OpenAPI).

## GraphNodeAncestors (optional DTO)

```text
{ node_id, ancestors: GraphNode[] } // from root to parent
```

For a click from a search without N+1.

## 5. WorkspacePanelWidths (client-only)

```text
{
  tree: number,   // px
  main: number, // px (or flex to calculate)
  props: number   // px
}
```

Storage key: `ods.workspace.panelWidths.v1`. Not stored in ES.

## 5b. GraphSearchResultsHeight (client-only)

The height of the search results list on the Graph screen (common for the Nodes/Edges column):

```text
{ list: number }  // px
```

Key: `ods.graph.searchResultsHeight.v1`. Default **180**, min **100**,
The following is the list of the most commonly used methods of calculating the value of a given value.

## 6. State transitions (folder status)

```text
                  cascade down (*)
  [any] ──────────────────────────► [target]  (directory, * except lift from not_needed)

  not_needed ──(lift to needed|auto_found|…)──► only folder changes; children unchanged
```

`(*)` target ∈ ElementStatus enum `002`; all active descendants = target +
`status_manually_set=true`.
