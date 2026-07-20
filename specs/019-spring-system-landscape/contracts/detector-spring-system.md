# Detector: Spring system artifacts (019)

**Spec**: [spec.md](../spec.md)  
**Base**: `specs/009-system-landscape/contracts/detector-artifacts.md`

## New artifact types

| artifact_type | parser_id | Trigger |
|---------------|-----------|---------|
| `maven-project` | `maven-project` | Files `pom.xml` in detector, WC |
| `spring-config` | `spring-config` | `application*.yml` / `application*.yaml` / `application*.properties` |
| `java-api-routes` | `java-api-routes` | `.java` + hints: `@RestController`, `@Controller`, `@RequestMapping`, `@GetMapping`, `@PostMapping`, `RouterFunction` |
| `java-http-calls` | `java-http-calls` | `.java` + hints: `@FeignClient`, `WebClient`, `webClient.`, `RestClient` |

## Rules

- `file_count` / `sample_paths` / `parser_status` — how others artifacts.
- Do not replace `languages[]`; parallel `artifacts[]`.
- Presence `language: java` **not** means auto-start routes/calls/config —
  artifact signals are needed.
- Incremental: change-set by globs/hints; over-include OK, parser filters
- `parsers/java` (symbols) from `languages[]` without rule changes `018`.
