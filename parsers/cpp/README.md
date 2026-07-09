# C++ parser (`parser_id=cpp`)

Extracts symbols from `.cpp`, `.cc`, `.cxx`, `.h`, `.hpp` using a **line-oriented extractor** in Node (`run.mjs`).

## Technology choice

The task allows **libclang** or **tree-sitter**. For the MVP Docker image we use a lightweight regex/heuristic extractor (no native bindings, no `libclang` in the image). A future increment can swap the implementation for tree-sitter or libclang without changing the envelope contract.

## Local run

```bash
node run.mjs \
  --project-id 00000000-0000-4000-8000-000000000001 \
  --working-copy-root /path/to/repo \
  --analysis-run-id 00000000-0000-4000-8000-000000000002 \
  --files '["src/main.cpp"]' \
  --output /tmp/envelope.json
```

## Detected constructs

- `module` per file (`qualified_name` = POSIX path)
- `class` / `struct` declarations
- function definitions with a trailing `{`
- `#include <…>` / `#include "…"` → `imports` refs (`iostream` maps to `std`)

## Native model v1

Same shape as `typescript` / `csharp` — see `specs/005-code-analysis/contracts/envelope-schema.json`.
