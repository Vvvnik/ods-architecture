# Детектор: Java language + ignore build wrappers

**Спека**: [spec.md](../spec.md) | **Research**: [research.md](../research.md) R4–R5

## Language `java`

Уже: расширение `.java` → `java` в language report.
`parser_id` = `java` при наличии `parsers/java/manifest.json`.

## Фильтр extract (парсер, не обязательно детектор)

CLI `java` обрабатывает только пути, matching:

- include: `**/src/main/java/**`
- exclude (типичный generated): `**/target/generated-sources/**`,
  `**/build/generated/**`

Отчёт `file_count` языка MAY включать все `.java` WC; DoD канона — только
main после фильтра CLI.

## Wrappers (не shell)

Basename (case-sensitive как в git на *nix; на Windows — best-effort) **не**
классифицировать как `shell`:

| basename |
|----------|
| `mvnw` |
| `gradlew` |
| `mvnw.cmd` |
| `gradlew.bat` |
| `mvnw.ps1` |
| `gradlew.ps1` |

Прочие `.sh` / shebang shell — без изменений (`missing` без модуля).

## Артефакты

Новых `artifact_type` в `018` **нет** (Spring/Maven — follow-up).
