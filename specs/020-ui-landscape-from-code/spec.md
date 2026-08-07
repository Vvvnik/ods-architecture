# Specification: UI landscape from code (Graph UI)

**Feature**: `020-ui-landscape-from-code`

**Created**: 2026-07-22

**Status**: Implemented (2026-07-22; React/TS dogfood closed)

**Input**: Draft `ods-help/requirements/020-ui-landscape-from-code-draft.md`
(UI layer from frontend sources + portal Graph UI; unified portal chrome;
English artifacts / portal UI i18n `en`+`ru`).

**Parent Spec**: `specs/001-ods-vision/spec.md` (Post-MVP — UI landscape)

**Dependencies**: `005`/`006` (analysis pipeline, canonical graph);
`011`–`014` (Graph view paradigm, HTTP endpoints / client calls);
`018` (parser extension playbook).

## Short description

After analysis, ODS already shows **code** and **system** structure. This feature
adds a third landscape: **UI** — routes, screens, forms, controls, styles, and
which UI actions call which known APIs — so an architect can see how product
interfaces are built from the repository, and so later work can regenerate
specifications for rebuilding or extending the studied system.

The portal gains **Graph UI**: structural overview of pages as **schematic
frames** (Figma-like structure, not pixel design and **not** the system Graph
view canvas), drill-in to a single page, center structural layout + right
inspector — same interaction habit as Graph view (center + properties). Frame
layout MUST be clear **without overlaps**. The center view MUST be **scalable**
(same **+/-** zoom controls pattern as Graph view) and MUST **fit content into
the graph field/viewport**. First extract covers **React / TypeScript (JSX·TSX)**
frontends; the **canonical UI model is stack-agnostic** so later stacks add
parsers without changing Graph UI or the graph model. Dogfood: ODS portal
frontend in this repository.

Implementing this feature **also** aligns **already shipped** Workspace / Graph
analysis / Graph view chrome to one unified visual system (not only the new
screen).

## Clarifications (defaults from draft)

Recorded at specify time from draft open questions (no blocking clarifications):

1. **Feature id** → `020-ui-landscape-from-code` (next sequential).
2. **Graph UI data surface** → dedicated UI overview/drill read path, parallel
   to Graph view (not overload of the system graph-view cut). Exact contract in
   `/speckit-plan`.
3. **Unresolved API binds** → keep a link/hint when method+path cannot join an
   existing HTTP endpoint (orphan allowed; not silent drop).
4. **Multiple frontends** → one UI app root per detected SPA/package entry;
   monorepo may yield several roots.

### Session 2026-07-22

- Q: How should Graph UI center render the landscape? → A: **B** — schematic
  page frames / cards with hierarchy (overview → drill); **not** the system
  Graph view canvas. Layout MUST be clearly placed **without overlaps or
  stacked overlays** of frames. The structural view MUST be **zoomable** with
  the **same +/- controls** pattern as Graph view and MUST **fit into the graph
  viewport** (fit-to-view / contain content in the center pane).
- Q: Are non-URL overlay flows mandatory for release DoD? → A: **B** — DoD
  requires ≥1 detectable overlay flow on dogfood when present in sources
  (analysis confirm); other overlay flows are best-effort.
- Q: When does UI extract run, and how is it shown in confirm UI? → A: **B** —
  automatically in the same analysis run when the detector finds a suitable
  frontend (React/TS for DoD); skip when none. The **first analysis confirm
  modal** (languages window) MUST list frontend language(s) with an explicit
  **frontend** mark and whether a **UI/frontend parser** is available or not
  (same availability idea as `parser_status` on language/artifact rows).
- Q: Navigate from Graph view to Graph UI? → A: **B** — keep menu entry **and**
  add an inspector action on Graph view (same right panel as Code / System /
  View in analysis) when the selected node is a frontend app/service **and** UI
  landscape exists; opens Graph UI. Does **not** change Graph view slice
  algorithms; not a canvas double-click default to Graph UI.
- Q: When is the Graph UI inspector action shown? → A: **B** — only when the
  selected system node is **linked to a UI app** from the UI landscape (explicit
  ingest association ui_app ↔ service). Not by name heuristics alone; not on
  every service merely because some UI landscape exists in the project.

## Spec boundaries

### In scope

- Detect and parse frontend UI structure into a **UI landscape** stored with the
  project analysis (same overall analysis → store → view paradigm as code/system).
- Canonical UI entities: app, module (optional), route, screen, frame, component,
  control, non-URL flow (e.g. confirm wizards), style artifact, specialty surface
  markers (diagram canvas / code viewer) without deep library internals.
- Relationships: containment hierarchy; navigation between screens; field binds;
  UI action → known HTTP API (prefer join to existing endpoints); style use;
  opening a flow.
- First parser capability for **React / TS (JSX·TSX)** ecosystems (routing,
  screens/layouts, forms/controls, client API calls, CSS modules / global sheets,
  i18n keys when resolvable, overlay flows when detectable).
- Portal **Graph UI**: menu + project route; overview of all pages; tabs when
  many modules/pages; drill-in (double-click or inspector primary action); center
  structural view + right properties inspector; multi-app roots when several
  frontends exist; Graph view inspector action to open Graph UI for frontend
  nodes when UI landscape exists (does not change Graph view algorithms).
- **Portal visual consistency**: Graph UI and a mandatory **style alignment pass**
  on existing Workspace / Graph analysis / Graph view (and shared portal styles)
  so all use one chrome (left-aligned project title, shared type scale and
  surfaces). No per-widget style sprawl.
- **Language**: all feature artifacts and non-UI code in **English**; Graph UI
  user-visible strings via portal i18n **`en`** (default) and **`ru`**.

### Out of scope

- Pixel-perfect / true design-tool export.
- Editing or annotating the UI landscape in the portal.
- One universal parser for every UI framework without stack-specific modules.
- Automatic generation of target-stack code or full ODS-style product specs
  (this feature delivers **data** for that later).
- Deep internals of diagram/code-editor libraries used inside studied apps.
- Non-React stacks (Vue, Angular, AngularJS, Blazor, server-rendered UI) as DoD —
  later parsers on the **same** canon.
- Docs / RAG / auth (`015`–`017`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — See UI landscape after analysis (Priority: P1)

As an **architect**, after a successful project analysis I can open **Graph UI**
and see the frontend’s pages/routes as a structural overview, so I understand
the product surface without reading every source file.

**Why this priority**: core value of the feature; without stored UI landscape,
Graph UI is empty.

**Independent Test**: analyze a React/TS dogfood project → open Graph UI →
overview lists recognizable pages/routes.

**Acceptance Scenarios**:

1. **Given** a project with a React/TS frontend and a successful analysis that
   includes the UI extract, **When** I open Graph UI, **Then** I see an overview
   of that frontend’s pages/routes as frames (not an empty “no UI” state when
   routes exist in source).
2. **Given** multiple frontend roots in one repository, **When** I open Graph UI,
   **Then** each root is distinguishable (I am not forced to mix unrelated SPAs
   into one unlabeled pile).
3. **Given** analysis finished without a detectable frontend UI extract,
   **When** I open Graph UI, **Then** I see a clear empty/explanation state
   (not a broken page).
4. **Given** sync completed on a project with a React/TS frontend, **When** the
   first analysis confirm modal opens, **Then** I see frontend language(s) with
   a frontend mark and whether the UI/frontend parser is available.
---

### User Story 2 — Drill into a page and inspect controls / API (Priority: P1)

As an **architect**, from the overview I enter one page and see layout regions,
forms/controls, and which actions call which APIs, so I can trace UI → API for
rebuild or extension work.

**Why this priority**: overview alone is not enough for specification reuse;
drill-in is the Figma-like “inside the screen” view.

**Independent Test**: overview → enter Import or Workspace (dogfood) → inspector
shows controls and at least one UI→API bind for a known action (e.g. register /
sync) when present in source.

**Acceptance Scenarios**:

1. **Given** Graph UI overview, **When** I double-click a page frame or use the
   inspector primary “enter” action, **Then** I see that page’s structure
   (regions / components / controls) instead of the all-pages overview.
2. **Given** I am inside a page that submits a form or triggers sync/delete/
   analysis in the dogfood portal, **When** I select the relevant control,
   **Then** the inspector shows an API association (joined to a known endpoint
   when possible, or an explicit unresolved hint when not).
3. **Given** I am drilled into a page, **When** I navigate up / back to overview
   (or equivalent), **Then** I return to the all-pages view without losing the
   project context.

---

### User Story 3 — Same portal look as Workspace / Graph / Graph view (Priority: P1)

As a **portal user**, Graph UI and the existing project screens share one visual
system (title bar, fonts, tree/inspector surfaces), so the product feels like
one application.

**Why this priority**: constitution and draft make visual drift a defect; DoD
includes aligning **existing** screens, not only the new one.

**Independent Test**: side-by-side Workspace, Graph analysis, Graph view, Graph UI
for the same project — headers left-aligned, matching type scale and surfaces.

**Acceptance Scenarios**:

1. **Given** Graph UI is open for a project, **When** I compare the project title
   bar to Workspace / Graph analysis / Graph view, **Then** title alignment,
   density, and typography match (no centered-only Graph UI header, no unique
   title size).
2. **Given** implementation of this feature is complete, **When** I review
   Workspace / Graph analysis / Graph view, **Then** they also use the shared
   chrome (style alignment pass applied — legacy drift fixed or explicitly
   deferred with rationale in tasks).
3. **Given** I switch portal language among supported locales (`en` / `ru`), **When** I use
   Graph UI, **Then** all Graph UI labels follow the switcher (no hard-coded
   mixed language in the UI).

---

### User Story 4 — Non-route UI flows are not lost (Priority: P1 for dogfood DoD)

As an **architect**, important wizard/modal flows that are not URL routes still
appear in the UI landscape when detectable, so critical journeys (e.g. analysis
confirm) are not invisible.

**Why this priority**: on dogfood the analysis confirm journey is part of
release DoD (≥1 overlay flow when present in sources); other overlays remain
best-effort so extract instability does not block the whole feature.

**Independent Test**: dogfood analysis → Graph UI or inspector shows the analysis
confirm flow (or equivalent) linked from the landscape.

**Acceptance Scenarios**:

1. **Given** dogfood sources contain a multi-step analysis confirm overlay flow,
   **When** analysis completes, **Then** that flow is represented in the UI
   landscape (not only URL routes) — **required for DoD**.
2. **Given** other overlay/modals exist in dogfood, **When** analysis completes,
   **Then** they MAY appear (best-effort); their absence alone MUST NOT fail DoD
   if the analysis confirm flow is present.

---

### User Story 5 — Open Graph UI from Graph view inspector (Priority: P2)

As an **architect** on Graph view, when I select the frontend service I can open
**Graph UI** from the right inspector (alongside Code / System / View in analysis),
so system and UI landscapes stay connected without changing Graph view algorithms.

**Why this priority**: navigation convenience; menu alone still works (FR-004).

**Independent Test**: dogfood Graph view → select frontend → inspector action →
Graph UI overview.

**Acceptance Scenarios**:

1. **Given** UI landscape exists and a system node **linked to a UI app** is
   selected, **When** I use the inspector Graph UI action, **Then** Graph UI
   opens for that project (overview).
2. **Given** a node **without** a UI-app link (e.g. database or unrelated
   service) is selected, **When** I view inspector actions, **Then** the Graph
   UI action is hidden or disabled.

---

### Edge Cases

- No frontend / no React-TS UI detectable → clear empty state; other analysis
  layers unchanged.
- API path in UI does not match any known HTTP endpoint → unresolved hint kept;
  no fake endpoint invented solely from the client URL.
- Page with almost no controls → screen/route still listed; empty interior is OK.
- Specialty surfaces (diagram canvas, code viewer) → marked as surfaces; no
  requirement to model library-internal nodes.
- Very large number of routes → overview remains usable (tabs and/or scroll);
  exact caps deferred to plan if needed.
- Repeat analysis → UI landscape for the new run replaces/supersedes prior run
  consistently with existing analysis-run semantics.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: After a successful analysis that includes UI extraction, the system
  MUST persist a **UI landscape** for the project analysis run (apps, routes/screens,
  hierarchy, and relationships described in Key Entities).
- **FR-002**: The UI landscape model MUST be **stack-agnostic** at the stored/
  viewed layer; adding another UI stack MUST NOT require changing Graph UI
  interaction semantics or inventing a second parallel UI graph model.
- **FR-003**: The first DoD extract MUST cover **React / TypeScript (JSX·TSX)**
  frontends sufficient for dogfood on this repository’s portal frontend: routes,
  screens/layouts, primary forms/controls, client→API binds, **style artifacts**
  (`ui_style` / `uses_style` for CSS modules and global sheets imported by those
  screens), detectable overlay flows, and **specialty surface markers**
  (`ui_surface` for diagram canvas / code viewer when statically evident). On
  dogfood DoD, overlay flows include ≥1 analysis-confirm-style flow when present
  in sources (**FR-015**); other overlays best-effort.
- **FR-004**: Users MUST be able to open **Graph UI** from the portal for a
  project (menu + project-scoped navigation, sibling to Graph view).
- **FR-004a**: Graph view inspector MUST offer an action to open **Graph UI**
  (same right-panel pattern as Code / System / View in analysis) when the
  selected node is **explicitly linked** to a **UI app** in the UI landscape
  (ingest association ui_app ↔ system service) **and** that landscape exists.
  Name/path heuristics alone MUST NOT be the sole rule; the action MUST NOT
  appear on unrelated services merely because some UI landscape exists in the
  project. The action MUST NOT replace or alter Graph view slice construction.
  When no such link exists, the action MUST be hidden or disabled.
- **FR-004b**: Ingest/store MUST be able to associate a detected UI app with the
  corresponding system service when resolvable, so FR-004a can be evaluated.
- **FR-005**: Graph UI MUST show an **overview** of all pages/routes for the
  selected UI app. When multiple modules/pages need grouping, Graph UI MUST
  provide **tabs or an equivalent filter**; for dogfood with a modest page
  count, a **scrollable non-overlapping frame layout without tabs** is
  acceptable if all pages remain reachable in overview (SC-001).
- **FR-006**: Users MUST be able to **drill in** to a single page (double-click
  or inspector primary action) and see structural regions/controls; they MUST
  be able to return to overview.
- **FR-007**: Graph UI MUST use **center = structural view**, **right = inspector**
  for selected UI entity properties (same habit as Graph view). The center
  MUST present a **schematic frame/card hierarchy** (overview of pages → drill
  into one page), **not** the system Graph view diagram canvas. Frames MUST be
  laid out clearly **without overlaps or stacked overlays**.
- **FR-007a**: Graph UI overview/drill MUST remain readable as a structured
  layout (tabs/scroll allowed); MUST NOT rely on free-form node dragging that
  produces overlapping page frames as the primary navigation model. “Readable”
  is verified by **SC-004** (non-overlapping frames + +/- / fit in viewport),
  not by a separate latency metric.
- **FR-007b**: The Graph UI center structural view MUST support **zoom in/out**
  via the **same +/- control pattern** used on Graph view and MUST support
  **fitting the content into the graph viewport** (fit-to-view / contain the
  frame layout within the center pane). Scaling MUST NOT introduce overlapping
  frames as the default layout result.
- **FR-007c**: Graph UI MUST let the user resize the **right inspector** vs the
  center structural view with a vertical splitter (parity with Graph view
  FR-022 / Workspace column widths). Width MUST persist on the client; center
  and inspector MUST keep configured minimum widths. Sharing the same client
  preference key with Graph view is allowed.
- **FR-008**: When a control/screen/flow invokes an HTTP API that matches a
  known endpoint from prior analysis, the landscape MUST associate them; when
  it does not match, the system MUST retain an **unresolved** association hint
  (MUST NOT invent a new endpoint only from the client URL).
- **FR-009**: Graph UI MUST follow **portal visual consistency**: shared chrome
  with Workspace / Graph analysis / Graph view (left-aligned project title bar,
  shared typography and surface roles). Visual drift is a defect.
- **FR-010**: Implementing this feature MUST include an explicit **style
  alignment pass** on already shipped Workspace / Graph analysis / Graph view
  and shared portal styles so they comply with the same chrome; Graph UI MUST
  NOT be the only compliant screen.
- **FR-011**: Graph UI MUST NOT introduce a separate visual theme, per-widget
  ad-hoc palettes/fonts, or centered project titles that diverge from the shared
  chrome. Page-local styling only where layout cannot reuse shared chrome.
- **FR-012**: All user-visible Graph UI strings MUST go through portal i18n
  locales **`en`** (default) and **`ru`**. Specs, models, operator-facing
  messages, and non-UI code for this feature MUST be **English only**
  (constitution Language policy).
- **FR-013**: When no UI landscape is available, Graph UI MUST show a clear
  empty/explanation state without breaking other portal graph screens.
- **FR-014**: UI extract and Graph UI MUST follow the existing parser-extension
  discipline (`018`): modular parser capability, envelope → store → view; no
  hard-coding of this monorepo’s folder names as the only supported layout.
- **FR-015**: On dogfood, when sources contain the analysis confirm (or equivalent)
  non-URL overlay flow, the UI landscape MUST include **at least one** such
  `UI Flow` after a successful UI extract — **DoD**. Additional overlay flows
  SHOULD be extracted when reliably detectable (best-effort); missing secondary
  overlays MUST NOT alone fail DoD if this primary flow is present.
- **FR-016**: UI extract MUST run **automatically** as part of an analysis run
  when the detector identifies a suitable frontend for the DoD stack (React/TS);
  when no such frontend is detected, UI extract MUST be skipped without failing
  the rest of the analysis.
- **FR-017**: The first analysis confirmation modal (languages / detection
  summary) MUST show detected **frontend** language(s) with a clear **frontend**
  marker and the **availability of the UI/frontend parser** (available vs not),
  analogous to existing language/artifact parser status in that window. Backend
  or shared languages alone MUST NOT be presented as if they were the UI
  landscape parser. Frontend languages are those detected **under the SPA root(s)**
  matched by the `frontend-ui` artifact (path-scoped), not a second global
  `typescript` row without a frontend mark.

### Key Entities

- **UI App**: Frontend root (SPA/package); one or many per project; MAY link to
  a system **service** for Graph view → Graph UI inspector action (FR-004a/b).
- **UI Module** (optional): Feature/route group under an app.
- **UI Route / Screen**: Navigable or primary page surface; may carry query-param
  contracts when statically known.
- **UI Frame**: Major layout region (header, tree, main, inspector, canvas, …).
- **UI Component / Control**: Form, table, modal, button, input, select, etc.
- **UI Flow**: Non-URL multi-step overlay/wizard journey.
- **UI Style**: Style sheet / module artifact associated with screens/components.
- **UI Surface**: Specialty embedded surface (e.g. diagram, code viewer) without
  deep internals.
- **UI relationships**: contains; navigates_to; binds_field; invokes_api
  (to known HTTP endpoint or unresolved hint); uses_style; opens_flow.

Draft schemas (planning input): `ods-help/requirements/json-model/native-ui-tree.*`,
`canonical-node-ui.*`, `canonical-edge-ui.*`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On dogfood (this repository’s portal frontend), after one successful
  analysis with UI extract, Graph UI overview lists the main portal pages/routes
  (import, projects list, workspace, graph analysis, graph view — or equivalent
  set present in source) within one analysis session.
- **SC-002**: From Graph UI overview, an architect can open at least two distinct
  dogfood pages and see structural content (regions and/or controls) for each
  without reading source in a separate tool.
- **SC-003**: For at least three dogfood user actions that call the portal API
  (e.g. project register, sync, delete, or start analysis), Graph UI/inspector
  shows a UI→API association after analysis (joined or explicitly unresolved).
- **SC-004**: Side-by-side check: Workspace, Graph analysis, Graph view, and
  Graph UI for the same project read as one product UI (left-aligned titles,
  matching type scale and header/inspector surface roles). Graph UI center
  shows non-overlapping schematic frames (not the system diagram canvas), with
  **+/- zoom** and **fit-to-viewport** available like Graph view.
- **SC-005**: Style alignment pass is evidenced: pre-existing project screens no
  longer show the prior class of chrome drift (mismatched title size/alignment,
  inconsistent tree/inspector surfaces) except items explicitly deferred in tasks
  with rationale.
- **SC-006**: Switching portal language `en` ↔ `ru` updates Graph UI chrome
  strings; no hard-coded single-language Graph UI labels remain in the UI.
- **SC-007**: When UI extract finds no frontend UI, Graph UI empty state is
  understandable in under 10 seconds (clear message + no broken layout).
- **SC-008**: On dogfood after UI extract, Graph UI (or inspector) shows the
  analysis confirm overlay flow when it exists in sources (≥1 required flow for
  DoD); absence of other secondary overlays alone does not fail this criterion.
- **SC-009**: After sync on dogfood, the first analysis confirm modal shows
  frontend language(s) marked as frontend and whether the UI/frontend parser is
  available; user can tell UI extract will run before confirming analysis.
- **SC-010**: On dogfood after UI extract, selecting the system service **linked
  to the UI app** on Graph view shows an inspector action that opens Graph UI;
  the action is absent or disabled for nodes without that link.
## Assumptions

- Existing analysis orchestration can gain an additional UI-parser capability
  without redesigning the whole pipeline (`018` checklist applies).
- Code and system landscapes (including HTTP endpoints / client calls from
  `013`/`014`) remain the join targets for UI→API; this feature does not replace
  them.
- Dogfood acceptance project is **this** ODS repository portal frontend (React/TS),
  not spring-petclinic’s AngularJS UI.
- Dedicated Graph UI read path (parallel to Graph view) is the default product
  shape; plan may name routes/APIs.
- Detector reports frontend presence distinctly enough for the first confirm
  modal (extend language report and/or artifacts summary — exact shape in plan;
  today `ods-language-reports` has `languages[]` + `artifacts[]`, not a file
  named `languages.json`).
- Caps/pagination for huge route lists use the same practical limits philosophy
  as other graph views if needed.
- Constitution **Portal UI consistency** and **Language** (v1.4.1+) apply as
  normative constraints for this feature.

## Follow-up (outside DoD `020`)

- **AngularJS UI landscape** → feature **`021-angularjs-ui-landscape`** (draft
  `ods-help/requirements/021-angularjs-ui-landscape-draft.md`; dogfood petclinic).
- **Angular 2+ UI landscape** → shipped 2026-07-27 as parser `angular-ui`
  (`artifact_type: frontend-angular`), same Graph UI + UI canon as React /
  AngularJS (pragmatic stack coverage; see `tasks.md` T047 — not a separate
  Speckit feature cycle).
- **Client cache + viewport restore** (2026-07-27): react-query + shared
  `sessionStorage` pan/zoom for Graph UI — see `tasks.md` T048–T049 / research
  R12; parallel to Graph view `011` T048–T049.
- **Canvas color legend** for Graph UI (flow/violet vs selection) together with
  Graph view and analysis-modal fills — portal polish in `001`; shared with
  `014`; **not** `019`.

## Related

- Draft: `ods-help/requirements/020-ui-landscape-from-code-draft.md`
- Vision: `specs/001-ods-vision/spec.md`
- Constitution: `.specify/memory/constitution.md` (Portal UI consistency; Language)
- Playbook: `specs/018-parser-extension-playbook/`
