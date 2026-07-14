# План реализации: Масштабирование пайплайна (010)

**Ветка**: `010-scale-pipeline` | **Дата**: 2026-07-15 | **Спека**: [spec.md](./spec.md)

**Вход**: `specs/010-scale-pipeline/spec.md` — hardening sync→детектор→оркестратор→
парсеры→ingest→graph API/UI под large repo; clarify 2026-07-15 (+ walk-scope /
SC gates)

**Зависимости**:

- `specs/001-ods-vision/spec.md` — этап 9
- `specs/005-code-analysis/spec.md` — детектор, оркестратор, envelope
- `specs/006-project-graph/spec.md` — канон, ingest, `ods-graph-*`
- `specs/007-portal-scale-ux/spec.md` — поиск/дерево графа
- `specs/008-code-graph-depth/spec.md` — code-слой
- `specs/009-system-landscape/spec.md` — system-слой (**не** меняем `spec.md`)

## Summary

**Один** file inventory на цикл sync+подготовки (обычно walk при sync;
detector/change-set — только reuse). Измеримый DoD: ≤ **15 мин** на
`large-repo`; SC-002 assert walk-count на large-repo; **обязательный**
замер SC-003 (40% incremental или documented fallback); closing smoke на
внешнем эталоне; прогресс UI (sync = этап; analysis = парсер / N из M);
timeout + max parallel без RAM cap; ingest без dangling; постраничный UI
на фактическом графе large-repo (10k — ориентир). Canvas и parser CLI SDK —
вне DoD (`011` / follow-up).

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend + frontend); C# / .NET 8
(парсер csharp) — без смены стека

**Primary Dependencies**: Fastify, Elasticsearch client, Vitest, React;
существующие сервисы `SyncService`, `LanguageDetectorService`,
`ChangeSetService`, `AnalysisOrchestratorService`, `IngestService`

**Storage**: Elasticsearch — `ods-projects`, `ods-analysis-runs`,
`ods-sync-snapshots` (или эквивалент inventory), `ods-graph-*` (без новых
индексов графа)

**Testing**: unit — inventory reuse, progress patch, edge-filter, orchestration
limits; integration — large-repo timing ≤900s, **walk-count ≤1 на large-repo**,
**SC-003 full vs incremental timing**; frontend — progress display; manual —
closing smoke checklist

**Target Platform**: Docker Compose профиль `full` + локальный backend для
бенчмарков; closing smoke — WC по `local_path` вне git ODS

**Project Type**: Backend services + frontend progress UX + fixtures/docs;
без новых parser_id

**Performance Goals**: SC-001 ≤ **15 мин**; SC-002 ≤1 walk (gate large-repo);
SC-003 incremental ≥40% faster (обязательный замер или fallback note);
SC-005 первая страница UI < 3 с на графе large-repo; SC-007 прогресс ≥30 с

**Constraints**: Без canvas; без hard RAM cap; без коммита внешнего эталона;
`009` spec не править; dangling = 0; русский UI; sync progress без N/M

**Scale/Scope**: Пилот / ops hardening; авто-эталон `large-repo`; DoD smoke —
внешний эталон оператора (ручной)

## Constitution Check

*GATE: до Phase 0 и после Phase 1.*

| Требование | Статус |
|------------|--------|
| VI. Детальная спека `010`, FR не в `001` | ✅ roadmap обновлён |
| TypeScript backend + модульные парсеры CLI | ✅ без смены стека |
| ES метаданные, канон `ods-graph-*` | ✅ без новых индексов графа |
| Расширение scope в `001` до plan | ✅ этап 9 = scale |
| Код после plan/tasks | ✅ |
| Русский язык артефактов | ✅ |
| Без canvas / auth / RAG в MVP | ✅ |

**Post-design:** research + data-model + contracts + quickstart
синхронизированы с clarify session 2; нарушений нет.

## Project Structure

### Documentation (this feature)

```text
specs/010-scale-pipeline/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── file-inventory.md
│   ├── analysis-run-progress.md
│   └── scale-acceptance.md
└── tasks.md                          # /speckit-tasks
```

### Source Code

```text
backend/
├── src/
│   ├── domain/
│   │   └── analysis-run.ts           # + progress fields
│   ├── services/
│   │   ├── file-inventory*           # walk once / publish snapshot
│   │   ├── language-detector.service.ts  # inventory reuse
│   │   ├── change-set.service.ts         # inventory reuse
│   │   ├── analysis-orchestrator.service.ts  # progress; parallel
│   │   ├── sync.service.ts               # build inventory on sync walk
│   │   └── ingest/ingest.service.ts      # dangling filter, bulk
│   └── api/schemas/analysis.schemas.ts   # progress in run response
└── tests/
    ├── unit/…inventory / progress / orchestrator
    ├── integration/…large-repo timing / walk-count / SC-003
    └── fixtures/…scale timing notes

frontend/
├── src/
│   ├── hooks/useAnalysis.ts / useSync.ts
│   ├── pages/WorkspacePage.tsx / GraphPage.tsx
│   └── i18n/ru.ts
└── tests/…progress UI

docker/fixtures/repos/                # large-repo
parsers/                              # SDK вне DoD (US7)
```

**Structure Decision**: расширяем существующие пути; inventory — из sync walk
или эквивалентный snapshot reuse; новых индексов графа нет.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Implementation Increments (для tasks)

| Инкремент | Фокус | FR / SC |
|-----------|--------|---------|
| A | File inventory: sync walk → reuse detect/CS | FR-001, SC-002 |
| B | Progress API + UI (analysis N/M; sync = этап) | FR-013, SC-007 |
| C | Orchestrator: timeout + max parallel; C# partial | FR-003…005 |
| D | Ingest scale + dangling = 0 | FR-006…007, SC-004 |
| E | Graph tree/search pagination; SC-005 на large-repo | FR-008, SC-005 |
| F | Quickstart: timings, **SC-003 measure**, closing smoke | FR-002/004/009, SC-001/003/006 |
| G | (follow-up) Parser CLI SDK — tracking only | FR-010 |
