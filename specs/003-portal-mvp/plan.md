# План реализации: Портал MVP

**Ветка**: `003-portal-mvp` | **Дата**: 2026-07-07 | **Обновлено**: 2026-07-07

**Спека**: [spec.md](./spec.md)

**Вход**: Спецификация `specs/003-portal-mvp/spec.md`

**Зависимости**:

- `specs/001-ods-vision/spec.md` — границы MVP, UX
- `specs/002-domain-model/spec.md` — **канонический API** и backend
- `docker/` — общий dev/full compose для связки сервисов

## Summary

Веб-портал ODS MVP — SPA **React + Vite + TypeScript**: главное меню, импорт,
список проектов, **трёхпанельное** рабочее место (дерево | read-only файл |
свойства/статус). Данные **только** через REST API backend (`002`):
[`specs/002-domain-model/contracts/openapi.yaml`](../002-domain-model/contracts/openapi.yaml).

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
│   ├── components/            # FileTree, FileViewer, ...
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
- [quickstart.md](./quickstart.md) — SC-001, SC-006 через UI и compose

## Phase 2: Tasks (preview)

1. Vite + Router + proxy `/api` → backend
2. Типы и API-клиент по `002/openapi.yaml`
3. Страницы Import, Projects, Workspace (3 панели)
4. FileTree (pagination), FileViewer, статусы
5. Sync polling + обработка 409
6. `frontend/Dockerfile` + `nginx/default.conf`
7. Добавить `frontend` в `docker/docker-compose.dev.yml` (профиль `full`)
8. Playwright e2e по [quickstart.md](./quickstart.md)

**Порядок с `002`:** минимальный backend (или mock по OpenAPI) → frontend →
`docker compose --profile full`.

## Complexity Tracking

Нарушений нет.
