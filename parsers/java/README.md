# java parser (018 + 023)

Language CLI: JavaParser + Symbol Solver → envelope `symbols[]` + `usages[]`
(`schema_version` **2**).

## DoD extract

- Paths: only `**/src/main/java/**` (skip test + typical generated)
- Per file: `module`
- Per package FQN: one `namespace` (`java-package/<slashes>`)
- Top-level `class` / `interface` / `enum` with `parent_qualified_name`
- **All methods** on those types (any visibility) as `kind: method`
- Semantic **`usages`** `type: calls` for uniquely resolvable instance/static
  calls (cross-file / cross-module; interface receiver → interface method QN)
- Nested / anonymous / local — not emitted
- Ambiguous / unresolved / constructors / `super` — no usage row

## CLI

```bash
./run.sh \
  --project-id <uuid> \
  --working-copy-root <abs> \
  --analysis-run-id <uuid> \
  --files '["module-alpha/src/main/java/ods/alpha/Service.java"]' \
  --output /tmp/envelope.json
```

Build: `mvn -q -DskipTests package` → `target/ods-java-parser.jar`.

DoD fixture: `docker/fixtures/repos/java-calls-demo/`  
Contracts: `specs/023-java-calls/contracts/` (and `018` for symbols MVP history)

## Disable module

Remove `parsers/java/` from image / `PARSERS_ROOT`, or delete catalog — language
report shows `parser_status: missing`; other parsers keep running.
