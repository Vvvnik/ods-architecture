# Tasks: Портал MVP (frontend)

**Input**: `specs/003-portal-mvp/` — plan.md, spec.md, data-model.md, contracts/, quickstart.md

**Prerequisites**: plan.md ✅, spec.md ✅; backend checkpoint'ы **B1–B4** из `specs/002-domain-model/tasks.md`

**Tests**: Не запрошены в spec; приёмка — quickstart.md (SC-001, SC-006); Playwright — в Polish (опционально).

**Organization**: По user stories spec.md; зависит от `002-domain-model`.

**Согласование с `002`**: см. [Согласование с backend](#согласование-с-backend-002-domain-model).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: можно параллельно
- **[Story]**: US1–US5 из spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Инициализация `frontend/` и dev-окружения

- [ ] T001 Создать структуру `frontend/` по plan.md (`src/`, `public/`, `package.json`, `vite.config.ts`, `tsconfig.json`)
- [ ] T002 Инициализировать `frontend/package.json`: React 18, Vite 5, React Router 6, TanStack Query 5, CodeMirror 6, TypeScript 5
- [ ] T003 [P] Настроить `frontend/vite.config.ts` — proxy `/api` → `http://localhost:3000`
- [ ] T004 [P] Настроить `frontend/tsconfig.json` и `frontend/tsconfig.node.json`
- [ ] T005 [P] Создать `frontend/index.html` и `frontend/src/main.tsx` (React root)
- [ ] T006 [P] Добавить скрипты в `frontend/package.json`: `dev`, `build`, `preview`, `lint`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: API-клиент, роутинг, layout, i18n — блокирует все user stories

**⚠️ CRITICAL**: Требует **B1** от `002` для живого API (или mock по OpenAPI до B1)

- [ ] T007 Сгенерировать типы: `npx openapi-typescript specs/002-domain-model/contracts/openapi.yaml -o frontend/src/api/types.ts`
- [ ] T008 Реализовать `frontend/src/api/client.ts` — baseURL `/api/v1`, fetch-обёртка, парсинг ApiError
- [ ] T009 [P] Реализовать `frontend/src/i18n/ru.ts` — метки статусов и коды ошибок по `contracts/error-messages.md`
- [ ] T010 [P] Реализовать `frontend/src/api/projects.ts` и `frontend/src/api/elements.ts` — методы FR-011 (list, register, get, sync, children, content, patch status)
- [ ] T011 Реализовать `frontend/src/app/router.tsx` — маршруты по `contracts/ui-routes.md`
- [ ] T012 Реализовать `frontend/src/layouts/AppLayout.tsx` — каркас с MainMenu
- [ ] T013 [P] Реализовать `frontend/src/components/MainMenu.tsx` — пункты меню (Импорт, Проекты, Sync, Файловая структура, Граф)
- [ ] T014 [P] Реализовать `frontend/src/hooks/useProjects.ts` и `frontend/src/providers/QueryProvider.tsx` (TanStack Query)
- [ ] T015 Реализовать `frontend/src/context/SessionContext.tsx` — `activeProjectId`, `selectedElementId`, `leftPanelMode`

**Checkpoint F1**: `npm run dev` → роуты открываются; API вызовы к backend на :3000 (после B1)

---

## Phase 3: User Story 1 — Импорт и список проектов (Priority: P1) 🎯 MVP

**Goal**: Регистрация репозитория и список с sync_status / ошибками

**Independent Test**: Импорт → проект в списке; повторный импорт → тот же проект (SC-001 часть 1)

**Depends on 002**: **B1**

### Implementation for User Story 1

- [ ] T016 [US1] Реализовать `frontend/src/pages/ImportPage.tsx` — форма Git URL / local path, валидация клиента (data-model.md)
- [ ] T017 [US1] Подключить регистрацию в `ImportPage.tsx` через `api/projects.ts` + redirect на `/projects/:id`
- [ ] T018 [US1] Реализовать `frontend/src/pages/ProjectListPage.tsx` — карточки: name, source, sync_status, last_sync_at, last_error_message
- [ ] T019 [P] [US1] Реализовать `frontend/src/components/SyncStatusBadge.tsx` — русские метки sync_status
- [ ] T020 [US1] Обработка идемпотентности: повторный импорт → redirect на существующий проект без дубликата в UI

**Checkpoint C1**: Import + Projects без рабочего места

---

## Phase 4: User Story 2 — Открытие проекта и sync (Priority: P1)

**Goal**: Выбор проекта, рабочий экран, sync с блокировкой и polling

**Independent Test**: Открыть проект → sync → статус обновляется без падения UI

**Depends on 002**: **B2**

### Implementation for User Story 2

- [ ] T021 [US2] Реализовать `frontend/src/pages/WorkspacePage.tsx` — каркас трёх панелей (пустой)
- [ ] T022 [US2] Реализовать `frontend/src/hooks/useSync.ts` — POST sync, polling `GET /projects/:id` каждые 2 с при `running`
- [ ] T023 [US2] Подключить Sync в `MainMenu.tsx` — активен только при `activeProjectId` на WorkspacePage
- [ ] T024 [US2] Блокировка Sync при `running`; обработка 409 `sync_in_progress` (тост/алерт на русском)
- [ ] T025 [US2] Навигация: клик по проекту в `ProjectListPage.tsx` → `/projects/:projectId` + set `activeProjectId`

**Checkpoint C2**: Sync UI работает; дерево ещё может быть заглушкой

---

## Phase 5: User Story 3 — Трёхпанельный просмотр файлов (Priority: P1)

**Goal**: Дерево | read-only файл | свойства; ленивая пагинация; not_text / encoding errors

**Independent Test**: Раскрыть папку → открыть `.ts` → текст в центре, путь и статус справа (SC-001)

**Depends on 002**: **B2**, **B3**

### Implementation for User Story 3

- [ ] T026 [US3] Реализовать `frontend/src/layouts/WorkspaceLayout.tsx` — три колонки ≥1280px (25% / flex / 280px)
- [ ] T027 [US3] Реализовать `frontend/src/hooks/useFileTree.ts` — кэш детей, expandedPaths, пагинация offset/limit
- [ ] T028 [US3] Реализовать `frontend/src/components/FileTree.tsx` — lazy load, кнопка «Загрузить ещё», скрытие `is_active=false`
- [ ] T029 [US3] Реализовать `frontend/src/components/FileViewer.tsx` — CodeMirror read-only; placeholder «Выберите файл»
- [ ] T030 [US3] Реализовать `frontend/src/components/ElementProperties.tsx` — path, type, status (read-only в этой фазе)
- [ ] T031 [US3] Загрузка содержимого в `FileViewer.tsx` — `kind=text|not_text|error`; сообщения для бинарных и `encoding_unsupported`
- [ ] T032 [US3] Обновление дерева после sync: инвалидация query в `useFileTree.ts`; файл удалён → сообщение в центре

**Checkpoint C3**: SC-001 и SC-003 выполнимы через UI

---

## Phase 6: User Story 4 — Главное меню (Priority: P1)

**Goal**: Единое меню; все пункты ведут на экран или заглушку; без auth

**Independent Test**: Цепочка импорт → список → проект → файл без терминала (SC-002)

**Depends on 002**: **B1** (меню частично готово в Phase 2)

### Implementation for User Story 4

- [ ] T033 [US4] Реализовать `frontend/src/pages/GraphStubPage.tsx` — заглушка «Доступно в этапах 5–7» (`005`–`007`)
- [ ] T034 [US4] Довести `MainMenu.tsx` — активные состояния, переходы `/import`, `/projects`, `/projects/:id`, `/graph`
- [ ] T035 [US4] Реализовать `frontend/src/pages/NotFoundPage.tsx` — русское сообщение 404
- [ ] T036 [US4] Redirect `/` → `/projects` в `frontend/src/app/router.tsx`

**Checkpoint C4**: SC-002 — нет мёртвых ссылок в меню

---

## Phase 7: User Story 5 — Смена статуса (Priority: P2)

**Goal**: Селект статуса в правой панели; русские метки; сохранение после refresh

**Independent Test**: Сменить статус → F5 → значение на месте

**Depends on 002**: **B4**

### Implementation for User Story 5

- [ ] T037 [US5] Дополнить `frontend/src/components/ElementProperties.tsx` — селект ElementStatus (5 значений)
- [ ] T038 [US5] Вызов PATCH status в `frontend/src/api/elements.ts` + optimistic update / invalidate
- [ ] T039 [US5] Отображение русских меток статусов из `i18n/ru.ts` в дереве и свойствах

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Docker, nginx, приёмка full stack, SC-006

- [ ] T040 [P] Создать `frontend/nginx/default.conf` — proxy `/api/` → `backend:3000`, SPA `try_files`
- [ ] T041 [P] Создать `frontend/Dockerfile` — build Vite → nginx alpine
- [ ] T042 Проверить сервис `frontend` в `docker/docker-compose.dev.yml` (профиль `full`, порт 8080)
- [ ] T043 [P] Стили: `frontend/src/styles/` — CSS Modules, layout ≥1280px, деградация <1280px (usable)
- [ ] T044 [P] Компонент `frontend/src/components/ConnectionBanner.tsx` — потеря связи с backend, retry
- [ ] T045 Прогнать `specs/003-portal-mvp/quickstart.md` режим full stack (SC-001, SC-006)
- [ ] T046 [P] Playwright e2e: `frontend/tests/e2e/mvp.spec.ts` — импорт → sync → открыть файл (опционально)
- [ ] T047 Сверить `specs/003-portal-mvp/contracts/api-consumer.yaml` с `002/contracts/openapi.yaml` после финального API

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → **User Stories (3–7)** → **Polish (8)**
- US2–US5 зависят от US1 (контекст проекта)
- US3 зависит от US2 (WorkspacePage)
- US5 зависит от US3 (ElementProperties)

### Зависимости от `002` (checkpoint'ы)

| Фаза 003 | Checkpoint 002 | Минимум API |
|----------|----------------|-------------|
| Phase 2–3 (US1) | **B1** | register, list, get project |
| Phase 4 (US2) | **B2** | sync, polling sync_status |
| Phase 5 (US3) | **B2+B3** | children, content, get element |
| Phase 7 (US5) | **B4** | PATCH status |
| Phase 8 | **002 Polish** | backend в compose healthy |

### User Story Dependencies (внутри 003)

| Story | Можно после | Independent Test |
|-------|-------------|------------------|
| US1 | Phase 2 + B1 | Import + list |
| US2 | US1 + B2 | Sync + workspace shell |
| US3 | US2 + B3 | 3 panels + file |
| US4 | US1 (частично Phase 2) | Menu + stub |
| US5 | US3 + B4 | Status select |

### Parallel Opportunities

- Phase 1: T003–T006
- Phase 2: T009–T010, T013–T014 после T008
- Phase 3: T019 параллельно T018
- Phase 8: T040, T041, T043, T044, T046

### Parallel Example: US3

```bash
# После T026:
Task T028: FileTree.tsx
Task T029: FileViewer.tsx
Task T030: ElementProperties.tsx (read-only часть)
```

---

## Согласование с backend (`002-domain-model`)

```
002 Phase 1–2 (Foundation)
    ↓
002 US1 → B1 ──→ 003 Phase 2–3 (API client, Import, Projects)
    ↓
002 US2 → B2 ──→ 003 US2 (Sync) + US3 (FileTree)
    ↓
002 US3 → B3 ──→ 003 US3 (FileViewer)
    ↓
002 US4 → B4 ──→ 003 US5 (Status)
    ↓
002 Polish + 003 Polish → docker compose --profile full → SC-006
```

**Параллельная работа:** после **002 B1** frontend может идти вперёд с mock-server по OpenAPI, пока backend доделывает sync (B2).

**Единая приёмка MVP:** SC-006 `003` = SC-005 `002` через UI; проверка в T045.

---

## Implementation Strategy

### MVP First (критический путь)

1. Дождаться **002 B1** → US1 (импорт/список)
2. **002 B2** → US2 + US3 (рабочее место, дерево, файл) — **основной MVP**
3. US4 (меню/заглушка) — параллельно с US3
4. **002 B4** → US5
5. Polish обеих спек → full compose

### Incremental Delivery

| Инкремент | 002 | 003 | Результат |
|-----------|-----|-----|-----------|
| 1 | B1 | US1 | Импорт в браузере |
| 2 | B2 | US2–US3 | Просмотр кода |
| 3 | B4 | US5 | Статусы |
| 4 | Polish | Polish | Пилот на :8080 |

---

## Notes

- Канон API: `specs/002-domain-model/contracts/openapi.yaml`
- Не хранить метаданные проекта в localStorage как source of truth (FR-001)
- Sync: polling, не WebSocket (research.md R4)
- Обновить текст заглушки графа в `contracts/ui-routes.md` при расхождении с spec (этапы 5–7)
