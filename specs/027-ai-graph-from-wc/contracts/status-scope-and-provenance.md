# Contract: Status scope and provenance (027)

## Element Status × analysis / AI scope

| Status | In inventory / parser analysis | In AI WC path list | In Status picker |
|--------|--------------------------------|--------------------|------------------|
| `auto_found` | Yes | Yes | Yes |
| `needed` | Yes | Yes | Yes |
| `not_needed` | No (+ inherited descendants) | No | Yes |
| `found` (legacy) | Yes (treat as auto_found) | Yes | No |
| `unused` (legacy) | No (treat as not_needed) | No | No |

Sync: unchanged full WC walk; statuses preserved; tree still lists
`not_needed` paths.

Import: always `auto_found`; never AI.

## Graph provenance badge

| `AnalysisRun.graph_builder` | Badge meaning (i18n) |
|----------------------------|----------------------|
| `parsers` | Built by parsers |
| `ai` | Built by AI |

**MVP surface:** Graph View header (required).  
Optional: reuse on other run-summary chrome if already present — not a
separate DoD.

MUST NOT change `ProjectElement.status` semantics or labels to encode
builder identity.

## Current graph resolution

Unchanged: resolvers pick latest **graph-ready** run. After AI success,
that run has `graph_builder=ai`. After later parser success, `parsers`.
Failed AI leaves previous graph-ready run (and its badge) intact.
