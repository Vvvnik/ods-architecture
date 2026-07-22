# Draft: AngularJS UI landscape (Graph UI — second stack)

**Status**: requirements draft (not a canonical `specs/**/spec.md`)  
**Proposed feature id**: `021-angularjs-ui-landscape`  
**Parent**: `001-ods-vision`  
**Depends on**: `020` (UI canon + Graph UI portal), `018` parser playbook, `019` petclinic system dogfood  
**Created**: 2026-07-22  
**Branch**: `angular-js-parser`  
**Dogfood**: [spring-petclinic-microservices](https://github.com/spring-petclinic/spring-petclinic-microservices)
(`project_id` `c736c364-96b1-442b-8bd4-3a8c2ea05d2d`) — **AngularJS 1.x** UI (not Angular 2+)

## Problem

`020` delivers Graph UI for **React/TS**. Petclinic’s user-facing UI is **AngularJS**;
today Graph UI is correctly empty. Architects still need screens/routes/forms and
UI→API binds for that stack, reusing the **same** `ui_*` canon and Graph UI chrome.

## Goal

1. New artifact parser (proposed `parser_id`: `angularjs-ui`) → native UI extract →
   ingest into existing UI canon (`020` / `008`-style UI kinds).
2. Detector recognizes AngularJS SPA (scripts, `angular.module`, `ng-app` / routes,
   templates) without treating it as React.
3. On petclinic after analysis: Graph UI overview + drill shows real pages; Graph view
   inspector can open Graph UI when `ui_app` ↔ gateway/UI service link exists.
4. Reuse portal Graph UI as-is; **no** second Graph UI product surface.

## Stack boundary (mandatory)

| In DoD `021` | Out of DoD |
|--------------|------------|
| **AngularJS 1.x** (petclinic) | Angular 2+ / Ivy / standalone components |
| Templates + controllers / components as used in petclinic | Vue, Blazor, Svelte, … |
| Static `invokes_api` / `$http` / similar when resolvable | Runtime-only route tables |

Modern Angular = later feature if needed. Do not conflate names in detector or docs.

## Non-goals

- Rewriting Graph UI UX from `020`
- Changing React `react-ui` behaviour
- Pixel-perfect layout
- New canon node/edge kinds unless a real gap vs `020` models is proven
- gRPC / color legend / paused `015`–`017`

## Design principles

- **Canon stack-agnostic** (`020`); **parser stack-specific** (`angularjs-ui`).
- Checklist `018` for new artifact module.
- English specs/drafts; portal i18n `en`/`ru` only for UI strings.
- Prefer heuristics that work for petclinic layout (`spring-petclinic-ui` and/or
  AngularJS assets under API gateway — **confirm paths in live WC** at specify).

## Dogfood acceptance (sketch)

1. Re-analyze petclinic → language report: artifact `angularjs-ui` (or agreed id)
   `available`.
2. Graph UI not empty: ≥N screens/routes (exact N in spec SC).
3. At least one control/screen → HTTP bind when statically visible (`invokes_api`
   or documented equivalent).
4. Empty Graph UI remains correct for pure-React-less / non-AngularJS repos.
5. No regression: React dogfood / `react-ui` still works on ODS portal.

## Suggested next step in new chat

```text
/speckit.specify
```

Input: implement `021-angularjs-ui-landscape` from this draft; dogfood petclinic
AngularJS → Graph UI; reuse `020` canon; new parser module only.

Then: clarify → plan → tasks → implement.

## Related

- Vision: `specs/001-ods-vision/spec.md` (roadmap stage `021`)
- React baseline: `specs/020-ui-landscape-from-code/`
- Draft React: `ods-help/requirements/020-ui-landscape-from-code-draft.md`
- UI JSON models: `ods-help/requirements/json-model/` (`native-ui-tree`, `canonical-node-ui`, …)
- Live system dogfood: `http://localhost:8080/projects/c736c364-96b1-442b-8bd4-3a8c2ea05d2d/graph-view`
