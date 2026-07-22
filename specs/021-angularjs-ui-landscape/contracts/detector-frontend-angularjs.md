# Detector: frontend-angularjs artifact (021)

**Spec**: [spec.md](./spec.md)  
**Base**: `specs/009-system-landscape/contracts/detector-artifacts.md`,
`specs/020-ui-landscape-from-code/contracts/detector-frontend-ui.md`  
**Research**: [research.md](../research.md) R2

## Artifact entry

| Field | Value |
|-------|--------|
| `artifact_type` | `frontend-angularjs` |
| `parser_id` | `angularjs-ui` when AngularJS 1.x root matched; else null |
| `parser_status` | via `ParserRegistryService` (+ failed carryover) |
| `file_count` | count of AngularJS UI source files under root(s) |
| `sample_paths` | up to 5 paths (e.g. `…/static/scripts/app.js`) |

## Detection heuristics (DoD)

Match an **AngularJS 1.x SPA root** when:

1. **Preferred:** directory/module `spring-petclinic-ui` (or equivalent) with
   AngularJS scripts/templates; **or**
2. **Fallback / current upstream:** tree under
   `**/spring-petclinic-api-gateway/**/static/scripts/**` (and related HTML
   templates) containing AngularJS signals.

Signals (content / layout):

- `angular.module(` and/or `ng-app`;
- `ui.router` / `$stateProvider` / `$routeProvider`;
- controllers / components / `*.template.html` layout as in petclinic.

**Must not** match:

- React SPA roots (`frontend-ui` / `react-ui` heuristics);
- Modern Angular (`@angular/core`, Ivy/standalone) as AngularJS DoD success.

Multiple AngularJS roots → aggregate `file_count` / samples; one
`angularjs-ui` spawn (native model may contain multiple `apps[]`).

## Orchestrator

Spawn `angularjs-ui` from `artifacts[]` when `artifact_type=frontend-angularjs`
and `parser_status=available`. Spawn failure / extract error → mark failed;
**do not** fail the whole analysis run.

Path selection for spawn/ingest: `pathsForArtifact(..., 'frontend-angularjs')`
(or equivalent), **not** `frontend-ui`.

## Modal window 1 (LanguagesConfirmModal)

Frontend section (from `020`) MUST also show AngularJS when detected:

1. Frontend language(s) path-scoped under AngularJS root(s), badge **frontend**.
2. UI parser row: `angularjs-ui` + `parser_status` badge.

When both React and AngularJS are present, list **both** parser rows.

i18n: reuse Frontend section keys; add en/ru only if a distinct AngularJS label
is required.
