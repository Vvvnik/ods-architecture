# Research: 014-graph-view-ux

**Date**: 2026-07-18  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## R1 — Signature dig-in

**Decision:** i18n: `GRAPH_VIEW_ENTER_CODE` → "Code"; dig-in system → "System";
analysis link → "View in analysis". Logic `onEnter` / `onEnterCode`
from `012` is saved.

**Rationale:** FR-001; minimum diff.

**Alternatives considered:** only Change tooltip; leave the "Log in".

## R2 — Slice analysis = UI-context

**Decision:** Navigate GraphPage `?select=<focusNodeId>` (+ if needed
layer in localStorage). The analysis run is full project, as it is now.
The disabled/ button is hidden without focus.

**Rationale:** Clarify Q1/Q3; not to break the Orchestrator.

**Alternatives considered:** Narrow spawn files for service; always-open full
project from overview.

## R3 — Crumbs on GraphPage

**Decision:** Reuse `GraphBreadbreadcrumbs` (or a thin wrapper with those
same signatures **Up** / **To the** system). The GraphPage breadcrumbs reflect
the context of the selected node / path system-service; "To the system" → graph-view
overview or focus of the service.

**Rationale:** FR-003; audit reuse, without a second implementation of the breadcrumbs.

**Alternatives considered:** Separate BreadbreadcrumbsAnalysis.

## R4 — Single progress overlay

**Decision:** One portal/banner in `AnalysisProvider` fed
`useSync` + analysis flow (the same signals that header hints on GraphPage /
Workspace). GraphView **not** duplicates confirm-of modelki. Confirm remain
existing Languages/Changes modals.

**Rationale:** FR-004; explore: GraphView now without progress UI.

**Alternatives considered:** Only toast; kopipasta wizard on GraphViewPage.

## R5 — Parser `ts-http-calls`

**Decision:** Separate `parsers/ts-http-calls/` (no sew `typescript`
and not in `ts-api-routes`). Detector artifact `ts-http-calls`: `.ts`/`.tsx` +
signals `apiFetch` / `API_BASE` / `'/api/v1'`.

**Rationale:** FR-003 style modularity from the Constitution/`005`; symmetry with `013`.

**Alternatives considered:** Expand `typescript` usages; one mega-parser.

## R6 — Extract DoD (shared client)

**Decision:** Standard: `const API_BASE = '/api/v1'` + `apiFetch(path, ...)` /
`fetch(\`${API_BASE}${path}\`)`. Collect method (from init or default GET) +
full path `/api/v1`+relative. Ignore: external URL, `fetch('/?_=` stale),
non-`/api/v1` bases.

**Rationale:** Clarify Q5 real `frontend/src/api/client.ts`.

**Alternatives considered:** Any fetch `/api/...`; only OpenAPI clients.

## R7 — Docking to endpoint

**Decision:** To calculate target **id** no ES in transform: prefer
`ts-api-routes:http_endpoint:{backendStable}|{METHOD}|{path}`; fallback
`openapi:http_endpoint:{METHOD}:{path}`. Do not create endpoint. In case of doubt —
skip call.

**Rationale:** FR-006; pure ingest adapters; coexistence `013`/`009`.

**Alternatives considered:** ES lookup in adapter; stub endpoints; always openapi.

## R8 — Caller service resolve

**Decision:** How `013` api-routes: segment path (`frontend/...`) →
`composeServiceNodeId` + `inferComposeFile` (ods-arch →
`docker/docker-compose.dev.yml`). DoD: frontend. Other clients best-effort.

**Rationale:** Reuse `api-routes-ids` / system-layer heuristics.

**Alternatives considered:** Only the explicit name in envelope.

## R9 — Inspector Publishes / Calls

**Decision:** Section incident edges: out `exposes` → Publishes; out
`http_calls` → It's calling. Empty sections are acceptable. Do not show "publishes
API" as the role of the service without `exposes`. Source badge to endpoint from
`metadata.source` if available.

**Rationale:** Clarify Q4; semantics draft.

**Alternatives considered:** Only canvas edges as DoD.

## R10 — Canvas http_calls

**Decision:** SHOULD: to include in view slice when limits (as other system
edges). DoD does not require edge visibility if the card is full.

**Rationale:** Clarify Q4.

**Alternatives considered:** Always force edges into slice (may displace
peers).
