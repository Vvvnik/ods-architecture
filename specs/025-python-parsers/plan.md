# Implementation Plan: Python HTTP and gRPC parsers

**Branch**: `025-python-parsers` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/025-python-parsers/spec.md`
(clarify locked: per-library HTTP client fixture; FastAPI alone for
FastAPI/Starlette cell; one multi-module ODS fixture; Django resolved
`include()` required; path templates with named params in DoD).

**Dependencies**:

- `specs/001-ods-vision/spec.md` — active `025`; Stack coverage matrix Python rows
- `specs/005-code-analysis/` — detector, registry, orchestrator, envelope
- `specs/006-project-graph/` — Canon ingest indexes
- `specs/009-system-landscape/` — system layer baseline
- `specs/013-api-routes-from-code/` / `specs/014-graph-view-ux/` — HTTP
  surface + `http_calls` UX parity (reuse Graph; no UX rewrite DoD)
- `specs/018-parser-extension-playbook/` — artifact-module checklist
- `specs/024-grpc-from-proto/` — `grpc_method`, shared `*-grpc-calls` native
  shape, `grpc-proto` surface (reuse; do not rewrite)

**Out of this plan**: parser pipeline perf (deferred unnumbered draft); C++
HTTP/gRPC; rewriting `parsers/python` symbols or TS/Java/.NET HTTP/gRPC /
`grpc-proto`; RSocket/SOAP/GraphQL/AsyncAPI; S1 / MCP / auth.

## Summary

Close the Python **system** capability gap with three new artifact modules
(`018`), reusing existing Canon and Graph:

| Module | Role | Canon |
| -------- | ------ | -------- |
| `python-api-routes` | FastAPI + Flask + Django routes | `http_endpoint` + `exposes` |
| `python-http-calls` | httpx + requests + aiohttp clients | `http_calls` → `http_endpoint` / `external_api` (HTTP) |
| `python-grpc-calls` | grpcio stub/channel unary binds | `http_calls` → `grpc_method`, `protocol=grpc` |

Shared IDL surface stays **`grpc-proto`** (`024`). Language symbols stay
**`python`**. No new node/edge kinds.

Prove DoD on **one** ODS-owned multi-module fixture: ≥1 endpoint each for
FastAPI, Flask, Django (incl. ≥1 resolved Django `include()`); ≥1 HTTP client
bind each for httpx, requests, aiohttp; ≥1 Python gRPC client bind; `.proto`
via existing `grpc-proto`.

## Technical Context

**Language/Version**: Python 3.11+ (CPython) for three new extract CLIs
(stdlib `ast` / text parse — same host family as `parsers/python`); TypeScript
5.x / Node 20 for backend detector rules, ingest adapters, Vitest

**Primary Dependencies**: existing Fastify + ES ingest registry; shared
`api-routes.ingest` / `grpc-calls.ingest` factories where possible; Vitest;
Docker image already ships CPython for `parsers/python`

**Storage**: same `ods-graph-nodes` / `ods-graph-edges` / `ods-parser-envelopes`;
`metadata.layer=system`; **no** new `NodeKind` / edge enum values

**Testing**: pytest for parser extract modules; Vitest for backend detector/
ingest/integration (including system Graph slice data-path asserts);
fixture end-to-end spawn→ingest→system Graph slice; regression smoke on
TS/Java/.NET HTTP + `grpc-proto`

**Target Platform**: Docker Compose `--profile full`

**Project Type**: 3 new artifact CLI parsers + detector rows + ingest
adapters + ODS multi-module fixture; no new Graph product

**Performance Goals**: fixture analysis within existing parser timeouts;
skip unresolved without failing the run; **no** pipeline worker/chunk redesign

**Constraints**: do not rewrite `python` symbols / peer HTTP/gRPC /
`grpc-proto`; no inventing endpoints; no multi-repo binds; English artifacts;
anti–dogfood heuristics; C++ out

**Scale/Scope**: 3 `parser_id`s; 1 ODS multi-module fixture; SHOULD external
pilot smoke (**T043**, not sole DoD)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution: `.specify/memory/constitution.md` (v1.4.10). Vision:
`specs/001-ods-vision/spec.md`.

| Requirement | Status |
| ------------- | -------- |
| VI. Detailed FR in child `025`, not inflated into `001` | ✅; `001` promotes active feature + matrix rows only |
| Scope in `001` before implement | ✅ — Specified 2026-07-28 |
| Modular CLI parsers (`018`), not language-symbol merge | ✅ — three artifact modules; `python` untouched |
| Single Canon ES indexes; no new edge types | ✅ — reuse `013`/`014`/`024` kinds |
| No merge of pipeline perf into extract DoD | ✅ — Non-goals |
| Code only after plan/tasks | ✅ |
| English feature artifacts | ✅ |
| Surgical changes under `specs/025-python-parsers/` | ✅ |
| No foreign product/repo names in tracked fixtures docs | ✅ — synthetic ODS fixture name |

**Post-design:** research + data-model + contracts + quickstart below; no
Constitution violations (Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/025-python-parsers/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   ├── native-python-api-routes.schema.json
│   ├── native-python-http-calls.schema.json
│   ├── ingest-python-api-routes.md
│   ├── ingest-python-http-calls.md
│   ├── ingest-python-grpc-calls.md
│   └── fixture-python-http-grpc.md
└── tasks.md                 # /speckit-tasks (not this step)
```

Reuse without copying: `specs/024-grpc-from-proto/contracts/native-grpc-calls.schema.json`
(shared `*-grpc-calls` model for `python-grpc-calls`).

### Source Code (repository root)

```text
parsers/
├── python/                  # UNCHANGED — symbols only
├── python-api-routes/       # NEW — FastAPI / Flask / Django
├── python-http-calls/       # NEW — httpx / requests / aiohttp
└── python-grpc-calls/       # NEW — grpcio client binds

backend/src/
├── config/detector-rules.json          # + 3 artifact rules
├── services/ingest/adapters/           # python-*-ingest (+ shared factories)
├── services/ingest/ingest-registry…    # register adapters
└── services/ingest/ingest.service.ts   # ARTIFACT_PARSER_IDS

docker/fixtures/repos/
└── python-http-grpc-demo/              # ODS-owned DoD fixture

frontend/                               # no change expected (reuse Graph)
```

**Structure Decision**: follow `013`/`014`/`019`/`024` artifact-module
pattern; keep language parser `python` untouched; host = CPython + `run.sh`
like existing `parsers/python`.

## Complexity Tracking

> Empty — no Constitution violations requiring justification.
