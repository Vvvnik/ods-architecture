# План реализации: Граф до дна (012)

**Ветка**: `012-code-graph-bottom` | **Дата**: 2026-07-18 | **Спека**: [spec.md](./spec.md)

**Вход**: `specs/012-code-graph-bottom/spec.md` — code-drill на «Граф просмотр»
после system-интерьера; view-only привязка по путям; clarify 2026-07-18

**Зависимости**:

- `specs/001-ods-vision/spec.md` — этап 11
- `specs/011-ods-graph-viewer/spec.md` — system canvas, срез, UX select≠enter
- `specs/006-project-graph/spec.md` — канон code kinds / рёбра
- `specs/008-code-graph-depth/spec.md` — `calls` / `injects`
- `specs/009-system-landscape/spec.md` — compose services

## Summary

Расширяем уже существующий **`GET .../graph/view`** и `GraphViewPage`: после
system-интерьера сервиса (`011`) пользователь явным шагом входит в **code-слой**
и углубляется по канону (модуль → тип → метод) с тем же правилом **фокус +
внешние связи**. Привязка code↔service без записи в канон: явные связи **или**
view-only эвристики по путям/имени сервиса (для `ods-arch`: `backend/`,
`frontend/`). «Открыть на схеме» из анализа фокусирует **сам code-узел**.

1. **Backend** — расширить `graph-view-slice` / loader: code kinds в срезе;
   `layer=system|code`; view-only affiliation; `resolve_from` → code-focus.
2. **Frontend** — шаг «В код»; крошки по code-уровням; empty code; регресс
   system; связка анализ→просмотр с `?focus=` для code.
3. **Без** новых парсеров / ingest / индексов.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend + frontend)

**Primary Dependencies**: существующие Fastify + ES graph repos; React 18 +
Vite; `@xyflow/react` + dagre layout (`011`); Vitest

**Storage**: Read-only `ods-graph-nodes` / `ods-graph-edges`. View-only
matching **не** пишет в ES. Координаты — sessionStorage как в `011`.

**Testing**: unit — affiliation heuristics (compose service name ↔ path
segment); code `insideForFocus` (module→class→method); resolve_from code-focus;
API contract; frontend — «В код», empty code, open-from-analysis; регресс
system slice

**Target Platform**: Docker Compose профиль `full` (`docker/`)

**Project Type**: Backend API extension + frontend page (web)

**Performance Goals**: те же caps **200 узлов / 500 рёбер**; SC-001 на
`ods-arch` — полный путь system→code→лист без тупика; ответ без полного dump
code-графа проекта

**Constraints**: Без edit канона; без новых парсеров; без поиска на схеме;
без фейковой БД-иерархии; system-первый вход в сервис сохранён; русские
empty/truncate; свободный вход в любого соседа среза

**Scale/Scope**: эталон `docker/fixtures/repos/ods-arch/`; регресс
`system-landscape-demo`

## Constitution Check

*GATE: до Phase 0 и после Phase 1.*

| Требование | Статус |
|------------|--------|
| VI. Детальная спека `012`, этап в `001` | ✅ |
| TypeScript + ES метаданные read-only | ✅ |
| Код после plan/tasks | ✅ |
| Русский язык артефактов / UI | ✅ |
| Черновик ≠ канон | ✅ clarify в `spec.md` |
| Без auth / RAG / edit графа / новых парсеров | ✅ |
| Docs/RAG/auth сдвинуты на `013`–`015` | ✅ |

**Post-design:** research + data-model + contracts + quickstart; нарушений нет.

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
└── tasks.md                 # /speckit-tasks
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
│   ├── pages/GraphViewPage.tsx           # layer=code, «В код»
│   ├── pages/GraphPage.tsx               # open → focus code id
│   ├── components/graph-view/            # inspector, crumbs, canvas
│   ├── api/graph.ts
│   └── i18n/ru.ts
```

**Structure Decision**: Расширение `011` без новых приложений. Парсеры не
трогаем.

## Complexity Tracking

> Пусто — нарушений конституции нет.

## Phase 0 / Phase 1 outputs

| Артефакт | Путь |
|----------|------|
| Research | [research.md](./research.md) |
| Data model | [data-model.md](./data-model.md) |
| API contract | [contracts/openapi-graph-view-code.yaml](./contracts/openapi-graph-view-code.yaml) |
| UI contract | [contracts/graph-view-code-ui.md](./contracts/graph-view-code-ui.md) |
| Quickstart | [quickstart.md](./quickstart.md) |

## Implementation sketch (для tasks, не FR)

1. `matchCodeToService(service, codeNodes)` — name/path heuristics (R1)
2. `insideForFocus` + `layer=code` — children by `parent_id` / kinds
3. Query `layer=system|code` (default system for service focus)
4. `resolve_from`: if code → `focus=code` + `resolve_status=exact_code`; else R5 `011`
5. UI: inspector **«В код»** всегда при focus=service и `layer=system`
   (даже без кандидатов → `no_related_code`); double-click service не
   открывает code
6. Empty: `empty_reason=no_related_code`

## Follow-ups (не DoD)

- Запись рёбер code↔service в канон
- Иерархия БД
- Ops-config caps
