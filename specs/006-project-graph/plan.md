# План реализации: Граф проекта — канон, ingest, UI

**Ветка**: `006-project-graph` | **Дата**: 2026-07-09 | **Спека**: [spec.md](./spec.md)

**Вход**: `specs/006-project-graph/spec.md` — ingest, индексы ES, API графа, UI

**Зависимости**:

- `specs/001-ods-vision/spec.md` — этап 5
- `specs/002-domain-model/spec.md` — проект, дерево, DELETE, OpenAPI канон
- `specs/003-portal-mvp/spec.md` — замена `GraphStubPage`
- `specs/005-code-analysis/spec.md` — **блокер данных**: envelope в `ods-parser-envelopes`

## Summary

Расширение backend (**TypeScript / Node.js 20 / Fastify**) и frontend (`003`):
**ingest pipeline** преобразует envelope парсеров (`005`) через **адаптеры по `parser_id`**
в канонические узлы/рёбра в **Elasticsearch** (`ods-graph-nodes`, `ods-graph-edges`).
REST API — чтение графа по файлу и подграф; UI `/graph` — список узлов + простая
схема связей (без React Flow). Ingest запускается **автоматически** после сохранения
envelope (`005`); инкремент — точечное обновление/удаление по `path`.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS

**Primary Dependencies**: Fastify 4, `@elastic/elasticsearch` 8, `zod`, `uuid`, `pino`

**Storage**: Elasticsearch 8.x — **новые** индексы `ods-graph-nodes`, `ods-graph-edges`
(см. [contracts/elasticsearch-indices.md](./contracts/elasticsearch-indices.md));
**читает** `ods-parser-envelopes`, `ods-analysis-runs` (`005`); не дублирует их схемы

**Testing**: Vitest — unit адаптеров ingest; integration — envelope fixture → канон в ES;
e2e — анализ (`005`) → ingest → `/graph` UI

**Target Platform**: Docker Compose профиль `full`

**Project Type**: Backend services + расширение frontend

**Performance Goals**: SC-001 — ingest + UI < 10 с после envelope (пилот); SC-003 —
инкремент ingest −50% vs полная пересборка при ≤5% файлов

**Constraints**: Оркестратор `005` не парсит `model`; один адаптер на `parser_id`;
русские сообщения; пагинация API (limit ≤100)

**Scale/Scope**: Пилот; 4 адаптера (sync с парсерами `005`); до ~50k узлов / проект (цель пилота)

## Constitution Check

*GATE: до Phase 0 и после Phase 1.*

| Требование | Статус |
|------------|--------|
| VI. Детальная спека `006`, не в `001` | ✅ |
| TypeScript backend | ✅ |
| ES метаданные, отдельные индексы | ✅ `ods-graph-*` |
| Граница с `005` | ✅ ingest только в `006` |
| Замена заглушки графа в `003` | ✅ `contracts/graph-ui.md` |
| Код после plan/tasks | ✅ |
| DELETE каскад | ✅ + `005` T057 |

**Post-design:** [contracts/ingest-pipeline.md](./contracts/ingest-pipeline.md),
[contracts/elasticsearch-indices.md](./contracts/elasticsearch-indices.md),
[contracts/openapi-graph.yaml](./contracts/openapi-graph.yaml) зафиксированы.

## Project Structure

### Documentation (this feature)

```text
specs/006-project-graph/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── elasticsearch-indices.md    # ods-graph-nodes, ods-graph-edges
│   ├── ingest-pipeline.md          # контракт ingest + адаптеры
│   ├── canonical-schemas.json      # JSON Schema узла/ребра
│   ├── openapi-graph.yaml          # REST чтения графа
│   └── graph-ui.md                 # замена GraphStubPage
└── tasks.md                        # /speckit-tasks
```

### Source Code

```text
backend/
├── src/
│   ├── domain/
│   │   ├── graph-node.ts
│   │   └── graph-edge.ts
│   ├── repositories/
│   │   ├── graph-node.repository.ts
│   │   └── graph-edge.repository.ts
│   ├── services/
│   │   ├── ingest/
│   │   │   ├── ingest.service.ts
│   │   │   ├── ingest-registry.service.ts
│   │   │   ├── types.ts              # IngestAdapter, IngestContext
│   │   │   └── adapters/
│   │   │       ├── typescript.ingest.ts
│   │   │       ├── csharp.ingest.ts
│   │   │       ├── python.ingest.ts
│   │   │       └── cpp.ingest.ts
│   │   └── analysis-orchestrator.service.ts  # hook: после envelope → ingest
│   └── api/routes/
│       └── graph.ts                  # /projects/:id/graph/*
├── tests/
│   ├── unit/ingest/
│   └── integration/graph-ingest.test.ts

frontend/
├── src/
│   ├── pages/GraphPage.tsx           # замена GraphStubPage
│   ├── components/graph/
│   │   ├── NodeList.tsx
│   │   ├── EdgeTable.tsx
│   │   └── FileGraphPanel.tsx
│   └── api/graph.ts
```

**Structure Decision:** Ingest и API в `backend/`; UI — расширение `frontend/` (`003`).

## Интеграция с `005` / `002` / `003`

| Аспект | Источник | `006` |
|--------|----------|-------|
| Вход ingest | `ods-parser-envelopes` | читает envelope + `model` |
| Прогон | `ods-analysis-runs` | `analysis_run_id`, latest run |
| Дерево | `ods-elements` | resolve `element_id` по `path` |
| DELETE | `002` FR-013 + `005` T057 | + `ods-graph-nodes/edges` |
| UI stub | `003` `/graph` | `GraphPage` по `graph-ui.md` |
| Запуск анализа | `005` API | **не** дублировать |

## Фазы реализации (логические)

### Инкремент A — индексы + ingest TS + hook

- bootstrap `ods-graph-nodes`, `ods-graph-edges`
- `IngestService`, adapter `typescript`
- hook из `005` orchestrator после save envelope

### Инкремент B — API чтения по файлу

- `GET .../graph/files/{path}/dependencies`
- resolve latest `analysis_run_id`

### Инкремент C — UI `/graph`

- замена `GraphStubPage`

### Инкремент D — инкрементальный ingest

- delete_by_path + upsert для change set

### Инкременты E–G — адаптеры C#, Python, C++

- синхронно с парсерами `005`

## Complexity Tracking

Нарушений конституции нет.
