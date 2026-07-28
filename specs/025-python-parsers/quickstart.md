# Quickstart: 025-python-parsers

Validate Python HTTP routes + HTTP clients + gRPC clients on the ODS-owned
fixture. Artifacts: [data-model.md](./data-model.md), [contracts/](./contracts/).

## Prerequisites

- Docker Compose profile `full` (backend + parsers with CPython 3.11+)
- Fixture present at `docker/fixtures/repos/python-http-grpc-demo/` (created in
  implement tasks)
- Parsers available: `python-api-routes`, `python-http-calls`,
  `python-grpc-calls` (plus existing `grpc-proto` / `python` symbols)

## 1. Import + analyze fixture

1. Import project with `local_path` pointing at the fixture under the repos
   mount.
2. Run full analysis; confirm modal shows artifact rows for the three new
   Python modules (and `grpc-proto`) as **available** when files match.
3. Complete run without hard-fail solely due to unresolved optional sites.

## 2. Assert Canon (API or ES)

Expect at least:

```text
nodes: kind=http_endpoint, parser_id=python-api-routes
       (≥1 FastAPI, ≥1 Flask, ≥1 Django; ≥1 Django via include)
edges: type=exposes (when service match) for Python endpoints
edges: type=http_calls, parser_id=python-http-calls
       (≥1 each client_kind httpx, requests, aiohttp)
nodes: kind=grpc_method (from grpc-proto)
edges: type=http_calls, metadata.protocol=grpc,
       parser_id=python-grpc-calls (≥1)
```

## 3. System Graph view

Open Graph (system slice) or query system `graph/view`. Confirm Python HTTP
endpoints and at least one HTTP client relationship plus one gRPC
client→method relationship are present in the **system Graph data path**.
Use existing protocol filters if helpful (`http` / `grpc`). Pixel UI e2e is
not required for DoD (see spec FR-008).

Automated: `backend/tests/integration/python-parsers-graph-slice.test.ts`
(implement task T039).

SC-001 timing step (measurable):

1. Start timer at opening Graph page (or first successful system slice
   response) for the fixture project.
2. Stop timer when ≥1 FastAPI, ≥1 Flask, and ≥1 Django endpoint are all
   identifiable in the system slice / inspector.
3. Record elapsed wall-clock time in test notes; target `< 2m 00s`.

## 4. Confirm / detector status

Automated: analysis artifact status for the three Python modules is
**available** on the DoD fixture when files match (task T037). Manual portal
confirm click-through is optional smoke only.

## 4. Negative / regression checks

| Check | Expect |
| ----- | ------ |
| Project without Python HTTP/gRPC DoD evidence | No invented Python HTTP/gRPC landscape from these modules |
| Ambiguous / unresolved call in fixture | No false bind; run ok |
| Known TS/Java/.NET HTTP + grpc-proto smoke | Prior landscape still present |
| `parsers/python` symbols | Still works; not rewritten |

## 5. Unit / CLI (dev)

```bash
# examples — exact flags match 005 parser CLI
bash parsers/python-api-routes/run.sh \
  --working-copy-root … --files '[…]' --output /tmp/python-api-routes.json
# similarly python-http-calls, python-grpc-calls

pytest parsers/python-api-routes/tests
pytest parsers/python-http-calls/tests
pytest parsers/python-grpc-calls/tests
```

Ingest unit tests: fixtures under `backend/tests/fixtures/ingest/` for each
native model → assert node/edge shapes in [contracts/](./contracts/).

## Out of scope here

Pipeline workers / parallel default tuning (deferred unnumbered draft);
C++ HTTP/gRPC; rewriting TS/Java/.NET modules or `grpc-proto`.

## Pilot smoke (SHOULD — T043)

Operator-local Python tree only (not committed paths). After DoD fixture
passes:

1. Import/analyze a local Python project that has at least one of: FastAPI/
   Flask/Django routes, httpx/requests/aiohttp calls, or grpcio clients.
2. Spot-check system Graph / Canon for non-invented binds where statically
   resolvable; skip unresolved as usual.
3. Record date + pass/skip outcome here (no foreign product/repo names in
   this file):

| Date | Outcome | Notes (generic) |
|------|---------|-----------------|
| 2026-07-28 | skip | CI implement session — operator-local tree not available; DoD fixture + automated tests green |
