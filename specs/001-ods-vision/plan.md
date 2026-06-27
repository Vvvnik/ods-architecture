# План реализации: ODS-портал — видение и MVP

**Ветка**: `001-ods-vision` | **Дата**: 2026-06-27 | **Спецификация**: [spec.md](./spec.md) v1.5.0

**Источник**: [spec.md](./spec.md) v1.5.0 + `ods-help/requirements/`

**Обновлено**: 2026-06-27 — синхронизация со spec v1.5.0: **только Elasticsearch**;
**регистрация без входа**; **без RAG, эмбеддингов, PostgreSQL, ChromaDB**.

## Резюме

MVP **ODS-портала** — единый веб-интерфейс: регистрация проекта, синхронизация
(sync), дерево файлов, редактор, статусы, документация, связи документ ↔ код.

**Доступ в MVP**: общий **без входа** (внутренний пилот). Регистрация и синхронизация —
через экран **«Регистрация проекта»** (маршрут `/projects/:id/admin` для настроек
существующего проекта; создание — `/` и `POST /api/v1/projects`). Это **не** роль
«администратор» и **не** защищённая зона: любой участник пилота может зарегистрировать
проект и запустить sync. Вход и разграничение прав — post-MVP (FR-018).

**Технический подход**: сервис **portal-api** (TypeScript/Node) + **portal-ui**
(React), **Elasticsearch** для структурных метаданных, **файловая система** для
рабочей копии и содержимого файлов, **Docker Compose** (api + ui + elasticsearch).
Graphify и анализ Roslyn — post-MVP; индексы графа `nodes` / `edges` / `files` —
в том же Elasticsearch позже. **RAG и векторные индексы вне scope** (spec v1.5.0).

## Технический контекст

| Параметр | Значение |
|----------|----------|
| Языки | TypeScript 5.x; Node.js 22 LTS; React 19 |
| Зависимости | Fastify (API), Vite (UI), `@elastic/elasticsearch` 8.x, simple-git или вызов git из CLI |
| Хранилище | **Elasticsearch** — индексы `portal-*` (MVP); `nodes` / `edges` / `files` (post-MVP). Файлы: `/workspace/repos/{project_id}/` |
| Тестирование | Vitest (модульные); Playwright или Cypress (сквозные — по [quickstart.md](./quickstart.md)) |
| Платформа | Linux-контейнеры (Docker Compose) |
| Тип проекта | Веб-приложение (серверная часть + интерфейс) |
| Производительность | SC-001, SC-004 — ленивое дерево + поиск в ES по `path`, `parent_path` |
| Ограничения | ES single-node для пилота; **без аутентификации и RBAC** (API/UI в доверенной сети); `/admin` — только метка экрана, не guard; без Git push/merge; русский UI |
| Масштаб | ~10 пользователей; FR-001–FR-011 |

## Проверка по конституции

| Принцип | Статус | Комментарий |
|---------|--------|-------------|
| I | ✅ | Точечное обновление plan и артефактов под spec v1.5.0 |
| II | ✅ | spec v1.5.0 согласован; plan синхронизирован |
| III–V | ✅ | plan после spec; код — только по [tasks.md](./tasks.md) |

**Повторная проверка после проектирования**: ✅

## Структура проекта

### Документация (эта фича)

```text
specs/001-ods-vision/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md             ← /speckit-tasks
```

### Исходный код (целевая структура)

```text
apps/ods-portal/
├── docker-compose.yml       # api, ui, elasticsearch
├── backend/
│   ├── src/
│   │   ├── api/
│   │   ├── services/
│   │   ├── search/          # репозитории ES, маппинги индексов
│   │   └── git/
│   └── tests/
├── frontend/
│   └── src/
└── workspace/               # рабочие копии проектов
```

**Решение по структуре**: один Elasticsearch на всю поставку ODS; портал — индексы
`portal-*`; подсистема анализа кода позже — `nodes` / `edges` / `files`.

## Фаза 0: Исследование

**Статус**: ✅ [research.md](./research.md)

Ключевые решения:

- **Только Elasticsearch** (портал + будущий граф); PostgreSQL и ChromaDB **не используются**
- Стек TypeScript; C# — post-MVP
- Sync + обход файлов → массовая индексация в `portal-elements`
- **Регистрация без входа**: экран без guard; API без middleware аутентификации
- **Без RAG** — этап `008-rag` снят (spec v1.5.0)

## Фаза 1: Проектирование

**Статус**: ✅

| Артефакт | Путь |
|----------|------|
| Модель данных (индексы ES) | [data-model.md](./data-model.md) |
| REST API | [contracts/openapi.yaml](./contracts/openapi.yaml) |
| Маршруты UI | [contracts/ui-routes.md](./contracts/ui-routes.md) |
| Быстрый старт / приёмка | [quickstart.md](./quickstart.md) |

### Связь MVP с требованиями

| FR | Проектное решение |
|----|-------------------|
| FR-001 | `POST /projects` + UI «Регистрация проекта» (`/`, `/projects/:id/admin`); **без входа/RBAC**; `portal-projects` + sync → `portal-elements` |
| FR-002–003 | рабочая копия + `content_hash` в ES |
| FR-004 | [ui-routes.md](./contracts/ui-routes.md) — меню, оглавление |
| FR-005 | поле `portal-elements.status` |
| FR-006 | без middleware аутентификации; все маршруты SPA/API без сессии |
| FR-007 | метаданные в ES, содержимое на диске |
| FR-008 | понятные ошибки API |
| FR-009 | запрос с `is_document: true` |
| FR-010 | индекс `portal-document-links` |
| FR-011 | конфликт hash → HTTP 409 |

### Регистрация проекта без входа

| Аспект | Решение |
|--------|---------|
| Термин «admin» | Только имя экрана/маршрута (`ProjectAdminPage`, `/projects/:id/admin`), **не** роль |
| UI | Список проектов (`/`) → «Новый проект»; у проекта — «Настройки / sync» на `/projects/:id/admin` |
| API | `POST /projects`, `POST /projects/{id}/sync` — без заголовка `Authorization` |
| Безопасность | Доверенная сеть пилота; FR-018 добавит вход и роли позже |
| Реализация | T035 `ProjectAdminPage`; backend **не** подключает плагин auth в MVP |

### Post-MVP (тот же Elasticsearch)

| Этап spec | Индексы / компоненты |
|-----------|----------------------|
| 2–3 | `nodes`, `edges`, `files` — граф кода |
| 6 | адаптер Graphify → ES |
| 7 | MCP, внешние инструменты (`009-mcp`) — **без RAG** |

*Снято (v1.5.0):* FR-014, FR-016, SC-005; этап `008-rag`; ChromaDB; векторные индексы.

## Фаза 2: Задачи (далее)

1. Compose: api, ui, **elasticsearch**
2. Шаблоны и маппинги индексов (`portal-*`)
3. Git sync + массовый индексатор
4. API по OpenAPI
5. Интерфейс React
6. Сквозные сценарии по quickstart

## Риски и меры

| Риск | Мера |
|------|------|
| ES слаб для транзакций | идемпотентный upsert; проверка конфликта через hash на диске |
| ~50k файлов при индексации | пакетный bulk API; ленивое дерево |
| Single-node ES | достаточно для пилота ~10 пользователей |
| Открытый `/admin` без входа | явно в scope MVP; развёртывание только во внутренней сети; FR-018 — вход позже |
