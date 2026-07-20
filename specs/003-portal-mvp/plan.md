# The plan for the implementation: MVP portal

**Vetka**: `003-portal-mvp` | **Date**: 2026-07-08 | **Updated**: 2026-07-08

**Spec**: [spec.md]

**Input**: Specification `specs/003-portal-mvp/spec.md` (increement: deleting the project in UI, FR-013)

**Dependency**:

- `specs/001-ods-vision/spec.md`  boundaries of MVP, UX
- `specs/002-domain-model/spec.md`  **canonical API** and backend
- `docker/`  common dev/full compose for linking services

## Summary

ODS MVP web portal — SPA **React + Vite + TypeScript**: global app header,
import, project list with project-scoped actions, and a **three-panel** workspace
(the tree) | Read-only file | Data is **only** through REST API
backend (`002`): [`specs/002-domain-model/contracts/openapi.yaml`](../002-domain-model/contracts/openapi.yaml),
including `DELETE /projects/{id}` (checkpoint **B5**).

The client does not store metadata as a source of truth.
Manually mirror OpenAPI `002`. Local check of the link  via
[`docker/docker-compose.dev.yml`](../../docker/docker-compose.dev.yml) (profile `full`)

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS

**Primary Dependencies**: React 18, Vite 5, React Router 6, TanStack Query 5,
CodeMirror 6 (read-only), `openapi-typescript` (types from `002`, optional)

**API Base URL**:

| The mode | URL |
|-------|-----|
| `npm run dev` (Vite) | proxy `/api` → `http://localhost:3000` |
| Docker (`full`) | Browser → `http://localhost:8080`, nginx → `backend:3000` |

**Storage**: Only `sessionStorage` for `activeProjectId` (optional); ES/FS  in `002`

**Testing**: Vitest + RTL; Playwright e2e vs `docker compose --profile full`

**Target Platform**: Desktop browser ≥ 1280px (targeted layout)

**Project Type**: Web SPA (`frontend/`)

**Performance Goals**: SC-004  200+ children's folder without UI blocking

**Constraints**: Read-only; UI i18n `en` (default) + `ru`; SDD/docs in English;
no auth; graph placeholder; contract = `002`

## Constitution Check

| The requirement | The status |
|------------|--------|
| VI. The hierarchy of specs | ✅ UI only in `003` |
| Dependence on `002` | ✅ OpenAPI canon at `002` |
| TypeScript + Docker | ✅ `frontend` in `docker/` compose |
| MVP read-only, 3 panels | ✅ |
| The DELETE UI (FR-013) | ✅ US6, ui-routes, api-consumer |
| Code after tasks | ✅ |

**Post-design:** `api-consumer.yaml`  mirror `002/openapi.yaml`; `docker/`
The ES + backend + frontend is the single lift point.

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
│ ── api-consumer.yaml # mirror 002 (without /health)
│   ├── error-messages.md
│ ── docker-integration.md # link to the docker/
└── tasks.md
```

### Source Code

```text
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts          # baseURL /api/v1
│ │ ── types.ts # from 002 OpenAPI
│   ├── layouts/               # AppLayout, WorkspaceLayout
│   ├── pages/                 # Import, Projects, Workspace, GraphStub
│   ├── components/            # FileTree, FileViewer, DeleteProjectDialog, ...
│   └── hooks/                 # useProjects, useSync, useFileTree
├── nginx/
│   └── default.conf           # proxy /api → backend:3000
├── Dockerfile                 # build → nginx
└── vite.config.ts             # dev proxy

Docker/ # common with 002
├── docker-compose.dev.yml     # es | full (+ backend + frontend)
├── .env.example
── nginx/ # (optional shared snippets)

Backend / # plan 002
```

**Structure Decision:** `frontend/`  separate package; `docker/`  infrastructure
both services; root `docker-compose.yml` no (only `docker/`).

## Integration with `002-domain-model`

| The Aspect | The source of truth (`002`) | In the portal (`003`) |
|--------|-------------------------|-------------------|
| REST paths, DTO | `contracts/openapi.yaml` | `api/client.ts`, `types.ts` |
| Error codes | FR-012, domain errors | `i18n/en.ts`, `i18n/ru.ts`, `error-messages.md` |
| Sync async | `sync_status`, 409 | Projects-row action, polling GET project, disable Sync |
| The tree's dying | `limit`≤100, `offset` | FileTree Download more |
| Project row actions | project endpoints | Icon-only Open/Delete/Sync with mandatory tooltips and `aria-label`s |
| Deleting the project | `DELETE /projects/{id}` → 204 | Trash action, confirm, invalidate list |
| Health | `GET /health` | Not called from UI; for compose depends |

Generating types (in tasks):

```bash
npx openapi-typescript ../specs/002-domain-model/contracts/openapi.yaml -o src/api/types.ts
```

## Docker (`docker/`)

The following is a list of the official languages of the United Kingdom.

| The profile | The services | The command |
|---------|---------|---------|
| *(default)* | elasticsearch | `docker compose -f docker/docker-compose.dev.yml up -d` |
| `full` | elasticsearch + backend + frontend | `... --profile full up --build` |

Pilot ports:

- `8080` — The portal (nginx)
- `3000`  backend (direct access for curl/debug)
- `9200` — Elasticsearch

## Phase 0–1

- the backend error message.
- [data-model.md]  the status of the client
- [contracts/](./contracts/)  routes, API mirror, docker
- [quickstart.md](./quickstart.md)  SC-001, SC-006, SC-007 through the UI and compose

## Phase 2: Tasks (preview)

MVP (T001T049)  completed. **Increment: project removal (US6, FR-013, SC-007):**

1. ~~Vite + Router + proxy~~
2. ~~Type and API client~~
3. ~~Import, Projects, Workspace~~
4. ~~FileTree, FileViewer, status~~
5. ~~Sync polling + 409~~
6. ~~Docker + nginx~~
7. ~~compose full~~
8. ~~e2e / quickstart~~

**Delete UI increment:**

9. `deleteProject(id)` in `frontend/src/api/projects.ts`; regeneration `types.ts` (DELETE in OpenAPI)
10. `DeleteProjectDialog` or inline confirm  text FR-013
11. `ProjectListPage`  button Delete in the line; mutation + invalidate `['projects']`
12. Processing 409 `sync_in_progress`, 404, network  `errorMessageForCode` / toast
13. `WorkspacePage` / router: 404 of the project removed or after delete from workspace → `navigate('/projects')`, `setActiveProjectId(null)`
14. Manual reception of SC-007 in quickstart § SC-007

**Order from `002`:** backend DELETE (**B5**) ✅ → frontend increment above.

## Complexity Tracking

There's no violation.
