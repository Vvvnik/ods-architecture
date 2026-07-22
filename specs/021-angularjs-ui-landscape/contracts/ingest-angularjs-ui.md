# Ingest: angularjs-ui → UI canon (021)

**Spec**: [spec.md](./spec.md)  
**Native schema** (shared with React): `specs/020-ui-landscape-from-code/contracts/native-ui-tree.schema.json`
(draft mirror: `ods-help/requirements/json-model/native-ui-tree.schema.json`)  
**Example** (same file kept in sync): [native-ui-tree-angularjs.example.json](./native-ui-tree-angularjs.example.json)
↔ `ods-help/requirements/json-model/native-ui-tree-angularjs.example.json`  
**Canon**: `020` canonical-node-ui / canonical-edge-ui (no AngularJS-specific kinds)  
**Research**: [research.md](../research.md) R4

## Adapter

| Item | Value |
|------|--------|
| `parser_id` | `angularjs-ui` |
| Input | Envelope `model` = native UI tree (`framework: angularjs`) |
| Output | UI nodes/edges in `ods-graph-nodes` / `ods-graph-edges` |

Follow `018` / `006` adapter registration. Adapter errors → ingest error record;
**do not** fail the entire analysis run.

Adapter module path:
`backend/src/services/ingest/adapters/angularjs-ui.ingest.ts`  
Prefer shared transform helper with `react-ui` (same native→canon mapping).

## Mapping (summary)

Same as `020` ingest-react-ui:

1. Each native `apps[]` → `ui_app` (+ nested routes/screens/…).
2. Hierarchy → `contains`.
3. Navigations → `navigates_to`.
4. Screen/controller `api_calls` → `invokes_api` (resolve endpoint or unresolved
   hint). Control-level binds preferred when present; **not required** for DoD.
5. Emit `binds_service` from `ui_app` → system **API Gateway** service when
   resolvable (name/path heuristics: `api-gateway`,
   `spring-petclinic-api-gateway`, compose service identity). Petclinic DoD
   MUST produce ≥1 such link (SC-005).

## Idempotency

Stable ids `{parser_id}:{kind}:{stable_key}` with `parser_id=angularjs-ui`.
Incremental analysis cleans stale UI docs for this parser consistently with
other adapters.

## Unresolved API

Same as `020`: MUST NOT create `http_endpoint` solely from client URL; keep
`invokes_api` with unresolved metadata / hint node.
