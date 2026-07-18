# Implementation Plan: UX graph-view + http_calls (014)

**Branch**: `014-graph-api-ux` (каталог спеки `014-graph-view-ux`) |
**Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/014-graph-view-ux/spec.md` — блок **A** (подписи Код/Система,
анализ в UI-контексте среза, крошки, единый прогресс на canvas) + блок **B**
(`http_calls` frontend→существующие `http_endpoint`; карточка «Публикует» /
«Вызывает»). Clarifications 2026-07-18 зафиксированы в спеке.

**Зависимости**:

- `specs/001-ods-vision/spec.md` — этап 13
- `specs/009-system-landscape/` — канон `http_calls` / `exposes` / `documents`
- `specs/011` + `012` — canvas, dig-in, GraphBreadcrumbs
- `specs/013-api-routes-from-code/` — `http_endpoint` + `exposes` (не менять DoD)

## Summary

**A (frontend):** переименовать dig-in в **«Код»** / **«Система»**; действие
**«Посмотреть в анализе»** → GraphPage с `?select=<focus>` только при фокусе;
переиспользовать `GraphBreadcrumbs` на GraphPage; один progress overlay из
`AnalysisProvider` (видимый и на GraphView) — **без** второго wizard-стека.

**B (parsers + ingest + UI):** модуль `ts-http-calls` извлекает вызовы через
shared API-client (`API_BASE='/api/v1'` + относительный path); ingest пишет
`http_calls` service→существующий `http_endpoint` (prefer `source=code`);
inspector — секции **Публикует** / **Вызывает**; рёбра на canvas — SHOULD.

Эталон: **ods-arch**. Без merge OpenAPI↔code; без узкого spawn анализа.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (parser + backend); React/Vite
(frontend)

**Primary Dependencies**: существующие Fastify + ES; React Router; Vitest;
лёгкий extract (regex/AST) под `apiFetch` / `API_BASE` (см. research)

**Storage**: те же `ods-graph-nodes` / `ods-graph-edges`; новые только рёбра
`http_calls` (+ metadata); endpoint-узлы не создавать из client URL

**Testing**: unit extract/ingest; frontend unit/i18n labels; integration
ods-arch-like fixture → `http_calls`; E2E/manual quickstart GraphView overlay

**Target Platform**: Docker Compose `--profile full`

**Project Type**: Frontend UX + 1 CLI parser + ingest adapter + detector artifact

**Performance Goals**: SC-004 — ≥1 «Вызывает» у frontend после анализа;
overlay не блокирует canvas дольше необходимого показа статуса

**Constraints**: DoD A+B; extract только shared `/api/v1` client; стыковка
только к существующим endpoints; prefer code при дубле; русский UI; reuse
AnalysisProvider / GraphBreadcrumbs; audit не «фича сверху»

**Scale/Scope**: 1 parser_id (`ts-http-calls`); эталон ods-arch frontend;
прочие клиенты — best-effort вне DoD

## Constitution Check

*GATE: до Phase 0 и после Phase 1.*

| Требование | Статус |
|------------|--------|
| VI. FR в `014`, не в `001` | ✅ |
| Scope в `001` (UX + `http_calls`) | ✅ |
| Модульный CLI-парсер, не раздувание `typescript` | ✅ |
| Один канон ES | ✅ |
| Русский UI | ✅ |
| Код после plan/tasks | ✅ |
| Без auth/RAG/docs продукта | ✅ |
| Не ломать DoD `013` | ✅ |

**Post-design:** research + data-model + contracts + quickstart — нарушений нет.

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
└── tasks.md                          # /speckit-tasks
```

### Source Code

```text
parsers/ts-http-calls/                # manifest + extract + run.mjs

backend/
├── src/config/detector-rules.json    # artifact ts-http-calls + content_hints
├── src/services/artifact-detector.ts # правки только если detector-rules.json недостаточно
└── src/services/ingest/adapters/
    └── ts-http-calls.ingest.ts       # http_calls → existing endpoints

frontend/
├── src/i18n/ru.ts                    # Код / Система / Посмотреть в анализе
├── src/components/graph-view/
│   ├── GraphInspector.tsx            # labels + Публикует/Вызывает + disabled
│   └── GraphBreadcrumbs.tsx          # reuse на GraphPage
├── src/pages/GraphViewPage.tsx       # overlay wiring
├── src/pages/GraphPage.tsx           # crumbs + select context
└── src/context/AnalysisProvider.tsx  # shared progress overlay (portal)
```

**Structure Decision**: UX в существующем frontend; consumer — отдельный
parser_id по образцу `013`; без нового оркестратора.

## Complexity Tracking

> Нет нарушений конституции, требующих обоснования.
