# Specifications: MVP portal

**Fiction**: `003-portal-mvp`

**Created**: 2026-07-07

**Updated**: 2026-07-08

**Statute**: Chernovik (increase: project removal in UI)

**Input**: Pilot post-MVP increment: the Delete button on the project list screen,
confirmation of action, call `DELETE` backend (`002` FR-013), update the list
The source of the ideas is `ods-help/user-guide/later.md` (p. 1).

**Parental specs**: `specs/001-ods-vision/spec.md` (stage 2)

**Dependency**: `specs/002-domain-model/spec.md` (blockers; operations FR-011 in `002`)

## A brief description

ODS web portal  user entry point to MVP. The portal ** does not store** metadata
It's called backend from `002` to register projects, sync,
UX contract: a global app header, project-scoped actions on the Projects list,
three panels in the workspace, and read-only code.

## The limits of heat

### It 's coming in .

- Import screens, project lists, three-panel workplaces;
- the main menu and navigation between the sections;
- sync status and backend errors;
- lazy load of the tree (API pagination `002`);
- change of the status of the element in the right panel;
- the menu item Graph (UI  `006-project-graph`);
- the frontend 's deployment in the Docker Compose;
- **delete the project** from the list (`/projects`) through the backend `002`.

### Not included

- The data schema, the ES indexes, the sync logic (`002-domain-model`);
- Parseers, data graphs, RAGs;
- editing/deleting **files** of the repository in the UI (FR-008);
- the logic of removing metadata and ES cascade (`002-domain-model`);
- soft-delete the project with the basket;
- renaming the project without deleting it.
- authentication, roles;
- the history of changes, the customization of the panels, the mobile interface;
- The side TOC of the document.

## User Scenarios & Testing *(mandatory)*

### User Story 1  Import and list of projects (Priority: P1)

As a developer, I register the repository using a Git URL or a local path.
I see it on the list of current sync status.

**Why this priority**: The entry point; registration in `002` immediately starts the initial sync.

**Independent Test**: Import → project in list → are displayed `sync_status` and
If you have an error  `last_error_message`.

**Acceptance Scenarios**:

1. **Given** import form, **When** user enters a valid Git URL
   and confirms that **Then** is called for the registration of the project (`002` FR-011),
   The project appears in the list, the sync indicator (`running` → outcome) is displayed.
2. **Given** the same source already registered, **When** re-import,
   **Then** an existing project is opened without a duplicate in the list.
3. **Given** sync ended with an error, **When** user viewing the list
   or project card, **Then** status `failed`/`partial` and text are visible
   the backend error message.

---

### User Story 2  Project opening and sync (Priority: P1)

As a developer, I pick a project from a list, I open a job.
I'll run the sync again if necessary.

**Independent Test**: Project selection → three-panel screen → sync → updated tree.

**Acceptance Scenarios**:

1. **Given** list of projects, **When** user selects project,
   **Then** opens a three-panel (US-3) and active work screen
    Context with  `project_id`.
2. **Given** the Projects list, **When** the user starts sync from a project row,
   **Then** that row's Sync action is disabled while `running`; after completion,
   a project-scoped success or error toast is shown.
3. **Given** backend returned `sync_in_progress`, **When** reboot sync,
   **Then** the portal shows the message without the interface falling.

---

### User Story 3  Three-panel view of files (Priority: P1)

As a team member, I navigate the tree to the left, reading the file in the center.
And I see the properties on the right in one browser window.

**Why this priority**: The key UX contract is from `001`.

**Independent Test**: Open the folder → open the `.ts` file → text in the center,
The path and status on the right.

**Acceptance Scenarios**:

1. **Given** project open, **When** screen loaded, **Then** three panels:
   **Navigation** | **Content** | **Properties**.
2. **Given** folder in the tree, **When** disclosure, **Then** subsidiary elements
   loaded with paging (not all the repository at once).
3. **Given** text file UTF-8, **When** selection in the tree,
   **Then** content in the central panel, **without ** save/remove buttons.
4. **Given** binary file (`not_text` from backend), **When** opening,
   **Then** the message file cannot be displayed as text.
5. **Given** unsupported encryption, **When** unlocking,
   Then an error message, not an empty screen.
6. **Given** element with `is_active` = false, **When** displaying the tree,
   **Then** the element ** is not shown** in the active tree (or hidden by default).

---

### User Story 4 — App header and navigation (Priority: P1)

As a user, I navigate through the global app header and run project-specific
actions from the Projects list.

**Independent Test**: Import → list → project → sync → file  without
without leaving the portal or using a terminal.

**Acceptance Scenarios**:

1. **Given** the user is in the portal, **When** the app header is displayed,
   **Then** the ODS brand is on the left and the EN/RU language selector is on the right.
2. **Given** the user navigates through the portal, **When** the main navigation is displayed,
   **Then** it contains **Import**, **Projects**, **File structure**, and **Graph**; Sync is not a main-menu item.
3. **Given** the Graph item, **When** the user navigates,
   **Then** screen of the graph by `006-project-graph` (list of nodes and edges); without auth.
4. **Given** MVP, **When** any scenario is executed,
   **Then** no access is requested.

---

### User Story 5  Changing status (Priority: P2)

As an architect, I change the status of a file or folder in the right panel.

**Independent Test**: Change the status → update the page → value saved.

**Acceptance Scenarios**:

1. **Given** active element selected, **When** user selects status
   from the list (`auto_found`, `needed`, `not_needed`, `found`, `unused`),
   **Then** portal calls for status updates (`002`) and displays
   the localized status label in the selected UI language.
2. **Given** status changed, **When** reopened the item,
   **Then** displays the saved status.

---

### User Story 6  Deleting the project from the list (Priority: P2)

As a developer, I remove unnecessary projects from the list to remove bits,
Test or obsolete records and if necessary import the same source
Again with a new name.

**Why this priority**: After the pilot , the list of projects gets clogged; without deleting
All that's left is a complete cleanup of the Docker volumes.

**Independent Test**: On `/projects` click on Delete → confirm → project
disappeared from the list; re-importing the same route creates a new project.

**Acceptance Scenarios**:

1. **Given** project list screen, **When** user clicks on Delete
   In the project line, **Then** is a confirmation with the text that
   The source can be re-imported.
2. **Given** confirmation accepted, **When** backend successfully removed the project,
   ** Then** the row disappears from the list without restarting the entire page
   (updating the list data).
3. **Given** confirmation canceled, **When** user closes the dialog,
   **Then** the project remains on the list, the request to delete **not** is sent.
4. **Given** opens the work screen `/projects/:id` of the remote project,
   **When** removal is completed successfully, **Then** the portal redirects
   user on `/projects`.
5. **Given** backend returned `sync_in_progress`, **When** attempt to remove,
   **Then** a clear localized message is displayed; the list is not broken.
6. **Given** project deleted, **When** user imports the same source,
   **Then** in the list appears **new** project (new name from import form).

---

### Edge Cases

- Tree of 10 000+ files: Open folders by request; Paginate e when
  You're going to be over the page limit.
- Loss of connection with the backend: banner/toast no connection, button repeat.
- Sync when the file is open: tree is updated; if file is deleted  message
  In the center panel, the context of the project is preserved.
- Empty repository: tree with root, central panel  placeholder.
- Screen width < 1280px: layout MAY be degraded but remains usable
  (details in plan).
- Delete during `sync_status` = `running`: the message `sync_in_progress`,
  The project remains on the list.
- Deletion when the backend is lost: network error, project remains in the list.
- The Delete button refers to the **project** in the list, not to files in the tree (FR-008).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The portal MUST be a web application, all data is through the API
  backend (`002` FR-011); local storage of project metadata MUST NOT
  to be used as a source of truth.
- **FR-002**: The portal MUST provide a global app header with the ODS brand on
  the left and an **EN/RU** language selector on the right. English is the default UI language.
- **FR-003**: The import screen MUST accept the Git URL or local path
  (explanation: path on the backend server in the pilot) and call for the project to register.
- **FR-004**: The ** list of projects** screen MUST display a table with columns:
  **Name**, **Source**, **Sync status**, **Last sync**, **Error**
  (`last_error_message` if there is), **Actions**.
  Each row MUST expose icon-only actions: **Open** (open-folder icon), **Delete**
  (trash icon), and **Sync** (circular-arrows icon). Every icon action MUST have
  a visible tooltip and an `aria-label` with the exact value `Open`, `Delete`, or `Sync`.
- **FR-005**: **Sync** MUST be available only from the corresponding row on the
  **Projects list** and MUST NOT appear in the main menu. During `running`, the
  row's Sync action MUST be disabled. Sync toasts and modals MUST be scoped to
  Projects; `ConnectionBanner` remains global.
- **FR-006**: The project work screen MUST have ** three panels**:
  - left  file tree (repository root; `.git` is not displayed);
  - central  read-only or placeholder view;
  - right  path, type, status, action of change of status (P2).
- **FR-007**: The tree MUST load the children of the folder lazily with API paging `002`.
- **FR-008**: The files MUST be read-only; save buttons,
  Deleting, creating files MUST NOT be displayed.
- **FR-009**: The portal MUST display backend errors through UI i18n in English
  (default) and Russian,
  using error codes (`source_unreachable`, `sync_in_progress`,
  `encoding_unsupported`, ...) to select the text.
- **FR-010**: The point Graph MUST open the `GraphPage` screen on the contract
  `006-project-graph` (list of nodes and edges); canvas  outside the scope `003`.
- **FR-011**: The portal MUST NOT require a terminal, a system access and
  The side TOC of the document.
- **FR-012**: The delivery component MUST include **Docker Compose** with services
  Frontend, backend and Elasticsearch (together with `002`).

- **FR-013**: The ** list of projects** (`/projects`) screen MUST provide the action
  **Delete** for each project line that:
  - Before sending the request, the user shall show a confirmation stating that
    the source can be imported again;
  - upon confirmation , calls the operation to remove the project backend (`002` FR-013);
  - updates the project list that is displayed if successful;
  - If the user was on a remote project screen,
    (`/projects/:id`),  performs **redirect** to `/projects` and clears
    the project 's active context;
  - does not cause backend when confirmation is cancelled;
  - When backend (`sync_in_progress`, `not_found`, network) is shown
    a localized message without the interface falling;
  - **no** adds file removal buttons in the tree or browser (FR-008).

### UI and backend correspondence (`002`)

| The action in the portal | Operation `002` |
|--------------------|----------------|
| Import / registration | Register the project |
| List / card of the project | List of projects / Get the project |
| Sync | Run sync |
| Opening the folder | The daughter elements |
| Selecting the node | Get the item |
| Opening the file | The contents of the file |
| Changing status | Updating the status |
| Delete the project | Delete the project |

### Language policy

- SDD and documentation content MUST be written in English.
- Portal UI MUST support `en` (default) and `ru`.
- UI labels, status labels, errors, confirmations, toasts, tooltips, and
  accessibility labels MUST be resolved through i18n resources.

### Displaying status in UI

| Code (`002`) | The mark in the portal |
|-------------|-----------------|
| `auto_found` | Automatically found |
| `needed` | I need to . |
| `not_needed` | No need to . |
| `found` | Found |
| `unused` | Not used |

### Panel types

| The panel | MVP | Post-MVP |
|--------|-----|----------|
| File structure | Yes | — |
| View the file (read-only) | Yes | editing |
| Properties / status | Yes | — |
| The dependency graph | Yes (`006`) | canvas |
| History of changes | No | Yes |
| The settings | No | Yes |
| The panel set | No | Yes |

### Key Entities

The data essence  in `002`. At UI level:

- **Context of the session**: `project_id` (active project), `element_id` (selected)
  The knot), `left_panel_mode` (`files` | `graph`).

## Success Criteria *(mandatory)*

- **SC-001**: User for **5 minutes** without terminal: Imports test
  The repository waits for sync, opens the `.md` or `.ts` file and reads the contents.
- **SC-002**: All menu items (FR-002) lead to the work screen; no dead links.
- **SC-003**: At width ≥ 1280px, three panels are visible simultaneously on the project screen.
- **SC-004**: Opening a folder with 200+ children does not block the UI (pagination/subloading).
- **SC-005**: Pilot confirms: basic code view  in one
  The interface (quality assessment).
- **SC-006**: The `002` SC-005 reception chain is executed through the portal UI only.
- **SC-007**: The user deletes the project from the list with a confirmation; the project
  disappears from the list; when the project screen is open , the transition to
  `/projects`; re-importing the same source creates a new project with a new
  name.

## Assumptions

- Backend and API contract are implemented on `002` and `plan.md` backend-specs.
- Frontend MVP  TypeScript; the stack is detailed in `plan.md` of this fichi.
- Local path in import form  path available backend on the deployment host.
- Mobile adaptation and drag and drop panels  post-MVP.
- Backend DELETE is implemented on `002` (checkpoint **B5**); the portal only consumes API.

## Dependencies

- `specs/001-ods-vision/spec.md`  boundaries of MVP, three-panel UX, read-only.
- `specs/002-domain-model/spec.md`  all data operations; the portal does not duplicate the FR backend.
- The removal increment: `002` FR-013 / US5 (API) MUST be unfolded before the FR-013 UI is received.
