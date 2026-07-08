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



```bash
docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
curl http://localhost:8080/api/v1/health   # {"status":"ok","elasticsearch":"ok"}
Проверено через nginx: регистрация проекта (/repos/sample-project), sync, дерево, чтение src/hello.ts.
```

## Пункт 1: DELETE проекта 

Спеки: сначала 002, потом 003 (backend блокирует frontend).

1. /speckit-specify   на specs/002-domain-model
   → дописать FR: DELETE /projects/{id}, каскад ES
2. /speckit-plan      на specs/002-domain-model
   → openapi.yaml, data-model
3. /speckit-tasks     на specs/002-domain-model
4. /speckit-implement на specs/002-domain-model
   → backend
5. /speckit-converge  на specs/002-domain-model
6. /speckit-specify   на specs/003-portal-mvp
   → FR: кнопка «Удалить», confirm, редирект
7. /speckit-tasks     на specs/003-portal-mvp
8. /speckit-implement на specs/003-portal-mvp
   → frontend
9. /speckit-converge  на specs/003-portal-mvp