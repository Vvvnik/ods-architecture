# Data model: 011-ods-graph-viewer

**The canon of nodes/edges** does not change (`006`/`008`/`009`). Below is the "**"slice model
view** (read-model), which gives API and consumes UI.

## 1. The existing canon (read-only)

| Entity | Index / source | Usage in `011` |
|----------|-------------------|------------------------|
| Graph node | `ods-graph-nodes` | Participants, inside, resolve service |
| Graph edge | `ods-graph-edges` | Focus connections ↔ external / inside |
| Analysis run | As in `006` | `analysis_run_id` snapshot |

Key fields of a node: `id`, `kind`, `name`, `qualified_name`, `path`,
`parent_id`, `metadata.layer`, `metadata.engine` (DB).

The key fields of ribs: `id`, `from`, `to`, `type`, `metadata.layer`.

## 2. GraphViewSlice (the answer is API)

| Field | Type | The rule |
|------|-----|---------|
| `project_id` | string | MUST |
| `analysis_run_id` | string | MUST |
| `focus_id` | string \| null | `null` = "System" level |
| `focus_kind` | string \| null | convenience |
| `nodes[]` | ViewNode | Inside + outside stubs |
| `edges[]` | ViewEdge | only between the slice nodes |
| `truncated` | boolean | MUST |
| `limits` | `{ max_nodes, max_edges }` | actually applied |
| `counts` | `{ nodes, edges, omitted_nodes?, omitted_edges? }` | for the UI message |

### ViewNode

| Field | The rule |
|------|---------|
| all public fields graph node (as list API) | MUST for real nodes |
| `role` | `"inside"` \| `"external"` \| `"focus"` — `focus` can duplicate inside root |
| `stub` | boolean — for external MAY true (no extra fields) |

### ViewEdge

As a public graph edge; both ends MUST be present in `nodes[]`.

## 3. Client status (not ES)

| Condition | Keeping | The rule |
|-----------|----------|---------|
| Selection | React state | click; inspector |
| Focus stack / breadbreadcrumbs | React state (+ URL `focus`) | "Enter" / "Up" |
| Viewport (zoom/pan) | React Flow + MAY session | is not a canon |
| Node positions | auto-layout; MAY sessionStorage | key `project+run+focus` |

## 4. Rules for constructing a slice

### 4.1 focus = null (System)

1. Candidates peer — R6 research.
2. Edges between candidates (system layer preferably).
3. Truncation: services first → linked infra → rest (R3).
4. All the remaining nodes: `role=inside` (or peer no focus); `stub=false`.

### 4.2 focus = service | broker | …

1. Node focus → `role=focus`.
2. Inside set by R6.
3. External = neighbors in the ribs from focus∪inside outside inside;
   `role=external`, `stub=true` (without revealing their insides).
4. Edges only between nodes of the cut (focus ∪ inside ∪ external), within cap.
5. Truncation: always keep focus; when space is tight, prefer external
   and ribs, preserving the visibility relations; `truncated=true`.

### 4.3 Resolve code → service

The algorithm R5; the result of either `focus_id=service` or slice "System" +
banner on UI (`resolve_status=system_fallback` in API).

## 5. Validation

- `nodes.length` ≤ `limits.max_nodes`
- `edges.length` ≤ `limits.max_edges`
- There is no edge with an end outside `nodes`
- External does not contain children focus (there are no "revealed" foreign entrails)
- Empty peer set with the existing graph → HTTP 200 + empty nodes + flag
  for empty-state "no system" (to distinguish it from 404 graph_not_found)

## 6. That is not modeled in `011`

- New kinds DB hierarchy
- Annotations / not_needed overlay
- Persisted layouts in ES
- Code-bottom drill tree (follow-up)
