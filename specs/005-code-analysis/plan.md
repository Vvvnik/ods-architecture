# План реализации: Анализ кода — детектор, оркестратор, парсеры

**Ветка**: `005-code-analysis` | **Дата**: 2026-07-09 | **Спека**: [spec.md](./spec.md)

**Вход**: `specs/005-code-analysis/spec.md`

**Зависимости**:

- `specs/001-ods-vision/spec.md` — этап 4, post-MVP анализ
- `specs/002-domain-model/spec.md` — проект, sync, WC, ES, DELETE
- `specs/003-portal-mvp/spec.md` — UX двух модальных окон после sync

**Потребитель**: `specs/006-project-graph/spec.md` — ingest envelope → канон графа

## Summary

Расширение backend ODS (**TypeScript / Node.js 20 / Fastify**) и портала (`003`):
после sync **Language Detector** строит отчёт по языкам в **Elasticsearch**;
пользователь подтверждает анализ в **двух модальных окнах**; **оркестратор**
запускает **CLI-модули** из каталога `parsers/` в порядке `file_count` убыв.
(не по стеку платформы); каждый модуль возвращает **envelope JSON** с свободным
`model`. Инкрементальный режим — только изменённые файлы с прошлого sync.
Канонический граф и ingest-адаптеры — **не** в этой спеке (`006`).

**Порядок поставки модулей (разработка):** `typescript` → `csharp` → `python` → `cpp`
(удобство команды и deps); **порядок запуска (runtime)** — всегда из отчёта
(FR-004, FR-008).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS (backend + первый parser module);
Roslyn/.NET для `csharp` — отдельный subprocess

**Primary Dependencies**: Fastify 4, `@elastic/elasticsearch` 8, `zod`, `simple-git`
(для diff), `uuid`, `pino`; parser `typescript`: `typescript` compiler API

**Storage**: Elasticsearch 8.x — новые индексы `ods-language-reports`,
`ods-analysis-runs`, `ods-parser-envelopes` (см. [contracts/elasticsearch-indices.md](./contracts/elasticsearch-indices.md));
filesystem — только WC (`002`)

**Testing**: Vitest (unit detector, registry, orchestrator mocks); integration —
spawn stub-parser; e2e — sync → modals → analysis (Playwright, в tasks)

**Target Platform**: Docker Compose профиль `full` (`docker/`); parsers в образе backend
или mount `parsers/`

**Project Type**: Web backend + subprocess CLI parsers + расширение frontend (`003`)

**Performance Goals**: SC-001 — детектор < 30 с на 10k файлов; SC-003 — инкремент
−50% времени при ≤5% изменённых файлов

**Constraints**: Без Redis/Kafka; in-memory lock анализа (как sync); оркестратор не
парсит `model`; два UX-подтверждения обязательны; русские сообщения об ошибках

**Scale/Scope**: Пилот; 4 целевых parser-модуля; до ~10k файлов / проект

## Constitution Check

*GATE: до Phase 0 и после Phase 1.*

| Требование | Статус |
|------------|--------|
| VI. Детальная спека `005`, не в `001` | ✅ |
| TypeScript backend MVP | ✅ оркестратор в `backend/` |
| ES для метаданных | ✅ отдельные индексы |
| Парсеры — subprocess, не monolith | ✅ `parsers/<id>/` |
| Граница с `006` (граф, ingest) | ✅ envelope → ES; ingest в `006` |
| UX модалей — контракт для `003` | ✅ `contracts/analysis-ui.md` |
| Код после plan/tasks | ✅ |
| Согласование с `001` post-MVP | ✅ |

**Post-design:** OpenAPI-расширение в `contracts/openapi-analysis.yaml`; индексы ES
зафиксированы; `006` потребляет `ods-parser-envelopes` без знания `model` на стороне
оркестратора.

## Project Structure

### Documentation (this feature)

```text
specs/005-code-analysis/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── openapi-analysis.yaml      # REST расширение 002
│   ├── envelope-schema.json       # контракт envelope
│   ├── parser-manifest.md         # каталог parsers/
│   ├── elasticsearch-indices.md   # индексы 005
│   └── analysis-ui.md             # контракт модалей для 003
└── tasks.md                       # /speckit-tasks
```

### Source Code

```text
backend/
├── src/
│   ├── domain/
│   │   ├── analysis-run.ts
│   │   ├── language-report.ts
│   │   └── parser-envelope.ts
│   ├── repositories/
│   │   ├── language-report.repository.ts
│   │   ├── analysis-run.repository.ts
│   │   └── parser-envelope.repository.ts
│   ├── services/
│   │   ├── language-detector.service.ts
│   │   ├── change-set.service.ts          # diff / snapshot
│   │   ├── parser-registry.service.ts
│   │   ├── analysis-orchestrator.service.ts
│   │   └── sync.service.ts                # hook: post-sync → detector
│   └── api/routes/
│       └── analysis.ts                    # /projects/{id}/analysis/*
├── tests/
│   ├── unit/
│   └── integration/

parsers/
├── typescript/
│   ├── manifest.json
│   └── run.mjs
├── csharp/          # инкремент 2
├── python/          # инкремент 3
└── cpp/             # инкремент 4

frontend/
├── src/
│   ├── components/analysis/
│   │   ├── LanguagesConfirmModal.tsx      # окно 1
│   │   └── ChangesConfirmModal.tsx        # окно 2
│   └── hooks/useAnalysis.ts
```

**Structure Decision:** Оркестрация в существующем `backend/`; парсеры — отдельный
каталог `parsers/` в корне репозитория; UI-модали — расширение `frontend/` (`003`).

## Интеграция с `002` / `003`

| Аспект | `002` | `005` |
|--------|-------|-------|
| Триггер | sync success | post-sync hook → detector |
| WC | `working_copy_root` | вход detector + parsers |
| Блокировка | `sync_in_progress` | `analysis_in_progress` (аналог) |
| DELETE проекта | каскад elements | + delete_by_query индексов 005 |

| Аспект | `003` | `005` |
|--------|-------|-------|
| После sync | polling status | цепочка 2 модалей |
| API | базовый OpenAPI | + `openapi-analysis.yaml` |

## Фазы реализации (логические)

### Инкремент A — детектор + API отчёта + окно 1

- `language-detector.service`, индекс `ods-language-reports`
- POST-sync hook, GET отчёта
- `LanguagesConfirmModal` (без запуска парсеров)

### Инкремент B — change set + окно 2 + оркестратор (stub)

- `change-set.service`, snapshot/diff
- `analysis-orchestrator` + `ods-analysis-runs`
- `ChangesConfirmModal`, запуск с заглушечным parser

### Инкремент C — parser `typescript`

- `parsers/typescript/`, registry, envelope → `ods-parser-envelopes`

### Инкременты D–F — `csharp`, `python`, `cpp`

- По одному модулю; без изменений оркестратора кроме registry

## Complexity Tracking

Нарушений конституции, требующих оправдания, нет.
