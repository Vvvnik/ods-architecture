# Research: Анализ кода (005)

**Дата**: 2026-07-09

## R1. Классификация языков (Language Detector)

**Decision:** Таблица расширений → язык + опциональные эвристики: shebang (первые 2 строки),
наличие `package.json` (JS/TS ecosystem), `*.csproj` / `*.sln` (C#), `pyproject.toml`,
`requirements.txt` (Python), `CMakeLists.txt` (C++). Файлы из `ods-elements` с `type=file`,
`is_active=true`; обход WC, исключая `.git`, `node_modules`, `dist`, `build` (denylist в config).

**Rationale:** FR-002, FR-018 — без AST; достаточно для пилота; согласовано с черновиком §5.

**Alternatives:** GitHub Linguist как lib — тяжёлая зависимость; полный AST — вне scope детектора.

## R2. Сортировка и порядок запуска

**Decision:** `languages[]` сортируется по `file_count` desc, tie-break — `language` asc.
Оркестратор и UI используют **один и тот же** отсортированный массив. Язык backend (TS)
**не** поднимается в приоритете.

**Rationale:** Согласованное решение spec Assumptions; US3, FR-008.

**Alternatives:** «Сначала язык backend» — отклонено.

## R3. Инкрементальный change set

**Decision:** После каждого успешного sync сохранять **snapshot** `{ path, mtime, size }`
для файлов проекта (ES документ `ods-sync-snapshots` или поле в `ods-language-reports`
metadata — предпочтительно отдельный lightweight snapshot в памяти/ES по `project_id` +
`last_sync_at`). При следующем sync: сравнение snapshot → списки `added`, `modified`,
`deleted`. Для `git_url` WC дополнительно можно использовать `git diff --name-status`
между `HEAD@{1}` и `HEAD` если доступен git (fallback — mtime snapshot).

**Rationale:** FR-011; черновик §3 D-005-8; не требует полного re-scan для UI окна 2.

**Alternatives:** Всегда полный анализ — отклонено (SC-003); хранить diff только в git —
недостаточно для `local_path` без истории.

## R4. Оркестратор и блокировки

**Decision:** Паттерн `SyncService`: in-memory `Set<projectId>` для `analysis_in_progress`;
POST confirm → `analysis_status=running` в `ods-analysis-runs`; отказ 409 при параллельном
запуске. Запуск парсеров — `child_process.spawn` по `manifest.command`; таймаут configurable
(default 10 min / module pilot). Параллельность: **до 2** модулей одновременно (pilot);
порядок **старта** очереди — по отчёту.

**Rationale:** FR-008; без Redis в MVP; согласовано с R6 из `002/research.md`.

**Alternatives:** Полный parallel всех модулей — риск OOM на Roslyn/clang; строгая
последовательность — медленнее без выигрыша для пилота.

## R5. Реестр парсеров

**Decision:** Каталог `parsers/<parser_id>/manifest.json`; при старте backend
`ParserRegistryService` сканирует каталог, валидирует manifest (zod), строит map
`language → parser_id`. Отсутствующий модуль → `parser_status: missing` в отчёте.

**Rationale:** FR-005, FR-017; черновик §4.2.

**Alternatives:** Конфиг только в env — хуже для добавления модулей (SC-005).

## R6. Envelope и хранение

**Decision:** Парсер пишет JSON-файл в temp dir или stdout; оркестратор валидирует
обёртку (не `model`), сохраняет документ в `ods-parser-envelopes` с полями envelope +
`analysis_run_id`, `parser_id`, `project_id`. Один документ на (run, parser_id).

**Rationale:** FR-007, FR-012, FR-013; ingest `006` читает оттуда.

**Alternatives:** Monolith merge — отклонено в spec.

## R7. Индексы Elasticsearch (005)

**Decision:** Три новых индекса (имена стабильны для `006`):

| Индекс | Назначение |
|--------|------------|
| `ods-language-reports` | последний и исторические отчёты детектора |
| `ods-analysis-runs` | прогоны анализа, статус, change set summary |
| `ods-parser-envelopes` | envelope + native `model` (object) |

Все с `project_id` keyword; фильтрация DELETE — delete_by_query (согласовать каскад с `002` FR-013).

**Rationale:** `code-analysis-subsystem.md` §7; отдельные индексы как `002`.

**Alternatives:** Nested в `ods-projects` — отклонено в `001`/constitution.

## R8. API и UX

**Decision:** Префикс `/api/v1/projects/{projectId}/analysis/...` — расширение OpenAPI
`002` (файл `openapi-analysis.yaml` в `005`, merge при реализации). Frontend: после
`sync_status=success` — fetch report → modal 1 → fetch change set → modal 2 → POST confirm
→ poll run status.

**Rationale:** FR-014, US2; единый API versioning с `002`.

**Alternatives:** WebSocket — избыточно для пилота.

## R9. Первый parser module (поставка)

**Decision:** Инкремент разработки начинается с `parsers/typescript` (TS Compiler API,
тот же runtime Node) — **не** означает runtime-приоритет. В репозитории с доминирующим
Python первым **запустится** python-модуль, когда он будет зарегистрирован.

**Rationale:** FR-016; удобство команды; согласовано с пользователем (runtime ≠ поставка).

**Alternatives:** Начать с C# (Roslyn) — выше порог deps для первого инкремента.

## R10. Подсветка «новых» языков (окно 1)

**Decision:** Хранить `languages[]` из **предыдущего** отчёта по проекту; при повторном
sync язык ∈ new \ old → highlight: green если `available`, red если `missing`. Первый
отчёт (нет previous) — без подсветки.

**Rationale:** US2 сценарии 2–3.

**Alternatives:** Diff по file_count only — недостаточно для «новый язык».
