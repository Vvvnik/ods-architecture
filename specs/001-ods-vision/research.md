# Исследование: ODS-портал MVP (001-ods-vision)

**Дата**: 2026-06-27  
**Обновлено**: 2026-06-27 (sync spec v1.5.0 — только Elasticsearch, без RAG)  
**Источники**: [spec.md](./spec.md) v1.5.0, `ods-help/requirements/`

## R-001: Хранилище данных (MVP)

**Решение**: **Только Elasticsearch** — единый кластер для метаданных портала MVP
и (post-MVP) графа кода. PostgreSQL, SQLite, ChromaDB и прочие БД **не используются**.

**Индексы MVP портала** (префикс `portal-`):

| Индекс | Назначение |
|--------|------------|
| `portal-projects` | Проекты (регистрация, источник, статус sync) |
| `portal-elements` | Элементы дерева, статусы, content_hash |
| `portal-sync-jobs` | История синхронизации |
| `portal-document-links` | Связи документ ↔ код |

**Индексы post-MVP графа** (из `canonical-graph-model.md`, тот же кластер):

| Индекс | Назначение |
|--------|------------|
| `nodes` | Сущности кода |
| `edges` | Связи |
| `files` | Метаданные файлов графа |

Изоляция данных: поле `project_id` (аналог `repo_id` в requirements) во всех индексах.

**Обоснование**:

- `code-analysis-subsystem.md` ориентирует MVP анализа на Elasticsearch.
- Один стек поиска и хранения структурных документов; меньше инфраструктуры в compose.
- Портал MVP и граф — разные индексы, один ES; переход к графу без смены БД.

**Отвергнутые варианты**:

| Вариант | Почему не выбран |
|---------|------------------|
| PostgreSQL | Вне scope ODS (spec v1.5.0) |
| SQLite | Не согласуется с целевой архитектурой ODS |
| ChromaDB | Вне scope; RAG снят (spec v1.5.0) |
| Векторные индексы ES | RAG и эмбеддинги сняты (spec v1.5.0) |

## R-002: Стек приложения MVP

**Решение**:

- **Серверная часть**: TypeScript, Node.js 22 LTS, HTTP API (Fastify или Express).
- **Интерфейс**: TypeScript, React 19, Vite.
- **Клиент Elasticsearch**: `@elastic/elasticsearch` 8.x.
- **Sync Git**: вызов системного `git` (clone/fetch) — без push/merge в MVP.
- **Рабочая копия**: том Docker `/workspace/repos/{project_id}/`.

**Обоснование**: `code-analysis-subsystem.md` — TypeScript для API/UI; C#/Roslyn — post-MVP (этап 2).

**Отвергнутые варианты**: монолит ASP.NET Core — отложен до подсистемы анализа C#.

## R-003: Синхронизация проекта и дерево

**Решение**:

1. Любой пользователь MVP регистрирует проект через экран регистрации
   (`local_path` | `git_url`) → документ в `portal-projects`. Маршрут
   `/projects/:id/admin` — метка UX, **не** RBAC.
2. Задание `sync` → clone или fetch + обход рабочей копии.
3. Массовый upsert в `portal-elements` со статусом `auto_discovered` для новых путей.
4. Удалённые на диске пути — `disk_present: false` (см. [data-model.md](./data-model.md)).

**Обоснование**: clarify Q1/Q3; без инкрементального анализа кода — только обход файловой системы.

## R-004: Документы и раздел «Документация»

**Решение**:

- Документ = текстовый файл с расширением `.md`, `.adoc`, `.txt`, `.asciidoc`.
- Раздел «Документация» — запрос к `portal-elements` с `is_document: true`.
- Связи документ ↔ код — индекс `portal-document-links` (clarify Q4).

**Отвергнутые варианты**: отдельное хранилище документов — дублирует FR-009.

## R-005: Конфликт при сохранении файла

**Решение**: оптимистичная блокировка — `content_hash` (SHA-256) в `portal-elements`
и на диске; при PUT, если hash на диске изменился → `409 Conflict` + диалог в UI.

**Обоснование**: clarify Q5; содержимое на диске, hash в ES для быстрой проверки конфликта.

## R-006: Аутентификация и экран «admin» без входа

**Решение**:

- MVP **без входа** и **без RBAC**; API и SPA в доверенной сети пилота.
- «Admin» = экран регистрации/sync (`ProjectAdminPage`, `/projects/:id/admin`),
  **не** роль пользователя (spec v1.3.0+, FR-001).
- Серверная часть: **не** подключать middleware аутентификации в MVP;
  `POST /projects` и `POST /projects/{id}/sync` без `Authorization`.
- FR-018 — post-MVP (вход + роли «читатель» / «редактор»).

**Обоснование**: согласовано с [plan.md](./plan.md) и [ui-routes.md](./contracts/ui-routes.md).

**Отвергнутые варианты**: скрытый `/admin` с basic auth — противоречит FR-006 для пилота.

## R-007: Post-MVP (дорожная карта, не в реализации 001)

| Область | Хранилище | Спецификация |
|---------|-----------|--------------|
| Граф кода | ES `nodes`, `edges`, `files` | `004-project-graph` |
| Graphify | JSON → адаптер → ES | `007-graphify-integration` |
| MCP | интеграция с внешними инструментами | `009-mcp` |
| PDF / AsciiDoc | post-MVP | `005-documentation` |

*Вне scope (v1.5.0):* RAG, эмбеддинги, этап `008-rag`, ChromaDB, PostgreSQL.

## R-008: Развёртывание

**Решение**: Docker Compose: `portal-api`, `portal-ui`, `elasticsearch` (single-node),
том `workspace`.

**Обоснование**: один ES для портала и будущего графа; без PostgreSQL и ChromaDB в compose.
