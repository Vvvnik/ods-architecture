# Contract: cascade of folder status and sync inheritance

**Speak**: [spec.md](../spec.md) · **Research**: R1R3 [research.md](../research.md)

## PATCH `/api/v1/projects/{projectId}/elements/{elementId}`

The body is unchanged relative to `002`: `{ "status": ElementStatus }`.

### Semantics `007`

1. Upload the element; 404 if not / `!is_active`.
2. If `type == file` → update only it (`status`, `status_manually_set=true`).
3. If `type == directory`:
   - If the old ** `status == not_needed` and the new ** ≠ `not_needed` → update
     ** only ** folder (FR-012).
   - Otherwise → cascade (see below).

### Cascade (directory)

1. Count the active ** descendants** (without the folder itself): `project_id` +
   `is_active` + `path` prefix `folderPath + "/"`.
2. If the count of descendants **> 5000** → `422` / `cascade_too_large`, the message is in Russian,
   **without** records (the soft-limit count ** does not** include).
3. `update_by_query` (folder + descendants): `status`, `status_manually_set: true`,
   `conflicts=abort`, `refresh=wait_for`.
4. When error / failures → HTTP error with Russian `message`; client counts the operation
   the failure (SC-003).
5. Success → `200` + body of the folder element; recommended add-on field:

```json
{
  "...Element fields...",
  "cascade": { "updated_count": 51 }
}
```

`updated_count` includes the folder. field optional for UI (Updated N elements).

### What happened ?

| code | HTTP | When |
|------|------|--------|
| `not_found` | 404 | No element |
| `cascade_too_large` | 422 | >5000 offspring |
| `cascade_failed` | 500/503 | ES failures / abort |

## Sync: `resolveStatusOnSync`

The code is:

```text
if existing?.status_manually_set:
  return existing.status

ancestor = walk parents by parent_path / path
if any ancestor with status==not_needed AND status_manually_set:
  return not_needed # write status_manually_set=false on upsert

if existing:
  return existing.status ?? auto_found

return auto_found
```

The inheritance is **only** `not_needed` (not `needed`).

## The admissions test (minimum)

- Fold + ≥50 descendants → `needed` / `not_needed`: all match.
- Lift folders from `not_needed`: children are unchanged.
- Hand `needed` in the child + parent cascade `not_needed`: child `not_needed`.
- Sync the new file under `not_needed`-predecessor: status `not_needed`, manually false.
- >5000: 422, the pre/post status sample is identical.
