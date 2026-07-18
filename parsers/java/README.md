# java parser (018)

Language CLI: JavaParser → envelope `symbols[]` (schema 1).

## DoD extract

- Paths: only `**/src/main/java/**` (skip test + typical generated)
- Per file: `module`
- Per package FQN: one `namespace` (`java-package/<slashes>`)
- Top-level `class` / `interface` / `enum` with `parent_qualified_name`
- Nested / anonymous / local — not emitted

## CLI

```bash
./run.sh \
  --project-id <uuid> \
  --working-copy-root <abs> \
  --analysis-run-id <uuid> \
  --files '["demo/src/main/java/com/example/App.java"]' \
  --output /tmp/envelope.json
```

Build: `mvn -q -DskipTests package` → `target/ods-java-parser.jar`.

## Disable module

Remove `parsers/java/` from image / `PARSERS_ROOT`, or delete catalog — language
report shows `parser_status: missing`; other parsers keep running.

## Contracts

`specs/018-parser-extension-playbook/contracts/`
