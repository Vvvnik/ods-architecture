# Research: Портал MVP

**Дата**: 2026-07-08  
**Спека**: [spec.md](./spec.md)

## R1. Фреймворк UI

**Decision:** React 18 + Vite 5 + TypeScript.

**Rationale:** Конституция MVP; Vite proxy для `/api` в dev.

## R2. Просмотр кода (read-only)

**Decision:** CodeMirror 6, `readOnly: true`.

## R3. Загрузка данных

**Decision:** TanStack Query; инвалидация после sync.

## R4. Sync в UI

**Decision:** Polling `GET /projects/{id}` каждые 2 с при `sync_status=running`;
обработка `409 sync_in_progress` из `002`.

## R5. Дерево

**Decision:** Lazy load + `limit`/`offset` по `002` FR-009.

## R6. Стилизация

**Decision:** CSS Modules, без тяжёлого UI-kit.

## R7. API-контракт

**Decision:** Канон — [`002/contracts/openapi.yaml`](../002-domain-model/contracts/openapi.yaml).
Зеркало потребителя — `003/contracts/api-consumer.yaml` (без `/health`).
При расхождении править consumer или обновлять оба с `/speckit-analyze`.

**Rationale:** План `002` зафиксирован; типы frontend из одного OpenAPI.

**Alternatives:** Дублировать схемы вручную без openapi-typescript — отклонено
(риск drift).

## R8. Docker и nginx

**Decision:**

- Dev ES only: `docker compose -f docker/docker-compose.dev.yml up -d`
- Полная связка: `--profile full` (ES + backend + frontend)
- Frontend: multi-stage build → **nginx alpine**; `default.conf` проксирует
  `/api/v1` → `http://backend:3000/api/v1`
- Статика SPA: `try_files $uri /index.html`

**Rationale:** Единый каталог `docker/` для `002` и `003`; порт **8080** для UI,
**3000** для прямого API (quickstart `002`).

**Alternatives:** Vite preview в контейнере — хуже для prod-like пилота.

## R9. Локальная разработка без Docker

**Decision:** Терминал 1: ES (`docker compose ... up -d elasticsearch`); терминал 2:
`cd backend && npm run dev`; терминал 3: `cd frontend && npm run dev` (Vite proxy).

**Rationale:** Быстрая итерация UI; тот же API что в compose.

## R10. E2E

**Decision:** Playwright против `http://localhost:8080` после `--profile full up`.

**Rationale:** Проверка SC-001/SC-006 в реальной связке nginx → backend → ES.

## R11. Удаление проекта в UI (инкремент 2026-07-08)

**Decision:** Кнопка «Удалить» в строке `ProjectListPage`; нативный `window.confirm`
или лёгкий модальный компонент `DeleteProjectDialog` с фиксированным текстом FR-013.

**Поток:**

1. Клик «Удалить» → confirm: *«Удалить проект? Источник можно будет импортировать заново.»*
2. OK → `DELETE /api/v1/projects/{id}` (TanStack Query `useMutation`)
3. Успех → `invalidateQueries(['projects'])`; если `activeProjectId === id` →
   `navigate('/projects')` + сброс контекста
4. 409 → сообщение `sync_in_progress`; 404 → обновить список

**Rationale:** FR-013, US6; backend готов (`002` B5); без удаления файлов (FR-008).

**Alternatives:** Soft-delete в UI — вне scope; удаление из меню Workspace — отклонено
(основной сценарий — список `/projects`).
