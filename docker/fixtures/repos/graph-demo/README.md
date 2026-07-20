# graph-demo

Small TypeScript project for validating the ODS graph: modules + `imports` edges (from → to).

After sync and analysis, the Graph screen should show module/function nodes and links between files.

## Files

| File | Imports |
|------|-------------|
| `src/app.ts` | `logger`, `services/user`, `utils/math` |
| `src/services/user.ts` | `logger`, `utils/math` |
| `src/logger.ts` | — |
| `src/utils/math.ts` | — |

## Import into Docker

```text
source_type: local_path
source_value: /repos/graph-demo
```

Local backend: use the absolute path to `docker/fixtures/repos/graph-demo`.

Before the first import, initialize Git in the directory if `.git` does not exist:

```bash
cd docker/fixtures/repos/graph-demo && git init && git add . && git commit -m 'graph demo'
```
