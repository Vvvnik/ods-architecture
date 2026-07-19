# Detector: Spring system artifacts (019)

**Спека**: [spec.md](../spec.md)  
**База**: `specs/009-system-landscape/contracts/detector-artifacts.md`

## Новые artifact types

| artifact_type | parser_id | Триггер |
|---------------|-----------|---------|
| `maven-project` | `maven-project` | Файлы `pom.xml` в WC |
| `spring-config` | `spring-config` | `application*.yml` / `application*.yaml` / `application*.properties` |
| `java-api-routes` | `java-api-routes` | `.java` + hints: `@RestController`, `@Controller`, `@RequestMapping`, `@GetMapping`, `@PostMapping`, `RouterFunction` |
| `java-http-calls` | `java-http-calls` | `.java` + hints: `@FeignClient`, `WebClient`, `webClient.`, `RestClient` |

## Правила

- `file_count` / `sample_paths` / `parser_status` — как у прочих artifacts.
- Не заменять `languages[]`; параллельный `artifacts[]`.
- Наличие `language: java` **не** означает автозапуск routes/calls/config —
  нужны сигналы артефакта.
- Incremental: change-set по globs/hints; over-include OK, парсер фильтрует.
- `parsers/java` (symbols) остаётся в `languages[]` без изменения правил `018`.
