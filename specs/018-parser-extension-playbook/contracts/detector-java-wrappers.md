# Detector: Java language + ignore build wrappers

**Spec**: [spec.md](../spec.md) | **Research**: [research.md](../research.md) R4–R5

## Language `java`

Already: extension `.java` → `java` in detector, language report.
`parser_id` = `java` upon availability `parsers/java/manifest.json`.

## Filter extract (parser, not necessarily a detector

CLI `java` handles only paths, matching:

- include: `**/src/main/java/**`
- exclude (typical generated): `**/target/generated-sources/**`,
  `**/build/generated/**`

Report `file_count` language MAY to include all `.java` WC; DoD canon — only
main after filter CLI.

## Wrappers (not shell)

Basename (case-sensitive as in git on *nix; on Windows — best-effort) **not**
classify as `shell`:

| basename |
|----------|
| `mvnw` |
| `gradlew` |
| `mvnw.cmd` |
| `gradlew.bat` |
| `mvnw.ps1` |
| `gradlew.ps1` |

Others `.sh` / shebang shell — without changes (`missing` without module).

## Artifacts

New `artifact_type` in detector, `018` **none** (Spring/Maven — follow-up).
