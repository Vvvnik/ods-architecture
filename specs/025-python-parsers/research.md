# Research: 025-python-parsers

**Date**: 2026-07-28  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## R1 — Three artifact modules (not merge into `python`)

**Decision:** Ship separate `parser_id`s: `python-api-routes`,
`python-http-calls`, `python-grpc-calls`. Do **not** extend
`parsers/python` symbols extract with HTTP/gRPC.

**Rationale:** Spec FR-004 / `018` rule (service HTTP/RPC → artifact even when
files share `.py`). Matches TS/Java/.NET peer layout.

**Alternatives considered:** One mega `python-system` module (rejected —
harder confirm status / spawn / incremental filters); fold into language
parser (rejected — `018`).

## R2 — Extract host and parse strategy

**Decision:** CPython 3.11+ CLIs (`bash run.sh` → `extract.py`) using
**stdlib `ast`** (and light text heuristics where AST alone is awkward, e.g.
Django `urlpatterns` lists). Do **not** require FastAPI/Flask/Django/httpx
installed in the parser image to extract DoD patterns from source text.

**Rationale:** Same operational family as `parsers/python`; image already has
CPython; avoids shipping framework runtimes into the parser container for
static extract.

**Alternatives considered:** Node/ts-morph over Python (rejected — worse for
Python syntax); runtime import of frameworks (rejected — fragile, heavy).

## R3 — HTTP routes DoD patterns

**Decision:** MUST extract when statically resolvable:

| Framework | Patterns (DoD) |
|-----------|----------------|
| **FastAPI** | `@app.get/post/…`, `@router.get/…` (and equivalent HTTP-method decorators) with literal or f-string/static path template |
| **Flask** | `@app.route` / blueprint `route` with static rule string |
| **Django** | `path()` / `re_path()` in `urlpatterns`; FBV and CBV (`as_view`) when view target is identifiable; **≥1 resolved `include()`** chain in fixture |

Named path params / converters (FastAPI `{id}`, Django `<int:pk>`, Flask
`<int:id>`) are **in DoD** when the template string is statically known
(clarify). Unresolved `include()` / i18n trees → **skip**. Starlette-only
apps are **not** required for DoD (clarify); overlapping Starlette decorator
patterns MAY still extract if encountered.

Native model: same shape as `*-api-routes` (`routes[]`: `method`, `path`,
`source_path`, optional `handler_name`, `service_hint`, `path_complete`).

**Rationale:** Spec FR-001 / clarifications; parity with `013`/`019`.

**Alternatives considered:** Starlette-native mandatory fixture (rejected —
clarify A); DRF routers as separate MUST (deferred — out of locked popular
list unless path()/include already covers common mounts).

## R4 — HTTP clients DoD patterns

**Decision:** MUST extract statically resolvable call-sites for **each**:

| Library | Patterns (DoD) |
|---------|----------------|
| **httpx** | `httpx.get/post/…` or `Client` / `AsyncClient` methods with literal URL or base_url+path |
| **requests** | `requests.get/post/…` or `Session` methods with literal URL or base+path |
| **aiohttp** | `session.get/post/…` (or `request`) with literal URL or base+path |

Fixture MUST include ≥1 bind **per** library (clarify). Target resolve:
prefer `http_endpoint` from `python-api-routes` (and other route parsers in
same project when unique); else `external_api` for absolute external URL;
else **skip**. Edge `http_calls`, HTTP protocol (not gRPC).

Native model: align with `ts-http-calls` (`calls[]`: `method`, `path`/`url`,
`source_path`, optional `service_hint`, `callee_service_hint`,
`client_kind`).

**Rationale:** FR-002 / FR-007 / clarify Q1.

**Alternatives considered:** ≥1 any library in fixture (rejected — clarify A);
urllib-only (out of MUST set).

## R5 — gRPC clients (`python-grpc-calls`)

**Decision:** Separate artifact module emitting shared `024`
`native-grpc-calls` shape (`calls[]`: `target_service`, `target_method`,
`source_path`, …). MUST patterns: **grpcio** generated stub / channel
**unary** invoke where service+method names are statically visible. Ingest
via existing `grpc-calls.ingest` factory → `http_calls` +
`metadata.protocol=grpc` to `grpc_method` ids from `grpc-proto`. Missing /
ambiguous → skip. Do **not** invent IDL surface from stubs alone.

**Rationale:** FR-003 / FR-009; parity with `ts|java|dotnet-grpc-calls`.

**Alternatives considered:** New edge type (rejected); parse only stubs for
server surface (rejected — `024` rule).

## R6 — Detector rules

**Decision:** Add three `artifact_types` rows in
`backend/src/config/detector-rules.json` (`.py` / `.pyw` + content hints):

| parser_id | content_hints (illustrative) |
|-----------|------------------------------|
| `python-api-routes` | `FastAPI`, `@app.`, `APIRouter`, `Flask`, `@app.route`, `urlpatterns`, `django.urls` |
| `python-http-calls` | `httpx`, `requests.`, `aiohttp` |
| `python-grpc-calls` | `grpc`, `grpcio`, `stub`, `Channel` |

Also register in `ARTIFACT_PARSER_IDS` and ingest registry. Spawn when
`file_count > 0`. Do not treat OpenAPI YAML as Python routes.

**Rationale:** FR-006 / `018` detection.

**Alternatives considered:** Spawn on every `.py` without hints (too noisy).

## R7 — Ingest adapters and stable ids

**Decision:**

| Module | Adapter approach | Id prefix |
|--------|------------------|-----------|
| `python-api-routes` | Thin wrapper: `transformApiRoutes(model, ctx, 'python')` from shared `api-routes.ingest`; optional native `framework` → endpoint metadata | `python-api-routes:http_endpoint:…` (+ `exposes`) |
| `python-http-calls` | Peer of `ts-http-calls` / `java-http-calls` | `python-http-calls:http_calls:…` |
| `python-grpc-calls` | Extend `grpc-calls.ingest` factory union with `python-grpc-calls` | `python-grpc-calls:http_calls:…` |

Reuse `httpEndpointNodeId` / service resolve helpers. Skip unresolved without
failing the run.

**Rationale:** FR-005 / FR-008; minimize Canon drift.

**Alternatives considered:** Fully custom ingest per module (more churn).

## R7b — Extract unit test runner

**Decision:** Use **pytest** with `parsers/<id>/tests/test_extract.py` per
module (not ad-hoc `extract.test.py` naming).

**Rationale:** Common Python practice; clear CI command.

**Alternatives considered:** stdlib `unittest` only; Node-side tests of
Python AST (rejected).

## R7c — Graph / confirm DoD evidence

**Decision:** FR-008 / SC-001–003: assert via system Graph **data path**
(`graph/view` or `buildViewSlicePure`), not pixel UI e2e. FR-006 confirm:
automated detector/analysis artifact status tests on the DoD fixture.

**Rationale:** Analyze remediation (C1/C2); parity with existing Graph slice
integration tests.

## R8 — Fixture packaging

**Decision:** One ODS-owned tree
`docker/fixtures/repos/python-http-grpc-demo/` with mini-apps / packages:

- `fastapi_app/` — ≥1 route (incl. named param template)
- `flask_app/` — ≥1 route
- `django_app/` — ≥1 direct `path`/`re_path` + ≥1 via resolved `include()`
- `http_clients/` — ≥1 call each httpx / requests / aiohttp (prefer targeting
  in-fixture endpoints when possible)
- `grpc_client/` + `proto/` — `.proto` + ≥1 grpcio unary bind
- optional root `docker-compose.yml` for service hints (parity with peers)

Register in fixtures README / `setup-fixtures.sh` at implement. External
pilot = SHOULD smoke only; no foreign path hardcodes.

**Rationale:** Clarify Q3 / FR-007; mirror `grpc-multistack-demo` packaging.

**Alternatives considered:** Separate repos per framework (rejected —
clarify A).

## R9 — Graph / UX

**Decision:** No new Graph product. Existing system Graph + `024` protocol
filters already display `http_endpoint` / `http_calls` / `grpc_method`. No
frontend DoD unless a proven allow-list gap appears at implement.

**Rationale:** Spec boundaries; FR-008.

**Alternatives considered:** Pixel redesign (out).

## R10 — Vision close-out

**Decision:** On feature close, promote `001` Stack coverage matrix Python
HTTP routes / HTTP clients / gRPC clients cells to ✅ with the three
`parser_id`s (FR-012). Plan/tasks do not claim ✅ early.

**Rationale:** Vision alignment principle III.
