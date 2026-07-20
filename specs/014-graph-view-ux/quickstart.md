# Quickstart: check 014-graph-view-ux

**Goal:** after analyzing ods-arch — clear Code/System, analysis with context
cross-section, progress on canvas, **Calls** for frontend. Contracts —
[contracts/](./contracts/).

## Prerequisites

1. `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
2. Project **ods-arch** sync + analysis (there is `ts-api-routes` + `ts-http-calls`
   available).
3. Modules registry: `ts-http-calls` available.

## 1. UX signature (SC-001)

1. "Graph view" → focus **backend** (system).
2. In inspector: **"Code"**, **"System"**, **"View in analysis"** (not
   "In code" / "Log in" as primary).
3. Overview without focus → "View in analysis" is not available.

## 2. Slice analysis (SC-002)

1. Focus backend → **See the analysis of**.
2. GraphPage with selected context + breadcrumbs; **To the system** returns to
   graph-view.

## 3. Overlay (SC-003)

1. Run "sync" on the "Graph view" (and, if necessary, analyze).
2. Repeat **3** times. The overall progress/status is visible to the end each time.
   or errors (not "silent" canvas).

## 4. http_calls (SC-004 / SC-005)

1. Focus **frontend** → section **Causes**: ≥1 way `/api/v1/...`.
2. Focus **backend** → **Publishes** with endpoints; not to be confused with Causes.
3. Frontend no exposes → no signature "published API".
4. Optional: the edges `HTTP-call` are visible on the slice at the limits.

## 5. Regression 013 (SC-006)

1. Dig-in backend system → endpoints from the on-site code.

## We are not checking

- Narrow spawn analysis based on service files
- Merge OpenAPI↔code; gRPC; raw fetch out API client
- Auto-alerts "dead API"
