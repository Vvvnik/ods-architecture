# Draft: Python HTTP and gRPC parsers

**Status**: specified → `specs/025-python-parsers/spec.md` (entry draft retained)  
**Proposed feature id**: `025-python-parsers`  
**Proposed parser id(s)** (names lock at specify; follow `018`):

| Role | Parser id |
|------|-----------|
| HTTP routes (server surface) | `python-api-routes` |
| HTTP clients | `python-http-calls` |
| gRPC clients | `python-grpc-calls` |

Shared gRPC **IDL surface** already exists: `grpc-proto` (`024`) — reuse; do
**not** rewrite. Language symbol parser `python` stays as-is (code layer
already ✅).

**C++** HTTP routes / HTTP clients / gRPC clients are **out of this feature**
(less common for API landscape DoD; later wave via `018` if commanded).
Symbol parser `cpp` unchanged.

**Parent**: `001-ods-vision`  
**Depends on**: `005`/`006` (pipeline + canon), `009` (system layer),
`013`/`014` (HTTP API + `http_calls` UX parity), `018` (parser playbook),
`024` (gRPC canon: `grpc_method`, `http_calls`/`exposes`/`documents` with
`metadata.protocol=grpc`; Graph protocol filters baseline)  
**Created**: 2026-07-28  
**Updated**: 2026-07-28 — C++ removed from scope (Python only)  
**Priority**: **Next** after closed `024` (ahead of S1 and deferred pipeline
perf).  
**Dogfood**: ODS-owned multi-module Python fixture covering ≥1 HTTP route per
DoD framework (FastAPI, Flask, Django), ≥1 HTTP client bind, ≥1 gRPC client
bind; `.proto` surface via existing `grpc-proto`. External pilot — SHOULD
smoke only, not sole DoD; no foreign path hardcodes.

## Problem

Vision §**Stack coverage matrix** (after `024`) still shows a Python gap:

| Stack | Code | HTTP routes | HTTP clients | gRPC clients |
|-------|------|-------------|--------------|--------------|
| TS / Java / .NET | ✅ | ✅ | ✅ | ✅ |
| **Python** | ✅ `python` | **—** | **—** | **—** |
| C++ | ✅ `cpp` | — (deferred) | — (deferred) | — (deferred) |

Architects with Python services see symbols but not HTTP landscape or gRPC
client→RPC binds comparable to TS/Java/.NET. `grpc-proto` already extracts
IDL methods when `.proto` is present; Python **client** and **HTTP route**
modules are missing.

## Goal

1. Close Python **system** capability layers for:
   - HTTP API from code → `http_endpoint` + `exposes`
   - HTTP clients → `http_calls` (protocol http)
   - gRPC clients → `http_calls` → `grpc_method` (`metadata.protocol=grpc`)
2. Reuse existing Canon and Graph view (`014`/`024`); no new Graph product.
3. Follow `018`: modular artifact CLIs, detector rows, confirm modal, ingest
   adapters; **popular** Python HTTP frameworks in DoD (FastAPI + Flask +
   Django — see §Volume); host = CPython.
4. ODS-owned fixtures; skip ambiguous / unresolved binds (no invented
   endpoints); English specs; i18n only if new UI strings appear.
5. Promote `001` matrix Python rows from `—` to ✅ when feature closes.

## Volume / DoD depth (parity with closed stacks)

Same **module shape and acceptance depth** as TS / Java / .NET (separate
`parser_id`s, Canon reuse, fixture ≥1, skip unresolved) — **and** cover the
**popular** Python HTTP frameworks (not a tiny single-style slice).
Peer analogy: Java HTTP clients already DoD several styles
(Feign / WebClient / RestClient / RestTemplate) in one feature.

| Dimension | Same as existing (MUST) | Not in this feature |
|-----------|-------------------------|---------------------|
| Modules | **One** artifact `parser_id` per role (3 new modules) | Merging symbols + HTTP into `python`; C++ HTTP/gRPC |
| Routes DoD | **Popular** Python frameworks (see MUST set) | Niche frameworks outside the locked list; C++ servers |
| HTTP clients DoD | **Popular** Python client libs with literal/base+path when resolvable | Dynamic URL-only builders with no static target |
| gRPC clients DoD | **Statically resolvable** stub/channel → `grpc_method` (like `*-grpc-calls` in `024`) | Runtime reflection-only, inventing RPCs; C++ gRPC clients |
| Canon | Reuse `http_endpoint` / `exposes` / `http_calls` / `grpc_method` + protocol metadata | New edge types, second Graph product |
| Acceptance | ODS fixture covers **each** DoD route style (≥1 endpoint) + ≥1 HTTP client + ≥1 gRPC client; Graph system slice visible | External pilot as sole oracle; multi-repo |
| Failure mode | Skip unresolved / ambiguous (no false binds) | Fail the run solely for unresolved sites |
| Out forever here | OpenAPI-as-DoD, RSocket/SOAP/GraphQL/AsyncAPI, pipeline perf, S1, **C++ API parsers** | — |

**Proposed MUST set** (do not drop popular frameworks below):

| Role | DoD |
|------|-----|
| HTTP routes | **FastAPI / Starlette** (`@app.*` / `@router.*`); **Flask** (`@app.route` / blueprints); **Django** (`path` / `urlpatterns` + CBVs/FBVs with static path) |
| HTTP clients | **`httpx`**, **`requests`**, **`aiohttp`** (static URL or base+path) |
| gRPC clients | **`grpcio`** generated stub / channel unary call when target RPC resolvable |

Fixture rule: each DoD route framework MUST appear with ≥1 extractable
endpoint in the ODS fixture set (can be separate mini-apps in one repo).

## Stack scope (proposed DoD)

| Stack | HTTP routes | HTTP clients | gRPC clients | Notes |
|-------|-------------|--------------|--------------|-------|
| **Python** | **DoD** FastAPI + Flask + Django | **DoD** httpx + requests + aiohttp | **DoD** grpcio stubs | This feature |
| C++ | out | out | out | Later via `018` if commanded |
| TS / Java / .NET | out | out | out | Already closed; do not rewrite |
| gRPC IDL (`.proto`) | — | — | surface via `grpc-proto` | Reuse `024` |

## Suggested scope

| In DoD (proposed) | Out of DoD (proposed) |
|-------------------|------------------------|
| 3 new artifact modules (`python-api-routes`, `python-http-calls`, `python-grpc-calls`) | Rewriting `python` symbol parser |
| FastAPI + Flask + Django routes; httpx/requests/aiohttp; grpcio | C++ HTTP/gRPC parsers; niche Python frameworks |
| Same Canon as TS/.NET/Java HTTP + gRPC (`024` kinds/edges) | New edge types unless a proven gap |
| Detector + ingest + confirm status (`018`) | RSocket, SOAP, GraphQL, AsyncAPI |
| ODS fixtures: each DoD route style ≥1 endpoint; ≥1 HTTP client + ≥1 gRPC client | Cross-ODS-project / multi-repo binds |
| Skip unresolved; no inventing endpoints | Full build-system / codegen product integration |
| Show on system Graph view | Pixel UI redesign; pipeline perf (deferred draft) |
| Update `001` Python matrix rows on close | S1 `graph_from_wc`, MCP, auth |

**Open at clarify (fixture / Django depth — keep popular set):**

- One combined fixture vs split mini-apps for FastAPI / Flask / Django +
  clients + gRPC.
- Path-template depth: match existing HTTP skip rules (parity, not deeper).
- Django: `path()` / `re_path()` static paths in DoD; complex `include()` /
  i18n URL trees — skip if unresolved.

## Non-goals

- **C++** HTTP routes, HTTP clients, or gRPC clients (later `018` wave)
- Parser pipeline performance (unnumbered
  `ods-help/requirements/parser-pipeline-perf-draft.md`)
- S1 `graph_from_wc`, MCP (`016`), auth (`017`), color legend
- Rewriting TS/Java/.NET HTTP or gRPC modules / `grpc-proto`
- Go, Kotlin, or other new language symbols in this feature
- RSocket / SOAP / GraphQL / AsyncAPI
- Dogfood hardcodes locked to one external tree path or name strip
- Niche / uncommon Python HTTP stacks **beyond** the locked popular MUST list

## Design principles

- **Canon first**: reuse `http_endpoint`, `http_calls`, `exposes`,
  `grpc_method`, protocol metadata from `013`/`014`/`024`.
- **Modular parsers** (`018`): separate `parser_id`s; do not merge symbols +
  HTTP into one module without justification.
- **Popular Python frameworks in DoD**: FastAPI + Flask + Django — same
  acceptance depth as peers (fixture + skip unresolved).
- **Anti–dogfood**: ODS fixtures; heuristics portable to other layouts.
- **Promote `001`**: matrix + roadmap when specifying / closing.

## Suggested next step

```text
/speckit.plan
```

(Optional first: `/speckit.clarify` on fixture layout / Django path depth —
**do not drop** Flask/Django; **do not add C++**.)

Specified: `specs/025-python-parsers/spec.md`.

## Related

- Vision matrix: `specs/001-ods-vision/spec.md` §Stack coverage matrix
- Playbook: `specs/018-parser-extension-playbook/`
- HTTP parity: `specs/013-api-routes-from-code/`, `specs/014-graph-view-ux/`
- gRPC closed: `specs/024-grpc-from-proto/`
- Existing code parser: `parsers/python/`
- Deferred perf: `ods-help/requirements/parser-pipeline-perf-draft.md`
