# Fixture: `grpc-multistack-demo`

**Path (planned)**: `docker/fixtures/repos/grpc-multistack-demo/`  
**Purpose**: DoD for `024` (FR-009, SC-001…006)

## Required contents

| Area | Minimum |
|------|---------|
| Protobuf | ≥1 `.proto` with ≥1 `service` and ≥1 `rpc` method |
| TS gRPC client | ≥1 statically resolvable call to that method |
| Java gRPC client | ≥1 statically resolvable call to that method |
| .NET gRPC client | ≥1 statically resolvable call to that method |
| .NET HTTP client | ≥1 statically resolvable HttpClient or Refit/generated call |
| Names | Synthetic ODS-owned only (no foreign product paths) |

## Suggested layout

```text
grpc-multistack-demo/
├── proto/
│   └── demo/v1/greeter.proto
├── ts-client/
│   └── src/call-greeter.ts
├── java-client/
│   └── src/main/java/.../CallGreeter.java
├── dotnet-client/
│   └── CallGreeter.cs
└── dotnet-http/
    └── HttpCallDemo.cs
```

## Expected Canon after analysis

- ≥1 `grpc_method` with `metadata.protocol=grpc`
- ≥1 `documents` (or equivalent contract→method) edge
- ≥1 gRPC `http_calls` per TS / Java / .NET client stacks
- ≥1 HTTP `http_calls` from `dotnet-http-calls`
- Project without this fixture’s `.proto` → zero invented `grpc_method`
