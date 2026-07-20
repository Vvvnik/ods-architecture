# Quickstart: check 013-api-routes-from-code (CP1)

**Goal:** after analyzing the diagram in system-the interior of the service visible HTTP
endpoints from the **code**. Contracts are [contracts/](./contracts/).

## Prerequisites

1. Stack: `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
2. Fixtures: **ods-arch**; **api-routes-csharp-demo** (created by implement)
   imported, sync + analysis completed.
3. Modules `ts-api-routes` and `dotnet-api-routes` in registry (`available`).

## 1. TS / ods-arch (SC-001, SC-003)

1. "Graph view" → System → **Log** in `backend` (system).
2. **Expectation:** ≥1 node HTTP-endpoint with the path in the spirit `/api/v1/...`
   (for example, health or graph/view).
3. **In the code** on the same tools → modules/symbols code, without recourse `012`.
4. API (optional):  
   `GET .../graph/view?focus=<backendServiceId>` — among nodes is
   `kind=http_endpoint`, `metadata.source=code` (or parser_id
   `ts-api-routes`).

## 2. C# fixture (SC-002)

1. Project api-routes-csharp-demo → analysis.
2. System-service entry: visible endpoint of **controller** from **MapGet**
   (one screen or two foci — according to the structure of fixture).
3. Code-the service layer — the symbols are in place.

## 3. Communication exposes (US3)

1. A slice of "backend" with endpoints — in "inspector/"connections shows that the service
   **publishes API** (`exposes`).
2. Negative: a file of routes without a comparable service → endpoint may be,
   without false connection to all services.

## 4. Disabling the module (SC-004)

1. To remove/break registry entry `ts-api-routes` (or simulate missing).
2. Analysis ods-arch → compose-services and code graph live; the status of the module
   `missing`/`failed` no knocks run entirely.

## 5. Audit reuse (SC-005)

- There are no second Orchestrator; only `parsers/*` + ingest adapters + detector
  artifacts.
- OpenAPI is not "fixed" merge is in this feature.

## Don't check here

- Button Code/System cutoff analysis sync-overlay (`014`)
- Python / Express / Nest
- Dedup with OpenAPI yaml
