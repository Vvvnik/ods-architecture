# План реализации: Просмотр графа системы (011)

**Ветка**: `011-ods-graph-viewer` | **Дата**: 2026-07-15 | **Спека**: [spec.md](./spec.md)

**Вход**: `specs/011-ods-graph-viewer/spec.md` — «Граф анализ» / «Граф просмотр»;
схема с drill-down system; срез «фокус + внешние»; clarify 2026-07-15

**Зависимости**:

- `specs/001-ods-vision/spec.md` — этап 10
- `specs/006-project-graph/spec.md` — канон, summary/nodes/edges
- `specs/007-portal-scale-ux/spec.md` — списочный GraphPage, меню
- `specs/008-code-graph-depth/spec.md` — code kinds (только связка анализ→просмотр)
- `specs/009-system-landscape/spec.md` — system kinds / layer
- `specs/010-scale-pipeline/spec.md` — large graph; canvas вне `010`

## Summary

Добавляем **второй экран графа** — интерактивную схему system-ландшафта с
правилом **фокус + только внешние связи**, без правки канона и без dump всего
индекса.

1. **Backend** — endpoint среза просмотра `GET .../graph/view` (серверная
   сборка узлов/рёбер + stub-флаг внешних + усечение с приоритетом service→инфро).
2. **Frontend** — пункт меню «Граф просмотр»; страница React Flow; крошки;
   inspector; «Войти»/double-click; pan/zoom; связка с «Граф анализ».
3. **Регресс** — бывший «Граф» → «Граф анализ» без потери UX `006`/`007`.

DoD MVP: только **system**-навигация. Follow-up «до дна» code и иерархия БД —
явно в spec «Отложено», не в приёмке.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend + frontend)

**Primary Dependencies**: Fastify + Elasticsearch (существующие graph
repositories); React 18 + Vite; **`@xyflow/react`** (React Flow) + layout
helper (dagre или ELK — см. research); Vitest / Testing Library; Playwright
smoke по желанию в tasks

**Storage**: Только чтение `ods-graph-nodes` / `ods-graph-edges` (и analysis runs
как сейчас). Координаты узлов — **не** в ES (MAY sessionStorage). Новых индексов
нет.

**Testing**: unit — view-slice builder (system peers, broker topics, truncation
priority, service resolve from code path); API contract tests; frontend —
GraphViewPage empty/truncated/enter focus; регресс MainMenu + GraphPage rename

**Target Platform**: Docker Compose профиль `full` (`docker/`)

**Project Type**: Backend API extension + frontend page (web)

**Performance Goals**: SC-001 — уровень «Система» на `system-landscape-demo`
понятен &lt; 10 с; default caps среза **200 узлов / 500 рёбер** (configurable
constants); ответ view без N+1 по одному ребру на весь landscape

**Constraints**: Без edit канона; без поиска на просмотре; без code drill в DoD;
без фейковой иерархии БД; русские empty/truncate; серверный срез обязателен
для DoD (клиентский N+1 — не приёмка)

**Scale/Scope**: MVP system-навигация; эталон
`docker/fixtures/repos/system-landscape-demo/`; large-repo — smoke «нет полного
dump» (ориентир после `010`)

## Constitution Check

*GATE: до Phase 0 и после Phase 1.*

| Требование | Статус |
|------------|--------|
| VI. Детальная спека `011`, не FR в `001` | ✅ этап 10 уже в `001` |
| TypeScript + ES метаданные | ✅ read-only graph indices |
| Код после plan/tasks | ✅ |
| Русский язык артефактов / UI | ✅ |
| Черновик ≠ канон | ✅ `ods-help/...-draft.md` → `spec.md` |
| Без auth / RAG / edit графа | ✅ |
| Follow-up «до дна» / иерархия БД не смешан с DoD | ✅ «Отложено» в spec |

**Post-design:** research + data-model + contracts + quickstart; нарушений нет.

## Project Structure

### Documentation (this feature)

```text
specs/011-ods-graph-viewer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi-graph-view.yaml
│   └── graph-view-ui.md
└── tasks.md                 # /speckit-tasks
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/routes/graph.ts          # + GET .../view
│   ├── api/schemas/graph.schemas.ts
│   ├── services/graph.service.ts
│   ├── services/graph-view.service.ts   # NEW: slice builder
│   └── repositories/graph-*.ts      # query helpers as needed
└── tests/
    └── … graph-view …

frontend/
├── src/
│   ├── components/MainMenu.tsx      # «Граф анализ» / «Граф просмотр»
│   ├── app/router.tsx / GraphRoutes
│   ├── pages/GraphPage.tsx          # анализ (rename labels only)
│   ├── pages/GraphViewPage.tsx      # NEW
│   ├── components/graph-view/       # NEW: canvas, inspector, crumbs
│   ├── api/graph.ts                 # + getGraphView
│   └── i18n/ru.ts
│   (тесты co-located: `*.test.tsx` рядом с компонентами / pages)
```

**Structure Decision**: Расширение существующих `backend` + `frontend` без новых
пакетов-приложений. Парсеры/`005`–`010` ingest **не** трогаем в MVP.

## Complexity Tracking

> Пусто — нарушений конституции нет.

## Phase 0 / Phase 1 outputs

| Артефакт | Путь |
|----------|------|
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| API contract | [contracts/openapi-graph-view.yaml](./contracts/openapi-graph-view.yaml) |
| UI contract | [contracts/graph-view-ui.md](./contracts/graph-view-ui.md) |
| Quickstart | [quickstart.md](./quickstart.md) |

## Implementation sketch (для tasks, не FR)

1. `GraphViewService.buildSlice({ projectId, focus?, analysisRunId? })`
2. Route mount рядом с существующими graph routes
3. Frontend: React Flow canvas, fit-view, selection ≠ focus
4. Deep-link: `/graph-view?focus=` / `?resolve_from=`; назад в анализ
   `/graph?select=` (см. `contracts/graph-view-ui.md`, research R8)
5. Resolve service from code: `parent_id` chain + path/heuristics (research R5)

## Follow-ups (не DoD)

- Схема до «дна» code (spec «Отложено»)
- Иерархия БД физика→логика→схема (данные + UX)
- Числовые caps как ops-config при необходимости
