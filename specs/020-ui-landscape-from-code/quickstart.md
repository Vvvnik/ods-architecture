# Quickstart: UI landscape / Graph UI (020)

**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)

## Prerequisites

- Stack up: `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
  (rebuild **frontend** after UI changes: `--build frontend`).
- Dogfood project: ODS portal sources (e.g. `/repos/ods-arch` or this monorepo
  imported as a project) — **React/TS frontend**, not petclinic AngularJS for DoD.

## 1. Sync + confirm modal

1. Open project → Sync.
2. First analysis modal (**Languages**) shows a **Frontend** block:
   frontend language(s) + **frontend** mark + `react-ui` parser status
   (available on a successful build with the module registered).
3. Confirm → second modal → start analysis.

**Expect:** analysis run includes `react-ui` when artifact `frontend-ui` is
available.

## 2. Graph UI overview

1. Menu → **Graph UI** (or `/projects/:id/graph-ui`).
2. Overview lists main portal routes/pages as **non-overlapping** frames.
3. Use **+ / − / fit** — content stays in the center viewport.
4. Title bar left-aligned; chrome matches Workspace / Graph / Graph view.

## 3. Drill + API binds

1. Double-click or inspector **Enter** on Import / Workspace (or equivalent).
2. See frames/controls; select a control that calls API.
3. Inspector shows `invokes_api` (joined endpoint or unresolved hint).

**Expect:** ≥3 dogfood actions with API association (SC-003); analysis confirm
`ui_flow` present (SC-008).

## 4. Graph view → Graph UI

1. Open **Graph view**; select the system service **linked** to the UI app
   (`binds_service`).
2. Right inspector shows **Graph UI** action → opens Graph UI.
3. Select a database / unrelated service → action hidden/disabled.

## 5. Empty project without frontend UI

On a project with no `frontend-ui` artifact: Graph UI empty state is clear;
other graph screens still work.

## 6. Style alignment smoke

Side-by-side Workspace, Graph analysis, Graph view, Graph UI — same title
alignment, type scale, surface roles.

## API smoke (optional)

```bash
# Replace PROJECT_ID
curl -s "http://localhost:8080/api/v1/projects/PROJECT_ID/graph/ui" | head
curl -s "http://localhost:8080/api/v1/projects/PROJECT_ID/analysis/language-report/latest" | head
```

## Notes (implement 2026-07-22)

- Parser dogfood extract on monorepo `frontend/` yields 1 app, 8 routes
  (including `/projects/:projectId/graph-ui`), styles, surfaces
  (`canvas` / `code_viewer`), and `analysis-confirm` flow.
- Integration API test `graph-ui-overview.test.ts` runs only when Elasticsearch
  is available (`skipIf` otherwise).
- After UI portal changes, rebuild frontend:  
  `docker compose -f docker/docker-compose.dev.yml --profile full up -d --build frontend`
- Full end-to-end sync→analyze→Graph UI still needs a live stack + project import;
  unit coverage: detector, ingest, extract, GraphInspector Graph UI action.

## Related contracts

- [detector-frontend-ui.md](./contracts/detector-frontend-ui.md)
- [ingest-react-ui.md](./contracts/ingest-react-ui.md)
- [ui-graph-ui.md](./contracts/ui-graph-ui.md)
- [openapi-graph-ui.yaml](./contracts/openapi-graph-ui.yaml)
