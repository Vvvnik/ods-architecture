# Tasks: The MVP portal (frontend)

**Input**: `specs/003-portal-mvp/` — plan.md, spec.md, data-model.md, contracts/, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅; backend checkpoint **B1B4** from `specs/002-domain-model/tasks.md`; **B5**  for US6 (DELETE API)

**Tests**: Not requested in spec; acceptance  quickstart.md (SC-001, SC-006, **SC-007**); Playwright  in Polish (optional).

**Organization**: According to user stories spec.md; depends on `002-domain-model`.

**Connecting with `002`**: see [Connecting with backend](#Connecting with backend-002-domain-model).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: You can do it in parallel.
- **[Story]**: US1US6 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialisation of the `frontend/` and dev-circles

- [x] T001 Create a structure `frontend/` according to plan.md (`src/`, `public/`, `package.json`, `vite.config.ts`, `tsconfig.json`)
- [x] T002 To start with `frontend/package.json`: React 18, Vite 5, React Router 6, TanStack Query 5, CodeMirror 6, TypeScript 5
- [x] T003 [P] Set up the `frontend/vite.config.ts`  proxy `/api` → `http://localhost:3000`
- [x] T004 [P] Set up `frontend/tsconfig.json` and `frontend/tsconfig.node.json`
- [x] T005 [P] Create `frontend/index.html` and `frontend/src/main.tsx` (React root)
- [x] T006 [P] Add the scripts to `frontend/package.json`: `dev`, `build`, `preview`, `lint`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: API client, routing, layout, i18n  blocks all user stories

**⚠️ CRITICAL**: Requires **B1** from `002` for live API (or mock on OpenAPI to B1)

- [x] T007 Generate the types: `npx openapi-typescript specs/002-domain-model/contracts/openapi.yaml -o frontend/src/api/types.ts`
- [x] T008 Implement `frontend/src/api/client.ts`  baseURL `/api/v1`, fetch-wrap, parsing ApiError
- [x] T009 [P] Implement `frontend/src/i18n/en.ts` and `frontend/src/i18n/ru.ts`; `en` is the default locale
- [x] T010 [P] Implement `frontend/src/api/projects.ts` and `frontend/src/api/elements.ts`  FR-011 methods (list, register, get, sync, children, content, patch status)
- [x] T011 Implement `frontend/src/app/router.tsx`  routes by `contracts/ui-routes.md`
- [x] T012 Implement the `frontend/src/layouts/AppLayout.tsx`  frame from MainMenu
- [x] T013 [P] Implement the app header: ODS brand left, Import/Projects/File structure/Graph navigation, EN/RU selector right; no Sync menu item
- [x] T014 [P] Implement `frontend/src/hooks/useProjects.ts` and `frontend/src/providers/QueryProvider.tsx` (TanStack Query)
- [x] T015 Implement `frontend/src/context/SessionContext.tsx`  `activeProjectId`, `selectedElementId`, `leftPanelMode`

**Checkpoint F1**: `npm run dev` → routes open; API calls to backend at :3000 (after B1)

---

## Phase 3: User Story 1  Import and list of projects (Priority: P1)  MVP

**Goal**: Registering the repository and list with sync_status / errors

**Independent Test**: Import → project in list; reimport → same project (SC-001 part 1)

**Depends on 002**: **B1**

### Implementation for User Story 1

- [x] T016 [US1] Implement `frontend/src/pages/ImportPage.tsx`  form Git URL / local path, client validation (data-model.md)
- [x] T017 [US1] Connect the registration to `ImportPage.tsx` via `api/projects.ts` + redirect to `/projects/:id`
- [x] T018 [US1] Implement the `frontend/src/pages/ProjectListPage.tsx`  cards: name, source, sync_status, last_sync_at, last_error_message
- [x] T019 [P] [US1] Implement localized `SyncStatusBadge.tsx` labels for `en` and `ru`
- [x] T020 [US1] Processing of the endpotential: re-import → redirect to an existing project without duplicate in UI

**Checkpoint C1**: Import + Projects without a job

---

## Phase 4: User Story 2  Project opening and sync (Priority: P1)

**Goal**: Project selection, screen, sync with blocking and polling

**Independent Test**: Open the project → sync → status is updated without UI failure

**Depends on 002**: **B2**

### Implementation for User Story 2

- [x] T021 [US2] Implement the `frontend/src/pages/WorkspacePage.tsx`  three-panel frame (empty)
- [x] T022 [US2] Implement `frontend/src/hooks/useSync.ts`  POST sync, polling `GET /projects/:id` every 2 seconds at `running`
- [x] T023 [US2] Expose Sync only as the circular-arrows action in each Projects row; remove Sync from `MainMenu.tsx`
- [x] T024 [US2] Disable row Sync while `running`; scope localized sync toasts/modals to Projects (`ConnectionBanner` remains global)
- [x] T025 [US2] Navigation: click on the project at `ProjectListPage.tsx` → `/projects/:projectId` + set `activeProjectId`

**Checkpoint C2**: Sync UI works; the tree may still be silenced

---

## Phase 5: User Story 3  Three-panel view of files (Priority: P1)

Goal: The tree | Read-only file | properties; lazy page-making; not_text / encoding errors

**Independent Test**: Open the folder → open `.ts` → text in the center, path and status on the right (SC-001)

**Depends on 002**: **B2**, **B3**

### Implementation for User Story 3

- [x] T026 [US3] Implement `frontend/src/layouts/WorkspaceLayout.tsx`  three columns ≥1280px (25% / flex / 280px)
- [x] T027 [US3] Implement `frontend/src/hooks/useFileTree.ts`  child cache, expandedPaths, paging offset/limit
- [x] T028 [US3] Implement `frontend/src/components/FileTree.tsx`  lazy load, button Load more, hide `is_active=false`
- [x] T029 [US3] Implement `frontend/src/components/FileViewer.tsx`  CodeMirror read-only; placeholder Pick the file
- [x] T030 [US3] Implement `frontend/src/components/ElementProperties.tsx`  path, type, status (read-only in this phase)
- [x] T031 [US3] Download the content in `FileViewer.tsx` — `kind=text|not_text|error`; The binary and `encoding_unsupported`
- [x] T032 [US3] Update the tree after sync: disabling query in `useFileTree.ts`; file removed → message in the center

**Checkpoint C3**: SC-001 and SC-003 can be executed through UI

---

## Phase 6: User Story 4  Main menu (Priority: P1)

**Goal**: One menu; all items lead to the screen or shutter; no auth

**Independent Test**: Import chain → list → project → file without terminal (SC-002)

**Depends on 002**: **B1** (menu is partially ready in Phase 2)

### Implementation for User Story 4

- [x] T033 [US4] Menu point Graf → `GraphPage` (realized at `006` T040)
- [x] T034 [US4] To bring `MainMenu.tsx`  active states, transitions `/import`, `/projects`, `/projects/:id`, `/graph`
- [x] T035 [US4] Implement a localized `NotFoundPage.tsx` message for `en` and `ru`
- [x] T036 [US4] Redirect `/` → `/projects` in `frontend/src/app/router.tsx`

**Checkpoint C4**: SC-002  No dead links in the menu

---

## Phase 7: User Story 5  Changing status (Priority: P2)

**Goal**: Status select in the right panel; localized tags; save after refresh

**Independent Test**: Change the status → F5 → value in place

**Depends on 002**: **B4**

### Implementation for User Story 5

- [x] T037 [US5] Add `frontend/src/components/ElementProperties.tsx`  Set of ElementStatus (5 words)
- [x] T038 [US5] Call PATCH status in `frontend/src/api/elements.ts` + optimistic update / invalidate
- [x] T039 [US5] Display localized status labels from `i18n/en.ts` and `i18n/ru.ts` in the tree and properties

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Docker, nginx, full stack receiver, SC-006

- [x] T040 [P]  Create  `frontend/nginx/default.conf` — proxy `/api/` → `backend:3000`, SPA `try_files`
- [x] T041 [P] Create `frontend/Dockerfile`  build Vite → nginx alpine
- [x] T042 Check the service `frontend` in `docker/docker-compose.dev.yml` (profile `full`, port 8080)
- [x] T043 [P] Style: `frontend/src/styles/`  CSS Modules, layout ≥1280px, degradation <1280px (usable)
- [x] T044 [P] Component `frontend/src/components/ConnectionBanner.tsx`  loss of connection with the backend, retry
- [x] T045 Pull out `specs/003-portal-mvp/quickstart.md` full stack mode (SC-001, SC-006)
- [x] T046 [P] Playwright e2e: `frontend/tests/e2e/mvp.spec.ts`  import → sync → open the file (optionally)  **closed manually without Playwright**: T045 (quickstart full stack), regression T049 (Vitest/RTL), manual verification on `:8080`
- [x] T047 To check `specs/003-portal-mvp/contracts/api-consumer.yaml` with `002/contracts/openapi.yaml` after the final API

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → **User Stories (3–7)** → **Polish (8)** → **Convergence (9)** → **US6 (10)**
- US2US5 depends on US1 (context of project)
- US3 is dependent on US2 (WorkspacePage)
- US5 is dependent on US3 (ElementProperties)
- **US6** depends on US1 (ProjectListPage) + **002 B5**; redirect  from US2 (WorkspacePage)

### Dependencies on `002` (checkpoint's)

| Phase 003 | Checkpoint 002 | Minimum API |
|----------|----------------|-------------|
| Phase 2–3 (US1) | **B1** | register, list, get project |
| Phase 4 (US2) | **B2** | sync, polling sync_status |
| Phase 5 (US3) | **B2+B3** | children, content, get element |
| Phase 7 (US5) | **B4** | PATCH status |
| Phase 8 | **002 Polish** | Backend in compose healthy |
| Phase 10 (US6) | **B5** | DELETE project |

### User Story Dependencies (within 003)

| Story | We can do it later. | Independent Test |
|-------|-------------|------------------|
| US1 | Phase 2 + B1 | Import + list |
| US2 | US1 + B2 | Sync + workspace shell |
| US3 | US2 + B3 | 3 panels + file |
| US4 | US1 (partly Phase 2) | Menu + stub |
| US5 | US3 + B4 | Status select |
| US6 | US1 + US2 + B5 | Delete + redirect + SC-007 |

### Parallel Opportunities

- Phase 1: T003–T006
- Phase 2: T009T010, T013T014 after T008
- Phase 3: T019 parallel to T018
- Phase 8: T040, T041, T043, T044, T046
- Phase 10: T052 parallel to T050T051; T054T055 after T053

### Parallel Example: US3

```bash
# After T026:
Task T028: FileTree.tsx
Task T029: FileViewer.tsx
Task T030: ElementProperties.tsx (read only part)
```

### Parallel Example: US6

```bash
# After T051:
Task T052: i18n/ru.ts (confirm text)
Task T053: useDeleteProject.ts

# After T053:
Task T054: ProjectListPage.tsx (button)
Task T056: WorkspacePage.tsx (404 redirect) # parallel to T054
```

---

## Accordance with backend (`002-domain-model`)

```
002 Phase 1–2 (Foundation)
    ↓
002 US1 → B1 ──→ 003 Phase 2–3 (API client, Import, Projects)
    ↓
002 US2 → B2 ──→ 003 US2 (Sync) + US3 (FileTree)
    ↓
002 US3 → B3 ──→ 003 US3 (FileViewer)
    ↓
002 US4 → B4 ──→ 003 US5 (Status)
    ↓
002 US5 → B5 ──→ 003 US6 (Delete project UI)
    ↓
002 Polish + 003 Polish → docker compose --profile full → SC-006
```

**Parallel work:** after **002 B1** the frontend can go forward from the mock-server through OpenAPI, while the backend reaches sync (B2).

**Only MVP:** SC-006 `003` = SC-005 `002` through UI; check in at T045.

---

## Implementation Strategy

### MVP First (critical path)

1. Wait for the US1 (import/list)
2. **002 B2** → US2 + US3 (workplace, tree, file)  **main MVP**
3. US4 (menu/deaf)  parallel to US3
4. **002 B4** → US5
5. Polish both spokes → full compose

### Incremental Delivery

| The increment | 002 | 003 | The result |
|-----------|-----|-----|-----------|
| 1 | B1 | US1 | Imported in the browser |
| 2 | B2 | US2–US3 | See the code |
| 3 | B4 | US5 | The status |
| 4 | Polish | Polish | Pilot on: 8080 |
| 5 | B5 | US6 | Removal of the project (SC-007) |

---

## Notes

- API canon: `specs/002-domain-model/contracts/openapi.yaml`
- Do not store project metadata in localStorage as source of truth (FR-001)
- Sync: The first is the polling, not WebSocket (research.md R4)
- Delete: confirm FR-013, do not delete files in the tree (FR-008); backend B5 is required
- Update the text of the column overlap in `contracts/ui-routes.md` when deviating from spec (stage 57)

## Phase 9: Convergence

- [x] T048 Correct file selection in `WorkspacePage.tsx` and `FileViewer.tsx` per US3/AC3 (partial): when clicking on `FileTree` to transfer the element from the tree (optimistic) or the load state `getElement`; placeholder  Select the file... only when `selectedElementId` empty; when `GET .../elements/{id}` to display the error message, not the placeholder
- [x] T049 Add regression test US3/AC3: perform T046 (Playwright e2e `frontend/tests/e2e/mvp.spec.ts` import → sync → click on file → text in center) or, if Playwright is not connected, the component/integration test of file selection per US3/AC3 (missing)

---

## Phase 10: User Story 6  Deleting the project from the list (Priority: P2)

**Goal**: Delete to `/projects`, confirm, call DELETE, update the list, redirect from workspace

**Independent Test**: On `/projects` → Delete → confirm → project disappeared; re-import of the same source  new project (SC-007)

**Depends on 002**: **B5** (DELETE `/api/v1/projects/{id}`)

### Implementation for User Story 6

- [x] T050 [US6] Re-generate `frontend/src/api/types.ts` from `specs/002-domain-model/contracts/openapi.yaml` (operation `deleteProject`)
- [x] T051 [US6] Add `deleteProject(projectId)` to `frontend/src/api/projects.ts`  `DELETE /projects/{id}`, success 204 without the body
- [x] T052 [P] [US6] Add `DELETE_PROJECT_CONFIRM` to `frontend/src/i18n/ru.ts` by `specs/003-portal-mvp/contracts/error-messages.md`
- [x] T053 [US6] Implement `frontend/src/hooks/useDeleteProject.ts`  `useMutation`, invalidate `['projects']`; if the current project is deleted, deploy `activeProjectId` and `navigate('/projects')`
- [x] T054 [US6] Add icon-only Open (open folder), Delete (trash), and Sync (circular arrows) row actions with exact tooltips/`aria-label`s; confirm Delete and call `useDeleteProject`
- [x] T055 [US6] Processing of deleting errors in `frontend/src/hooks/useDeleteProject.ts` and displaying in `ProjectListPage.tsx`  409 `sync_in_progress`, 404 `project_not_found`, `network_error` (role=alert, without UI fall)
- [x] T056 [US6] Redirect on 404 in `frontend/src/pages/WorkspacePage.tsx`: if `useSync` / `GET /projects/:id` → `project_not_found`, call `navigate('/projects')`, `setActiveProjectId(null)`, and show a localized message
- [x] T057 Throw away the SC-007 reception by `specs/003-portal-mvp/quickstart.md` § SC-007 (full stack `:8080` or dev `:5173`)

**Checkpoint C5**: SC-007  Remove from the list, redirect from the workspace, re-import

---

## Phase 11: Polish (table of projects)

- [x] T058 Add the title of the column Actions in `frontend/src/pages/ProjectListPage.tsx`; columns of the table: Name, Source, Status sync, Last sync, Error, Actions (FR-004, `contracts/ui-routes.md`)
- [x] T059 Lighting of the project **open** on `/projects`: line c
  `activeProjectId` from `SessionContext` (phone + bar + tag open /
  `PROJECT_LIST_ACTIVE_BADGE` in `frontend/src/i18n/ru.ts`); without change
  The files are: `ProjectListPage.tsx`, `contracts/ui-routes.md`

---

## Post-MVP ops (2026-07-27) — local_path hosts

- [x] T060 Document + implement cross-OS `LOCAL_PATH_MAP` / host path mapping:
  split on `:/`, normalize `\`, do not `path.resolve` Windows absolute paths
  inside Linux containers (`backend/src/services/local-path-map.ts` + unit
  tests); README + `docker/.env.example` + this docker-integration contract
