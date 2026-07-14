# TypeScript parser module (`005`)

CLI parser for TypeScript and JavaScript sources. Uses the TypeScript Compiler API and writes a parser envelope with native `model` schema version **`2`** (`symbols` + optional `usages[]` with `calls`, 008). Schema `1` (symbols/refs only) still ingested.

## Setup

```bash
cd parsers/typescript
npm ci
```

## Local run

```bash
node run.mjs \
  --project-id 00000000-0000-4000-8000-000000000001 \
  --working-copy-root /path/to/repo \
  --analysis-run-id 00000000-0000-4000-8000-000000000002 \
  --files '["src/main.ts","lib/util.ts"]' \
  --output /tmp/envelope.json
```

## Example output (`model` excerpt)

```json
{
  "symbols": [
    {
      "name": "main.ts",
      "kind": "module",
      "path": "src/main.ts",
      "qualified_name": "src/main.ts",
      "location": { "start_line": 1, "start_col": 0, "end_line": 3, "end_col": 0 },
      "refs": [
        {
          "type": "imports",
          "name": "util",
          "kind": "module",
          "path": "lib/util.ts",
          "qualified_name": "lib/util.ts"
        }
      ]
    },
    {
      "name": "main",
      "kind": "function",
      "path": "src/main.ts",
      "qualified_name": "main",
      "location": { "start_line": 1, "start_col": 0, "end_line": 1, "end_col": 25 }
    }
  ]
}
```

## Native model (schema 1 + 2)

| Field | Description |
|-------|-------------|
| `symbols[]` | Extracted declarations and module nodes |
| `symbols[].refs[]` | `imports` / `exports` (structural, as v1) |
| `usages[]` (v2) | Semantic links; MVP: `calls` |

Ingest: `backend/src/services/ingest/adapters/typescript.ingest.ts` → shared `symbols-model.ingest.ts`

See `specs/005-code-analysis/contracts/parser-manifest.md` for the orchestrator CLI contract.
