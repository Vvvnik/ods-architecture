# Data model: AngularJS UI landscape (021)

**Spec**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)  
**Canon / native schema**: reuse `specs/020-ui-landscape-from-code/` —
[native-ui-tree.schema.json](../020-ui-landscape-from-code/contracts/native-ui-tree.schema.json),
[canonical-node-ui.schema.json](../020-ui-landscape-from-code/contracts/canonical-node-ui.schema.json),
[canonical-edge-ui.schema.json](../020-ui-landscape-from-code/contracts/canonical-edge-ui.schema.json)  
**Example**: [contracts/native-ui-tree-angularjs.example.json](./contracts/native-ui-tree-angularjs.example.json)
(synced to `ods-help/requirements/json-model/native-ui-tree-angularjs.example.json` — same U01 schema as React)

## Storage

| Store | Documents |
|-------|-----------|
| `ods-language-reports` | + `artifacts[]` entry `frontend-angularjs` |
| `ods-parser-envelopes` | envelope + native UI tree (`angularjs-ui`) |
| `ods-graph-nodes` | UI nodes (`metadata.layer=ui`) |
| `ods-graph-edges` | UI edges (+ `invokes_api`, `binds_service`) |

ES `_id` for nodes/edges: `{analysis_run_id}:{id}` (same as `006` / `020`).

**No new node/edge kinds** for DoD.

## Detector artifact

```text
ArtifactEntry {
  artifact_type: "frontend-angularjs"
  file_count: number
  sample_paths: string[]
  parser_id: "angularjs-ui" | null
  parser_status: available | missing | failed
  frontend_languages?: string[]   # e.g. javascript under AngularJS root
}
```

Coexists with `frontend-ui` / `react-ui` on the same project when both stacks exist.

## Canonical mapping (reuse `020`)

| Native | Canon |
|--------|--------|
| `apps[]` (`framework: angularjs`) | `ui_app` |
| declared `$state` / `$route` | `ui_route` + `ui_screen` |
| template regions / components | `ui_frame` / `ui_component` (best-effort) |
| controls | `ui_control` (best-effort) |
| controller/screen `$http` calls | `invokes_api` (resolve or unresolved hint) |
| ui_app → API Gateway service | `binds_service` |

Stable id: `{parser_id}:{kind}:{stable_key}` with `parser_id=angularjs-ui`.

## DoD counting rules

- **Page (SC-001):** declared **URL-bearing, non-abstract** route/state only
  (`ui_route` / linked `ui_screen`). Abstract parents do not count.
- **HTTP bind (SC-003):** `invokes_api` from screen/controller sufficient.
- **Graph view action (SC-005):** `binds_service` from `ui_app` → API Gateway.

## Lifecycle

1. Sync → detector → language report (+ `frontend-angularjs` when matched).
2. User confirms → orchestrator spawns `angularjs-ui` when available.
3. Envelope stored → ingest UI nodes/edges → `binds_service` to gateway when
   resolvable.
4. Graph UI reads latest run with UI data via existing `/graph/ui` APIs.
5. Extract failure → run succeeds without UI landscape; parser status failed.
6. New analysis run supersedes prior UI snapshot for that parser.

## Validation rules

- `ui_app` required if any `angularjs-ui` UI nodes exist for the run.
- Overview empty if no declared routes/screens for the app.
- Inspector Graph UI action requires `binds_service` to the selected service id
  (gateway on petclinic DoD).
- MUST NOT create `http_endpoint` solely from client URL.
- MUST NOT treat Angular 2+ hits as this artifact’s DoD success.
