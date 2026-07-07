# Модель данных (клиент): Портал MVP

**Спека**: [spec.md](./spec.md)  
**Backend-модель**: `specs/002-domain-model/spec.md` (каноническая)

Документ описывает **только клиентское** состояние и DTO, которые портал
получает от API. Сущности `Project` / `ProjectElement` в ES определены в `002`.

## DTO с backend (зеркало `002`)

### ProjectView

| Поле | Тип | UI |
|------|-----|-----|
| `id` | string | идентификатор, маршрут |
| `name` | string | заголовок проекта |
| `source_type` | `git_url` \| `local_path` | бейдж источника |
| `source_value` | string | подпись в списке |
| `sync_status` | enum | SyncStatusBadge |
| `last_sync_at` | ISO datetime \| null | «Обновлено …» |
| `last_error_message` | string \| null | алерт при failed/partial |

### ElementView

| Поле | Тип | UI |
|------|-----|-----|
| `id` | string | выбор в дереве |
| `project_id` | string | контекст |
| `path` | string | дерево, свойства |
| `parent_path` | string \| null | навигация |
| `type` | `file` \| `directory` | иконка |
| `status` | ElementStatus | метка + селект |
| `is_active` | boolean | скрыт в дереве если false |

### ElementStatus

`auto_found` | `needed` | `not_needed` | `found` | `unused`

Русские метки — [error-messages.md](./contracts/error-messages.md) / `i18n/ru.ts`.

**Источник типов:** генерировать из
[`002-domain-model/contracts/openapi.yaml`](../002-domain-model/contracts/openapi.yaml)
(схемы `Project`, `Element`, `FileContent`, `ApiError`, `ChildrenPage`).

### FileContentView

| Поле | Тип |
|------|-----|
| `kind` | `text` \| `not_text` \| `error` |
| `content` | string (если `text`) |
| `error_code` | string (если `error`, напр. `encoding_unsupported`) |

### ChildrenPage

| Поле | Тип |
|------|-----|
| `items` | ElementView[] |
| `total` | number |
| `limit` | number |
| `offset` | number |

## Клиентское состояние (не персистентное как источник правды)

### SessionContext

| Поле | Тип | Хранение |
|------|-----|----------|
| `activeProjectId` | string \| null | React state + optional sessionStorage |
| `selectedElementId` | string \| null | React state |
| `leftPanelMode` | `files` \| `graph_stub` | React state |

### FileTreeState (на папку)

| Поле | Тип |
|------|-----|
| `expandedPaths` | Set\<string\> |
| `childrenCache` | Map\<path, ChildrenPage\> |
| `loadingPaths` | Set\<string\> |

### SyncUIState

| Поле | Тип |
|------|-----|
| `isSyncRequested` | boolean |
| `pollingProjectId` | string \| null |

## Переходы sync_status (отображение)

```text
idle → running (POST sync или начальный sync после регистрации)
running → success | failed | partial
success | failed | partial → running (повторный sync)
```

UI: при `running` — спиннер, Sync disabled; при `failed`/`partial` — показ
`last_error_message`.

## Валидация форм (клиент)

| Поле импорта | Правило |
|--------------|---------|
| Git URL | не пустой; префикс `http://`, `https://`, `git@`, или `.git` |
| Локальный путь | не пустой; подсказка «путь на сервере ODS» |

Серверная валидация — в backend `002`.
