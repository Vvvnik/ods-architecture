# Draft: UI landscape from code (Graph UI)

**Status**: requirements draft (not a canonical `specs/**/spec.md`)  
**Proposed feature id**: `020-ui-landscape-from-code` (number may shift at `/speckit-specify`)  
**Parent**: `001-ods-vision`  
**Depends on**: `005`/`006` pipeline, `011`–`014` Graph view UX, `018` parser playbook  
**Created**: 2026-07-22  
**Updated**: 2026-07-22 — strengthened portal visual consistency (unified tokens/chrome; no per-element style sprawl)  
**Dogfood**: ODS portal `frontend/` (React 18 + TypeScript/JSX)  
**JSON models**: `ods-help/requirements/json-model/` — `native-ui-tree`, `canonical-node-ui`, `canonical-edge-ui`

## Problem

After code and system parsing, ODS knows services, symbols, and HTTP links, but **not** the structure of the product UI: routes, screens, forms, controls, styles, and which control calls which API. Without that layer, regenerating specs / rebuilding the studied system on a new stack misses the user-facing surface.

## Goal

1. Parse frontend sources → **native UI extract** → ingest → **canonical UI graph** in Elasticsearch (same paradigm as code/system).
2. Portal screen **Graph UI** (name TBD in i18n): Figma-like **structural** view of screens/forms (not pixel-perfect design).
3. Data must support later **spec regeneration** (screens + fields + API contracts), not only visualization.

## Non-goals (v1)

- Pixel-accurate layout / true Figma export
- Editing the UI graph in the portal
- One parser that understands every UI framework without adapters
- Generating target-stack code or full ODS-style specs automatically (data only; generators later)
- Deep internals of React Flow / CodeMirror / layout persistence

## Design principles

### Stack-agnostic canon, stack-specific parsers

| Layer | Changes per project? | Notes |
|-------|----------------------|--------|
| Canonical UI kinds/edges in ES | **No** | Shared model for any frontend |
| Ingest + Graph UI | **No** | Consume canon only |
| Parser module (`react-ui`, later `vue-ui`, …) | New module per **stack**, not per repo | Framework heuristics |
| Optional project hints | Rare path/entry config | No core code forks |

**ODS `frontend/` is the acceptance pilot**, not a hard-coded folder layout for the universe. Heuristics target ecosystem patterns (React Router, JSX forms, `fetch`/`axios`, CSS Modules), so other React/TS apps work without ODS-specific branches.

### Portal visual consistency (ODS UI chrome) — mandatory for Graph UI

**Reference look (as of 2026-07-22):** Workspace, Graph analysis, and Graph view after
shared `page-chrome` / CSS tokens in `frontend/src/styles/workspace.css`
(`--ods-font-size-*`, `--ods-color-surface*`, left-aligned project title bar,
white tree/list surfaces, muted inspector).

All portal surfaces delivered under this feature — especially **Graph UI** —
**MUST** stay in **that same visual system**. Constitution:
**MVP Product Constraints → Portal UI consistency** (v1.4.0+).

| Rule | Requirement |
|------|-------------|
| One chrome | Same project title bar (height, padding, muted background `#f9fafb` / token), **left-aligned** title + secondary hints — not centered, not a one-off header per page |
| One type scale | Titles / body / hints / tree rows only via shared tokens (`--ods-font-size-page-title`, `-body`, `-hint`, `-tree`, …). **MUST NOT** invent per-page `font-size: 22px` / `1.25rem` / inline sizes |
| One surfaces | Tree/list = surface white; header + inspector = surface-muted; borders = shared border token |
| Reuse, don’t fork | New UI **MUST** use `page-chrome`, `page-chrome-header`, `page-chrome-title`, `page-chrome-body` (and existing graph panel patterns). **MUST NOT** copy-paste a parallel header/CSS module that drifts |
| No style sprawl | **MUST NOT** give each control, panel, or Graph UI widget its own ad-hoc palette, font, or spacing. Prefer shared classes/tokens; page-local CSS only for layout that cannot be shared |
| Graph UI = same habit | Center = structural view; **right** = inspector — same density and typography as Graph view inspector |
| Defect, not taste | Visual drift vs Workspace / Graph analysis / Graph view is a **bug**. DoD fails if Graph UI “looks different on purpose” |

**When specifying / implementing `020`:** treat unified chrome as an FR (not a soft guideline). Any new screen or widget that needs a visual exception requires an explicit note in the child `spec.md` — default is **no exception**.

**Existing portal code (mandatory cleanup with this feature):** implementing `020`
**MUST** bring **already shipped** Workspace / Graph analysis / Graph view (and
shared styles under `frontend/src/styles/`) into compliance with the same
unified system — not only build Graph UI correctly. That includes fixing
drift already present in headers, fonts, surfaces, and one-off inline styles
where they diverge from `page-chrome` / CSS tokens. New work **MUST NOT** leave
legacy pages “as is” while Graph UI alone follows the standard; alignment of
existing styles and components is **in scope** of the `020` implementation
tasks (audit + fix pass), unless a task explicitly defers a named remnant with
rationale.


## Canonical model (summary)

Full schemas: paired `*.schema.json` / `*.example.json` in `json-model/`.

### Node kinds (`metadata.layer = "ui"`)

| kind | Meaning |
|------|---------|
| `ui_app` | SPA / frontend root (one or many per system) |
| `ui_module` | Optional feature folder / route group |
| `ui_route` | URL route (`/projects/:projectId/graph-view`) |
| `ui_screen` | Page / primary screen bound to a route or overlay |
| `ui_frame` | Major layout region (shell, left tree, canvas, inspector) |
| `ui_component` | Reusable or page-local component (form, table, modal) |
| `ui_control` | Button, input, select, checkbox, link, tab, tree row, … |
| `ui_flow` | Non-URL workflow (e.g. analysis confirm modals) |
| `ui_style` | Style artifact (CSS module, global sheet, token file) |
| `ui_surface` | Specialty surface marker (`canvas`, `code_viewer`) without diving into lib internals |

Same ES indices as today: `ods-graph-nodes` / `ods-graph-edges` (or documented equivalent). Stable id pattern: `{parser_id}:{kind}:{stable_key}`.

### Edge types

| type | Meaning |
|------|---------|
| `contains` | Hierarchy app → module → route/screen → frame → component → control |
| `navigates_to` | Nav / link / programmatic navigate → route/screen |
| `binds_field` | Control → form field / state name |
| `invokes_api` | Control/screen/flow → `http_endpoint` (preferred) or method+path hint |
| `uses_style` | Screen/component → `ui_style` |
| `opens_flow` | Control → `ui_flow` (modal workflow) |

Cross-layer: `invokes_api` **SHOULD** join existing system `http_endpoint` nodes from `013`/`014` when path/method resolve; otherwise keep an unresolved hint in metadata (orphan allowed).

## First parser: React / TS (JSX·TSX)

**Proposed `parser_id`**: `react-ui`  
**schema_version**: `1`

### Extract (v1)

- Route table (`createBrowserRouter` / `Routes` / route objects)
- Path params and documented query-param contracts when statically visible
- Page/screen components and layout shells
- Nav targets (`Link` / `NavLink` / `navigate(...)`)
- Forms and native controls; control taxonomy at HTML/ARIA level
- Calls into API wrappers (`fetch`, `axios`, project `api/*.ts`) → method + path
- CSS Modules / imported global CSS as `ui_style`
- i18n message keys as stable label ids when resolvable
- Overlay flows (modals/portals) as `ui_flow` when detectable
- Specialty surfaces: mark `canvas` / `code_viewer`, do not parse library internals

### Defer

- Runtime-only routes, dynamic `lazy()` graphs without static targets
- Pixel CSS (computed layout, splitter px, localStorage widths)
- TanStack queryKey / cache details
- Full OpenAPI surface beyond what UI calls
- Non-React stacks (AngularJS petclinic UI, Vue, Blazor, …) — later `parser_id`s on the **same** canon

## Graph UI (portal)

**Placement**: sibling to Graph view (menu + route), same interaction paradigm.

| Aspect | Behavior |
|--------|----------|
| Layout | Center = structural graph; **right** = inspector (properties of selected UI node) — same habit as Graph view |
| Multi frontend | Separate `ui_app` roots when several frontends exist in the system |
| Overview | First screen: **all pages/routes** of the selected app as frames |
| Tabs | Top tabs for pages/modules when many screens |
| Drill-in | Double-click or inspector primary action (“Enter”) → single page: frames → forms → controls → API |
| Consistency | **MUST** match current portal chrome (see §Portal visual consistency): shared tokens/classes only; no per-widget style forks; title bar left-aligned like Workspace / Graph / Graph view |

Suggested route: `/projects/:projectId/graph-ui` (final path in child spec).

### Graph UI implementation constraints (style)

1. **MUST** compose layout from shared portal chrome (`page-chrome*`) and existing inspector/panel patterns — not a new visual language.
2. **MUST NOT** introduce a separate “Graph UI theme”, unique title font sizes, or centered headers.
3. Tabs, frames, and form mock rectangles in the structural view **SHOULD** use the same border/radius/color tokens as graph panels today; decorative one-offs are out of scope.
4. i18n labels only via locale files (existing portal rule); no hard-coded RU/EN strings in components.
5. **MUST** audit and align **existing** pages and CSS (Workspace, Graph analysis, Graph view, shared modules/global sheets, leftover inline styles) to the unified tokens/`page-chrome` as part of implementing this feature — Graph UI is not allowed to be the only compliant screen.

## Pipeline

```text
Detector (frontend/UI artifacts) → react-ui CLI
  → envelope (E01 + native-ui-tree)
  → ods-parser-envelopes
  → ingest → ods-graph-nodes / ods-graph-edges (layer=ui)
  → Graph UI reads view API (new or extended graph/view)
```

Follow `018` for module layout, manifest, adapter registration.

## Acceptance (dogfood on ODS portal)

After one successful analysis of **this** repository:

1. Graph UI overview lists portal routes/pages (`/import`, `/projects`, workspace, graph, graph-view, …).
2. Drill into Import / Workspace / Graph view shows frames + primary controls.
3. Import submit, sync, delete, analysis start show `invokes_api` to real `/api/v1/...` paths (join to endpoints when present).
4. CSS module / global style files appear as `ui_style` or inspector links.
5. Analysis modal flow is not lost (at least one `ui_flow` or equivalent).
6. Graph UI chrome matches Workspace / Graph analysis / Graph view: left-aligned
   project title bar, same type scale tokens, white tree/list vs muted inspector,
   shared `page-chrome` classes — **no** per-element custom fonts/colors that
   diverge from the portal system.
7. Side-by-side check (manual): open Workspace, Graph analysis, Graph view, Graph UI
   for the same project — headers and body typography read as **one** product UI.
8. Implementation tasks include an explicit **style alignment pass** on pre-existing
   frontend styles/code (not only new Graph UI files).

## Open questions

1. Confirm feature number `020` vs next free id at specify time.
2. Extend `graph/view` vs dedicated `graph/ui` API.
3. Unresolved API paths: edge with hint only vs suppress until matched.
4. How many `ui_app` roots in a monorepo (package.json / Vite root heuristics).

## Out of this draft → later

- `vue-ui`, `angular-ui`, AngularJS/JS (e.g. petclinic UI), server-rendered (.NET/Razor, Thymeleaf)
- Spec/code generation from UI+API canon
- Pixel design tokens / theme export

## Related

- Vision backlog: `specs/001-ods-vision/spec.md` (UI landscape + portal consistency)
- Constitution: portal UI consistency constraint
- Models: `json-model/native-ui-tree.*`, `canonical-node-ui.*`, `canonical-edge-ui.*`
- Playbook: `specs/018-parser-extension-playbook/`
