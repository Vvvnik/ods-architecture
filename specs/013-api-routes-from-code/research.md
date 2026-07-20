# Research: 013-api-routes-from-code

**Date**: 2026-07-18  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## R1 — Separate parser_id

**Decision:** `ts-api-routes` and `dotnet-api-routes` — separate directories
`parsers/<id>/` + ingest adapters; not to expand `typescript`/`csharp`.

**Rationale:** FR-003; udaljenost; different envelope.

**Alternatives considered:** One mega-parser; embedded in code-parsers.

## R2 — Node id: service + method + path

**Decision:**  
`id = {parser_id}:http_endpoint:{serviceStable}|{METHOD}|{path}`  
using `systemNodeId` where `serviceStable` = `composeFile#service` or
`unscoped:{hash(sourcePath)}` no service.

**Rationale:** Clarify uniqueness. OpenAPI `009` keys only
`METHOD:path` — **do not change** in `013` (merge out scope).

**Alternatives considered:** Global method+path; random UUID.

## R3 Full path and prefix (ods-arch)

**Decision:**

1. A string literal ways → as is (`'/api/v1/health'`).
2. `` `${prefix}/view` `` / concatenation, if `prefix` — **const string
   literal in the same file** → glue.
3. Otherwise, → segment of the handler literal without guessing from the repo.

On ods-arch meet both the pattern (for the full and literal `const prefix = '/api/v1/...'`).

**Rationale:** FR-012 / SC-001.

**Alternatives considered:** Ignore prefix; global resolve.

## R4 — Detector artifacts

**Decision:**

| artifact_type | parser_id | The trigger |
|---------------|-----------|---------|
| `ts-api-routes` | `ts-api-routes` | `.ts`/`.js` + signals Fastify (`fastify`, `.get(`, `.post(`, `.route(`) |
| `dotnet-api-routes` | `dotnet-api-routes` | `.cs` + `[HttpGet`/`[Route` or `MapGet`/`MapPost` |

Denylist as languages; spawn in the same run. Incremental change-set — globs
as `009`.

**Alternatives considered:** Spawn all `.ts` no signals.

## R5 — Binding to service

**Decision:** Heuristics as `009`/`012` affiliation: segment path his name
compose service; otherwise without `exposes`. Rib **`exposes`**: service →
http_endpoint.

**Rationale:** FR-005; reuse.

## R6 — Handler (SHOULD)

**Decision:** In CP1 — **metadata** on the endpoint:
`handler_name` / `handler_qualified_name` / `handler_path` with a clear
match. New `EdgeType` for handler↔endpoint **not required** in CP1 (to avoid
cross-layer filter surprises). Follow-up MAY add an edge (for example
`handles`).

**Rationale:** FR-006 SHOULD; minimum diff domain.

**Alternatives considered:** New edge immediately; do not link at all.

## R7 — Extract strategy TS

**Decision:** Easy file parsing (TypeScript compiler API **or**
target regex/AST walk only under Fastify-patterns DoD). Incomplete semantic
graph. Preference: **ts-morph / typescript** for template+const prefix in
in one file is more reliable regex.

**Rationale:** Accuracy FR-012 vs speed; volume ods-arch moderate.

**Alternatives considered:** Only regex — fragile on `` `${prefix}` ``.

## R8 — Extract strategy C#

**Decision:** Roslyn (as `parsers/csharp` / bus): attributes on methods
controllers + calls `MapGet`/`MapPost`/`MapPut`/`MapDelete` with a literal.
Assembly route: `[Route]` class + method; Map* literal.

**Rationale:** FR-002; toolchain already in the repo.

## R9 — C# fixture

**Decision:** New `docker/fixtures/repos/api-routes-csharp-demo/`:
minimum web-project **one** `[HttpGet]` controller **and** one
`MapGet` plus simple compose service for `exposes`. Connect to
`setup-fixtures.sh`.

**Rationale:** SC-002 both styles; the existing fixtures may not cover Map*.

**Alternatives considered:** Only WebApplication1 — check in implement;
if enough is enough, reuse, otherwise the new demo.

## R10 — OpenAPI coexistence

**Decision:** Don't disable `openapi` parser. We won't buy it. Acceptance `013` —
Only code-sourced endpoints. Possible duplicates yaml+code — tech debt up to
docs-spaces.

**Rationale:** Clarify "code only" for DoD.

## R11 — UI / graph-view

**Decision:** CP1 **no** mandatory UI-changes: `http_endpoint` already
`SYSTEM_INSIDE_KINDS` (`011`/`012`). The "Enter"/"Code" buttons remain.
Russian label kind if needed — small i18n not CP2.

**Rationale:** Scope CP1 vs `014`.

## Unresolved NEEDS CLARIFICATION

No — all are closed clarify + research above.
