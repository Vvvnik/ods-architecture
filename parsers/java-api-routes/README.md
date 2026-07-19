# java-api-routes

Извлекает литеральные Spring MVC mappings из `@RestController`/`@Controller`.
Полный path складывается из class `@RequestMapping` и method mapping;
`route_kind=mvc`. Gateway/WebFlux остаются опциональными согласно 019.

Regex-помощники разделены с `java-http-calls` в
`../_shared/java-spring/`; output `parsers/java` не меняется.
