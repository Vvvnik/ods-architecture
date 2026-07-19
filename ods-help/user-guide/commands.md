# Команды Spec Kit

## Команды для проектирования

* /speckit-constitution - задать конституцию проекта;
* /speckit-specify - создать/обновить спецификацию spec.md;

* /speckit.agent-context.update - обновить ссылку на plan в `.cursor/rules/specify-rules.mdc` (блок `SPECKIT START`/`END`) из `.specify/feature.json`; **не** меняет постоянную часть rule. Запускать вручную, если после `/speckit-plan` путь не подставился; обычно хук делает это сам после `/speckit-specify` и `/speckit-plan`. Пока у фичи нет `plan.md`, путь может не появиться или откатиться на предыдущий plan — тогда ориентир: `feature.json` → `{feature_directory}/plan.md`.
* /speckit-clarify - уточнить/проверить несогласованность спецификации обязателен для уточнения расхождений спецификации;
* /speckit-plan - составить план реализации – план на /speckit-implement;
* /speckit-tasks - сгенерировать задачи – задачи на /speckit-implement;
* /speckit-analyze - проверить согласованность – использовать для отчёта и посмотреть проблемы в спецификации задач и плана;
* /speckit-checklist - сгенерировать чеклист – использовать только для отчёта.

## Команды для реализации

* /speckit-implement - выполнить задачи.

* /speckit-converge - дополнить задачи; выполнять всегда после implement для того, чтобы проверить, что все задачи выполнены.

Руководство по обратной связи после implement (ошибки, спеки, что куда записывать): [implement-feedback-guide.md](./implement-feedback-guide.md).

## Дополнительные команды

* /speckit-taskstoissues - преобразовать задачи в issues.

**Что делает /speckit-taskstoissues:**

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
7. /speckit-plan      на specs/003-portal-mvp
8. /speckit-tasks     на specs/003-portal-mvp
9. /speckit-implement на specs/003-portal-mvp
   → frontend
10. /speckit-converge  на specs/003-portal-mvp

## Пункт 2: Анализ кода (005)

Спеки: `005-code-analysis` (backend + parsers), потребитель графа — `006-project-graph`.

Предусловие: MVP `002`/`003` (sync, workspace, DELETE).

```bash
docker compose -f docker/docker-compose.dev.yml --profile full up -d
```

Рекомендуемый порядок implement:

1. `/speckit-implement specs/005-code-analysis` — US1–US4 (детектор, модали, оркестратор, инкремент)
2. `/speckit-implement specs/005-code-analysis` — US5 (парсеры: typescript → csharp → python → cpp)
3. `/speckit-implement specs/005-code-analysis` — Phase 8 (DELETE каскад, api-consumer, quickstart)
4. `/speckit-converge specs/005-code-analysis`
5. `/speckit-implement specs/006-project-graph` — по `tasks.md` (ingest + API + UI графа)
6. `/speckit-converge specs/006-project-graph`

Проверка анализа (API): `specs/005-code-analysis/quickstart.md`  
E2E UI (опционально): `cd frontend && npm run test:e2e` (стек на `:8080`, `E2E_PROJECT_PATH=/repos/sample-project`)

## Пункт: Scale pipeline (010)

После `009`: hardening под large repo — один file inventory на sync, progress UI
(этап + парсер N/M), parallel parsers, timing gates.

- Quickstart: `specs/010-scale-pipeline/quickstart.md`
- Fixture: `./docker/fixtures/repos/setup-fixtures.sh --demo` → `/repos/large-repo`
- Closing smoke на **внешнем** `local_path` — **не** коммитить эталон в ODS
- `skipIf` без fixture ≠ PASS (см. `contracts/scale-acceptance.md`)
