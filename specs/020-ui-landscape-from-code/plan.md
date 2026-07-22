# Implementation Plan: UI landscape from code (Graph UI)

**Branch**: (catalog `020-ui-landscape-from-code`; git branch optional) |
**Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/020-ui-landscape-from-code/spec.md` — UI landscape extract +
Graph UI + portal chrome alignment; clarifications session 2026-07-22.

**Dependencies**:

- `specs/001-ods-vision/spec.md` — Post-MVP UI landscape
- `specs/005` / `006` — analysis pipeline, ES graph
- `specs/009` — `artifacts[]` detector + modal patterns
- `specs/011`–`014` — Graph view inspector actions, `http_endpoint` / `http_calls`
- `specs/018` — parser extension playbook
- Draft models: `ods-help/requirements/json-model/native-ui-tree.*`,
  `canonical-node-ui.*`, `canonical-edge-ui.*`

## Summary

Add **UI layer** to ODS analysis: modular parser **`react-ui`** (artifact spawn)
→ native UI tree → ingest to `ods-graph-nodes` / `ods-graph-edges`
(`metadata.layer=ui`) with `invokes_api` joins and `binds_service` (ui_app ↔
service). Portal **Graph UI** page: schematic non-overlapping frames, +/-/fit
zoom, center + inspector; menu + Graph view inspector action when linked.
Detector/`artifacts[]` + first confirm modal show **frontend** mark and UI
parser status. Mandatory **style alignment pass** on existing project screens.
Dogfood: this repo’s `frontend/` (React/TS).

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend + `react-ui` parser);
React 18 / Vite (portal frontend)

**Primary Dependencies**: Fastify + Elasticsearch; existing analysis
orchestrator / ingest registry; React Router; Vitest; AST/heuristics for
React Router + JSX (parser-local); portal `page-chrome` CSS tokens

**Storage**: Same `ods-graph-nodes` / `ods-graph-edges` (+ UI kinds/edges);
`ods-language-reports.artifacts[]` entry `frontend-ui`; envelopes in
`ods-parser-envelopes`

**Testing**: unit detector + ingest + extract; API tests for `/graph/ui`;
frontend unit for Graph UI layout/zoom and modal Frontend block; manual
quickstart on ods-arch dogfood

**Target Platform**: Docker Compose `--profile full` (rebuild frontend after UI
changes)

**Project Type**: CLI parser module + backend ingest/API + portal Graph UI +
chrome alignment

**Performance Goals**: Dogfood Graph UI overview usable without overlap; fit
viewport; analysis spawn of `react-ui` within existing parser timeout budget

**Constraints**: Stack-agnostic canon; first DoD parser React/TS only; English
artifacts; portal i18n en/ru; no system Graph view algorithm change; no pixel
Figma; constitution UI consistency

**Scale/Scope**: One `parser_id` (`react-ui`); dogfood ODS portal; AngularJS
petclinic UI out of DoD

## Constitution Check

*GATE: before Phase 0; re-check after Phase 1.*

| Requirement | Status |
|------------|--------|
| VI. FR in child `020`, not only `001` | ✅ |
| Scope reflected in `001` | ✅ |
| Modular parser (`018`), not inflate `typescript` | ✅ |
| One canon ES (layer=ui) | ✅ |
| Language: EN artifacts; portal UI i18n en/ru | ✅ |
| Portal UI consistency (chrome / no style sprawl) | ✅ |
| Code after plan/tasks | ✅ |
| No auth/RAG/docs product scope | ✅ |

**Post-design:** research + data-model + contracts + quickstart — no gate
violations. Open design details resolved in [research.md](./research.md).

## Project Structure

### Documentation (this feature)

```text
specs/020-ui-landscape-from-code/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── detector-frontend-ui.md
│   ├── native-ui-tree.schema.json
│   ├── native-ui-tree.example.json
│   ├── ingest-react-ui.md
│   ├── openapi-graph-ui.yaml
│   └── ui-graph-ui.md
└── tasks.md                          # /speckit-tasks (not this command)
```

### Source Code (expected touchpoints)

```text
parsers/react-ui/                     # manifest, extract, run, tests

backend/
├── src/services/                     # detector artifact, orchestrator spawn
├── src/services/ingest/adapters/     # react-ui.ingest.ts + binds_service / invokes_api
├── src/services/graph-ui.service.ts  # overview + screen slices
└── src/api/routes/graph.ts           # GET .../graph/ui(+ /screen)

frontend/
├── src/pages/GraphUiPage.tsx
├── src/components/graph-ui/          # frames viewport, zoom, inspector
├── src/components/analysis/LanguagesConfirmModal.tsx  # Frontend block
├── src/components/graph-view/GraphInspector.tsx       # Graph UI action
├── src/styles/workspace.css          # tokens / page-chrome (alignment)
└── src/i18n/{en,ru}.ts
```

**Structure Decision**: ODS standard layout; UI layer via new parser + graph-ui
API + portal page; chrome alignment in existing styles/pages.

## Complexity Tracking

| Violation | Why needed | Simpler alternative rejected |
|-----------|------------|------------------------------|
| New UI layer kinds/edges | Spec requires third landscape | Stuffing UI into code symbols — breaks 018 |
| Dedicated `/graph/ui` API | Different UX than system view | Overloading `/graph/view` — risk to 011–014 |
| RF viewport + fixed uiFrame nodes | Same pan/zoom as Graph view; frames not draggable | Custom CSS zoom — rejected after dogfood UX |
