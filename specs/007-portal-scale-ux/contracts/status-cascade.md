# Контракт: каскад статуса папки и sync inheritance

**Спека**: [spec.md](../spec.md) · **Research**: R1–R3 [research.md](../research.md)

## PATCH `/api/v1/projects/{projectId}/elements/{elementId}`

Тело без изменений относительно `002`: `{ "status": ElementStatus }`.

### Семантика `007`

1. Загрузить элемент; 404 если нет / `!is_active`.
2. Если `type == file` → обновить только его (`status`, `status_manually_set=true`).
3. Если `type == directory`:
   - Если **старый** `status == not_needed` и **новый** ≠ `not_needed` → обновить
     **только** папку (FR-012).
   - Иначе → каскад (см. ниже).

### Каскад (directory)

1. Посчитать активных **потомков** (без самой папки): `project_id` +
   `is_active` + `path` prefix `folderPath + "/"`.
2. Если count потомков **> 5000** → `422` / `cascade_too_large`, сообщение на русском,
   **без** записи (папка в soft-limit count **не** входит).
3. `update_by_query` (folder + потомки): `status`, `status_manually_set: true`,
   `conflicts=abort`, `refresh=wait_for`.
4. При ошибке / failures → HTTP ошибка с русским `message`; клиент считает операцию
   неуспешной (SC-003).
5. Успех → `200` + тело элемента папки; рекомендуется доп. поле ответа:

```json
{
  "...Element fields...",
  "cascade": { "updated_count": 51 }
}
```

`updated_count` включает папку. Поле optional для UI («Обновлено N элементов»).

### Ошибки

| code | HTTP | Когда |
|------|------|--------|
| `not_found` | 404 | Нет элемента |
| `cascade_too_large` | 422 | >5000 потомков |
| `cascade_failed` | 500/503 | ES failures / abort |

## Sync: `resolveStatusOnSync`

Псевдокод:

```text
if existing?.status_manually_set:
  return existing.status

ancestor = walk parents by parent_path / path
if any ancestor with status==not_needed AND status_manually_set:
  return not_needed   # write status_manually_set=false на upsert

if existing:
  return existing.status ?? auto_found

return auto_found
```

Наследование **только** `not_needed` (не `needed`).

## Тесты приёмки (минимум)

- Папка + ≥50 потомков → `needed` / `not_needed`: все совпадают.
- Lift папки из `not_needed`: дети неизменны.
- Ручной `needed` у ребёнка + каскад родителя `not_needed`: ребёнок `not_needed`.
- Sync нового файла под `not_needed`-предком: статус `not_needed`, вручную false.
- >5000: 422, выборка статусов до/после идентична.
