# Research: The MVP portal

**Date**: 2026-07-08
**Spec**: [spec.md]

## R1. UI framework

**Decision:** React 18 + Vite 5 + TypeScript.

**Rationale:** Constitution MVP; Vite proxy for `/api` in dev.

## R2. Read-only code

**Decision:** CodeMirror 6, `readOnly: true`.

## R3. Loading data

**Decision:** TanStack Query; disability after sync.

## R4. Sync to UI

**Decision:** Polling `GET /projects/{id}` every 2 seconds at `sync_status=running`;
processing `409 sync_in_progress` from `002`.

Sync is initiated only from the circular-arrows action in the corresponding
Projects row; it is not part of the main menu. Sync toasts and modals remain
scoped to Projects, while `ConnectionBanner` remains global.

## R5. The tree

**Decision:** Lazy load + `limit`/`offset` on `002` FR-009.

## R6. Styling

**Decision:** CSS Modules, without a heavy UI kit.

## R7. API contract

**Decision:** Canon  [`002/contracts/openapi.yaml`](../002-domain-model/contracts/openapi.yaml).
The mirror of the consumer  `003/contracts/api-consumer.yaml` (without `/health`).
When there is a difference govern consumer or update both with `/speckit-analyze`.

**Rationale:** Plan `002` is fixed; frontend types from one OpenAPI.

**Alternatives:** Manually duplicate schemes without openapi-typescript  rejected
(risk drift)

## R8. Docker and nginx

**Decision:**

- Dev ES only: `docker compose -f docker/docker-compose.dev.yml up -d`
- Full link: `--profile full` (ES + backend + frontend)
- Frontend: Multi-stage build → **nginx alpine**; `default.conf` proxy
  `/api/v1` → `http://backend:3000/api/v1`
- Sstatics SPA: `try_files $uri /index.html`

**Rationale:** Unified catalog `docker/` for `002` and `003`; port **8080** for UI,
**3000** for direct API (quickstart `002`).

**Alternatives:** Vite preview in the container  worse for a prod-like pilot.

## R9. Local development without Docker

**Decision:** Terminal 1: ES (`docker compose ... up -d elasticsearch`); terminal 2:
`cd backend && npm run dev`; terminal 3: `cd frontend && npm run dev` (Vite proxy).

**Rationale:** Quick iteration of UI; same API as in compose.

## R10. E2E

**Decision:** Playwright vs. `http://localhost:8080` after `--profile full up`.

**Rationale:** Check SC-001/SC-006 in the real link nginx → backend → ES.

## R11. Deleting the project in UI (increase 2026-07-08)

**Decision:** Project rows use icon-only Open (open folder), Delete (trash), and
Sync (circular arrows) actions. Each action has a mandatory tooltip and exact
`aria-label` (`Open`, `Delete`, or `Sync`). Delete uses native `window.confirm`
or a lightweight `DeleteProjectDialog` with the localized FR-013 text.

**Flow:**

1. Click Delete → confirm: *Delete the project? The source can be imported again.*
2. OK → `DELETE /api/v1/projects/{id}` (TanStack Query `useMutation`)
3. Success → `invalidateQueries(['projects'])`; if `activeProjectId === id` →
   `navigate('/projects')` + dismiss the context
4. 409 → message `sync_in_progress`; 404 → update the list

**Rationale:** FR-013, US6; backend ready (`002` B5); without deleting files (FR-008).

**Alternatives:** Soft-delete in UI  outside scope; deleting from Workspace menu  is rejected
(main script  list `/projects`).
