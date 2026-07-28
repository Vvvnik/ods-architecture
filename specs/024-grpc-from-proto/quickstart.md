# Quickstart: 024-grpc-from-proto

Validate gRPC surface + multi-stack client binds + .NET HTTP clients on the
ODS-owned fixture. Artifacts: [data-model.md](./data-model.md),
[contracts/](./contracts/).

## Prerequisites

- Docker Compose profile `full` (or local backend + parsers with Node, JDK 17,
  .NET 8+)
- Fixture present at `docker/fixtures/repos/grpc-multistack-demo/` (created in
  implement tasks)
- Parsers built: `grpc-proto`, `ts-grpc-calls`, `java-grpc-calls`,
  `dotnet-grpc-calls`, `dotnet-http-calls` (Release DLL/JAR where applicable)

## 1. Import + analyze fixture

1. Import project with `local_path` pointing at the fixture under the repos
   mount.
2. Run full analysis; confirm modal shows artifact rows for `grpc-proto` and
   applicable `*-grpc-calls` / `dotnet-http-calls` as **available** when files
   match.
3. Complete run without hard-fail solely due to unresolved optional sites.

## 2. Assert Canon (API or ES)

Expect at least:

```text
nodes: kind=grpc_method, metadata.protocol=grpc, count >= 1
edges: type=documents, metadata.protocol=grpc, count >= 1
edges: type=http_calls, metadata.protocol=grpc
        (from TS, Java, and .NET client parsers — ≥1 each)
edges: type=http_calls from parser_id=dotnet-http-calls (≥1)
```

Optional: `exposes` service→`grpc_method` when service_hint matches.

## 3. System Graph view

Open Graph (system slice). Confirm ≥1 RPC method node is visible and at least
one client→method relationship is inspectable within ~2 minutes (SC-001/002).

## 4. Negative / regression checks

| Check | Expect |
|-------|--------|
| Project without `.proto` | No `grpc_method` invented |
| OpenAPI-only tree | Not classified as gRPC surface |
| Known TS/Java HTTP smoke | Prior `http_endpoint` / `http_calls` still present |
| Ambiguous gRPC call in fixture | No false bind; run ok |

## 5. Unit / CLI (dev)

```bash
# examples — exact flags match 005 parser CLI
node parsers/grpc-proto/run.mjs --working-copy-root … --files '[…]' --output /tmp/grpc-proto.json
# similarly ts-grpc-calls; java/dotnet via run.sh
```

Ingest unit tests: fixtures under `backend/tests/fixtures/ingest/` for each
native model → assert node/edge shapes in [contracts/](./contracts/).

## Out of scope here

Pipeline workers / parallel default tuning (`025`); Python/C++ clients;
RSocket/SOAP/AsyncAPI.
