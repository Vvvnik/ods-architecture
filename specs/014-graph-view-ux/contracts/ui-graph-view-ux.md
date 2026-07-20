# UI contract: graph-view UX (014 block A + inspector B)

**Spec**: [spec.md](../spec.md)

## Dig-in labels (`GraphInspector`)

| It was | Become | Condition |
|------|-------|---------|
| "In the code" | **"Code"** | service + layer system → code |
| "Log in" | **"System"** | dig-in system / peers |
| "In the analysis" | **"View in analysis"** | enabled **only** when focus on the node/service |

Navigate analysis: `/projects/:id/graph?select=<focusId>`.

## Crumbs

- GraphView: existing `GraphBreadbreadcrumbs`.
- GraphPage: the same component / API signatures; **Up** / **To the system**
  (→ graph-view with focus service or overview).

## Progress overlay

- The source States: `AnalysisProvider` (+ sync/analysis hooks).
- One portal/banner on layout; visible on **GraphView** and other screens.
- Confirm Languages/Changes - without dubbing on GraphViewPage.

## Inspector section (block B)

For focus `kind=service`:

1. **Publishes** — outgoing `exposes` (empty OK).
2. **Causes** — outgoing `http_calls` (empty OK).

Do not show the service as "publishes API" if there is no `exposes`.

On `http_endpoint`: when `metadata.source` — signature "code" / "OpenAPI".

## Node/edge signatures (short names)

In UI **not** show raw id (`compose:service:...#frontend`,
`ts-api-routes:http_endpoint:…#backend|POST|/api/…`).

| Context | The rule |
|----------|---------|
| graph-view inspector "Connections" | `frontend: → ...` / `backend: ← frontend`; the endpoint `frontend: → HTTP-call` |
| `/graph` EdgeTable, search ribs | `shortGraphRefLabel`: `#name` → the name of the service; `...\|METHOD\|path` → `METHOD path` |
| Full id | only `title` (hover), not the main text |

Utility: `frontend/src/utils/graphNodeLabel.ts`.

## Canvas

Rib `http_calls` in the slice — SHOULD when limits; DoD section **Calls**.
