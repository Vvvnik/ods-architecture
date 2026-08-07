# Quickstart: Check the 007-portal-scale-ux

**Objective:** manually make sure that cascade, hierarchy/search of the graph and width of the panels
The API details are
[contracts/](./contracts/).

## The preamble

1. Stack: `docker compose --profile full` from `docker/` (as the pilot `002`+`003`+`006`).
2. Project with file tree and already built graph (`005`/`006`).
3. Backend `:3000`, UI `:8080` (or current ports compose).

## 1. Cascade of the folder status

1. In workspace, select a folder with ≥ several files inside.
2. In Property → Not needed (or Need).
3. **Wait:** all active descendants with the same status; API response may contain
   `cascade.updated_count` ([status-cascade.md](./contracts/status-cascade.md)).
4. Pick up the folder from the "No need" to the "Need".
5. **Wait:** the kids **not** changed automatically.
6. (Optional) Sync: add the file under `not_needed`-vet → file status
   `not_needed` Zwithout Wow Handy Markings.

Refusal at a huge branch: localized message, status before/after matches.

## 2. The rank of the count

1. Open the graph.
2. **Waiting:** tree, top level turned; **no** flat list of all nodes.
3. Open the child's node → to load; in many children, the child's node is paginalized.

API: `GET /api/v1/projects/{id}/graph/nodes?parent_id=root&limit=50`.

**SC-001 (≥1000 nodes):** if there is a large project  the same smokeless hand
(hierarchy/search without a flat list). **No** mandatory gate CI; pilot observation.

## 3. Search

1. Enter the known node name (≥2 symbols) → Night.
2. **Waiting:** tabs/sections of the Nodes and Ribra.
3. Click on the node → path is opened, the node is marked out, the edges are visible.
4. Click on the link → link + is marked `from`.

API: `GET /api/v1/projects/{id}/graph/search?q=...`.

Short `q`  error via portal i18n, without full download.

Pull the horizontal divider under the result list  height changes
and is stored ([graph-ui-scale.md](./contracts/graph-ui-scale.md)).

## 4. The width of the panels

1. Drag the workspace partitions; remember the widths.
2. Reload the page.
3. **Wait: ** width restored (error ≤5%); Properties uncompressed
   The minimum is below ([workspace-panels.md](./contracts/workspace-panels.md)).

## Criteria of success (smoke)

| # | Checking it | SC |
|---|----------|-----|
| 1 | No flat list on `/projects/:id/graph` (when ≥1000  manual pilot) | SC-001 |
| 2 | Search finds a known node on page 1 | SC-002 |
| 3 | Cascade ≥50 offspring or controlled rejection (including >5000) | SC-003 |
| 4 | Widths after reload | SC-004 |

Autotests and tasks of implementation  in `/speckit-tasks` → `tasks.md`.
