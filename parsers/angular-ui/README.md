# angular-ui

Angular 2+ UI landscape parser. Emits the same native `apps` / `routes` / `screens`
tree shape as `react-ui` for ingest into Graph UI.

## Detection

- `package.json` with `@angular/core`
- Prefer packages that have `angular.json` and/or `*-routing.module.ts` / `*.routes.ts`

## Extract (heuristic)

- Parse `Routes` object literals for `path` + `component` / `loadChildren` / `loadComponent`
- Skip `**` wildcards; empty path without component is ignored unless redirected with a name

AngularJS 1.x remains `angularjs-ui` (021).
