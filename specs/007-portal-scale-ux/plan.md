# The implementation plan: UX scale of the portal (007)

**Vetka**: `007-portal-scale-ux` | **Date**: 2026-07-13 | **Spec**: [spec.md]

**Input**: `specs/007-portal-scale-ux/spec.md`  columns of the workspace, hierarchy/search of the column,
Cascade of status of the folder (clarify 2026-07-13)

**Dependency**:

- `specs/001-ods-vision/spec.md`  stage 6 (focus: columns, hierarchy, search, cascade)
- `specs/002-domain-model/spec.md`  elements, status, sync, OpenAPI canon
- `specs/003-portal-mvp/spec.md`  workspace, three panels
- `specs/006-project-graph/spec.md`  canon, `/graph`, `parent_id`

## Summary

The following are the backend (TypeScript / Fastify / ES) and frontend (React) extensions:

1. **Cascade of the folder status**  at `PATCH` directory (except for  `not_needed`)
   atomic update of the folder + active descendants; sync inherits `not_needed`
   from hand-marked ancestors.
2. **UX** graph  hierarchy of nodes by `parent_id` with lazy load; **without** flat list;
   Search for nodes + edges by one `q`; click → unlocking the path / anchor `from`.
3. **Workspace**  resizable columns + store widths on the client.

Search filters and canvas  outside of scope (set in contracts without FR).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS (as `002`/`006`)

**Primary Dependencies**: Fastify 4, `@elastic/elasticsearch` 8, React 18, Vite;
frontend: CSS + pointer events for splitters (without a new UI-kit)

**Storage**: Elasticsearch 8.x  `ods-elements` (casc/sync), `ods-graph-nodes` /
`ods-graph-edges` (search/search hierarchy); widths of panels  **only client**
(`localStorage`), without a server profile

**Testing**: Vitest  unit of cascade/sync inheritance, hierarchy/search repositories;
integration — PATCH cascade + GET nodes/search; frontend unit — splitters,
GraphTree + search navigation

**Target Platform**: Docker Compose the profile `full` (`docker/`)

**Project Type**: Backend API extension + frontend UX

**Performance Goals**: SC-003  cascade ≥50 offspring 100% or complete rejection;
hierarchy/search  page size default **50**, max **100** (as `006`);
Search by the known name  hit on the first page (SC-002)

**Constraints**: Cascade synchronous/atomic (clarify); localized user messaging;
No canvas/edit column; no search filters in `007`; we do not read the text `002`/`003`
(behavior in `007`)

**Scale/Scope**: Pilot; targeted volumes as `006` (~ up to 50k nodes/project); soft-limit
Cascade in research (refusal beyond the limit with localized user messaging)

## Constitution Check

*GATE: before Phase 0 and after Phase 1.*

| The requirement | The status |
|------------|--------|
| VI. Detailed specs `007`, not FR in `001` | ✅ Focus of the stage in `001` updated |
| TypeScript + ES metadata | ✅ |
| The scope expansion is reflected in `001` to plan | ✅ (cascade on the road map) |
| Chernobyl canon | ✅ source → `spec.md` |
| Code after plan/tasks | ✅ |
| UI i18n (`en` default + `ru`) | ✅ |
| Without canvas / edit the column in `007` | ✅ |
| Do not break the MVP boundary of auth/read-only files | ✅ |

**Post-design:** contracts + data-model + research recorded below; violations
There 's no constitution (Complexity Tracking is empty).

## Project Structure

### Documentation (this feature)

```text
specs/007-portal-scale-ux/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi-portal-scale.yaml   # graph hierarchy/search + PATCH cascade semantics
│ ── status-cascade.md # rules of cascade and sync inheritance
│ ── graph-ui-scale.md # replacing the flat list → tree + search
│   └── workspace-panels.md         # splitters + localStorage
── tasks.md # /speckit-tasks (not this step)
```

### Source Code

```text
backend/
├── src/
│   ├── repositories/
│   │   ├── element.repository.ts      # + bulk/cascade, ancestor lookup
│   │   └── graph-node.repository.ts   # + listByParent, search
│   ├── services/
│   │   ├── element.service.ts         # cascade orchestration
│   │   └── sync.service.ts            # resolveStatusOnSync + ancestor not_needed
│   └── api/routes/
│ ── elements.ts # semantics PATCH
│       └── graph.ts                   # parent_id, /search
└── tests/
    ├── unit/status-cascade.test.ts
    └── integration/
        ├── status-cascade.test.ts
        └── graph-search.test.ts

frontend/
├── src/
│   ├── layouts/WorkspaceLayout.tsx    # resizable columns (+ workspace.css)
│ ── hooks/usePanelWidths.ts # localStorage; main=0  flex-marker
│ ── hooks/useGraphSearchResultsHeight.ts # height of the search list
│ ── pages/GraphPage.tsx # tree + search, without NodeList flat
│ ── pages/WorkspacePage.tsx # panels DO NOT touch the splitters (Layout only)
│   ├── components/graph/
│   │   ├── GraphNodeTree.tsx
│ │ ── GraphSearch.tsx # + row-resize list heights
│ │ ── EdgeTable.tsx # anchor from search; NodeList not on GraphPage
│   ├── utils/startColumnResize.ts     # startColumnResize + startRowResize
│   └── api/graph.ts                   # listGraphNodes, searchGraph, getNodeAncestors
```

**Structure Decision**: without new top-level packets; expansion `backend/` + `frontend/`
the existing routes `002`/`006`/`003`.

## Complexity Tracking

> There are no violations of the Constitution that require justification.
