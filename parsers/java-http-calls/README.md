# java-http-calls

Извлекает исходящие HTTP-вызовы из:

- Spring OpenFeign (`@FeignClient`) — `client_kind=feign`
- `WebClient` (литерал / `hostname + "path"`) — `webclient`
- `RestClient` (в т.ч. `getInstances("service")` + path concat) — `restclient`

Native-модель — `calls[]`. Regex-помощники с `java-api-routes` в
`../_shared/java-spring/`; `parsers/java` остаётся только symbols-модулем.
