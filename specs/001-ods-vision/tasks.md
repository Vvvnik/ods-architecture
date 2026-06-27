---
description: "Список задач MVP ODS-портала (001-ods-vision)"
---

# Задачи: ODS-портал — MVP

**Вход**: артефакты проектирования в `/specs/001-ods-vision/`

**Предварительно**: [plan.md](./plan.md) v1.5.0, [spec.md](./spec.md) v1.5.0, [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Тесты**: в spec не запрошены — отдельные test-задачи не включены. Приёмка — фаза 6 ([quickstart.md](./quickstart.md)).

**Организация**: по user stories US1–US3 (MVP). US4 (граф) — post-MVP, вне scope.

**Формат**: `[ID] [P?] [Story] Описание с путём к файлу`

- **[P]**: можно параллельно (разные файлы, нет зависимостей от незавершённых задач)
- **[Story]**: US1, US2, US3 — только в фазах user stories

## Соглашения по путям

Код приложения: `apps/ods-portal/` (см. [plan.md](./plan.md)). Артефакты spec: `specs/001-ods-vision/`.

---

## Фаза 1: Настройка (общая инфраструктура)

**Цель**: инициализация приложения portal-api + portal-ui + elasticsearch

- [ ] T001 Создать структуру каталогов `apps/ods-portal/{backend,frontend,workspace}` по [plan.md](./plan.md)
- [ ] T002 Создать `apps/ods-portal/docker-compose.yml` (сервисы portal-api, portal-ui, elasticsearch, том workspace)
- [ ] T003 Инициализировать backend в `apps/ods-portal/backend/package.json` (Node 22, TypeScript, Fastify, @elastic/elasticsearch)
- [ ] T004 Инициализировать frontend в `apps/ods-portal/frontend/package.json` (React 19, Vite, TypeScript)
- [ ] T005 [P] Добавить конфиги ESLint/Prettier в `apps/ods-portal/backend/` и `apps/ods-portal/frontend/`
- [ ] T006 [P] Добавить `apps/ods-portal/.gitignore` (node_modules, workspace/, dist/)
- [ ] T007 [P] Добавить точку входа backend `apps/ods-portal/backend/src/index.ts` и скрипт dev

---

## Фаза 2: Фундамент (блокирует все user stories)

**Цель**: Elasticsearch, каркас API, sync Git, оболочка интерфейса

**⚠️ КРИТИЧНО**: user stories начинаются только после этой фазы

- [ ] T008 Реализовать обёртку клиента ES в `apps/ods-portal/backend/src/search/client.ts`
- [ ] T009 Определить маппинги индекса в `apps/ods-portal/backend/src/search/mappings/portal-projects.ts`
- [ ] T010 [P] Определить маппинги в `apps/ods-portal/backend/src/search/mappings/portal-elements.ts`
- [ ] T011 [P] Определить маппинги в `apps/ods-portal/backend/src/search/mappings/portal-sync-jobs.ts`
- [ ] T012 [P] Определить маппинги в `apps/ods-portal/backend/src/search/mappings/portal-document-links.ts`
- [ ] T013 Создать bootstrap индексов в `apps/ods-portal/backend/src/search/bootstrap.ts` (создание portal-* при старте)
- [ ] T014 Реализовать загрузчик конфигурации в `apps/ods-portal/backend/src/config.ts` (URL ES, путь workspace, порт)
- [ ] T015 Создать сервер Fastify в `apps/ods-portal/backend/src/api/server.ts` с префиксом /api/v1 **без middleware аутентификации** (FR-006)
- [ ] T016 Добавить глобальный обработчик ошибок в `apps/ods-portal/backend/src/api/errors.ts` (FR-008, ConflictError для 409)
- [ ] T017 Реализовать sync Git/локальный путь в `apps/ods-portal/backend/src/git/sync.ts` (clone, fetch, путь рабочей копии)
- [ ] T018 Реализовать обход файловой системы в `apps/ods-portal/backend/src/services/scan.ts` (дерево, hash файлов)
- [ ] T019 Реализовать ProjectRepository в `apps/ods-portal/backend/src/search/repositories/projects.ts`
- [ ] T020 [P] Реализовать ElementRepository в `apps/ods-portal/backend/src/search/repositories/elements.ts`
- [ ] T021 [P] Реализовать SyncJobRepository в `apps/ods-portal/backend/src/search/repositories/sync-jobs.ts`
- [ ] T022 [P] Реализовать DocumentLinkRepository в `apps/ods-portal/backend/src/search/repositories/document-links.ts`
- [ ] T023 Создать клиент API в `apps/ods-portal/frontend/src/api/client.ts`
- [ ] T024 Создать каркас AppLayout в `apps/ods-portal/frontend/src/components/AppLayout.tsx` по [contracts/ui-routes.md](./contracts/ui-routes.md)
- [ ] T025 Настроить React Router в `apps/ods-portal/frontend/src/router.tsx` (маршруты из ui-routes.md)
- [ ] T026 Добавить ProjectContext в `apps/ods-portal/frontend/src/context/ProjectContext.tsx`

**Контрольная точка**: фундамент готов — можно начинать user stories

---

## Фаза 3: User Story 1 — Просмотр проекта как файлового дерева (приоритет P1) 🎯 MVP

**Цель**: регистрация проекта (без входа), sync, дерево, просмотр/редактирование текста, конфликт сохранения

**Независимая проверка**: зарегистрировать проект → sync → дерево → прочитать файл → сохранить правку ([quickstart](./quickstart.md) сценарии 1–3)

### Реализация US1

- [ ] T027 [US1] Реализовать SyncService в `apps/ods-portal/backend/src/services/sync-service.ts` (git + scan + bulk index, статус auto_discovered)
- [ ] T028 [US1] Реализовать FileService в `apps/ods-portal/backend/src/services/file-service.ts` (чтение/запись диска, content_hash, конфликт FR-011)
- [ ] T029 [US1] Реализовать TreeService в `apps/ods-portal/backend/src/services/tree-service.ts` (ленивые дочерние узлы по parent_path)
- [ ] T030 [US1] Добавить маршруты в `apps/ods-portal/backend/src/api/routes/projects.ts` (GET/POST /projects, GET /projects/:id, POST /projects/:id/sync)
- [ ] T031 [US1] Добавить маршруты в `apps/ods-portal/backend/src/api/routes/tree.ts` (GET /projects/:id/tree)
- [ ] T032 [US1] Добавить маршруты в `apps/ods-portal/backend/src/api/routes/files.ts` (GET/PUT /projects/:id/files по [openapi.yaml](./contracts/openapi.yaml))
- [ ] T033 [US1] Зарегистрировать маршруты в `apps/ods-portal/backend/src/api/server.ts`
- [ ] T034 [P] [US1] Создать ProjectListPage в `apps/ods-portal/frontend/src/pages/ProjectListPage.tsx` (форма «Новый проект», FR-001)
- [ ] T035 [P] [US1] Создать ProjectAdminPage в `apps/ods-portal/frontend/src/pages/ProjectAdminPage.tsx` (регистрация/sync **без guard и без входа**; маршрут `/admin` — только метка экрана, FR-001/FR-006)
- [ ] T036 [US1] Создать FileTreePage в `apps/ods-portal/frontend/src/pages/FileTreePage.tsx` (ленивое дерево, SC-004)
- [ ] T037 [US1] Создать FileEditorPage в `apps/ods-portal/frontend/src/pages/FileEditorPage.tsx` (просмотр/правка/сохранение)
- [ ] T038 [US1] Создать ConflictModal в `apps/ods-portal/frontend/src/components/ConflictModal.tsx` (обработка 409, FR-011)
- [ ] T056 [US1] Добавить создание нового файла: POST в `apps/ods-portal/backend/src/api/routes/files.ts`, метод в `apps/ods-portal/backend/src/services/file-service.ts`, кнопка «Новый файл» в `apps/ods-portal/frontend/src/pages/FileTreePage.tsx` (FR-003, **U1**)
- [ ] T057 [US1] Обработка неподдерживаемой кодировки: понятное сообщение в `apps/ods-portal/backend/src/services/file-service.ts` и `apps/ods-portal/frontend/src/pages/FileEditorPage.tsx` (edge case spec, **U2**)
- [ ] T058 [US1] Индикатор сбоя sync: компонент `apps/ods-portal/frontend/src/components/SyncStatusBanner.tsx` и интеграция в `apps/ods-portal/frontend/src/pages/ProjectAdminPage.tsx` при `last_sync_status=failed` ([ui-routes.md](./contracts/ui-routes.md), **U3**)

**Контрольная точка**: US1 проверяется отдельно — минимальный MVP (дерево + файлы)

---

## Фаза 4: User Story 2 — Единый интерфейс + документация (приоритет P1)

**Цель**: единая навигация, раздел «Документация», ручные связи документ ↔ код

**Независимая проверка**: проект → файл кода → связанный документ без смены приложения ([quickstart](./quickstart.md) сценарии 5–6)

### Реализация US2

- [ ] T039 [US2] Расширить запрос документов в `apps/ods-portal/backend/src/search/repositories/elements.ts` (фильтр is_document, FR-009)
- [ ] T040 [US2] Добавить маршрут в `apps/ods-portal/backend/src/api/routes/documentation.ts` (GET /projects/:id/documentation)
- [ ] T041 [US2] Добавить маршруты в `apps/ods-portal/backend/src/api/routes/links.ts` (GET/POST /projects/:id/links, FR-010)
- [ ] T042 [US2] Реализовать LinkService в `apps/ods-portal/backend/src/services/link-service.ts`
- [ ] T043 [US2] Доработать навигацию AppLayout в `apps/ods-portal/frontend/src/components/AppLayout.tsx` (Дерево | Документация, FR-004)
- [ ] T059 [US2] Добавить боковое оглавление раздела в `apps/ods-portal/frontend/src/components/SectionToc.tsx` и подключить в `apps/ods-portal/frontend/src/components/AppLayout.tsx` (FR-004, **U4**)
- [ ] T044 [US2] Создать DocumentationPage в `apps/ods-portal/frontend/src/pages/DocumentationPage.tsx`
- [ ] T045 [US2] Создать LinkDocumentDialog в `apps/ods-portal/frontend/src/components/LinkDocumentDialog.tsx`
- [ ] T046 [US2] Добавить переход к связанному документу в `apps/ods-portal/frontend/src/pages/FileEditorPage.tsx` (US2 сценарий 3)

**Контрольная точка**: US1 + US2 — единый портал с документацией

---

## Фаза 5: User Story 3 — Статусы элементов (приоритет P2)

**Цель**: ручная смена статусов; по умолчанию «найдено автоматически» при sync

**Независимая проверка**: сменить статус → обновить страницу → статус сохранён ([quickstart](./quickstart.md) сценарий 4)

### Реализация US3

- [ ] T047 [US3] Проверить установку status `auto_discovered` при sync в `apps/ods-portal/backend/src/services/sync-service.ts`
- [ ] T048 [US3] Добавить PATCH в `apps/ods-portal/backend/src/api/routes/elements.ts` (/projects/:id/elements/:elementId/status)
- [ ] T049 [US3] Реализовать обновление статуса в `apps/ods-portal/backend/src/search/repositories/elements.ts`
- [ ] T050 [US3] Создать StatusBadge в `apps/ods-portal/frontend/src/components/StatusBadge.tsx` (enum из [data-model.md](./data-model.md))
- [ ] T051 [US3] Подключить StatusBadge в `apps/ods-portal/frontend/src/pages/FileTreePage.tsx`
- [ ] T060 [US3] Фильтр дерева по статусу: параметр status в `apps/ods-portal/backend/src/services/tree-service.ts` и UI фильтра в `apps/ods-portal/frontend/src/pages/FileTreePage.tsx` (US-3, **U4**)

**Контрольная точка**: MVP портала FR-001–FR-011 выполнен

---

## Фаза 6: Полировка и сквозные задачи

**Цель**: производительность, локализация, документация, приёмка

- [ ] T052 [P] Добавить поиск по path для SC-001 в `apps/ods-portal/backend/src/search/repositories/elements.ts`
- [ ] T053 [P] Добавить модуль русских строк UI в `apps/ods-portal/frontend/src/i18n/ru.ts`
- [ ] T054 Добавить README в `apps/ods-portal/README.md` (запуск, compose, переменные окружения)
- [ ] T055 Выполнить ручную приёмку по [quickstart.md](./quickstart.md) и зафиксировать в `apps/ods-portal/VALIDATION.md`

---

## Зависимости и порядок выполнения

### Зависимости фаз

- **Фаза 1 (настройка)**: без зависимостей
- **Фаза 2 (фундамент)**: после фазы 1 — **блокирует все user stories**
- **US1 (фаза 3)**: после фазы 2
- **US2 (фаза 4)**: после фазы 2; интеграция с FileEditorPage из US1
- **US3 (фаза 5)**: после фазы 2; интеграция с FileTreePage из US1
- **Фаза 6 (полировка)**: после фаз 3–5

### Зависимости user stories

| Story | Зависит от | Независимая проверка |
|-------|------------|----------------------|
| US1 | Фундамент | Да — дерево + файлы |
| US2 | Фундамент, US1 FileEditor | Да — документы + связи после US1 |
| US3 | Фундамент, US1 дерево | Да — статусы на дереве |

### Возможности параллельной работы

**Фаза 1**: T005, T006, T007 параллельно  
**Фаза 2**: T010–T012, T020–T022 параллельно после T008–T009  
**Фаза 3**: T034, T035 параллельно; маршруты T030–T032 последовательно после сервисов  
**Фаза 4**: T043–T046, T059 частично параллельно после T039–T042  
**Фаза 5**: T060 после T051; backend T047–T049 может параллельно с US2 frontend

---

## Пример параллельной работы: User Story 1

```bash
# Сервисы backend (последовательно: T027 → T028 → T029)

# Страницы frontend параллельно после готовности маршрутов:
# T034: apps/ods-portal/frontend/src/pages/ProjectListPage.tsx
# T035: apps/ods-portal/frontend/src/pages/ProjectAdminPage.tsx
```

---

## Стратегия реализации

### Сначала MVP (только User Story 1)

1. Фаза 1 — настройка  
2. Фаза 2 — фундамент  
3. Фаза 3 — User Story 1 (включая T056–T058)  
4. **СТОП** — проверка [quickstart](./quickstart.md) сценарии 1–3  
5. Демо: регистрация, дерево, правка файла

### Пошаговая поставка (полный MVP портала)

1. Настройка + фундамент  
2. US1 → проверка  
3. US2 → проверка (единый UI + документация)  
4. US3 → проверка (статусы + фильтр)  
5. Фаза 6 — полировка + полный quickstart

### Вне scope (post-MVP — не реализовывать в этих задачах)

- User Story 4 (граф зависимостей), Graphify
- RAG, эмбеддинги, этап `008-rag`
- Аутентификация (FR-018)
- Git push/merge
- Индексы `nodes`, `edges`, `files` для графа кода

---

## Примечания

- Хранилище: **только Elasticsearch** (индексы `portal-*`); см. [research.md](./research.md) R-001
- Содержимое файлов — диск в `apps/ods-portal/workspace/`
- Контракт API: [contracts/openapi.yaml](./contracts/openapi.yaml)
- Задачи **U1–U4** (analyze): T056 (новый файл), T057 (кодировка), T058 (сбой sync), T059–T060 (оглавление, фильтр статусов)
- **Всего задач: 60** (настройка 7, фундамент 19, US1 15, US2 9, US3 6, полировка 4)
