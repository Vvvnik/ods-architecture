# Data model (client): MVP portal

**Spec**: [spec.md]
**Backend-model**: `specs/002-domain-model/spec.md` (canonical)

The document describes **only the client** status and DTO that the portal
The essence of `Project` / `ProjectElement` in ES is defined in `002`.

## DTO with backend (mirror `002`)

### ProjectView

| The field | Type of the | UI |
|------|-----|-----|
| `id` | string | Identifier, route |
| `name` | string | Title of the project |
| `source_type` | `git_url` \| `local_path` | The source badge |
| `source_value` | string | Signature in the list |
| `sync_status` | enum | SyncStatusBadge |
| `last_sync_at` | ISO datetime \| null | It's been updated. |
| `last_error_message` | string \| null | Alert for failed/partial |

### ElementView

| The field | Type of the | UI |
|------|-----|-----|
| `id` | string | The choice in the tree |
| `project_id` | string | context |
| `path` | string | tree, properties |
| `parent_path` | string \| null | navigation |
| `type` | `file` \| `directory` | The icon |
| `status` | ElementStatus | Tag + set |
| `is_active` | boolean | hidden in the tree if false |

### ElementStatus

`auto_found` | `needed` | `not_needed` | `found` | `unused`

Localized labels are defined by [error-messages.md](./contracts/error-messages.md),
`i18n/en.ts`, and `i18n/ru.ts`; `en` is the default locale.

**Source of types:** generated from
[`002-domain-model/contracts/openapi.yaml`](../002-domain-model/contracts/openapi.yaml)
(schemes `Project`, `Element`, `FileContent`, `ApiError`, `ChildrenPage`)

### FileContentView

| The field | Type of the |
|------|-----|
| `kind` | `text` \| `not_text` \| `error` |
| `content` | string (if `text`) |
| `error_code` | string (if `error`, e.g. `encoding_unsupported`) |

### ChildrenPage

| The field | Type of the |
|------|-----|
| `items` | ElementView[] |
| `total` | number |
| `limit` | number |
| `offset` | number |

## Client status (not persistent as a source of truth)

### SessionContext

| The field | Type of the | Storage |
|------|-----|----------|
| `activeProjectId` | string \| null | React state + optional sessionStorage |
| `selectedElementId` | string \| null | React state |
| `leftPanelMode` | `files` \| `graph_stub` | React state |

### FileTreeState (on the folder)

| The field | Type of the |
|------|-----|
| `expandedPaths` | Set\<string\> |
| `childrenCache` | Map\<path, ChildrenPage\> |
| `loadingPaths` | Set\<string\> |

### SyncUIState

| The field | Type of the |
|------|-----|
| `isSyncRequested` | boolean |
| `pollingProjectId` | string \| null |

Sync state is owned by the Projects context. Sync toasts and modals are
project-scoped; `ConnectionBanner` remains global.

### DeleteProjectUIState

| The field | Type of the | Notes from the |
|------|-----|------------|
| `pendingDeleteProjectId` | string \| null | Opened confirm for this id |
| `isDeleting` | boolean | mutation in flight |

The deleting action ** not** is stored in sessionStorage; after success  invalidate
A list of projects from the API.

## Sync_status transitions (image)

```text
idle → running (POST sync or initial sync after registration)
running → success | failed | partial
success | failed | partial → running (repeated sync)
```

UI: Prize `running` — spinner, Sync disabled; Prize `failed`/`partial` —
`last_error_message`.

## Validation of forms (client)

| Import field | The rule |
|--------------|---------|
| Git URL | Not empty; prefix `http://`, `https://`, `git@`, or `.git` |
| Local route | not empty; a hint of way on the ODS server |

Server validation  in the backend `002`.
