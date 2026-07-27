# angularjs-ui parser

Extracts an AngularJS 1.x SPA UI landscape (declared URL-bearing non-abstract
`$state` / `$route`, screen-level literal `$http` calls) into the native UI tree
model (`schema_version: 1`), same schema as `react-ui` / `020`.

Heuristic / regex based. Roots: prefer `*-ui` modules; else
`**/static/scripts/**` (typical gateway-served SPA layout).

DoD pages exclude `abstract: true` states. DoD HTTP binds: literal
`$http.get/post/…('…')` with a static path string.
