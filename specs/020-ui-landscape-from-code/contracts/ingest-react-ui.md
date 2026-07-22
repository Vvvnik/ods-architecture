# Ingest: react-ui → UI canon (020)

**Spec**: [spec.md](./spec.md)  
**Native**: [native-ui-tree.schema.json](./native-ui-tree.schema.json)  
**Canon**: [canonical-node-ui.schema.json](./canonical-node-ui.schema.json),
[canonical-edge-ui.schema.json](./canonical-edge-ui.schema.json)

## Adapter

| Item | Value |
|------|--------|
| `parser_id` | `react-ui` |
| Input | Envelope `model` = native UI tree |
| Output | UI nodes/edges in `ods-graph-nodes` / `ods-graph-edges` |

Follow `018` / `006` adapter registration. Adapter errors → ingest error record;
do not fail the entire analysis run.

## Mapping (summary)

1. Each native `apps[]` → `ui_app` (+ nested modules/routes/screens/…).
2. Hierarchy → `contains`.
3. Navigations → `navigates_to`.
4. Control field binds → `binds_field` when present in native extract.
5. Control `api_calls` → `invokes_api` (resolve endpoint or unresolved hint).
6. Styles → `ui_style` + `uses_style`.
7. Specialty surfaces → `ui_surface` (canvas / code viewer markers; no library
   internals as separate landscape trees).
8. Flows → `ui_flow` + `opens_flow` when linked.
9. Emit `binds_service` from `ui_app` → system `service` when heuristics match
   ([research.md](../research.md) R9). Dogfood MUST produce ≥1 link on ods-arch.

Adapter module path: `backend/src/services/ingest/adapters/react-ui.ingest.ts`
(same `*.ingest.ts` convention as sibling adapters).

## Idempotency

Stable ids `{parser_id}:{kind}:{stable_key}`. Incremental analysis cleans stale
UI docs for paths/apps no longer present (same philosophy as other adapters).

## Unresolved API

See [data-model.md](../data-model.md). MUST NOT create `http_endpoint` solely
from client URL.
