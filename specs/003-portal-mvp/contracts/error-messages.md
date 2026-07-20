# Error codes → message UI

**Spec**: [spec.md](../spec.md) (FR-009)

The portal displays `message` with backend if there is one; otherwise  on `code`:

| The code | Message (RU) |
|-----|----------------|
| `source_unreachable` | Couldn't access the source. Check the URL or path. |
| `sync_in_progress` | The sync is already running, so wait for the finish. |
| `project_not_found` | The project has not been found. |
| `element_not_found` | The element was not found in the project tree. |
| `file_not_available` | The file is unavailable (possibly deleted during sync). |
| `encoding_unsupported` | The file encoding is not supported. UTF-8 is expected. |
| `not_text` | The file cannot be displayed as text. |
| `network_error` | No connection to the server. |
| `unknown` | There's been a mistake. |

## Confirmation dialogs (FR-013)

| The action | The text |
|----------|------------|
| Delete the project | Remove the project? The source can be re-imported. |

If you delete with the `sync_in_progress`  use the line from the table above.

## Sync_status tags

| What it means | The mark (RU) |
|----------|------------|
| `idle` | Waiting |
| `running` | The sync... |
| `success` | Ready |
| `failed` | This is an error |
| `partial` | Partly |

## The ElementStatus tag

| The code | The mark (RU) |
|-----|------------|
| `auto_found` | Automatically found |
| `needed` | I need to . |
| `not_needed` | No need to . |
| `found` | Found |
| `unused` | Not used |
