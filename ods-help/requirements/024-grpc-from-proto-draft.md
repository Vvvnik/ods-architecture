# Draft: gRPC / protobuf system extract (+ .NET HTTP clients)

**Status**: requirements draft → **specified** as `specs/024-grpc-from-proto/spec.md`
(2026-07-28; clarify still open on canon kinds/edges and .NET HTTP MUST patterns)  
**Proposed feature id**: `024-grpc-from-proto`  
**Proposed parser id(s)**: `grpc-proto` (IDL / server surface, one module for all
stacks); gRPC client modules in DoD: `java-grpc-calls`, `ts-grpc-calls`,
`dotnet-grpc-calls`; plus .NET HTTP client parity: `dotnet-http-calls` (names
lock at specify; follow `018`)  
**Parent**: `001-ods-vision`  
**Depends on**: `005`/`006` (pipeline + canon), `009` (system layer), `013`/`014`
(HTTP API + `http_calls` UX parity target), `018` (parser playbook), `019`
(Spring system closed — gRPC was deferred there)  
**Created**: 2026-07-28  
**Updated**: 2026-07-28 — gRPC clients TS+Java+.NET; `dotnet-http-calls` in DoD;
Python/C++ deferred  
**Dogfood**: ODS-owned multi-module fixture with `.proto` + gRPC client call-sites
for **each** DoD stack (TS, Java, .NET), **and** ≥1 .NET HTTP client call-site
for `dotnet-http-calls` — required. Second tree / external pilot — SHOULD only,
not locked to one host path.

## Problem

System landscape covers **HTTP** for TS and Java (`http_endpoint`, `exposes`,
`http_calls` from `013`/`014` / Spring `019`). **.NET** has routes
(`dotnet-api-routes`) but **no** dedicated HTTP client parser parity with
`ts-http-calls` / `java-http-calls`. **gRPC** was deferred in `009` (Phase 2)
and `019` (Post-MVP). Architects with protobuf services see no RPC surface in
Graph view: no service methods from `.proto`, no client→RPC binds comparable to
HTTP.

Bus `rpc_handles` (message-bus RPC roles) is **not** a substitute for
gRPC/protobuf extract.

## Goal

1. Detect protobuf / gRPC presence (`.proto` roots; optional codegen markers)
   without treating OpenAPI/HTTP as gRPC.
2. Extract **service + RPC method** surface into the **existing system canon**
   (prefer reuse / thin extension of node/edge kinds — prove gap before new
   kinds) via **one** language-agnostic artifact parser (`grpc-proto`).
3. Extract **client → RPC** binds when statically resolvable for **TS, Java, and
   .NET** in the same feature (parity with `http_calls` / `018` capability-layers —
   not a second Graph product; not rewriting language parsers).
4. Close **.NET HTTP client** gap: new `dotnet-http-calls` → existing
   `http_calls` canon (parity with TS/Java HTTP clients; reuse ingest patterns
   from `013`/`019`, do not rewrite those modules).
5. Show results on Graph view (system slice) for the fixture DoD project.
6. Follow `018` for new parser module(s); English specs; portal i18n only if new
   user-visible strings appear.

## Stack scope (locked)

| Stack | Code | HTTP routes | HTTP clients | gRPC in `024` |
|-------|------|-------------|--------------|---------------|
| TS | ✅ | ✅ `ts-api-routes` | ✅ `ts-http-calls` | **DoD** — `ts-grpc-calls` |
| Java | ✅ | ✅ `java-api-routes` | ✅ `java-http-calls` | **DoD** — `java-grpc-calls` |
| .NET / C# | ✅ | ✅ `dotnet-api-routes` | **DoD** — `dotnet-http-calls` | **DoD** — `dotnet-grpc-calls` |
| Python | ✅ code | — | — | **Out** — later capability wave |
| C++ | ✅ code | — | — | **Out** — later capability wave |

Notes:

- Existing language / HTTP parsers are **not** rewritten; add new artifact
  modules (`grpc-proto`, `*-grpc-calls`, `dotnet-http-calls`) + detector/ingest
  touchpoints (+ canon enum if gRPC kinds/edges need it).
- `dotnet-http-calls` targets existing `http_calls` / `http_endpoint` model —
  no new HTTP kinds.
- `014` forbids gRPC extract in that feature; `024` lifts that for **data** only
  (no UX rewrite unless a proven gap).

## Suggested scope (DoD sketch — lock in specify/clarify)

| In DoD (proposed) | Out of DoD (proposed) |
|-------------------|------------------------|
| `.proto` → RPC service / method nodes (or agreed kind) | RSocket, SOAP, GraphQL, AsyncAPI |
| One `grpc-proto` surface parser (all stacks) | Python / C++ HTTP or gRPC clients |
| gRPC client binds: TS + Java + .NET when resolvable | Runtime discovery only |
| `dotnet-http-calls` → `http_calls` (static HttpClient / typed clients when resolvable) | Rewriting `ts-http-calls` / `java-http-calls` |
| Same-project cross-module binds | Cross-ODS-project / multi-repo |
| ODS fixture: gRPC surface + ≥1 gRPC bind **per** TS/Java/.NET; ≥1 .NET HTTP client bind | Full codegen / build-tool integration |
| Ambiguous / unresolved → skip (like `008` / language calls) | Inventing endpoints not in sources |
| Server surface from `.proto`; stubs only for client resolution | Rewriting OpenAPI / Feign / existing route extract |

**Open at clarify (do not invent in draft):**

- Reuse `http_endpoint` + metadata vs new `grpc_method` (or similar) kind
  (schema `signature` already mentions gRPC full name — research hint).
- Edge type: reuse `http_calls` / `exposes` with protocol metadata vs new
  `grpc_calls` / `exposes_rpc`.
- Whether `.proto` → method gets a `documents`-like edge (OpenAPI parity).
- Unary-only DoD vs also showing streaming RPC methods (metadata depth).
- Exact stub / channel patterns per stack (Java / TS / .NET) for gRPC binds.
- Exact .NET HTTP client patterns in DoD (HttpClient, Refit, generated NSwag,
  etc.) — pick MUST set at clarify.
- Whether AsyncAPI stays a separate later feature (yes by default).

## Non-goals

- S1 `graph_from_wc` (AI replace parsers)
- MCP (`016-mcp`), auth (`017`), color legend
- Rewriting OpenAPI / Feign / existing `*-api-routes` / `ts-http-calls` /
  `java-http-calls`
- Python / C++ system HTTP or gRPC clients (later `018` wave)
- Pixel UI / Graph UI changes (system Graph view only unless a proven gap)
- Dogfood hardcodes: no path priority / name strip locked to one external tree
- Analysis pipeline performance (workers / chunk / parallel) — see
  `025-parser-pipeline-perf-draft.md`; not this feature

## Design principles

- **Canon first**: extend system model only when HTTP kinds cannot represent
  gRPC safely; document the decision in research at plan time.
  `dotnet-http-calls` stays on existing HTTP canon.
- **Parsers modular** (`018`): one IDL artifact + N client artifacts; detector
  artifact row + confirm modal status.
- **Skip unresolved** rather than wrong links.
- **Anti–dogfood**: fixture is ODS-owned; heuristics must work for other
  layouts with `.proto` under normal module trees.
- **Promote `001`**: when specifying, fix capability-table wording so gRPC is not
  implied done under ✅ `http_calls`; mark .NET HTTP clients done when shipped.

## Dogfood acceptance (sketch)

1. Analyze fixture → `grpc-proto` (+ gRPC client parsers) + `dotnet-http-calls`
   available; envelopes stored.
2. Graph has ≥1 RPC service surface and ≥1 method (exact SC in spec).
3. ≥1 gRPC client→method bind for **each** of TS, Java, .NET when that stack’s
   call site is present in the fixture (MUST for DoD fixture coverage).
4. ≥1 .NET `http_calls` edge from `dotnet-http-calls` when fixture has a
   resolvable HTTP client call-site.
5. Repos without `.proto` / gRPC stay unchanged (no false gRPC landscape).
6. No regression on HTTP `013`/`014` / Spring HTTP paths from `019`.

## Suggested next step

```text
/speckit.specify
```

Input: implement `024-grpc-from-proto` from this draft; one `grpc-proto` surface
parser + gRPC client binds for TS, Java, and .NET; add `dotnet-http-calls` for
.NET HTTP client parity with TS/Java; ODS fixture covering all three stacks
(gRPC) plus .NET HTTP client; reuse system Graph view; defer Python/C++,
RSocket/SOAP/AsyncAPI.

Then: clarify → plan → tasks → implement. Promote in `001` when specifying.

## Related

- Vision backlog: `specs/001-ods-vision/spec.md` (S1 or gRPC next candidates)
- System baseline: `specs/009-system-landscape/`
- HTTP parity: `specs/013-api-routes-from-code/`, `specs/014-graph-view-ux/`
- Deferred note: `specs/019-spring-system-landscape/` (gRPC out of `019`)
- Playbook: `specs/018-parser-extension-playbook/`
- Coverage gap note (historical): `ods-help/requirements/015-project-docs-draft.md` §10.2
- Pipeline perf (orthogonal, later): `ods-help/requirements/025-parser-pipeline-perf-draft.md`
