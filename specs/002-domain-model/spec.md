# Specifications: MVP data model

**File**: `002-domain-model`

**Created**: 2026-07-07

**Updated**: 2026-07-08

**Statute**: Chernovik (increement: removal of the project)

**Input**: Pilot increment post MVP: project removal operation  removal
Elasticsearch metadata (a cascade of trees), release source for
the re-import; cleaning the working copy to the filesystem for `git_url`.
The source of the ideas is: `ods-help/user-guide/later.md` (p. 1).

**Parental specs**: `specs/001-ods-vision/spec.md` (stage 1)

**User**: `specs/003-portal-mvp/spec.md` (stage 2)

## A brief description

The MVP backend layer stores ** projects** (imported repositories), ** tree
The data is stored in the database of the data element** (working copy files and folders) and the data element** status.
JSON in Elasticsearch; file content  on the drive. Parser, graph, RAG and UI
This is not a hot spot.

## The limits of heat

### It 's coming in .

- registering the project via Git URL or local path;
- sync the work copy and build the tree;
- reading the contents of text files (read-only);
- change of the status of the element;
- backend operations for the list of projects, tree (with paging), sync, status;
- **delete the project** (metadata in ES + working copy for `git_url`).

### Not included

- UI, menu, panels (`003-portal-mvp`);
- language parser, dependence graph;
- RAG, vector search;
- editing/deleting files on the disk through API;
- authentication and roles;
- removing source data with only metadata (post-MVP, `001`);
- UI of the project removal (`003-portal-mvp`);
- soft-delete the project with the basket and the recovery;
- renaming the project without deleting (PATCH `name`).

## User Scenarios & Testing *(mandatory)*

### User Story 1  Registering the project (Priority: P1)

As a developer, I register repositories using Git URLs or local paths,
So the platform can create a project and start working on a copy.

**Why this priority**: Without the essence Project, import and sync are impossible.

**Independent Test**: POST of registration → project in the list with correct source
And the status of the operation.

**Acceptance Scenarios**:

1. **Given** valid Git URL, **When** registration, **Then** project is created
   with `source_type` = `git_url`, unique `id` and the initial sync** is run.
2. **Given** valid local path, **When** registration, **Then** is created
   project with `source_type` = `local_path` and the initial sync is run.
3. **Given** project with the same `source_type` + `source_value` already exists,
   **When** re-register, **Then** the existing project is returned
   (Idempotence) A new duplicate is being created.

---

### User Story 2  Sync and tree of files (Priority: P1)

As an architect, I run sync and get the current file and folder tree.
with metadata.

**Why this priority**: The tree is the foundation of navigation in the portal.

**Independent Test**: After successful sync, the tree in the storage matches
the working copy on the disk (without `.git`).

**Acceptance Scenarios**:

1. **Given** project registered, **When** sync completed successfully,
   ** Then** for each file and folder of the work copy (except `.git`) there is an element
   with `path`, `type`, `status` = `auto_found`, `is_active` = true.
2. **Given** in the working copy a new file, **When** re-sync,
   **Then** a new element with the status `auto_found` appears.
3. **Given** file is deleted from the workbook, **When** re-sync,
   **Then** the element receives `is_active` = false (soft-delete); record
   It's preserved for the history of the status.
4. The file with the same path appeared again, when sync,
   **Then** the element is reactivated (`is_active` = true); the status is maintained,
   If it was changed manually, it's not `auto_found`.

---

### User Story 3  View the contents of the file (Priority: P1)

As a developer, I'm asking for the contents of the text file by ID.
The element to display it on the portal (read-only).

**Why this priority**: The MVP portal doesn't edit files, but MUST read them.

**Independent Test**: Open the `file` → type element to get text or a sign
not text/coding error.

**Acceptance Scenarios**:

1. **Given** active element `file` in UTF-8, **When** a content request,
   **Then** returns the text of the file from the working copy.
2. **Given** binary file, **When** request for content,
   **Then** returns the `not_text` sign without the file body.
3. **Given** element `is_active` = false, **When** the content request,
   **Then** error fail not available (API `code` + English `message`; portal
   shows i18n copy by `code`).

---

### User Story 4  Status of the element (Priority: P2)

As an architect, I change the status of a file or folder to fix the decisions on the
The code base.

**Independent Test**: PATCH status → read over the item → status saved
After the service restarts.

**Acceptance Scenarios**:

1. **Given** active element, **When** setting status from FR-004,
   **Then** status is stored in the metadata element.
2. **Given** new element after sync, **When** status has not changed,
   **Then** `status` = `auto_found`.

---

### User Story 5  Deleting the project (Priority: P2)

As a developer, I remove a project from the platform to remove bits,
Test or obsolete records from the list and if necessary import
The same source again with a new name.

**Why this priority**: After the pilot, the projects accumulated in Elasticsearch are getting in the way.
Demo; full cleaning through `down -v` is too rough.

**Independent Test**: DELETE project → project is not listed; repeat
The same `(source_type, source_value)` registers the same `id` and the same name.

**Acceptance Scenarios**:

1. **Given** an existing project, **When** deleted, **Then** the project document
   and **all** tree elements with this `project_id` removed from storage
   metadata; the operation ends successfully without a body of response.
2. **Given** project with `source_type` = `git_url`, **When** deleted,
   **Then** the workbook of this project on the filesystem backend is deleted.
3. **Given** project with `source_type` = `local_path`, **When** deleting,
   ** Then** metadata is deleted; source directory on mount/read-only path
   It's not changing.
4. **Given** project deleted, **When** registration with the same `source_type` and
   `source_value`, **Then** is created **new** project (new `id`, new name)
   The initial sync is run.
5. **Given** other projects in storage, **When** deleting one project,
   Then the rest of the projects and their trees are not affected.

---

### Edge Cases

- Wrong URL / inaccessible path: project in `sync_status` = `failed`,
  `last_error_message` is filled; re-sync is allowed.
- Repository of > 10 000 files: sync in `partial` or `success` with report;
  The tree is given **page** (lazy sample of the children of the folder).
- Sync is already running: restart → refusal with clear message
  (without parallel sync of one project).
- Symbols: bypass; the bited symbols  in the sync report, do not break the entire sync.
- Empty repository: the project exists, the tree  root without subsidiary files.
- Not UTF-8 encoding: error with `encoding_unsupported` for the portal.
- Delete during `sync_status` = `running`: refusal with code `sync_in_progress`;
  Repeat after the sync is complete or interrupted.
- Deleting a non-existent project: error `not_found`.
- Removing one project **not** is equivalent to completely cleaning up the storage
  (the rest of the records and volumes are kept).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store **Project** (`Project`) with the fields: `id`, `name`,
  `source_type` (`git_url` | `local_path`), `source_value`, `working_copy_root`
  (internal path on disk), `created_at`, `last_sync_at`, `sync_status`
  (`idle` | `running` | `success` | `failed` | `partial`), `last_error_message`
  (nullable).
- **FR-002**: Project registration MUST run the initial sync automatically.
- **FR-003**: The working copy of the files MUST be stored on **filesystem** separately
  from JSON metadata in Elasticsearch.
- **FR-004**: The system MUST store the tree element (`ProjectElement`): `id`,
  `project_id`, `path` (relative to the root of the repository), `parent_path`,
  `type` (`file` | `directory`), `status`, `is_active` (boolean).
- **FR-005**: The permissible **statuses**: `auto_found`, `needed`, `not_needed`,
  `found`, `unused`. By default when the element  `auto_found` appears.
- **FR-006**: The metadata `Project` and `ProjectElement` MUST be serialized in
  **JSON** and stored in Elasticsearch (separate indexes; names  in `plan.md`).
- **FR-007**: Sync MUST be ** and powered** by the pair `project_id` + `path`:
  The sync doesn't create duplicates of active elements.
- **FR-008**: The catalog **`.git`** MUST NOT get into the user tree.
- **FR-009**: Request for the subfolders MUST support **pagination**
  (limit/offset or cursor); by default limit ≤ 100.
- **FR-010**: MUST read the file to return: text (UTF-8), `not_text` for
  binary, or encoding error; recording to disk through API MUST NOT be
  It's available in MVP.
- **FR-011**: Backend MUST provide the operations (the REST  contract in `plan.md`):

  | The operation | The assignment |
  |----------|------------|
  | List of projects | All imported projects sorted by `last_sync_at` ↓ |
  | Get the project | Metadata and status sync |
  | Register the project | Creating + initial sync |
  | Run sync | Updating the workbook and the tree |
  | The daughter elements | Paginated folder children |
  | Get the item | The metadata of a single node |
  | Updating the status | Change the `status` element |
  | The contents of the file | Read-only text |
  | Delete the project | Removing project metadata and cascade of tree elements |

- **FR-012**: API errors MUST return a stable **error `code`** for the UI
  (`source_unreachable`, `sync_in_progress`, …) plus an English `message`
  (technical IT English, same as other backend strings). The portal MUST map
  `code` → copy via i18n for supported locales; it MUST NOT rely on the API
  `message` language for localization.

- **FR-013**: The operation of deleting the project MUST:
  - accept the identifier of the existing project;
  - delete the project document from the metadata repository;
  - **cascading** to remove all the elements of the tree with the same `project_id`
    (hard-delete records, not `is_active` = false);
  - for `git_url`  delete the work copy catalog of the project to the filesystem backend;
  - for `local_path`  **no** change the original catalog (read only/mount);
  - release the pair `(source_type, source_value)` for subsequent registration
    the new project;
  - reject the request when `sync_status` = `running` (code `sync_in_progress`);
  - return success without a response body when the existing project is removed;
  - return `not_found` if the project does not exist.

### Key Entities

- **Project (`Project`) **: Imported repository; source, root WC,
  The status and error of the last sync.
- **Tree element (`ProjectElement`) **: File structure node; path, type,
  The status, the sign of activity.
- **Status (`ElementStatus`) **: The list of FR-005.
- **SyncRun** *(optional in MVP) *: sync launch log; MAY be added
  in `plan.md` without changing scope.

### Connecting to storage

| The data | The storage room | Notes from the |
|--------|-----------|------------|
| Project, ProjectElement | Elasticsearch (JSON) | The index in the plan; DELETE the project  hard-delete |
| The contents of the files | Filesystem WC | Path = `working_copy_root` + `path`; for `git_url` WC is deleted with the project |
| Count, RAG | — | post-MVP (`004+`) |

## Success Criteria *(mandatory)*

- **SC-001**: Registering the test repository (≤ 1000 files) and successful sync
  They give a tree that matches the WC on the disk (without `.git`).
- **SC-002**: The change in the status of the element is retained after the backend is restarted.
- **SC-003**: Repeat sync does not increase the number of entries with one `project_id`
  + `path`.
- **SC-004**: Children's query of a 500+ item folder returns the first page
  (≤ 100 records) less than 2 seconds on the pilot iron (plan clarification).
- **SC-005**: The portal (`003`) can perform a chain list of projects → sync →
  tree → file content only through FR-011 operations.
- **SC-006**: Deleting the project and re-registering the same source
  create a new project with a new identifier; the list does not include a deleted project
  and its tree elements; for `git_url` on the backend disk there is no catalog
  It's a remote working copy.

## Assumptions

- Elasticsearch and backend in one Docker Compose with a pilot.
- One instance of ODS; multi-tanternity and auth are not required in MVP.
- The local path is available to the backend process (volume or mount host).
- The names of the ES and JSON-scheme of the documents are detailed in `plan.md`
  (`data-model.md`, `contracts/`).
- Removing the source with the preservation of the metadata  post-MVP (`001`).
- Delete the project  hard-delete metadata; not to be confused with soft-delete elements
  The sync (FR-007, US2)
- User of the UI of removal  `003-portal-mvp` (separate increments of specs `003`).

## Dependencies

- `specs/001-ods-vision/spec.md`  MVP boundaries and through solutions.
- `specs/003-portal-mvp/spec.md`  user API; UI is not duplicated here.
