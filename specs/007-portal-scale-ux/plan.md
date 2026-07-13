# План реализации: Масштаб UX портала (007)

**Ветка**: `007-portal-scale-ux` | **Дата**: 2026-07-13 | **Спека**: [spec.md](./spec.md)

**Вход**: `specs/007-portal-scale-ux/spec.md` — колонки workspace, иерархия/поиск графа,
каскад статуса папки (clarify 2026-07-13)

**Зависимости**:

- `specs/001-ods-vision/spec.md` — этап 6 (фокус: колонки, иерархия, поиск, каскад)
- `specs/002-domain-model/spec.md` — элементы, статусы, sync, OpenAPI канон
- `specs/003-portal-mvp/spec.md` — workspace, три панели
- `specs/006-project-graph/spec.md` — канон, `/graph`, `parent_id`

## Summary

Расширение **backend** (TypeScript / Fastify / ES) и **frontend** (React):

1. **Каскад статуса папки** — при `PATCH` directory (кроме «снятия» `not_needed`)
   атомарное обновление папки + активных потомков; sync наследует `not_needed`
   от вручную помеченных предков.
2. **Граф UX** — иерархия узлов по `parent_id` с lazy load; **без** плоского списка;
   поиск узлов+рёбер одним `q`; клик → раскрытие пути / якорь `from`.
3. **Workspace** — resizable колонки + сохранение ширин на клиенте.

Фильтры поиска и canvas — вне scope (задел в contracts без FR).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS (как `002`/`006`)

**Primary Dependencies**: Fastify 4, `@elastic/elasticsearch` 8, React 18, Vite;
frontend: CSS + pointer events для splitters (без нового обязательного UI-kit)

**Storage**: Elasticsearch 8.x — `ods-elements` (каскад/sync), `ods-graph-nodes` /
`ods-graph-edges` (иерархия/поиск); ширины панелей — **только client**
(`localStorage`), без серверного профиля

**Testing**: Vitest — unit каскада/sync inheritance, hierarchy/search repositories;
integration — PATCH cascade + GET nodes/search; frontend unit — splitters,
GraphTree + search navigation

**Target Platform**: Docker Compose профиль `full` (`docker/`)

**Project Type**: Backend API extension + frontend UX

**Performance Goals**: SC-003 — каскад ≥50 потомков 100% или полный отказ;
иерархия/поиск — page size default **50**, max **100** (как `006`);
поиск по известному имени — hit в первой странице (SC-002)

**Constraints**: Каскад синхронный/атомарный (clarify); русские сообщения;
нет canvas/edit графа; нет фильтров поиска в `007`; не правим тексты `002`/`003`
(поведение в `007`)

**Scale/Scope**: Пилот; целевые объёмы как `006` (~до 50k узлов/проект); soft-limit
каскада в research (отказ сверх лимита с русским сообщением)

## Constitution Check

*GATE: до Phase 0 и после Phase 1.*

| Требование | Статус |
|------------|--------|
| VI. Детальная спека `007`, не FR в `001` | ✅ фокус этапа в `001` обновлён |
| TypeScript + ES метаданные | ✅ |
| Расширение scope отражено в `001` до plan | ✅ (каскад в дорожной карте) |
| Черновик ≠ канон | ✅ источник → `spec.md` |
| Код после plan/tasks | ✅ |
| Русский язык артефактов | ✅ |
| Без canvas / edit графа в `007` | ✅ |
| Не ломаем MVP границы auth/read-only файлов | ✅ |

**Post-design:** contracts + data-model + research зафиксированы ниже; нарушений
конституции нет (Complexity Tracking пуст).

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
│   ├── status-cascade.md           # правила каскада и sync inheritance
│   ├── graph-ui-scale.md           # замена плоского списка → дерево + поиск
│   └── workspace-panels.md         # splitters + localStorage
└── tasks.md                        # /speckit-tasks (не этот шаг)
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
│       ├── elements.ts                # семантика PATCH
│       └── graph.ts                   # parent_id, /search
└── tests/
    ├── unit/status-cascade.test.ts
    └── integration/
        ├── status-cascade.test.ts
        └── graph-search.test.ts

frontend/
├── src/
│   ├── layouts/WorkspaceLayout.tsx    # resizable columns (+ workspace.css)
│   ├── hooks/usePanelWidths.ts        # localStorage; main=0 — flex-маркер
│   ├── hooks/useGraphSearchResultsHeight.ts  # высота списка поиска
│   ├── pages/GraphPage.tsx            # tree + search, без NodeList flat
│   ├── pages/WorkspacePage.tsx        # панели НЕ трогать splitters (только Layout)
│   ├── components/graph/
│   │   ├── GraphNodeTree.tsx
│   │   ├── GraphSearch.tsx            # + row-resize высоты списка
│   │   └── EdgeTable.tsx              # якорь from из поиска; NodeList не на GraphPage
│   ├── utils/startColumnResize.ts     # startColumnResize + startRowResize
│   └── api/graph.ts                   # listGraphNodes, searchGraph, getNodeAncestors
```

**Structure Decision**: без новых top-level пакетов; расширение `backend/` + `frontend/`
существующих маршрутов `002`/`006`/`003`.

## Complexity Tracking

> Нет нарушений конституции, требующих обоснования.
