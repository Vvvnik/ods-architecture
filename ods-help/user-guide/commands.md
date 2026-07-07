# Команды Spec Kit

## Команды для проектирования

* /speckit-constitution - задать конституцию проекта;
* /speckit-specify - создать/обновить спецификацию spec.md;
* /speckit-clarify - уточнить спецификацию;
* /speckit-plan - составить план реализации;
* /speckit-tasks - сгенерировать задачи;
* /speckit-analyze - проверить согласованность;
* /speckit-checklist - сгенерировать чеклист.

## Команды для реализации

* /speckit-implement - выполнить задачи.

## Дополнительные команды

* /speckit-converge - дополнить задачи;
* /speckit-taskstoissues - преобразовать задачи в issues.

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