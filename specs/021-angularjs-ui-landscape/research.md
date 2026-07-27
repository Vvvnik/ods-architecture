# Research: AngularJS UI landscape (021)

**Feature**: `021-angularjs-ui-landscape`  
**Date**: 2026-07-22  
**Spec**: [spec.md](./spec.md)

## R1. Parser placement

**Decision:** Ship `parsers/angularjs-ui/` as an **artifact-style** capability
(`parser_id: angularjs-ui`), spawned from `artifacts[]`, **not** mixed into
`typescript` / `javascript` / `react-ui` (`018`).

**Rationale:** Same layer as `020` (`metadata.layer=ui`); stack-specific extract
only. Mixing into `react-ui` would couple two frameworks and break playbook.

**Alternatives considered:** Extend `react-ui` — rejected. Language-only spawn —
rejected (UI is not “another language”).

## R2. Detector artifact (AngularJS vs React)

**Decision:**

1. Add a **separate** artifact entry  
   `{ artifact_type: "frontend-angularjs", parser_id: "angularjs-ui", file_count,
   sample_paths, parser_status }` when an AngularJS 1.x SPA root is found.
2. Keep existing `frontend-ui` + `react-ui` unchanged (no regression).
3. LanguagesConfirmModal **Frontend** section lists **both** frontend artifacts
   when present (React and/or AngularJS), each with frontend mark + parser status.
4. Orchestrator spawns `angularjs-ui` when `parser_status=available` (same
   artifact spawn path as other modules).
5. Change-set / path filter uses `frontend-angularjs` so AngularJS files are not
   mixed into `react-ui` spawn.

**Detection heuristics (DoD):**

- Prefer module/directory whose name ends with `-ui` when present (clarify).
- Else (typical gateway-served SPA): AngularJS under `**/static/scripts/**`
  (and related templates).
- Signals: `angular.module(`, `ng-app`, `ui.router` / `$stateProvider` /
  `$routeProvider`, AngularJS script/template layout — **without** matching
  React SPA heuristics and **without** treating Angular 2+ (`@angular/core`,
  `standalone: true`) as AngularJS DoD success.
- MUST NOT hard-code a single dogfood repository path in detector/parser code.

**Live WC note (2026-07-22):** Upstream dogfood microservices sample often has
**no** separate `*-ui` module; sources live under API Gateway static scripts.
Clarify “prefer UI module, gateway static as fallback” still holds:
when the UI module is absent, gateway static **is** the extract root.

**Rationale:** Separate artifact_type keeps `pathsForArtifact` clean; avoids
breaking React file selection.

**Alternatives considered:** Second `frontend-ui` row with different parser_id —
rejected (path filter keyed by artifact_type today). Merge into `react-ui` —
rejected.

## R3. Native model + canon reuse

**Decision:** Reuse `020` **native-ui-tree** schema and UI canon
(`ui_*` kinds, `invokes_api`, `binds_service`, etc.). Set
`framework: "angularjs"` on `ui_app`. **No new canon kinds** for DoD.

Emit declared **`$state` / `$route`** as `ui_route` + `ui_screen` when
**URL-bearing and non-abstract**. Attach controller literal `$http` calls as
screen/controller-level `api_calls` → ingest `invokes_api` (clarify: control-level
not required).

**Rationale:** Spec FR-001/015; stack-agnostic Graph UI already works.

**Alternatives considered:** New AngularJS-only canon — rejected.

## R4. Ingest adapter

**Decision:** Add `angularjs-ui.ingest.ts` registered like `react-ui`. Prefer
**extracting a shared native-UI-tree transform helper** from the existing
`react-ui` adapter (same mapping) parameterized by `parser_id`; if extraction
cost is high, thin copy with parser_id/`binds_service` heuristics is acceptable
for DoD.

**Petclinic `binds_service`:** Prefer system service matching API Gateway
identity (`api-gateway`, `spring-petclinic-api-gateway`, compose/service name
heuristics). DoD requires ≥1 `ui_app` → gateway `binds_service` (clarify B).

**Adapter / extract failure:** Non-fatal to the analysis run (clarify A); status
failed/unavailable; Graph UI empty for that run.

**Rationale:** Aligns with `018` adapter isolation and clarify failure policy.

## R5. Graph UI portal

**Decision:** **No** new Graph UI product surface. Existing `/graph/ui` APIs and
portal page already filter `layer=ui` and support multi-app. Expect **zero or
minimal** portal code (i18n only if Frontend modal needs an AngularJS label).

**Rationale:** Spec non-goal — reuse `020` chrome.

## R6. Extract strategy (AngularJS 1.x)

**Decision:** Heuristic / lightweight AST-or-regex extract on JS + HTML under the
AngularJS root (Node CLI, same shape as `react-ui`):

1. Discover app module (`angular.module('…', [deps])`).
2. Collect **declared** `$stateProvider.state` / `$routeProvider.when` routes.
   **DoD pages (SC-001)** = **URL-bearing, non-abstract** states/routes only
   (exclude `abstract: true` parents and layout-only states without a navigable
   URL — they MUST NOT inflate the ≥3 count).
3. Link templates/components/controllers to those states when statically
   resolvable.
4. Scan controllers for **literal** `$http.get/post/…('…')` (static path string)
   → screen-level `api_calls`. `$resource` / interceptors / dynamic concat =
   best-effort (not required for SC-003 if literal `$http` exists).
5. Best-effort controls from templates; not required for SC-003.

**Rationale:** Petclinic uses `ui.router` + per-feature `.state('owners', …)` and
`$http.get('api/…')` in controllers — matches clarify DoD. Abstract `app` parent
must not count as a page.

**Alternatives considered:** Full AngularJS compiler — overkill. Runtime-only
route tables — out of scope.

## R7. Code reuse audit

| Area | Reuse |
|------|--------|
| Native UI tree + UI canon | `020` contracts |
| Detector / modal Frontend block | Extend `020` patterns |
| Parser CLI / envelope / registry | `005`/`018` |
| Ingest mapping | Factor or mirror `react-ui.ingest.ts` |
| Graph UI API + page | `020` as-is |
| Inspector Graph UI action | `020` (`binds_service`) |
| Petclinic system landscape | `019` services (gateway target) |

No auth/RAG/docs; no Angular 2+; no Graph UI rewrite.
