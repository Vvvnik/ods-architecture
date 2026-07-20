# java-api-routes

Extracts literal Spring MVC mappings from `@RestController`/`@Controller`.
The full path combines the class `@RequestMapping` and method mapping;
`route_kind=mvc`. Gateway/WebFlux remain optional under 019.

Regex helpers shared with `java-http-calls` are in
`../_shared/java-spring/`; the `parsers/java` output remains unchanged.
