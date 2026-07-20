# Parser fixtures (local test data)

**Canonical source for demo 008** (`calls`/`injects`):
`docker/fixtures/repos/code-graph-depth-demo/`  
Integration tests copy from that location (`csharp-parser-calls`, `typescript-parser-calls`).

| Directory | Purpose |
|---------|------------|
| `csharp-ambiguous/` | Overloads without an unambiguous `calls` edge (the "no edge" scenario) |

Do not duplicate `code-graph-depth-demo` here; the single source of truth is in `docker/fixtures/repos/`.
