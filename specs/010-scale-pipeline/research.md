# Research: 010-scale-pipeline

**Дата**: 2026-07-15 (sync после clarify walk-scope / SC gates)  
**Спека**: [spec.md](./spec.md)

## R1 — Один обход filesystem (file inventory)

**Decision:** На цикл **sync + подготовка анализа** — **ровно один** полный
walk WC. Типовой путь: **sync** строит **File Inventory** (`path` + `mtime` +
`size`); `LanguageDetectorService`, `ChangeSetService` и пути оркестратора
(`listAllFilePaths` / spawn sets) **MUST** читать этот снимок и **MUST NOT**
выполнять независимый повторный полный walk в том же цикле (clarify
walk-scope = Option A; FR-001 / SC-002).

**Rationale:** Сегодня walk есть в sync (elements), `walkDirectory`,
`listAllFilePaths`, `scanFiles` — главный лишний I/O на large repo.
«Игнорировать sync walk и считать ≤1 только для detect+CS» отклонено —
не закрывает SC-002 («sync+подготовка ≤ 1»).

**Alternatives considered:** (B) sync walk отдельно + ещё один shared walk
detect/CS — до 2 обходов, провал SC-002; кэш только в памяти process —
теряется при рестарте.

**Проверка DoD:** assert walk-count **на large-repo (≥1000 файлов)**; unit на
меньших WC — только регрессия (clarify SC-002 gate).

## R2 — Progress для оператора

**Decision:** Расширить публичную модель `AnalysisRun` полями прогресса.
Канон `progress_phase`: `queued` \| `parsing` \| `ingest` \| `done`
(**без** `detecting` в public API; без `sync` на run). Sync UI — только
этап «Синхронизация…» через `project.sync_status` (без N/M файлов)
(clarify FR-013). Analysis — этап + `active_parser` / N из M.

**Rationale:** Clarify прогресс + устранение drift data-model vs contract
(analyze I2).

**Alternatives considered:** WebSocket/SSE; % по файлам; N/M на sync.

## R3 — Лимиты оркестратора и C#

**Decision:** MVP = **timeout** + **max parallel**. Hard RAM cap — вне MVP.
`parser_results` обновляются по мере завершения модулей.

**Rationale:** Clarify Q5 первой сессии.

**Alternatives considered:** cgroup/docker memory per child.

## R4 — Incremental и SC-003

**Decision:** Политика bootstrap/инкремента `006`/`P0` сохраняется.
**DoD SC-003:** обязательный **замер** wall-clock analysis+ingest на
`large-repo`: после изменения ≤1% файлов incremental ≥ **40%** быстрее
full baseline **или** явная запись в quickstart/отчёт, почему инкремент
недоступен (тогда 40% не требуется, но fallback MUST быть записан)
(clarify Session 2).

**Rationale:** Path classification alone не закрывает SC-003 (analyze C1).

**Alternatives considered:** 40% только ориентир без замера — отклонено.

## R5 — Closing smoke

**Decision:** DoD = fixture gates + **ручной** smoke на внешнем эталоне
оператора (`local_path`). Не коммитить эталон; не CI.

**Rationale:** Clarify Q1 первой сессии.

## R6 — Graph UI на большом объёме

**Decision:** Server pagination + согласованность layer filter.
**SC-005 DoD:** первая страница на графе после анализа **large-repo**
(фактический `node_count`); цель ≥10 000 — **ориентир**, не жёсткий блокер
(clarify Session 2). Не вводить `layer` query в graph API в `010`.

**Rationale:** Не раздувать fixture ради искусственных 10k узлов.

## R7 — Parser CLI SDK

**Decision:** **Вне DoD `010`**; обязательный follow-up (FR-010 / US7).

**Rationale:** Clarify Q4 первой сессии.

## R8 — Timing gate ≤15 мин

**Decision:** Авто/скрипт на `large-repo` (~≥1000 файлов); SC-001 =
**900 с** wall-clock sync→detect→analysis→ingest.

**Rationale:** Clarify Q2 первой сессии.

## Resolved unknowns

Все NEEDS CLARIFICATION закрыты (clarify ×2 + research R1–R8). Analyze
deferred I2 (enum) закрыт в R2.
