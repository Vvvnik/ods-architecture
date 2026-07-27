# Research: UI landscape from code (020)

**Feature**: `020-ui-landscape-from-code`  
**Date**: 2026-07-22  
**Spec**: [spec.md](./spec.md)

## R1. Parser placement (language vs artifact)

**Decision:** Ship `parsers/react-ui/` as an **artifact-style** capability module
(`parser_id: react-ui`), spawned from `artifacts[]`, **not** mixed into the
`typescript` symbols parser (`018` rule: no symbols+HTTP/UI in one module).

**Rationale:** UI landscape is a separate canon layer (`metadata.layer=ui`),
parallel to code/system. Mixing into `typescript` would couple symbol extract
with routes/forms and break playbook.

**Alternatives considered:** Extend `typescript` parser — rejected (018).  
Separate language entry only — rejected (UI is not “another language”).

## R2. Detector signal for frontend + modal window 1

**Decision:**

1. Detector adds `artifacts[]` entry  
   `{ artifact_type: "frontend-ui", parser_id: "react-ui", file_count, sample_paths, parser_status }`  
   when a React/TS SPA root is found (heuristics: `package.json` with `react` +
   router, and/or `vite.config.*` / `src/main.tsx` under a frontend package path).
2. Window 1 (`LanguagesConfirmModal`) gains a **Frontend** summary block:
   - detected frontend language(s) (e.g. TypeScript/JavaScript under that root)
     with an explicit **frontend** badge;
   - `react-ui` **parser_status** (available / missing / failed) — same badge
     pattern as languages/artifacts.
3. Orchestrator spawns `react-ui` from `artifacts[]` like other system parsers
   when `parser_status=available`.

**Rationale:** Matches clarify FR-016/017; reuses `artifacts[]` spawn path from
`009`; avoids inventing a file named `languages.json` (report lives in ES
`ods-language-reports`).

**Alternatives considered:** Only mark rows inside `languages[]` — insufficient
to spawn a separate parser_id cleanly.  
Opt-in flag — rejected (clarify B = automatic).

## R3. Canonical storage

**Decision:** Persist UI nodes/edges in existing `ods-graph-nodes` /
`ods-graph-edges` with `metadata.layer = "ui"`. Extend kind/type enums per
contracts copied from `ods-help/requirements/json-model/canonical-node-ui` and
`canonical-edge-ui`. Add cross-link edge **`binds_service`**: `ui_app` → system
`service` id when resolvable (for Graph view inspector action).

**Rationale:** Same pattern as code/system layers; Graph UI filters by layer;
FR-004a/b need explicit association.

**Alternatives considered:** Separate ES indices — unnecessary for MVP scale.  
Name-heuristic only for inspector button — rejected (clarify Q5 = B).

## R4. Graph UI read API

**Decision:** Dedicated endpoints under graph API (not overload `GET .../graph/view`):

- `GET /api/v1/projects/:projectId/graph/ui` — overview slice (apps, routes/screens,
  optional module tabs meta); query: `app` (ui_app id), `analysis_run_id` optional
  (default latest successful with UI data).
- `GET /api/v1/projects/:projectId/graph/ui/screen` — drill slice for one
  screen/route; query: `screen` (or route) id + `app`.

Response: nodes + edges (UI layer) + resolve hints for `invokes_api` targets.

**Rationale:** Clarify: dedicated surface parallel to Graph view; keeps system
view builder unchanged.

**Alternatives considered:** Reuse `/graph/view?layer=ui` — rejected (different
layout semantics, risk of breaking system caps/roles).

## R5. Graph UI center rendering

**Decision (updated 2026-07-22):** Reuse **React Flow** viewport habits from
Graph view (`Background`, `Controls` +/-/fit, pan, wheel zoom toward cursor).
UI entities are **custom RF nodes** (`uiFrame`) in a **fixed non-overlapping
grid**; `nodesDraggable={false}` / `nodesConnectable={false}` — frames do not
move; only the viewport pans/zooms. Not the system-node layout/slice algorithms.

**Rationale:** Same interaction model users already know from Graph view;
avoids reimplementing pan/zoom. Still schematic UI landscape, not Graph view
code/system graph.

**Alternatives considered:** Custom CSS transform viewport — rejected after
dogfood UX (zoom-to-corner, pan friction). Pure list-only — weaker DoD.

## R12. Client cache + viewport restore (2026-07-27) — done

**Decision:** Graph UI uses the same client patterns as Graph view (`011`
R12–R13): react-query for overview/screen slices; `sessionStorage` pan/zoom
via shared `frontend/src/utils/graphViewportCache.ts` (keys under `graph-ui:…`).
Remount restores last zoom; first open may still wait on the API.

**Tasks:** T048–T049 (aligned with `011` T048–T049).

## R6. UI → API join

**Decision:** At ingest, resolve `invokes_api` to existing `http_endpoint` nodes
(same analysis run / project) by method + normalized path. On miss, keep edge to
a **hint** target or edge metadata `unresolved_api: true` + `path_template` /
`http_method` (orphan allowed; no new endpoint from client URL alone).

**Rationale:** Aligns with `013`/`014` and clarify default.

## R7. Overlay flows DoD

**Decision:** Extract analysis confirm flow (LanguagesConfirm → ChangesConfirm →
progress) as `ui_flow` on dogfood — **required**. Other modals best-effort.

**Rationale:** Clarify Q2 = B.

## R8. Portal chrome alignment

**Decision:** Explicit task pass: reuse `page-chrome*` / CSS tokens in
`frontend/src/styles/workspace.css`; audit Workspace / GraphPage / GraphViewPage
inline drifts; Graph UI MUST use the same chrome. Zoom controls styled
consistently with Graph view controls.

**Rationale:** Constitution Portal UI consistency + FR-009–011.

## R9. Service ↔ ui_app link heuristics (dogfood)

**Decision:** Prefer linking `ui_app` to system `service` that:

1. owns outgoing `http_calls` matching the UI client base, and/or  
2. matches package/compose service name to frontend package (`frontend`, app name).

Document heuristics in ingest contract; must produce at least one link on
ods-arch dogfood for SC-010.

**Rationale:** Enables FR-004a without name-only false positives on petclinic
gateway.

## R10. Code reuse audit (high level)

| Area | Reuse |
|------|--------|
| Detector artifacts + modal | `009` patterns |
| Parser CLI / envelope / registry | `005`/`018` |
| Ingest adapters | `006` registry |
| Graph API auth/project scope | existing graph routes |
| Inspector action pattern | `014` GraphInspector |
| page-chrome / tokens | current portal styles |
| i18n | `en.ts` / `ru.ts` |

No new product auth/RAG/docs.

## R11. Angular 2+ stack (post-DoD, 2026-07-27)

**Decision:** Add `parsers/angular-ui` + detector `frontend-angular` for Angular
2+ (`@angular/core`, `*-routing.module.ts` / `*.routes.ts`). Reuse the same
native UI tree ingest as `react-ui`. Tighten `react-ui` to omit zero-route
packages and parse JSX `<Route>`. AngularJS 1.x stays `021` / `angularjs-ui`.

**Rationale:** Large monorepo dogfood SPAs are Angular 2+, not React Router
object-tables — Graph UI showed `no_screens` despite real route tables.

**Alternatives considered:** Extend `angularjs-ui` for Angular 2+ — rejected
(different APIs/artifact types). Full Speckit feature — deferred; recorded as
`020` T047.
