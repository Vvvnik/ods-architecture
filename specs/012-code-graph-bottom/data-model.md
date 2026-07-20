# Data model: 012-code-graph-bottom

**Spec**: [spec.md](./spec.md)  
**Canon nodes/edges**: no change indices (`006` / `009`).  
**Slice view**: extension DTO `011` ([data-model 011](../011-ods-graph-viewer/data-model.md)).

## View Entities (read-model)

### GraphViewSlice (extension)

| Field | Type | Description |
|------|-----|----------|
| (fields `011`) |  | `focus_id`, nodes, edges, truncated, limits, counts, resolve_status, empty_reason |
| `layer` | `system` \| `code` | The active slice layer |
| `affiliation` | object? | MAY: `{ mode: 'explicit'\|'view_only'\|'none', service_id? }` |

### GraphViewNode (as `011` +)

| Field | Description |
|------|----------|
| `role` | `focus` \| `inside` \| `external` |
| `stub` | true for simplified external |
| `metadata.layer` | `system` \| `code` (from canon) |

### empty_reason (addition)

| Meaning | When |
|----------|--------|
| `no_graph` | like `011` |
| `no_system_participants` | like `011` |
| `no_related_code` | `layer=code` service/context without affiliated code |

### resolve_status (supplement)

| Meaning | When |
|----------|--------|
| `exact` | how `011` (system peer) |
| `resolved_service` | like `011` R5 |
| `system_fallback` | like `011` |
| `exact_code` | `resolve_from` / focus on code-node successfully |

## Affiliation (view-only, not entity ES)

**ServiceCodeAffiliation** (calculated in `GraphViewService`):

| Field | Description |
|------|----------|
| `service_id` | id node `kind=service` |
| `service_name` | service name compose- |
| `code_node_ids` | the set of id code-nodes that have passed R1 |
| `mode` | `explicit` if there was parent/edges; otherwise `view_only` |

**Validation rules:**

- Do not create documents in ES.
- One code-node MAY can get into several services only if the heuristics
  conflict — then wins longest path match / more specific
  segment; in case of a draw — the first stable sort id (determinism tests).

## Hierarchy drill (logical levels)

Not separate tables — levels from `kind` canon:

```text
service (system) --"code"--> module|file|namespace → class|interface|… → method|function|…
```

Connections in the slice: any existing types of edges, incident focus∪inside
(`calls`, `injects`, `depends_on`, …).

## State transitions (client navigation)

```text
System --Log in--> service/system-interior
service --"code"--> code roots (layer=code)
code-node --Log in--> child focus | external neighbor focus
* --To the system--> System (layer=system, focus=null)
* --Up--> previous crumb
analysis --resolve_from code--> focus=code (exact_code) | fallback 011
```

## Out of model

- Entry affiliation into the canon
- Database hierarchy physics→logic→schema
- The coordinates of the nodes in ES
