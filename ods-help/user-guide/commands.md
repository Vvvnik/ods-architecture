# Команды Spec Kit

## Команды для проектирования

* /speckit-constitution - задать конституцию проекта;
* /speckit-specify - создать/обновить спецификацию spec.md;
* /speckit-clarify - уточнить спецификацию – уточнение спецификации для /speckit-implement;
* /speckit-plan - составить план реализации – план на /speckit-implement;
* /speckit-tasks - сгенерировать задачи – задачи на /speckit-implement;
* /speckit-analyze - проверить согласованность – использовать только для отчёта;
* /speckit-checklist - сгенерировать чеклист – использовать только для отчёта.

## Команды для реализации

* /speckit-implement - выполнить задачи.

* /speckit-converge - дополнить задачи; выполнять всегда после implement для того, чтобы проверить, что все задачи выполнены.

Руководство по обратной связи после implement (ошибки, спеки, что куда записывать): [implement-feedback-guide.md](./implement-feedback-guide.md).

## Дополнительные команды

* /speckit-taskstoissues - преобразовать задачи в issues.

**Что делает /speckit-taskstoissues**

Берёт строки из specs/*/tasks.md и создаёт GitHub Issues вида T048: Исправить FileViewer….

Нужен, когда:

– работаете через трекер GitHub (доска, assignee, PR ↔ – issue);
– задачи делят несколько человек;
– хотите историю в репозитории, а не только в tasks.md.

Не нужен, когда:

– чините 1–2 бага сами в Cursor;
– сразу идёте converge → implement в одной сессии.

## Запуск сервисов

```bash
docker compose -f docker/docker-compose.dev.yml up -d elasticsearch
cd backend && npm run dev          # :3000
cd frontend && npm run dev         # :5173
```

Откройте http://localhost:5173/projects — импорт через /import (локальный путь: docker/fixtures/repos/sample-project).

## Следующие шаги (Завершение MVP)

Phase 8 завершена (SC-006)

| Checklist | Total | Completed | Incomplete | Status |
|-----------|-------|-----------|------------|--------|
| requirements.md | 14 | 14 | 0 | PASS |

Что сделано:
- [x] Docker / nginx (T040–T042)

- frontend/nginx/default.conf — proxy /api/ → backend:3000, SPA try_files
- frontend/Dockerfile — multi-stage: Vite build → nginx:1.27-alpine
- frontend/.dockerignore
- docker/docker-compose.dev.yml — healthchecks для backend и frontend, depends_on: service_healthy

UI polish (T043–T044)

- frontend/src/styles/app.module.css — shell layout, responsive <1280px
- frontend/src/components/ConnectionBanner.tsx — polling /api/v1/health, кнопка «Повторить»
- Интеграция в AppLayout

Контракт (T047)

api-consumer.yaml синхронизирован с openapi.yaml (requestBody.required: true на PATCH)

Приёмка (T045)

```bash
docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
curl http://localhost:8080/api/v1/health   # {"status":"ok","elasticsearch":"ok"}
Проверено через nginx: регистрация проекта (/repos/sample-project), sync, дерево, чтение src/hello.ts.
```

## Запуск SC-006

```bash
cp docker/.env.example docker/.env
docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
```

Открыть http://localhost:8080 → Импорт → local_path = /repos/sample-project → sync → проект → файл.

Не сделано:

T046 (Playwright e2e) — опционально, оставлен [ ]

Задачи T040–T045, T047 отмечены [x] в specs/003-portal-mvp/tasks.md.