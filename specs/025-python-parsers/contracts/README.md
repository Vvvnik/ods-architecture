# Contracts: 025-python-parsers

Native envelope schemas and ingest notes for Python HTTP routes, HTTP
clients, and gRPC clients.

| File | Purpose |
|------|---------|
| [native-python-api-routes.schema.json](./native-python-api-routes.schema.json) | `parser_id=python-api-routes` model |
| [native-python-http-calls.schema.json](./native-python-http-calls.schema.json) | `parser_id=python-http-calls` model |
| [ingest-python-api-routes.md](./ingest-python-api-routes.md) | Routes → `http_endpoint` + `exposes` |
| [ingest-python-http-calls.md](./ingest-python-http-calls.md) | HTTP clients → `http_calls` |
| [ingest-python-grpc-calls.md](./ingest-python-grpc-calls.md) | gRPC clients → `http_calls` (protocol=grpc) |
| [fixture-python-http-grpc.md](./fixture-python-http-grpc.md) | DoD fixture expectations |

**Shared (do not duplicate):** gRPC client native model —
[`../../024-grpc-from-proto/contracts/native-grpc-calls.schema.json`](../../024-grpc-from-proto/contracts/native-grpc-calls.schema.json)
(`parser_id=python-grpc-calls` uses the same `calls[]` shape).

Envelope wrapper remains `005` / shared envelope schema (`parser_id`,
`schema_version`, `project_id`, `analysis_run_id`, `files_analyzed`, `model`).
