# Implementation plan: Graph to the bottom (012)

**Branch**: `012-code-graph-bottom` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

**Entrance**: `specs/012-code-graph-bottom/spec.md` — code-drill on the "Graph view"
after system-interior; view-only binding on the tracks; clarify 2026-07-18

**Dependencies**:

- `specs/001-ods-vision/spec.md` — stage 11
- `specs/011-ods-graph-viewer/spec.md` — system canvas, cut, UX select≠enter
- `specs/006-project-graph/spec.md` — Canon code kinds / rib
- `specs/008-code-graph-depth/spec.md` — `calls` / `injects`
- `specs/009-system-landscape/spec.md` — compose services

## Summary

Expanding existing **`GET .../graph/view`** and `GraphViewPage`: after
system-interior service (`011`) the user explicitly included in step **code-layer**
and goes deeper according to the canon (module → type → method) with the same rule **focus +
External links**. Binding code↔service no entries in the Canon: an explicit connection **or**
view-only heuristics on the way/the service name (for `ods-arch`: `backend/`,
`frontend/`). "Open the diagram" from the analysis focuses **himself code-node**.

1. **Backend** — expand `graph-view-slice` / loader: code kinds in the slice;
   `layer=system|code`; view-only affiliation; `resolve_from` → code-focus.
2. **Frontend** — step "In code"; breadcrumbs for code-levels; empty code; regression
   system; link analysis→viewing with `?focus=` for code.
3. **Without** new parsers / ingest / indexes.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend + frontend)

**Primary Dependencies**: existing Fastify + ES graph repos; React 18 +
Vite; `@xyflow/react` + dagre layout (`011`); Vitest

**Storage**: Read-only `ods-graph-nodes` / `ods-graph-edges`. View-only
matching **not** writes in ES. Coordinates sessionStorage as `011`.

**Testing**: unit — affiliation heuristics (compose service name ↔ path
segment); code `insideForFocus` (module→class→method); resolve_from code-focus;
API contract; frontend — "IN code", empty code, open-from-analysis; regression
system slice

**Target Platform**: Docker Compose profile `full` (`docker/`)

**Project Type**: Backend API extension + frontend page (web)

**Performance Goals**: the same caps **200 nodes / 500 ribs**; SC-001 on
`ods-arch` full path system→code→sheet no deadlock; the answer without full dump
code-project graph

**Constraints**: No edit Canon; without parsers; without searching for the scheme;
no the fake DB-hierarchy; system-first log in to the service saved; Russian
empty/truncate; free entrance to any neighbor of the slice

**Scale/Scope**: the standard `docker/fixtures/repos/ods-arch/`; regression
`system-landscape-demo`

## Constitution Check

*GATE: to Phase 0 after Phase 1.*

| Requirement | Status |
|------------|--------|
| VI. Detailed Spec `012` round `001` | ✅ |
| TypeScript + ES metadata read-only | ✅ |
| Code after plan/tasks | ✅ |
| Russian language of artifacts / UI | ✅ |
| Draft , canon | ✅ clarify in `spec.md` |
| Without auth / RAG / edit graph / parsers | ✅ |
| Docs/RAG/auth shifted by `013`–`015` | ✅ |

**Post-design:** research + data-model + contracts + quickstart; no violations.

## Project Structure

### Documentation (this feature)

```text
specs/012-code-graph-bottom/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi-graph-view-code.yaml
│   └── graph-view-code-ui.md
└── tasks.md                 # /specit-tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/schemas/graph.schemas.ts      # + layer / resolve mode
│   ├── services/graph-view.service.ts    # load code kinds under focus
│   ├── services/graph-view-slice.ts      # code inside + affiliation
│   └── services/graph-view-affiliation.ts # NEW: view-only match
└── tests/unit/
    └── graph-view-*.test.ts

frontend/
├── src/
│ ├── pages/GraphViewPage.tsx # layer=code, "Into the code"
│   ├── pages/GraphPage.tsx               # open → focus code id
│   ├── components/graph-view/            # inspector, breadcrumbs, canvas
│   ├── api/graph.ts
│   └── i18n/ru.ts
```

**Structure Decision**: Extension `011` no new applications. Parsers don't
We're touching it.

## Complexity Tracking

> Empty — there are no violations of the constitution.

## Phase 0 / Phase 1 outputs

| The artifact | Way |
|----------|------|
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| API contract | [contracts/openapi-graph-view-code.yaml](./contracts/openapi-graph-view-code.yaml) |
| UI contract | [contracts/graph-view-code-ui.md](./contracts/graph-view-code-ui.md) |
| Quickstart | [quickstart.md](./quickstart.md) |

## Implementation sketch (for tasks not FR)

1. `matchCodeToService(service, codeNodes)` — name/path heuristics (R1)
2. `insideForFocus` + `layer=code` — children by `parent_id` / kinds
3. Query `layer=system|code` (default system for service focus)
4. `resolve_from`: if code → `focus=code` + `resolve_status=exact_code`; else R5 `011`
5. UI: inspector **"Code"** always with focus=service and `layer=system`
   (even without candidates → `no_related_code`); double-click service no
   opens code
6. Empty: `empty_reason=no_related_code`

## Follow-ups (not DoD)

- Writing edges code↔service to the canon
- Database Hierarchy
- Ops-config caps
