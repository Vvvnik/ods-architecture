# Implementation plan: Viewing the system graph (011)

**Branch**: `011-ods-graph-viewer` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Entrance**: `specs/011-ods-graph-viewer/spec.md` — "Graph analysis" / "Graph view";
scheme drill-down system; slice "focus + external"; clarify 2026-07-15

**Dependencies**:

- `specs/001-ods-vision/spec.md` — stage 10
- `specs/006-project-graph/spec.md` — Canon, summary/nodes/edges
- `specs/007-portal-scale-ux/spec.md` — list GraphPage menu
- `specs/008-code-graph-depth/spec.md` — code kinds (just a bunch analysis→preview)
- `specs/009-system-landscape/spec.md` — system kinds / layer
- `specs/010-scale-pipeline/spec.md` — large graph; canvas out `010`

## Summary

Add **second screen count** — interactive diagram system-landscape
rule **focus + only external connection** without editing Canon without dump only
index.

1. **Backend** — endpoint slice view `GET .../graph/view` (server
   assembly of nodes/edges + stub-external flag + priority truncation service→info).
2. **Frontend** — the menu item "Graph view"; page React Flow; breadcrumbs;
   inspector; the "Log in"/double-click; pan/zoom; a bunch of "Graph analysis".
3. **Regression** — former "Count" → "Graph analysis" without losing UX `006`/`007`.

DoD MVP: only **system** navigation. Follow-up "to the bottom" code and DB hierarchy —
clearly in "spec" "Postponed", not in acceptance.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend + frontend)

**Primary Dependencies**: Fastify + Elasticsearch (existing graph
repositories); React 18 + Vite; **`@xyflow/react`** (React Flow) + layout
helper (dagre or ELK — see research); Vitest / Testing Library; Playwright
smoke optional in tasks

**Storage**: read-Only `ods-graph-nodes` / `ods-graph-edges` (and analysis runs
as it is now). The coordinates of the nodes **not** in ES (MAY sessionStorage). New indexes
no.

**Testing**: unit — view-slice builder (system peers, broker topics, truncation
priority, service resolve from code path); API contract tests; frontend —
GraphViewPage empty/truncated/enter focus; regression MainMenu + GraphPage rename

**Target Platform**: Docker Compose profile `full` (`docker/`)

**Project Type**: Backend API extension + frontend page (web)

**Performance Goals**: SC-001 — level "System" `system-landscape-demo`
clear &lt; 10 C; default caps slice **200 nodes / 500 ribs** (configurable
constants); response view no N+1 one edge to the whole landscape

**Constraints**: No edit Canon; without searching for the viewing; without code drill in DoD;
no fake database hierarchy; localized empty/truncate; server slice required
for DoD (client N+1 — not accepted)

**Scale/Scope**: MVP system-navigation; benchmark
`docker/fixtures/repos/system-landscape-demo/`; large-repo — smoke "no full
dump" (landmark after `010`)

## Constitution Check

*GATE: to Phase 0 after Phase 1.*

| Requirement | Status |
|------------|--------|
| VI. Detailed Spec `011` not FR in `001` | ✅ stage 10 already `001` |
| TypeScript + ES metadata | ✅ read-only graph indices |
| Code after plan/tasks | ✅ |
| Language policy (constitution) | ✅ |
| Draft , canon | ✅ `ods-help/...-draft.md` → `spec.md` |
| Without auth / RAG / edit count | ✅ |
| Follow-up "to the bottom" / DB hierarchy is not mixed with DoD | ✅ "Postponed" in spec |

**Post-design:** research + data-model + contracts + quickstart; no violations.

## Project Structure

### Documentation (this feature)

```text
specs/011-ods-graph-viewer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi-graph-view.yaml
│   └── graph-view-ui.md
└── tasks.md                 # /specit-tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/routes/graph.ts          # + GET .../view
│   ├── api/schemas/graph.schemas.ts
│   ├── services/graph.service.ts
│   ├── services/graph-view.service.ts   # NEW: slice builder
│   └── repositories/graph-*.ts      # query helpers as needed
└── tests/
    └── … graph-view …

frontend/
├── src/
│ ├── components/MainMenu.tsx # "Graph analysis" / "Graph view"
│   ├── app/router.tsx / GraphRoutes
│ ├── pages/GraphPage.tsx # analysis (rename labels only)
│   ├── pages/GraphViewPage.tsx      # NEW
│   ├── components/graph-view/       # NEW: canvas, inspector, breadcrumbs
│   ├── api/graph.ts                 # + getGraphView
│   └── i18n/ru.ts
│ (tests co-located: `*.test.tsx` next to the components / pages)
```

**Structure Decision**: Expansion of existing `backend` + `frontend` no new
application packages. Parsers/`005`–`010` ingest **not** touch in MVP.

## Complexity Tracking

> Empty — there are no violations of the constitution.

## Phase 0 / Phase 1 outputs

| The artifact | Way |
|----------|------|
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| API contract | [contracts/openapi-graph-view.yaml](./contracts/openapi-graph-view.yaml) |
| UI contract | [contracts/graph-view-ui.md](./contracts/graph-view-ui.md) |
| Quickstart | [quickstart.md](./quickstart.md) |

## Implementation sketch (for tasks not FR)

1. `GraphViewService.buildSlice({ projectId, focus?, analysisRunId? })`
2. Route mount next to existing graph routes
3. Frontend: React Flow canvas, fit-view, selection ≠ focus
4. Deep-link: `/graph-view?focus=` / `?resolve_from=`; back to analysis
   `/graph?select=` (see `contracts/graph-view-ui.md`, research R8)
5. Resolve service from code: `parent_id` chain + path/heuristics (research R5)

## Follow-ups (not DoD)

- Diagram to the "bottom" code (spec "Postponed")
- The hierarchy of the database physics→logic→scheme (data + UX)
- Numeric caps as ops-config if necessary

### Post-DoD (2026-07-27) — recorded in tasks/research

- Peer-first overview + inside cap (T045–T046, R11)
- Inspector «N more» (T047); client slice cache (T048, R12)
- Viewport pan/zoom restore (T049, R13) for **Graph view** and **Graph UI**
  (shared util); Graph UI data cache also in `020` T048
