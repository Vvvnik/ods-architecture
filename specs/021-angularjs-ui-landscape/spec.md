# Specification: AngularJS UI landscape (Graph UI — second stack)

**Feature**: `021-angularjs-ui-landscape`

**Created**: 2026-07-22

**Status**: Implemented (2026-07-22; AngularJS petclinic dogfood — unit + wiring)

**Input**: Draft `ods-help/requirements/021-angularjs-ui-landscape-draft.md`
(AngularJS 1.x UI extract → existing UI canon + Graph UI; dogfood spring-petclinic
microservices; no second Graph UI product surface).

**Parent Spec**: `specs/001-ods-vision/spec.md` (Post-MVP — UI landscape / stack coverage)

**Dependencies**: `020` (UI canon + Graph UI portal; stack-agnostic model);
`018` (parser extension playbook); `019` (petclinic system dogfood);
`005`/`006` (analysis pipeline, canonical graph); `011`–`014` (Graph view paradigm,
HTTP endpoints / client calls).

## Short description

`020` already delivers Graph UI and a **stack-agnostic** UI landscape for
**React / TypeScript** frontends. The petclinic dogfood system’s user-facing UI
is **AngularJS 1.x**, so Graph UI is correctly empty today. This feature adds a
**second UI extract capability** for AngularJS so architects see screens, routes,
forms/controls, and UI→API binds on the **same** Graph UI chrome and the **same**
UI canon — without rewriting Graph UI or inventing a parallel UI product.

Dogfood: [spring-petclinic-microservices](https://github.com/spring-petclinic/spring-petclinic-microservices)
(`project_id` `c736c364-96b1-442b-8bd4-3a8c2ea05d2d`). Modern Angular (2+) is
**out of DoD** for this feature; it is covered by parser `angular-ui`
(`020` T047, 2026-07-27).

## Clarifications (defaults from draft)

Recorded at specify time (no blocking clarifications):

1. **Feature id** → `021-angularjs-ui-landscape` (roadmap slot in `001`).
2. **Parser capability id** → `angularjs-ui` (parallel naming to `020`’s React UI
   extract; exact module layout in plan).
3. **Minimum screens for DoD** → Graph UI overview shows **at least three**
   distinct petclinic pages from **declared, navigable (URL-bearing,
   non-abstract) routes/states** after a successful AngularJS UI extract
   (welcome / owners / vets or equivalent set present in source). Abstract
   parent states (e.g. `abstract: true`) and layout-only states without a
   navigable URL MUST NOT count toward SC-001.
4. **UI source location** → extract prefers AngularJS **UI-module sources**
   (directory/module name ending in `-ui` / scripts + templates); gateway
   static assets (`**/static/scripts/**`) are a **fallback** when UI-module
   sources are absent. Paths confirmed against the live working copy at plan
   time; DoD MUST NOT hard-code a single dogfood folder name as the only
   supported layout.
5. **Graph UI product** → reuse `020` Graph UI as-is; **no** second Graph UI
   surface, chrome rewrite, or new UI canon kinds unless a real gap vs `020`
   models is proven during plan/implement.

### Session 2026-07-22

- Q: Which system service should `ui_app` link to for Graph view → Graph UI on
  petclinic? → A: **B** — link to the **API Gateway** (user-entry / UI-serving
  service), not a separate UI-module runtime node.
- Q: Where should AngularJS extract read sources on petclinic? → A: **A** —
  prefer **UI-module sources** (module name ending in `-ui` / scripts +
  templates); gateway static assets only as fallback when sources are absent.
- Q: If AngularJS extract fails mid-analysis? → A: **A** — skip UI landscape;
  overall analysis **succeeds**; UI parser status failed/unavailable; other
  layers (code/system) unchanged.
- Q: What counts as a distinct page for DoD ≥3? → A: **A** — only **declared
  routes/states** (navigable SPA screens); not arbitrary HTML partials.
- Q: Where is UI→HTTP bind sufficient for DoD (SC-003)? → A: **B** — bind on
  **screen/controller** is enough when the HTTP call is statically tied to that
  screen; a template control bind is not required for DoD.
- Q: Which declared states count as DoD pages (SC-001)? → A: **URL-bearing,
  non-abstract** `$state` / `$route` entries only; abstract parents and
  layout-only states without a navigable URL do not count.

## Spec boundaries

### In scope

- Detect AngularJS 1.x SPA presence (scripts, module declaration, app bootstrap /
  routes, templates) **without** classifying it as React or as modern Angular.
  Prefer UI-module **sources** over gateway static copies when both exist.
- Parse AngularJS UI structure into the **existing** UI landscape canon from
  `020` (apps, routes/screens, hierarchy, controls, UI→API associations).
- Run the AngularJS UI extract automatically in the same analysis run when the
  detector finds a suitable AngularJS frontend; skip when none.
- Show AngularJS UI extract availability in the first analysis confirm modal
  (frontend mark + parser available / not), consistent with `020` confirm UX.
- Dogfood on petclinic: Graph UI overview + drill show real pages; Graph view
  inspector can open Graph UI when a `ui_app` ↔ **API Gateway** service link
  exists (same association rules as `020`; gateway is the DoD link target).
- At least one statically resolvable UI→HTTP bind (`invokes_api` or documented
  equivalent) when present in petclinic sources (`$http` / similar) — bind MAY
  attach at **screen/controller** level for DoD (control-level preferred when
  evident, not required).
- Follow `018` discipline for the new artifact capability; English specs;
  portal i18n `en`/`ru` only if any new user-visible strings are required
  (prefer zero new chrome strings by reusing Graph UI).

### Out of scope

- Rewriting or redesigning Graph UI UX from `020`.
- Changing React UI extract behaviour from `020`.
- Angular 2+ / Ivy / standalone components (later feature if needed).
- Vue, Blazor, Svelte, and other non-AngularJS stacks.
- Pixel-perfect layout reconstruction.
- New canon node/edge kinds unless a proven gap vs `020` models appears.
- Runtime-only route tables that cannot be resolved statically.
- gRPC / color legend / paused `015`–`017` / `004`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — See petclinic UI landscape in Graph UI (Priority: P1)

As an **architect**, after a successful petclinic analysis I can open **Graph UI**
and see AngularJS pages/routes as a structural overview, so the product surface
is visible without reading every template and controller.

**Why this priority**: core value; without AngularJS extract, Graph UI stays empty
on the primary system dogfood.

**Independent Test**: re-analyze petclinic → open Graph UI → overview lists
recognizable petclinic pages from declared **URL-bearing, non-abstract**
routes/states (≥3).

**Acceptance Scenarios**:

1. **Given** petclinic with AngularJS 1.x UI sources and a successful analysis
   that includes the AngularJS UI extract, **When** I open Graph UI, **Then** I
   see an overview of that frontend’s pages/routes as frames (not an empty “no
   UI” state when routes exist in source).
2. **Given** analysis finished without a detectable AngularJS (or other
   supported) UI extract, **or** AngularJS was detected but extract failed,
   **When** I open Graph UI, **Then** I still see the clear empty/explanation
   state from `020` (not a broken page; overall analysis may still be successful).
3. **Given** sync completed on petclinic, **When** the first analysis confirm
   modal opens, **Then** I see frontend language(s)/artifact(s) with a frontend
   mark and whether the AngularJS UI extract capability is available.

---

### User Story 2 — Drill into a page and see UI→API binds (Priority: P1)

As an **architect**, from the overview I enter one petclinic page and see
structure (regions/controls) and which actions call which APIs, so I can trace
UI → gateway/API for rebuild or extension work.

**Why this priority**: overview alone is not enough; UI→API is the architect’s
main join across landscapes.

**Independent Test**: overview → enter Owners (or equivalent) → inspector shows
at least one UI→API association at screen/controller (or control) level when
statically visible in source.

**Acceptance Scenarios**:

1. **Given** Graph UI overview for petclinic, **When** I double-click a page
   frame or use the inspector primary “enter” action, **Then** I see that page’s
   structure (regions / components / controls) instead of the all-pages overview.
2. **Given** I am inside a page that performs an HTTP call visible in AngularJS
   sources (controller or template), **When** I select the screen or the
   relevant control, **Then** the inspector shows an API association (joined to
   a known endpoint when possible, or an explicit unresolved hint when not).
   For DoD, a screen/controller-level bind is sufficient.
3. **Given** I am drilled into a page, **When** I navigate up / back to overview,
   **Then** I return to the all-pages view without losing the project context.

---

### User Story 3 — Open Graph UI from Graph view for the UI service (Priority: P2)

As an **architect** on Graph view, when I select the **API Gateway** service
linked to the UI app I can open **Graph UI** from the right inspector, so system
and UI landscapes stay connected.

**Why this priority**: navigation convenience already defined in `020`; this
feature must make the association work for petclinic’s AngularJS UI app via the
gateway entry point.

**Independent Test**: petclinic Graph view → select linked API Gateway service →
inspector action → Graph UI overview.

**Acceptance Scenarios**:

1. **Given** AngularJS UI landscape exists and a system node **linked to that
   UI app** is selected, **When** I use the inspector Graph UI action, **Then**
   Graph UI opens for that project (overview).
2. **Given** a node **without** a UI-app link is selected, **When** I view
   inspector actions, **Then** the Graph UI action remains hidden or disabled
   (same rules as `020`).

---

### User Story 4 — No regression on React dogfood / empty non-UI repos (Priority: P1)

As a **portal user**, React UI landscape and empty Graph UI for non-AngularJS /
non-React repos keep working as before, so adding AngularJS does not break
`020` or unrelated projects.

**Why this priority**: second stack must not harm the shipping React path or
correct empty states.

**Independent Test**: analyze ODS portal (React) → Graph UI still populated;
analyze a repo without AngularJS/React UI → Graph UI empty state unchanged.

**Acceptance Scenarios**:

1. **Given** the ODS portal React dogfood project after analysis, **When** I open
   Graph UI, **Then** the React UI landscape still appears (no regression vs
   `020` DoD outcomes).
2. **Given** a project with neither React nor AngularJS UI extract, **When** I
   open Graph UI, **Then** the empty/explanation state remains correct.
3. **Given** a repository with both React and AngularJS UI roots, **When**
   detection runs, **Then** both `frontend-ui` and `frontend-angularjs` appear
   (distinguishable roots) without one stack suppressing the other.

---

### Edge Cases

- AngularJS assets only under gateway static paths (no separate UI package) →
  still detectable and extractable when scripts/templates are present (fallback
  when UI-module sources are absent).
- When both UI-module sources and gateway static copies exist → extract MUST
  prefer sources; MUST NOT require a merged union landscape for DoD.
- Detector MUST NOT treat AngularJS as React, and MUST NOT treat Angular 2+ as
  AngularJS DoD success.
- API path in UI does not match any known HTTP endpoint → unresolved hint kept;
  no fake endpoint invented solely from the client URL.
- Page with almost no controls → screen/route still listed; empty interior is OK.
- Runtime-built route tables with no static declaration → may be incomplete;
  DoD only requires statically declared petclinic **URL-bearing, non-abstract**
  routes/states (≥3).
- HTML partials / includes without a declared route → MUST NOT alone satisfy
  the ≥3 page DoD count (they MAY appear under a parent screen when linked).
- Abstract `ui.router` states (`abstract: true`) or states without a navigable
  URL → MUST NOT count as DoD overview pages (MAY exist in extract metadata but
  MUST NOT inflate SC-001).
- Repeat analysis → UI landscape for the new run replaces/supersedes prior run
  consistently with existing analysis-run semantics.
- AngularJS extract fails after detection → analysis run still succeeds for
  code/system layers; Graph UI shows empty/explanation state; UI parser status
  shows failed/unavailable (not a silent success with stale UI from a prior run
  unless product semantics explicitly retain prior run — default: this run has
  no UI landscape).
- Mixed monorepo (React + AngularJS) → each supported root remains distinguishable
  under the existing multi-app Graph UI behaviour from `020`; detector MUST emit
  both `frontend-ui` and `frontend-angularjs` when both stacks are present.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an AngularJS 1.x UI extract capability that
  produces a UI landscape conforming to the **existing** stack-agnostic UI canon
  from `020` (apps, routes/screens, hierarchy, controls, and relationships).
- **FR-002**: Adding AngularJS extract MUST NOT require a second Graph UI product
  surface, a second UI graph model, or changes to Graph UI interaction semantics
  defined in `020`.
- **FR-003**: The detector MUST recognize AngularJS 1.x SPA signals (module
  declaration, app bootstrap / routes, templates / scripts as used in dogfood)
  and MUST NOT classify that presence as React or as modern Angular (2+) DoD
  success.
- **FR-004**: AngularJS UI extract MUST run **automatically** as part of an
  analysis run when the detector identifies a suitable AngularJS frontend; when
  none is detected, the extract MUST be skipped without failing the rest of the
  analysis. If AngularJS extract **fails** after detection, the run MUST still
  complete successfully for non-UI layers; UI landscape MUST be absent/empty for
  that run and UI parser status MUST reflect failed/unavailable (MUST NOT fail
  the whole analysis solely because UI extract failed).
- **FR-005**: The first analysis confirmation modal MUST show AngularJS UI
  extract availability (frontend mark + available / not), consistent with the
  `020` confirm-modal pattern for UI/frontend parsers.
- **FR-006**: After a successful AngularJS UI extract on petclinic, Graph UI
  MUST show an overview of that frontend’s pages/routes using the existing
  Graph UI overview behaviour from `020`. For DoD counting (SC-001), a page
  MUST be a **declared, URL-bearing, non-abstract** route/state (navigable SPA
  screen), not an arbitrary HTML partial/template and not an abstract parent or
  layout-only state without a navigable URL.
- **FR-007**: Users MUST be able to drill into a single page and return to
  overview using existing Graph UI drill behaviour from `020`.
- **FR-008**: When a control/screen invokes an HTTP API that is statically
  resolvable from AngularJS sources, the landscape MUST associate them
  (`invokes_api` or documented equivalent); when it does not match a known
  endpoint, the system MUST retain an **unresolved** association hint (MUST NOT
  invent a new endpoint only from the client URL). For DoD (SC-003), a bind
  attached to the **screen/controller** is sufficient; a template control bind
  is preferred when statically evident but NOT required. **DoD extract minimum:**
  literal `$http.(get|post|put|patch|delete)` (or equivalent method call) with a
  **static string** path template; `$resource`, interceptors, and dynamically
  concatenated paths are best-effort and MUST NOT alone fail DoD if the literal
  `$http` case is present.
- **FR-009**: Ingest/store MUST associate the detected AngularJS UI app with the
  corresponding system service when resolvable (same ui_app ↔ service rule as
  `020`), so Graph view inspector can open Graph UI for that node. On petclinic
  DoD, the link target MUST be the **API Gateway** service (user-entry /
  UI-serving node), not a separate UI-module runtime service.
- **FR-010**: Graph view inspector Graph UI action rules from `020` MUST continue
  to apply unchanged (only when an explicit ui_app ↔ service link exists).
- **FR-011**: AngularJS UI extract MUST follow parser-extension discipline
  (`018`): modular capability, envelope → store → view; MUST NOT hard-code only
  this monorepo’s or petclinic’s folder names as the sole supported layout. When
  both UI-module sources and gateway static AngularJS assets exist, extract MUST
  **prefer sources**; gateway static MAY be used only as fallback when sources
  are absent.
- **FR-012**: This feature MUST NOT regress React UI extract / Graph UI outcomes
  on the ODS portal dogfood from `020`.
- **FR-013**: For repositories without AngularJS (and without other supported UI
  extract), Graph UI MUST keep the clear empty/explanation state.
- **FR-014**: DoD stack boundary is **AngularJS 1.x** only. Angular 2+ MUST NOT
  be required for DoD and MUST NOT be conflated with AngularJS in detector
  labelling or operator-facing docs for this feature.
- **FR-015**: New canon node/edge kinds MUST NOT be introduced unless plan/
  implement proves a real gap versus `020` models; preference is reuse of
  existing `ui_*` entities and relationships.
- **FR-016**: Specs and non-UI artifacts for this feature MUST be **English**;
  any new portal user-visible strings (if required) MUST go through portal i18n
  **`en`** and **`ru`**. Prefer reusing existing Graph UI strings.

### Key Entities

Reuse of `020` UI entities (no new kinds required for DoD):

- **UI App**: AngularJS SPA root; MAY link to a system **service**. On petclinic
  DoD, that service is the **API Gateway**.
- **UI Module** (optional): Feature/route group under the app.
- **UI Route / Screen**: Navigable primary page from a **declared, URL-bearing,
  non-abstract** AngularJS route/state; HTML partials without a route
  declaration and abstract parent states are not DoD pages.
- **UI Frame / Component / Control**: Layout regions and form controls as
  statically evident.
- **UI relationships**: contains; navigates_to; binds_field; invokes_api
  (known HTTP endpoint or unresolved hint); uses_style; opens_flow (best-effort
  if overlay flows exist; not a separate DoD gate beyond HTTP binds).

Planning input schemas remain those from `020` / `ods-help/requirements/json-model/`
(`native-ui-tree`, `canonical-node-ui`, `canonical-edge-ui`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On petclinic dogfood, after one successful analysis with AngularJS
  UI extract from **preferred UI-module sources**, Graph UI overview lists
  **at least three** distinct pages from **declared, URL-bearing, non-abstract**
  routes/states present in source (e.g. welcome, owners, vets — or equivalent)
  within one analysis session. Abstract parents MUST NOT inflate this count.
- **SC-002**: From that overview, an architect can open at least **two** distinct
  pages and see structural content (regions and/or controls) for each without
  reading source in a separate tool.
- **SC-003**: For at least **one** petclinic UI action that performs an HTTP call
  visible in AngularJS sources, Graph UI/inspector shows a UI→API association
  after analysis (joined or explicitly unresolved). The association MAY be on
  the **screen/controller** (control-level bind not required for DoD).
- **SC-004**: After sync on petclinic, the first analysis confirm modal shows the
  AngularJS UI extract capability as available (frontend mark + availability),
  so the user can tell UI extract will run before confirming analysis.
- **SC-005**: On petclinic after UI extract, selecting the **API Gateway**
  service **linked to the UI app** on Graph view shows an inspector action that
  opens Graph UI; the action is absent or disabled for nodes without that link
  (including non-gateway services).
- **SC-006**: On the ODS portal React dogfood, Graph UI outcomes from `020`
  remain satisfied (no regression after this feature).
- **SC-007**: When neither AngularJS nor other supported UI extract applies,
  Graph UI empty state remains understandable in under 10 seconds (clear message
  + no broken layout). The same empty/explanation clarity MUST hold when
  AngularJS was detected but extract **failed** (overall analysis still
  successful).
- **SC-008**: Detector/docs for this feature distinguish AngularJS 1.x from
  modern Angular; DoD acceptance does not require Angular 2+ extract.

## Assumptions

- `020` Graph UI, UI canon, confirm-modal frontend marking, and ui_app ↔ service
  inspector rules remain the product baseline; `021` only adds AngularJS extract
  + dogfood wiring.
- Petclinic / sample AngularJS dogfood: prefer a `*-ui` module when present;
  otherwise gateway `**/static/scripts/**`. Exact paths are confirmed at plan
  time against the checkout. For Graph view → Graph UI, DoD link target is the
  **API Gateway** service. Detector/parser heuristics are layout-generic (no
  hard-coded dogfood repository path).
- Existing HTTP endpoints / client-call landscapes from `013`/`014`/`019` remain
  join targets for UI→API; this feature does not replace them.
- Capability id `angularjs-ui` is the default name for language-report /
  artifact availability (plan may refine packaging).
- Overlay/non-URL flows are best-effort for AngularJS; DoD gates are overview
  pages (≥3 **URL-bearing, non-abstract** routes/states), drill structure, and
  ≥1 literal `$http` bind at screen/controller level — not a mandatory overlay
  count or control-level bind.
- AngularJS extract failure is non-fatal to the analysis run (skip UI; report
  parser failed/unavailable), consistent with modular parser isolation.
- Caps/pagination for large route lists reuse `020` Graph UI behaviour.
- Constitution Language and Portal UI consistency policies continue to apply;
  no Graph UI chrome rewrite is expected for DoD.

## Follow-up (outside DoD `021`)

- Modern **Angular 2+** UI landscape (separate feature if needed).
- Other UI stacks (Vue, Blazor, …) on the same canon.
- Canvas color legend / paused `015`–`017` / `004` — unchanged pause policy.

## Related

- Draft: `ods-help/requirements/021-angularjs-ui-landscape-draft.md`
- Vision: `specs/001-ods-vision/spec.md`
- React baseline: `specs/020-ui-landscape-from-code/`
- Parser playbook: `specs/018-parser-extension-playbook/`
- Petclinic system: `specs/019-spring-system-landscape/`
