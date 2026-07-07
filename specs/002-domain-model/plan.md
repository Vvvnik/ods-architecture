# План реализации: Модель данных MVP (backend)

**Ветка**: `002-domain-model` | **Дата**: 2026-07-07 | **Спека**: [spec.md](./spec.md)

**Вход**: `specs/002-domain-model/spec.md`

**Зависимости**: `specs/001-ods-vision/spec.md`  
**Потребитель API**: `specs/003-portal-mvp/spec.md`

## Summary

Backend-сервис ODS MVP на **TypeScript (Node.js 20 + Fastify)** хранит метаданные
проектов и дерева файлов в **Elasticsearch** (JSON-документы), рабочие копии
репозиториев — на **filesystem**. Реализует REST API `/api/v1` для регистрации,
sync, дерева с пагинацией, read-only чтения файлов и смены статусов. Sync —
асинхронный (фоновая задача в процессе), без параллельного sync одного проекта.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS

**Primary Dependencies**: Fastify 4, `@elastic/elasticsearch` 8, `simple-git`,
`uuid`, `zod` (валидация), `pino` (логи)

**Storage**: Elasticsearch 8.x (индексы `ods-projects`, `ods-elements`);
filesystem `DATA_ROOT/working-copies/{projectId}/`

**Testing**: Vitest (unit), supertest + Fastify inject (API integration);
testcontainers или docker ES для интеграционных тестов (опционально в tasks)

**Target Platform**: Linux/macOS контейнер Docker; локально — `npm run dev`

**Project Type**: HTTP API backend (`backend/`)

**Performance Goals**: SC-004 — первая страница детей папки (≤100) < 2 с;
sync репозитория до 1000 файлов — приемлемо для пилота (< 60 с)

**Constraints**: Без auth; русские сообщения об ошибках; read-only файлов;
`.git` исключён из дерева; идемпотентность sync

**Scale/Scope**: Пилотная команда, десятки проектов, до ~10k файлов на проект

## Constitution Check

*GATE: до Phase 0 и после Phase 1.*

| Требование | Статус |
|------------|--------|
| TypeScript backend MVP | ✅ |
| JSON метаданные в ES | ✅ |
| Filesystem для WC | ✅ |
| Без парсеров/графа/RAG | ✅ |
| Без UI | ✅ |
| Согласование с `003` API | ✅ `contracts/openapi.yaml` = канон |
| Код после plan/tasks | ✅ |

**Post-design:** OpenAPI и ES-схемы зафиксированы; `003/api-consumer.yaml`
должен совпадать (приоритет у `002`).

## Project Structure

### Documentation (this feature)

```text
specs/002-domain-model/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi.yaml          # канонический REST API
│   └── elasticsearch-indices.md
└── tasks.md                  # /speckit-tasks
```

### Source Code

```text
backend/
├── src/
│   ├── index.ts              # bootstrap Fastify
│   ├── config.ts             # env: ES_URL, DATA_ROOT, PORT
│   ├── domain/
│   │   ├── project.ts
│   │   ├── element.ts
│   │   └── errors.ts         # коды ApiError
│   ├── repositories/
│   │   ├── project.repository.ts
│   │   └── element.repository.ts
│   ├── services/
│   │   ├── project.service.ts
│   │   ├── sync.service.ts
│   │   ├── workspace.service.ts   # git clone / local scan
│   │   └── file-content.service.ts
│   ├── api/
│   │   ├── routes/
│   │   │   ├── projects.ts
│   │   │   └── elements.ts
│   │   └── plugins/error-handler.ts
│   └── infra/
│       └── elasticsearch.ts  # client + index bootstrap
├── tests/
│   ├── unit/
│   └── integration/
├── Dockerfile
├── package.json
└── tsconfig.json

docker/
├── docker-compose.dev.yml    # ES (default); профиль full — backend + frontend
├── .env.example
└── fixtures/repos/           # тестовые git-репозитории для пилота

data/                         # gitignored: WC + ES volumes (локально)
└── working-copies/
```

**Structure Decision**: Один пакет `backend/`; ES и WC через репозитории.
Пилотный **полный стек** (ES + backend + frontend) — `docker/docker-compose.dev.yml`
(профиль `full`). Спека `004-mvp-runtime` формализует smoke/CI и приёмку runtime;
не блокирует реализацию `002`/`003`.

## Complexity Tracking

Нарушений нет.

## Phase 0: Research

См. [research.md](./research.md).

## Phase 1: Design

| Артефакт | Содержание |
|----------|------------|
| [data-model.md](./data-model.md) | ES-документы, поля, индексы, sync state |
| [contracts/openapi.yaml](./contracts/openapi.yaml) | Канонический REST API |
| [contracts/elasticsearch-indices.md](./contracts/elasticsearch-indices.md) | Маппинги индексов |
| [quickstart.md](./quickstart.md) | curl-сценарии, локальный запуск |

## Phase 2: Tasks (preview)

Группы для `/speckit-tasks`:

1. Каркас Fastify, config, health `GET /health`
2. Elasticsearch client + создание индексов при старте
3. Project repository + register (идемпотентность)
4. Workspace: git clone/pull + local path scan
5. Sync service (async, lock per project, soft-delete)
6. Element repository + list children (pagination)
7. File content (UTF-8, not_text, encoding error)
8. PATCH status + русские ApiError
9. OpenAPI contract tests vs `003`
10. `docker-compose.dev.yml` (backend + ES)
11. Integration tests SC-001–SC-005

## Синхронизация с `003-portal-mvp`

- Канонический контракт: `002/contracts/openapi.yaml`.
- `003/contracts/api-consumer.yaml` — зеркало; при расхождении править consumer
  или обновлять оба с пометкой в changelog plan.
- SC-005 `002` = SC-006 `003` через один API.
