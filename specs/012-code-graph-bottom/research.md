# Research: 012-code-graph-bottom

**Date**: 2026-07-18  
**Spec**: [spec.md](./spec.md)  
**Basis**: `specs/011-ods-graph-viewer/research.md`

## R1 — View-only binding code ↔ compose-service

**Decision:** The procedure for determining the "associated" code for the service:

1. Explicit relationships Canon: `parent_id` → service; ribs `exposes` / other
   service↔code, if already available.
2. Otherwise **view-only** ('s ES):
   - the path segment code-node coincides with **service name**
     (`backend/...` ↔ service `backend`; case-insensitive; POSIX `/`);
   - optional: longest path-prefix among services who have `path`
     similar to the application directory (not compose-file) — how a weakened R5 `011`;
   - qualified_name / path contains `/{serviceName}/` or starts with
     `{serviceName}/`.
3. No candidates → `empty_reason=no_related_code`.

**Rationale:** Clarify Q1 (option B). Have compose-services `path` =
`docker/docker-compose.dev.yml`, so clean path-prefix R5 `011` on
`ods-arch` doesn't work; the name of the service ↔ root folder — typical monorepo
is the pattern of the reference.

**Alternatives considered:**

| Option | Why not |
|---------|------------|
| Only explicit edges | SC-001/SC-006 will fail on ods-arch |
| Write affiliation in Canon's `012` | Out of scope (postponed); no new ingest |
| Dockerfile context → service | Fragile; compose native already has name |

## R2 — layer Setting `layer` vs separate endpoint

**Decision:** Expand existing `GET .../graph/view` query-parameter
`layer`:

- omit / `system` — behavior `011` (including system-interior service);
- `code` — code-slice for the current `focus` (service or code-node).

When `focus` = code-node `layer` ignored as code (slice around code).

**Rationale:** One contract, regression system easier; clarify "separate step"
= change `layer` or focus on synthetic/entry no new URL path.

**Alternatives considered:** `GET .../graph/view/code` — duplication;
client N+1 at `/nodes` — banned in `011` R2.

## R3 — The first code-level under the service

**Decision:** When `focus=<serviceId>&layer=code` **inside** =

- root code-nodes assigned to the service (R1) that do not have a parent in
  the same affiliated-many **or** `kind` ∈ {`module`, `file`,
  `namespace`} and parent not affiliated set;
- Practically: nodes with minimum depth parent-chains among affiliated
  (usually modules/files).

Further drill: inside = children `parent_id` with `metadata.layer=code` (or
code kinds), if present; otherwise the bottom.

Kinds "type": `class`, `interface`, `enum`, ...  
Kinds "method/list": `method`, `function`, `property`, `field`, ...  
Do not fabricate levels without nodes.

**Rationale:** Clarify depth "bottom"; Canon `006`/`008`.

**Alternatives considered:** Always show all classes services on the first page
code-screen — violates "not the whole graph" and SC-002.

## R4 — `resolve_from` for code (FR-015)

**Decision:**

1. If `resolve_from` points to an existing node with code-kind /
   `layer=code` → `focus_id` = this node `resolve_status=exact_code`,
   slice code (children + externals along the edges).
2. Otherwise, the previous R5 `011` → service / `system_fallback`.

Banner `011` "code the diagram does not show" for a successful `exact_code`
**delete/replace**.

GraphPage "Open on the scheme": for code pass `resolve_from=<id>`
(the server itself will put focus); MAY also `focus=<id>` directly.

**Rationale:** Clarify Q4.

## R5 — Node loading (performance)

**Decision:** Not shipping all code-project nodes.

- System slice (`011`): How is it now `LOAD_KINDS` system.
- Code under service: **one** strategy (choice records implement in
  T009 + Notes `tasks.md`):
  - **(A)** ES query `path` prefix / wildcard segment service name;
  - **(B)** filter in-memory after a limited scroll at `project_id` +
    `analysis_run_id` + `metadata.layer=code` with cap (reference ≤5k).
  The default preference: **(A)**.
- Focus code node: load focus + descendants (parent_id) + incident edge
  endpoints (externals).

Caps answer: 200 / 500 as `011`.

**Rationale:** SC-002; large-repo from `010`.

## R6 — UX "In the code"

**Decision:** In inspector when you focus on service (system-interior) button
**"Code"** (Rus.): request `focus=<service>&layer=code`. If
`empty_reason=no_related_code` — empty state, system-navigation alive.
Double-click on service **not** jumps into code (saves `011` enter =
system).

**Rationale:** Clarify Q2 separate clear step.

## R7 — Free entrance to the neighbor

**Decision:** "Login" / double-click on `role=external` (including code other
of the service) → `focus=<neighborId>` (layer derived from kind). Without a filter
"only your component."

**Rationale:** Clarify Q5.

## R8 — Regression and benchmark

**Decision:** Acceptance code — `ods-arch`; regression system —
`system-landscape-demo` + system-scripts `ods-arch`. Elasticsearch
service → empty code is acceptable.

**Rationale:** SC-001...SC-007; spec standard.
