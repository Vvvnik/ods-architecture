# java-http-calls

Extracts outgoing HTTP calls from:

- Spring OpenFeign (`@FeignClient`) — `client_kind=feign`
- `WebClient` (literal / `hostname + "path"`) — `webclient`
- `RestClient` (including `getInstances("service")` + path concatenation) — `restclient`
- `RestTemplate` (`getForObject` / `exchange` / …) — `resttemplate`
- `HttpURLConnection` (`new URL("…").openConnection()`) — `httpurlconnection`

Unresolved URL expressions are skipped. The native model is `calls[]`. Regex helpers
shared with `java-api-routes` are in `../_shared/java-spring/`; `parsers/java`
remains a symbols-only module.
