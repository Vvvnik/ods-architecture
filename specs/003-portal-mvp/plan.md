# План реализации: Портал MVP

**Ветка**: `003-portal-mvp` | **Дата**: 2026-07-08 | **Обновлено**: 2026-07-08

**Спека**: [spec.md](./spec.md)

**Вход**: Спецификация `specs/003-portal-mvp/spec.md` (инкремент: удаление проекта в UI, FR-013)

**Зависимости**:

- `specs/001-ods-vision/spec.md` — границы MVP, UX
- `specs/002-domain-model/spec.md` — **канонический API** и backend
- `docker/` — общий dev/full compose для связки сервисов

## Summary

Веб-портал ODS MVP — SPA **React + Vite + TypeScript**: главное меню, импорт,
список проектов (с **удалением** проекта), **трёхпанельное** рабочее место
(дерево | read-only файл | свойства/статус). Данные **только** через REST API
backend (`002`): [`specs/002-domain-model/contracts/openapi.yaml`](../002-domain-model/contracts/openapi.yaml),
включая `DELETE /projects/{id}` (checkpoint **B5**).

Клиент не хранит метаданные как источник правды. Типы DTO генерируются или
вручную зеркалируют OpenAPI `002`. Локальная проверка связки — через
[`docker/docker-compose.dev.yml`](../../docker/docker-compose.dev.yml) (профиль `full`).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS

**Primary Dependencies**: React 18, Vite 5, React Router 6, TanStack Query 5,
CodeMirror 6 (read-only), `openapi-typescript` (типы из `002`, опционально)

**API Base URL**:

| Режим | URL |
|-------|-----|
| `npm run dev` (Vite) | proxy `/api` → `http://localhost:3000` |
| Docker (`full`) | браузер → `http://localhost:8080`, nginx → `backend:3000` |

**Storage**: Только `sessionStorage` для `activeProjectId` (опционально); ES/FS — в `002`

**Testing**: Vitest + RTL; Playwright e2e против `docker compose --profile full`

**Target Platform**: Браузер desktop ≥ 1280px (целевой layout)

**Project Type**: Web SPA (`frontend/`)

**Performance Goals**: SC-004 — папка 200+ детей без блокировки UI

**Constraints**: Read-only; русский UI; без auth; заглушка графа; контракт = `002`

## Constitution Check

| Требование | Статус |
|------------|--------|
| VI. Иерархия спек | ✅ UI только в `003` |
| Зависимость от `002` | ✅ Канон OpenAPI в `002` |
| TypeScript + Docker | ✅ `frontend` в `docker/` compose |
| MVP read-only, 3 панели | ✅ |
| Инкремент DELETE UI (FR-013) | ✅ US6, ui-routes, api-consumer |
| Код после tasks | ✅ |

**Post-design:** `api-consumer.yaml` — зеркало `002/openapi.yaml`; `docker/` —
единая точка поднятия ES + backend + frontend.

## Project Structure

### Documentation

```text
specs/003-portal-mvp/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ui-routes.md
│   ├── api-consumer.yaml      # зеркало 002 (без /health)
│   ├── error-messages.md
│   └── docker-integration.md  # связка с docker/
└── tasks.md
```

### Source Code

```text
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts          # baseURL /api/v1
│   │   └── types.ts           # из 002 OpenAPI
│   ├── layouts/               # AppLayout, WorkspaceLayout
│   ├── pages/                 # Import, Projects, Workspace, GraphStub
│   ├── components/            # FileTree, FileViewer, DeleteProjectDialog, ...
│   └── hooks/                 # useProjects, useSync, useFileTree
├── nginx/
│   └── default.conf           # proxy /api → backend:3000
├── Dockerfile                 # build → nginx
└── vite.config.ts             # dev proxy

docker/                        # общий с 002
├── docker-compose.dev.yml     # es | full (+ backend + frontend)
├── .env.example
└── nginx/                     # (опционально shared snippets)

backend/                       # план 002
```

**Structure Decision:** `frontend/` — отдельный пакет; `docker/` — инфраструктура
обоих сервисов; корневого `docker-compose.yml` нет (только `docker/`).

## Интеграция с `002-domain-model`

| Аспект | Источник правды (`002`) | В портале (`003`) |
|--------|-------------------------|-------------------|
| REST paths, DTO | `contracts/openapi.yaml` | `api/client.ts`, `types.ts` |
| Коды ошибок | FR-012, domain errors | `i18n/ru.ts`, `error-messages.md` |
| Sync async | `sync_status`, 409 | polling GET project, disable Sync |
| Пагинация дерева | `limit`≤100, `offset` | FileTree «Загрузить ещё» |
| Удаление проекта | `DELETE /projects/{id}` → 204 | таблица проектов + столбец **Действия**; кнопка «Удалить», confirm, invalidate list |
| Health | `GET /health` | не вызывается из UI; для compose depends |

Генерация типов (в tasks):

```bash
npx openapi-typescript ../specs/002-domain-model/contracts/openapi.yaml -o src/api/types.ts
```

## Docker (`docker/`)

См. [contracts/docker-integration.md](./contracts/docker-integration.md).

| Профиль | Сервисы | Команда |
|---------|---------|---------|
| *(default)* | elasticsearch | `docker compose -f docker/docker-compose.dev.yml up -d` |
| `full` | elasticsearch + backend + frontend | `... --profile full up --build` |

Порты пилота:

- `8080` — портал (nginx)
- `3000` — backend (прямой доступ для curl/debug)
- `9200` — Elasticsearch

## Phase 0–1

- [research.md](./research.md) — UI-стек, polling, docker/nginx
- [data-model.md](./data-model.md) — клиентское состояние
- [contracts/](./contracts/) — маршруты, API-зеркало, docker
- [quickstart.md](./quickstart.md) — SC-001, SC-006, SC-007 через UI и compose

## Phase 2: Tasks (preview)

MVP (T001–T049) — выполнено. **Инкремент: удаление проекта (US6, FR-013, SC-007):**

1. ~~Vite + Router + proxy~~
2. ~~Типы и API-клиент~~
3. ~~Import, Projects, Workspace~~
4. ~~FileTree, FileViewer, статусы~~
5. ~~Sync polling + 409~~
6. ~~Docker + nginx~~
7. ~~compose full~~
8. ~~e2e / quickstart~~

**Инкремент DELETE UI:**

9. `deleteProject(id)` в `frontend/src/api/projects.ts`; регенерация `types.ts` (DELETE в OpenAPI)
10. `DeleteProjectDialog` или inline confirm — текст FR-013
11. `ProjectListPage` — кнопка «Удалить» в строке; mutation + invalidate `['projects']`
12. Обработка 409 `sync_in_progress`, 404, сеть — `errorMessageForCode` / тост
13. `WorkspacePage` / router: при 404 удалённого проекта или после delete с workspace → `navigate('/projects')`, `setActiveProjectId(null)`
14. Ручная приёмка SC-007 в quickstart § SC-007

**Порядок с `002`:** backend DELETE (**B5**) ✅ → frontend increment выше.

## Complexity Tracking

Нарушений нет.
