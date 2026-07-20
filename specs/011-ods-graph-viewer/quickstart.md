# Quickstart: check 011-ods-graph-viewer

**Goal:** make sure that the "Graph view" shows a map of the system drill by
It follows the focus rule and does not load the entire graph. Details API/UI —
[contracts/](./contracts/).

## Prerequisites

1. Stack `docker/` profile `full` (as pilot ODS).
2. Imported and analyzed fixture
   `docker/fixtures/repos/system-landscape-demo/` (or equivalent with system-nodes).
3. Backend gives existing `GET .../graph/summary` (graph is built).

## 1. Menu

1. Open the portal and select a project.
2. **Expectation:** items **"Graph analysis"** and **"Graph view"**.
3. "Graph analysis" — former tree/search/edges (regression).

## 2. The "System" level

1. Open **Graph view**.
2. **Waiting (SC-001):** for ≤10 with the "System" visible ≥1 service and ≥1 infra
   (DB/broker/... from the fixture); class/method is not the main content of the map.
3. If necessary: `GET /api/v1/projects/{id}/graph/view` no `focus` —
   `truncated` false demo; nodes with kinds service/database/broker/...

## 3. Selection vs input

1. A single click on the service → inspector, the "System" card is still in place.
2. "Log in" or double-click → service focus: Inside system-children (if any),
   only related services are outside; unrelated services are gone (SC-002).

## 4. Database without fake hierarchy

1. Log in to the node `database`.
2. **Waiting (SC-006):** inspector + related services; no levels
   "physics / scheme", which are not in the canon.

## 5. Truncate / Zoom

1. Make sure that pan/zoom only changes viewport.
2. On a large graph (or decrease `max_nodes` in the query) — `truncated=true` and
   Russian banner; the root priority is service (SC-003).

## 6. Bundle analysis , view

1. In "Graph Analysis" select system-node → "Open in diagram" → focus on it.
2. Select code-node → schema with service-context or "System" + explanation.
3. From the "In analysis" schema → the same project/node (as far as the list allows).

## 7. Empty system

1. A project with only a "code-" layer (or "mock"empty_reason").
2. **Expectation:** empty state view + transition in the analysis, not code-dump.

## Run criteria

| SC | Check |
|----|----------|
| SC-001 | §2 |
| SC-002 | §3 |
| SC-003 | §5 |
| SC-004 | §1 analysis |
| SC-005 | there is no UI delete/edit node |
| SC-006 | §4 |
| SC-007 | chain System → service → neighbor → To the system |
| SC-008 | in spec/plan is follow-up "bottoms up" code |

AutoTest: unit slice-builder + contract `getGraphView`; UI — selection≠focus.
