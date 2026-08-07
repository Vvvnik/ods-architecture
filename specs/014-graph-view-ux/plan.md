# Implementation Plan: UX graph-view + http_calls (014)

**Branch**: `014-graph-api-ux` (catalog specs `014-graph-view-ux`) |
**Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/014-graph-view-ux/spec.md` — block **A** (signature Code/System,
analysis UI-context of the cut, breadcrumbs, unified progress on canvas) + block **B**
(`http_calls` frontend→existing `http_endpoint`; card "Publishes" /
"Causes"). Clarifications 2026-07-18 recorded in Speke.

**Dependencies**:

- `specs/001-ods-vision/spec.md` — stage 13
- `specs/009-system-landscape/` — Canon `http_calls` / `exposes` / `documents`
- `specs/011` + `012` — canvas, dig-in, GraphBreadbreadcrumbs
- `specs/013-api-routes-from-code/` — `http_endpoint` + `exposes` (not to change DoD)

## Summary

**A (frontend):** rename dig-in in **"Code"** / **"System"**; action
**"View in the analysis of"** → GraphPage with `?select=<focus>` only when focus;
reuse `GraphBreadbreadcrumbs` on GraphPage; one progress overlay from
`AnalysisProvider` (visible and GraphView) — **no** second wizard-stack.

**B (parsers + ingest + UI):** module `ts-http-calls` retrieves the calls through
shared API-client (`API_BASE='/api/v1'` + relative path); ingest writes
`http_calls` service→existing `http_endpoint` (prefer `source=code`);
inspector — sections **Published by** / **Causes**; ribs on canvas — SHOULD.

Reference: **ods-arch**. Without merge OpenAPI↔code; without narrow spawn analysis.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (parser + backend); React/Vite
(frontend)

**Primary Dependencies**: existing Fastify + ES; React Router; Vitest;
easy extract (regex/AST) under `apiFetch` / `API_BASE` (see research)

**Storage**: the same `ods-graph-nodes` / `ods-graph-edges`; number of ribs
`http_calls` (+ metadata); endpoint-nodes to create client URL

**Testing**: unit extract/ingest; frontend unit/i18n labels; integration
ods-arch-like fixture → `http_calls`; E2E/manual quickstart GraphView overlay

**Target Platform**: Docker Compose `--profile full`

**Project Type**: Frontend UX + 1 CLI parser + ingest adapter + detector artifact

**Performance Goals**: SC-004 — ≥1 Causes have frontend after analysis;
overlay does not block canvas for longer than the required status display

**Constraints**: DoD A+B; extract only shared `/api/v1` client; docking
only to existing endpoints; prefer code when you take; portal UI i18n; reuse
AnalysisProvider / GraphBreadbreadcrumbs; audit not "feature from the top"

**Scale/Scope**: 1 parser_id (`ts-http-calls`); standard ods-arch frontend;
other clients — best-effort outside DoD

## Constitution Check

*GATE: to Phase 0 after Phase 1.*

| Requirement | Status |
|------------|--------|
| VI. FR in `014`, not `001` | ✅ |
| Scope in `001` (UX + `http_calls`) | ✅ |
| Modular CLI-parser, not inflating `typescript` | ✅ |
| One canon ES | ✅ |
| Language policy (constitution) | ✅ |
| Code after plan/tasks | ✅ |
| Without the auth/RAG/docs product | ✅ |
| Don't break DoD `013` | ✅ |

**Post-design:** research + data-model + contracts + quickstart — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/014-graph-view-ux/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── detector-http-calls.md
│   ├── native-ts-http-calls.schema.json
│   ├── ingest-http-calls.md
│   └── ui-graph-view-ux.md
└── tasks.md                          # /specit-tasks
```

### Source Code

```text
parsers/ts-http-calls/                # manifest + extract + run.mjs

backend/
├── src/config/detector-rules.json    # artifact ts-http-calls + content_hints
├── src/services/artifact-detector.ts # edits only if detector-rules.json is insufficient
└── src/services/ingest/adapters/
    └── ts-http-calls.ingest.ts       # http_calls → existing endpoints

frontend/
├── src/i18n/ru.ts # Code / System / View in the analysis
├── src/components/graph-view/
│ ├── GraphInspector.tsx # labels + Publishes/Calls + disabled
│ └── GraphBreadbreadcrumbs.tsx # reuse on GraphPage
├── src/pages/GraphViewPage.tsx       # overlay wiring
├── src/pages/GraphPage.tsx           # breadcrumbs + select context
└── src/context/AnalysisProvider.tsx  # shared progress overlay (portal)
```

**Structure Decision**: UX existing frontend; consumer — private
parser_id pattern `013`; without a new Orchestrator.

## Complexity Tracking

> There are no constitutional violations that require justification.
