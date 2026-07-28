# Fixture: python-http-grpc-demo

**Path (implement):** `docker/fixtures/repos/python-http-grpc-demo/`  
**Spec DoD:** [spec.md](../spec.md) FR-007 / clarifications session 2026-07-28

## Layout (proposed)

```text
python-http-grpc-demo/
├── README.md
├── docker-compose.yml          # optional service hints
├── proto/                      # ≥1 .proto with service + rpc (grpc-proto)
├── fastapi_app/                # ≥1 FastAPI route (incl. named param OK)
├── flask_app/                  # ≥1 Flask route / blueprint
├── django_app/                 # path/re_path + ≥1 resolved include() chain
├── http_clients/               # ≥1 each: httpx, requests, aiohttp
└── grpc_client/                # ≥1 grpcio unary stub/channel call
```

Names are synthetic ODS-owned; do not hard-code external pilot paths.

## Minimum acceptance after analysis

| Check | Expect |
|-------|--------|
| FastAPI | ≥1 `http_endpoint` from `python-api-routes` |
| Flask | ≥1 `http_endpoint` |
| Django | ≥1 `http_endpoint` **and** ≥1 via resolved `include()` |
| Path template | ≥1 endpoint with named param / converter in path |
| httpx | ≥1 `http_calls` (HTTP) |
| requests | ≥1 `http_calls` (HTTP) |
| aiohttp | ≥1 `http_calls` (HTTP) |
| gRPC | ≥1 `grpc_method` (`grpc-proto`) + ≥1 `http_calls` protocol=grpc from `python-grpc-calls` |
| Ambiguous site (optional planted) | No false bind; run ok |

## Anti-dogfood

Heuristics MUST work for any similar layout under an ODS project tree.
External pilot smoke is SHOULD only, not the sole oracle.
