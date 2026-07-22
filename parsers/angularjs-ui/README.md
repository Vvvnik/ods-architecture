# angularjs-ui parser

Extracts an AngularJS 1.x SPA UI landscape (declared URL-bearing non-abstract
`$state` / `$route`, screen-level literal `$http` calls) into the native UI tree
model (`schema_version: 1`), same schema as `react-ui` / `020`.

Heuristic / regex based. Dogfood: spring-petclinic-microservices API Gateway
static scripts (`…/static/scripts/`), or `spring-petclinic-ui` when present.

DoD pages exclude `abstract: true` states. DoD HTTP binds: literal
`$http.get/post/…('…')` with a static path string.
