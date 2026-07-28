# Ingest: python-grpc-calls

**parser_id**: `python-grpc-calls`  
**Native**: reuse
[`../../024-grpc-from-proto/contracts/native-grpc-calls.schema.json`](../../024-grpc-from-proto/contracts/native-grpc-calls.schema.json)  
**Canon**: [data-model.md](../data-model.md); peer ingest notes
[`../../024-grpc-from-proto/contracts/ingest-grpc-calls.md`](../../024-grpc-from-proto/contracts/ingest-grpc-calls.md)

## Transform

1. For each `model.calls[]` with `target_service` + `target_method`:
   - Resolve to existing `grpc_method` id from `grpc-proto` ingest
     (`package.Service/Method`).
   - On unique match → upsert `http_calls` with `metadata.protocol=grpc`,
     `metadata.layer=system`.
   - On missing / ambiguous → **skip** (no invent; do not create
     `grpc_method` from stubs alone).
2. Prefer extending shared `grpc-calls.ingest` factory to accept
   `python-grpc-calls` (same as ts/java/dotnet).

## Registration

- Adapter: extend `backend/src/services/ingest/adapters/grpc-calls.ingest.ts`
  **or** thin `python-grpc-calls.ingest.ts` wrapper.
- Register in `ingest-registry.service.ts`.
- Add `python-grpc-calls` to `ARTIFACT_PARSER_IDS`.
- Orchestrator already prefers `grpc-proto` before `*-grpc-calls` when
  ordering by suffix/heuristics — verify Python id participates.

## DoD notes

Fixture must include `.proto` surface (via existing `grpc-proto`) and ≥1
Python grpcio unary bind that resolves to a `grpc_method`.
