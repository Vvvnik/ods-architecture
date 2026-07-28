# Contracts: 024-grpc-from-proto

Native envelope schemas and ingest notes for gRPC surface, gRPC client binds,
and .NET HTTP clients.

| File | Purpose |
|------|---------|
| [native-grpc-proto.schema.json](./native-grpc-proto.schema.json) | `parser_id=grpc-proto` model |
| [native-grpc-calls.schema.json](./native-grpc-calls.schema.json) | Shared model for `ts-grpc-calls` / `java-grpc-calls` / `dotnet-grpc-calls` |
| [native-dotnet-http-calls.schema.json](./native-dotnet-http-calls.schema.json) | `parser_id=dotnet-http-calls` model |
| [ingest-grpc-proto.md](./ingest-grpc-proto.md) | `.proto` → `grpc_method` + edges |
| [ingest-grpc-calls.md](./ingest-grpc-calls.md) | Client binds → `http_calls` (protocol=grpc) |
| [ingest-dotnet-http-calls.md](./ingest-dotnet-http-calls.md) | .NET HTTP → `http_calls` |
| [fixture-grpc-multistack.md](./fixture-grpc-multistack.md) | DoD fixture expectations |

Envelope wrapper remains `005` / shared envelope schema (`parser_id`,
`schema_version`, `project_id`, `analysis_run_id`, `files_analyzed`, `model`).
