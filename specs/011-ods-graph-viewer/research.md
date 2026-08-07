# Research: 011-ods-graph-viewer

**Date**: 2026-07-15  
**Spec**: [spec.md](./spec.md)

## R1 — Library scheme (React Flow)

**Decision:** `@xyflow/react` (React Flow v12+) on frontend.

**Rationale:** Already fixed in `001` as the direction canvas; Mature pan/zoom,
custom nodes, selection; ecosystem layout. Vision and draft are the same.

**Alternatives considered:**

| Option | Why not |
|---------|------------|
| Cytoscape.js | Other mental model; weaker React-integration in the current stack |
| Self -made SVG | High cost pan/zoom/hit-test |
| Graphviz only server-side PNG | There is no interactive FR-011/014 |

## R2 — Server slice vs client N+1

**Decision:** Mandatory `GET .../graph/view` for DoD; the client only renders
response. Client bypass `.../edges` — not acceptance (dev fallback banned in SC).

**Rationale:** The rule of "focus + outer" + truncate on large repo (`010`) otherwise
are unpredictable in terms of latency and volume.

**Alternatives considered:** First the "System" layer on the client from
`nodes?kind=service` — fragile for links/topics/cap; rejected for MVP DoD.

## R3 — Slice limits

**Decision:** Default **max_nodes = 200**, **max_edges = 500** (constants
backend; MAY query override down, not up without auth). When truncated at the level
"System": first, all `service` (while they fit), then the information on the number of connections with
the pre-selected set of degrees, then the remaining peer kinds. Response field
`truncated: true` + `truncation_message` (localized via portal i18n on the client or server).

**Rationale:** Clarifications: Priority services→infro; zoom does not replace the limit.
Guidelines draft 150–250 / 400–600 rounded to the round constants.

**Alternatives considered:** Only services on the "System" at any tightness —
losing DB/tires on review; rejected.

## R4 — Layout positions

**Decision:** Auto-layout on the client after receiving the slice (dagre or
`@dagrejs/dagre` / ELK wasm — choose implement size bundle; **one**
library). Position MAY in `sessionStorage` key
`projectId+runId+focusId` on session; **not** writing in ES.

**Rationale:** FR-017; enough for a pilot. Persist is prohibited in the canon.

## R5 — Service-context from code-site

**Decision:** Resolve order for "Open on the scheme" from code:

1. Chain `parent_id` up to node `kind=service` (if they appear in the data).
2. Otherwise: system-node `service` associated ribs/`path` prefix by
   code-node (heuristic: longest matching `path` prefix among services /
   compose-derived services).
3. Otherwise: System level + explanation (not an error).

Do not add `metadata.service_id` in ingest MVP (`FR-021`), while the heuristic
does not fail on the fixture — then follow-up task in tasks/research note.

**Rationale:** Clarify Q2; do not inflate parsers.

## R6 — Participants of the "System" level

**Decision:** Peer kinds at the root (focus empty):

- always candidates: `service`, `database`, `broker`, `external_api`, `storage`
  (and other system peer from `009`, **except** `message_topic` / `message_type` /
  `http_endpoint` / `dotnet_project` as peer — they are "inside").

`message_topic`: if there is an edge/parent to `broker` → just inside the broker;
otherwise peer on the "System" (clarify).

**Inside focus:**

| Focus kind | Inside |
|------------|--------|
| `service` | system children via `parent_id` + endpoints/projects linked to service |
| `broker` | `message_topic` (+ message_type if parented) |
| `database` / `storage` / `external_api` | empty inside; externals = connected services |

**External:** nodes connected by an edge with focus or any inside-node is not
included in inside; `role: "external"` in response API.

## R7 — Select vs input (UX)

**Decision:** Selection state ≠ focus state. Click → select + inspector;
"Log in" / double-click → refresh view with `focus=<id>`; breadcrumbs from the stack
focuses on the customer (or `focus_path` responsible if the — MAY).

**Rationale:** Clarify Q5.

## R8 — Menu/Route dependencies

**Decision:**

| Point | Route |
|-------|-------|
| Graph analysis | `/projects/:projectId/graph` (as of now) |
| Graph view | `/projects/:projectId/graph-view` |

Query (canon = UI/OpenAPI contract):

| Param | Where | Meaning |
|-------|-----|----------|
| `focus` | `/graph-view` | id Circuit focus; No = System |
| `resolve_from` | `/graph-view` | id node from the analysis → resolve in service / System |
| `select` | `/graph` (analysis) | id node to highlight after "Show in analysis" |

Outdated / not to use: `?node=`, `?from=analysis&node=`.  
`/graph` redirect no project — as it is now.

## R9 — Unresolved → implement only

- Specific package layout (dagre vs ELK) — to choose bundle size in T0xx.
- Accurate ES query (terms vs nested) — in graph-view.service when implement.
- Playwright e2e — optional in tasks, not a blocker unit/integration.

## R10. Quickstart run

**date:** 2026-07-15  
**Context:** after `/specit-implement` 011.

### Automatic verification

| Check | Result |
|----------|-----------|
| Unit `graph-view.service.test.ts` (peers, focus, broker topics, DB empty inside, truncate priority, resolve_from, empty system) | ✅ 7 passed |
| Frontend: MainMenu "Graph analysis"/"Graph view"; GraphViewPage select≠focus + enter; empty/truncate banners; breadbreadcrumbs | ✅ passed |
| Integration `graph-view-system.test.ts` | skipIf ES unavailable; when ES — system peers, caps 200/500 without class as required contents |
| `frontend` `tsc --noEmit` | ✅ |
| Layout | `@dagrejs/dagre` (not ELK) |

Manual run §§1–7 on `system-landscape-demo` with `docker/` full — available in the stack (not a blocker unit/tsc).

### DoD UI (T040)

| Check | Status |
|----------|--------|
| (a) SC-005 — no edit/delete nodes in `GraphViewPage` / `graph-view/*` | ✅ only select / enter / navigate / link in the analysis |
| (b) FR-018 — there is no search on the view | ✅ |
| (c) FR-017 — coordinates of the nodes are not written in ES | ✅ layout only client dagre (+ React Flow viewport) |

### Scope (T044)

- Changes: `backend/src/**` (graph view + repos/schemas/routes), `frontend/**`, `specs/011-ods-graph-viewer/**`
- Without edits `parsers/**` and ingest `009`
- Caps: `backend/src/services/graph-view.service.ts` / slice-builder

### Follow-up (SC-008 / T041)

Confirmed in `spec.md` "Pending" and `plan.md`: scheme "to the bottom" code + hierarchy BD — **not** in DoD MVP 011.

## R11. System overview load MUST prefer peers (2026-07-27) — done

**Decision:** Root `GET .../graph/view` (no focus) loads **SYSTEM_PEER_KINDS**
first (service/broker/database/…). Inside kinds (`http_endpoint`, …) MUST NOT
fill the node seed budget on the overview — otherwise service↔service
`depends_on` edges never enter `listIncidentToNodes` and the map looks empty
of links. Focused service loads children by `parent_id`; slice caps insides
(`prioritizeInsideNodes`) so endpoints do not blow past `max_nodes` before
peer externals.

**Requirement:** FR-013/FR-015 — server slice remains capped; overview MUST
still show inter-service `depends_on` / `connects_to` present in the store.

**Tasks (completed):**

- [x] T045 Peer-first `loadRelevantNodes` in `graph-view.service.ts`
- [x] T046 Cap + prioritize insides in `graph-view-slice.ts`
  (`prioritizeInsideNodes`); unit tests in `graph-view.service.test.ts`

## R12. Client cache for Graph view remount (2026-07-27) — done

**Decision:** `GraphViewPage` loads slices via react-query (`graphView` /
`graphUiOverview`), `staleTime` 5 min / `gcTime` 15 min, `placeholderData`
keeps the last slice while refetching. Full-page loader only when no cached
data. Invalidate on analysis complete (`useAnalysis`).

**Rationale:** Remounting Graph view re-hit ES (~3–4 s) and blanked the UI;
server slice contract unchanged.

**Task:** T048.

## R13. Persist pan/zoom viewport (2026-07-27) — done

**Decision:** Save React Flow viewport (`x`,`y`,`zoom`) in `sessionStorage`
keyed by surface + project + focus/layer (Graph view) or app/screen (Graph UI),
via shared `frontend/src/utils/graphViewportCache.ts`. On remount restore saved
viewport; `fitView` only when no saved state. Graph UI also caches slices via
react-query (same stale window as R12). Applies to both RF canvases (**Graph
view** and **Graph UI**); Code structure `/graph` is not RF and is unchanged.

**Tasks:** `011` T049; `020` T048–T049.
