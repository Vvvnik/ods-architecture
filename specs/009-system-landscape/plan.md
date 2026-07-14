# План реализации: System landscape (009)

**Ветка**: `009-system-landscape` | **Дата**: 2026-07-14 | **Спека**: [spec.md](./spec.md)

**Вход**: `specs/009-system-landscape/spec.md` — system-слой в каноне ES,
`artifacts[]` в детекторе, 5+1 парсеров, UI-фильтр layer (clarify 2026-07-14)

**Зависимости**:

- `specs/001-ods-vision/spec.md` — этап 8
- `specs/005-code-analysis/spec.md` — детектор, оркестратор, envelope
- `specs/006-project-graph/spec.md` — канон, ingest, `ods-graph-*`
- `specs/007-portal-scale-ux/spec.md` — поиск/просмотр графа
- `specs/008-code-graph-depth/spec.md` — паттерн `metadata.layer`

## Summary

Расширение платформы **system-ландшафтом**: детектор дополняет language report
массивом **`artifacts[]`** (отдельно от `languages[]`); оркестратор spawn
system-парсеров в том же `analysis_run_id`; ingest пишет узлы/рёбра с
`metadata.layer=system` в те же индексы. MVP-парсеры: `compose`, `appsettings`,
`openapi`, `dotnet-project`, bus (`bus-rabbit` / `bus-kafka` — детектор
выбирает один до spawn; tie-break → Rabbit). UI: фильтр `code` | `system` |
`all` на «Графе». Canvas, `path prefix`, `catalog-info` — вне MVP.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend, TS-парсеры compose/
openapi/appsettings); C# / .NET 8 (bus-rabbit, bus-kafka, dotnet-project) —
subprocess как `005`/`008`

**Primary Dependencies**: существующие Fastify + ES; `yaml` (compose/openapi);
`@apidevtools/swagger-parser` или `js-yaml` + минимальная валидация OpenAPI;
Roslyn для bus/dotnet (переиспользовать toolchain `parsers/csharp`);
Vitest + integration spawn

**Storage**: Elasticsearch — те же `ods-graph-nodes` / `ods-graph-edges` /
`ods-parser-envelopes`; расширение mapping `ods-language-reports` nested
`artifacts[]` (bootstrap migration additive)

**Testing**: unit — детектор artifacts, bus tie-break, ingest adapters;
integration — fixture mini-monorepo → envelopes → ingest → GET graph +
layer filter; регрессия code-only fixture `008`

**Target Platform**: Docker Compose профиль `full` (`docker/`)

**Project Type**: Parser modules (`parsers/*`) + backend (detector, orchestrator,
ingest) + frontend (layer filter, i18n system edge labels)

**Performance Goals**: SC-001/002 — ≥10 system nodes, ≥8 edges на fixture;
переключение фильтра ≤2 с; детектор artifacts без полного AST

**Constraints**: Весь repo в MVP; не ломать `languages[]` UX; один bus spawn;
типы БД только в `appsettings` парсере; русские метки рёбер в UI;
фильтр слоя `code`/`system`/`all` в MVP — **client-only** (без `layer`
query в graph API); modal окна 1 — сводка `artifacts[]` (см.
`contracts/detector-artifacts.md`)

**Scale/Scope**: Пилот; 6 parser_id (4 infra + 2 bus, spawn 1 bus); system kinds
из C02; эталон `docker/fixtures/repos/system-landscape-demo/` (создать в implement)

## Constitution Check

*GATE: до Phase 0 и после Phase 1.*

| Требование | Статус |
|------------|--------|
| VI. Детальная спека `009`, не FR в `001` | ✅ |
| TypeScript backend + модульные парсеры CLI | ✅ |
| ES метаданные, один канон `ods-graph-*` | ✅ без новых индексов графа |
| Расширение scope отражено в `001` | ✅ (этап 8) |
| Черновик/json-model → contracts | ✅ |
| Код после plan/tasks | ✅ |
| Русский язык артефактов | ✅ |
| Без canvas (`010`) / auth / RAG | ✅ |

**Post-design:** research + data-model + contracts + quickstart; нарушений нет.

## Project Structure

### Documentation (this feature)

```text
specs/009-system-landscape/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── detector-artifacts.md
│   ├── detector-rules.md
│   ├── ingest-system-layer.md
│   ├── canonical-edge-types-system.md
│   ├── canonical-node-system.schema.json
│   ├── canonical-edge-system.schema.json
│   ├── native-*.schema.json          # P01–P07
│   └── _shared.schema.json
└── tasks.md                          # /speckit-tasks
```

### Source Code

```text
backend/
├── src/
│   ├── domain/
│   │   ├── language-report.ts        # + ArtifactEntry, artifacts[]
│   │   ├── graph-node.ts             # + system NodeKind union
│   │   └── graph-edge.ts             # + system EdgeType union
│   ├── services/
│   │   ├── language-detector.service.ts   # + artifact scan, bus signals
│   │   ├── analysis-orchestrator.service.ts # spawn artifacts[] + languages[]
│   │   ├── change-set.service.ts          # paths for artifact types
│   │   └── ingest/
│   │       ├── adapters/
│   │       │   ├── compose.ingest.ts
│   │       │   ├── appsettings.ingest.ts
│   │       │   ├── openapi.ingest.ts
│   │       │   ├── dotnet-project.ingest.ts
│   │       │   ├── bus-rabbit.ingest.ts
│   │       │   └── bus-kafka.ingest.ts
│   │       └── ingest-registry.service.ts
│   ├── infra/elasticsearch.ts        # language-reports mapping artifacts
│   └── api/routes/graph.ts           # без layer query в MVP (client-side filter)
├── config/detector-rules.json        # artifact triggers (или в backend/src)
└── tests/
    ├── unit/language-detector-artifacts.test.ts
    ├── unit/ingest/system-*.test.ts
    └── integration/system-landscape-*.test.ts

parsers/
├── compose/          # manifest + run.mjs (yaml parse)
├── appsettings/      # run.mjs (json + .env)
├── openapi/          # run.mjs (yaml openapi)
├── dotnet-project/   # .NET CLI или run.sh
├── bus-rabbit/       # Roslyn + config heuristics
└── bus-kafka/

frontend/
├── src/pages/GraphPage.tsx           # layer filter control (client-side)
├── src/components/analysis/LanguagesConfirmModal.tsx  # + artifacts summary
├── src/i18n/ru.ts                    # SYSTEM_EDGE_TYPE_LABELS + artifact labels

docker/fixtures/repos/system-landscape-demo/   # mini-monorepo SC-001
```

**Structure Decision:** Расширяем `005`/`006`/`007`/`008` без нового индекса
графа; system-парсеры — новые каталоги `parsers/<id>/` по контракту manifest.
Детекторные правила — конфиг + unit-тесты (не хардкод только в service).

## Complexity Tracking

> Нет нарушений конституции, требующих обоснования.

## Phase 0 — Research

См. [research.md](./research.md): `artifacts[]`, bus tie-break, ingest id,
cross-parser linking (service↔openapi), incremental paths.

## Phase 1 — Design

- [data-model.md](./data-model.md) — ArtifactEntry, system NodeKind/EdgeType
- [contracts/](./contracts/) — detector, ingest, JSON schemas
- [quickstart.md](./quickstart.md) — пилотная проверка SC-001–SC-005

## Инкременты реализации (для tasks)

| Инкремент | Содержание | Блокер |
|-----------|------------|--------|
| **A** | `artifacts[]` ES + domain + детектор + orchestrator spawn + modal artifacts summary (окно 1) | — |
| **B** | Канон: `graph-node`/`graph-edge` system types + `layer` ingest helper | A |
| **C** | Парсеры `compose` + `appsettings` + ingest | B |
| **D** | Парсеры `openapi` + `dotnet-project` + ingest | C |
| **E** | `bus-rabbit` + `bus-kafka` parsers + detector bus choice + ingest | C |
| **F** | UI layer filter (client-only) + i18n system edge/artifact labels | B (можно параллельно D) |
| **G** | Fixture `system-landscape-demo` + integration SC-001/003/004 | C–F |
| **H** | json-model `implementation_status: done` + polish | G |

**Checkpoint:** после G — quickstart §1–§6 зелёные; code-only регрессия `008`.
