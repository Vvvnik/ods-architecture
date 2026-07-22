# Implementation Plan: AngularJS UI landscape (Graph UI — second stack)

**Branch**: (catalog `021-angularjs-ui-landscape`; suggested git `angular-js-parser`) |
**Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/021-angularjs-ui-landscape/spec.md` — AngularJS 1.x UI extract →
existing UI canon + Graph UI; clarify session 2026-07-22.

**Dependencies**:

- `specs/001-ods-vision/spec.md` — roadmap stage `021`
- `specs/020-ui-landscape-from-code/` — UI canon, Graph UI, `react-ui`, native-ui-tree
- `specs/018-parser-extension-playbook/` — parser checklist
- `specs/019-spring-system-landscape/` — petclinic system dogfood / gateway
- `specs/005` / `006` — analysis pipeline, ES graph

## Summary

Add **AngularJS 1.x** UI extract as modular parser **`angularjs-ui`** (artifact
`frontend-angularjs`) → same native UI tree → ingest to existing UI layer
(`metadata.layer=ui`) with `invokes_api` and `binds_service` to **API Gateway**.
Reuse Graph UI portal/APIs from `020` unchanged. Detector + confirm modal show
AngularJS frontend availability without classifying as React or Angular 2+.
Dogfood: spring-petclinic-microservices (`project_id`
`c736c364-96b1-442b-8bd4-3a8c2ea05d2d`). Prefer `spring-petclinic-ui` sources when
present; otherwise API Gateway static scripts (current upstream layout).

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend + `angularjs-ui` parser);
portal React unchanged for DoD

**Primary Dependencies**: Fastify + Elasticsearch; analysis orchestrator / ingest
registry; Vitest; heuristic extract for AngularJS `ui.router` / `$http` (parser-local);
existing Graph UI from `020`

**Storage**: Same `ods-graph-nodes` / `ods-graph-edges` (UI kinds); new
`ods-language-reports.artifacts[]` entry `frontend-angularjs`; envelopes in
`ods-parser-envelopes`

**Testing**: unit detector + extract + ingest; regression that `react-ui` /
`frontend-ui` still pass; manual quickstart on petclinic dogfood

**Target Platform**: Docker Compose `--profile full` (rebuild backend/parsers as
needed; frontend rebuild only if modal i18n changes)

**Project Type**: CLI parser module + backend detector/ingest wiring (+ optional
modal i18n); no new Graph UI product

**Performance Goals**: Petclinic AngularJS extract within existing parser timeout
budget (`react-ui`-like, ~120s cap); Graph UI overview usable (≥3 declared states)

**Constraints**: AngularJS 1.x only; reuse `020` canon/Graph UI; non-fatal extract
failure; English artifacts; prefer UI-module sources when present; gateway
`binds_service` for DoD; no new UI kinds unless proven gap

**Scale/Scope**: One new `parser_id` (`angularjs-ui`); dogfood petclinic; React
path regression-free

## Constitution Check

*GATE: before Phase 0; re-check after Phase 1.*

| Requirement | Status |
|------------|--------|
| VI. FR in child `021`, not only `001` | ✅ |
| Scope reflected in `001` (stage **next**; spec+plan+tasks) | ✅ (mark Fulfilled on implement close) |
| Modular parser (`018`), not inflate `react-ui` | ✅ |
| One canon ES (layer=ui) — reuse `020` | ✅ |
| Language: EN artifacts; portal UI i18n en/ru if needed | ✅ |
| Portal UI consistency — no Graph UI rewrite | ✅ |
| Code after plan/tasks | ✅ |
| No auth/RAG/docs / Angular 2+ product scope | ✅ |

**Post-design:** research + data-model + contracts + quickstart — no gate
violations. Open design details resolved in [research.md](./research.md).

## Project Structure

### Documentation (this feature)

```text
specs/021-angularjs-ui-landscape/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── detector-frontend-angularjs.md
│   ├── ingest-angularjs-ui.md
│   ├── native-ui-tree-angularjs.example.json
│   └── parser-extension-checklist-021.md
└── tasks.md                          # /speckit-tasks (not this command)
```

Native UI tree **schema** and Graph UI OpenAPI remain canonical under
`specs/020-ui-landscape-from-code/contracts/` (referenced, not forked).

### Source Code (expected touchpoints)

```text
parsers/angularjs-ui/                 # manifest, extract, run, tests, README

backend/
├── src/services/artifact-detector.ts           # frontend-angularjs detect
├── src/services/ingest/adapters/
│   ├── react-ui.ingest.ts                      # optional shared helper extract
│   └── angularjs-ui.ingest.ts
├── src/services/ingest/ingest-registry.service.ts
└── src/services/ingest/ingest.service.ts       # pathsForArtifact angularjs

frontend/   # only if LanguagesConfirmModal Frontend block needs AngularJS labels
├── src/components/analysis/LanguagesConfirmModal.tsx
└── src/i18n/{en,ru}.ts

docker/     # ensure parsers/angularjs-ui available in analysis image if required
```

**Structure Decision**: ODS standard; second UI stack = new artifact parser +
ingest; Graph UI / canon reused from `020`.

## Complexity Tracking

| Violation | Why needed | Simpler alternative rejected |
|-----------|------------|------------------------------|
| New artifact_type `frontend-angularjs` | Clean path filter vs React | Reuse `frontend-ui` — mixes spawn files |
| Optional shared UI ingest helper | Avoid dual mapping drift | Full duplicate adapter — OK fallback |
