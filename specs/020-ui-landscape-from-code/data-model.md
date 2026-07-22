# Data model: UI landscape (020)

**Spec**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)  
**Native**: [contracts/native-ui-tree.schema.json](./contracts/native-ui-tree.schema.json)  
**Canon**: [contracts/canonical-node-ui.schema.json](./contracts/canonical-node-ui.schema.json),
[contracts/canonical-edge-ui.schema.json](./contracts/canonical-edge-ui.schema.json)

## Storage

| Store | Documents |
|-------|-----------|
| `ods-language-reports` | + `artifacts[]` entry `frontend-ui` |
| `ods-parser-envelopes` | envelope + native UI tree (`react-ui`) |
| `ods-graph-nodes` | UI nodes (`metadata.layer=ui`) |
| `ods-graph-edges` | UI edges (+ `invokes_api`, `binds_service`) |

ES `_id` for nodes/edges: `{analysis_run_id}:{id}` (same as `006`).

## Detector artifact

```text
ArtifactEntry {
  artifact_type: "frontend-ui"
  file_count: number
  sample_paths: string[]
  parser_id: "react-ui" | null
  parser_status: available | missing | failed
}
```

Frontend language summary for modal MAY list language codes found under the
detected SPA root(s) (implementation detail in detector contract).

## Canonical node kinds (`layer=ui`)

| kind | Role |
|------|------|
| `ui_app` | SPA / package root |
| `ui_module` | Optional feature group |
| `ui_route` | Route path pattern |
| `ui_screen` | Page / primary screen |
| `ui_frame` | Layout region |
| `ui_component` | Form, table, modal, … |
| `ui_control` | Button, input, select, … |
| `ui_flow` | Non-URL wizard/overlay |
| `ui_style` | CSS module / global sheet |
| `ui_surface` | canvas / code_viewer marker |

Stable id: `{parser_id}:{kind}:{stable_key}`.

## Canonical edge types

| type | from → to |
|------|-----------|
| `contains` | hierarchy |
| `navigates_to` | screen/control → route/screen |
| `binds_field` | control → field name (to may be synthetic or metadata-only) |
| `invokes_api` | control/screen/flow → `http_endpoint` **or** unresolved hint |
| `uses_style` | screen/component → `ui_style` |
| `opens_flow` | control → `ui_flow` |
| `binds_service` | `ui_app` → system `service` |

## Unresolved API

When method+path cannot match an `http_endpoint`:

- still emit `invokes_api` with `metadata.unresolved_api=true`,
  `http_method`, `path_template`, optional `body_fields`;
- `to` MAY be a stable hint id `react-ui:api_hint:{METHOD}:{path}` **or**
  omit target node and keep fields on the edge only (ingest chooses one
  approach consistently — prefer edge metadata + synthetic hint node of kind
  documented in ingest contract, **not** a fake `http_endpoint`).

## Lifecycle

1. Sync → detector → language report (+ `frontend-ui` artifact).
2. User confirms analysis → orchestrator spawns `react-ui` when available.
3. Envelope stored → ingest UI nodes/edges → optional `binds_service`.
4. Graph UI reads latest run with UI data via `/graph/ui` APIs.
5. New analysis run supersedes prior UI snapshot (same run semantics as other layers).

## Validation rules

- `ui_app` required if any UI nodes exist for the run.
- Overview Graph UI empty if no `ui_route`/`ui_screen` for selected app.
- Inspector Graph UI action requires `binds_service` from some `ui_app` to the
  selected service id.
