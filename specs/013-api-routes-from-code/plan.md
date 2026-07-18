# Implementation Plan: API routes from code (013 CP1)

**Branch**: `013-api-routes-from-code` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/013-api-routes-from-code/spec.md` — HTTP API из **кода**
(TS Fastify-литералы + C# controllers/minimal APIs) → `http_endpoint` system;
уникальность **сервис + method + path**; полный path при статическом префиксе.
UX CP2 (`014`) вне scope.

**Зависимости**:

- `specs/001-ods-vision/spec.md` — этап 12
- `specs/005-code-analysis/spec.md` — модульные парсеры, envelope, оркестратор
- `specs/006-project-graph/spec.md` — канон ES, ingest
- `specs/009-system-landscape/spec.md` — system kinds/`exposes`, detector artifacts
- `specs/011-ods-graph-viewer/spec.md` + `012` — system interior уже показывает
  `http_endpoint` (SYSTEM_INSIDE_KINDS); UI-ренейм не трогаем

## Summary

Два новых **system**-парсера (`ts-api-routes`, `dotnet-api-routes`): CLI →
native envelope → ingest → `http_endpoint` + `exposes` → compose `service`;
при однозначном match — **optional metadata handler_*** (R6; **без** нового
EdgeType к code-handler в CP1). Детектор добавляет artifacts по сигналам
(Fastify/`MapGet`/`[HttpGet]`). Без merge с OpenAPI; без Python; без второго
оркестратора. Эталоны: **ods-arch** (TS) + C#-fixture (controllers + Map*).

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (`ts-api-routes`, backend ingest);
C# / .NET 8 (`dotnet-api-routes`, Roslyn/toolchain как `parsers/csharp`)

**Primary Dependencies**: существующие Fastify backend + ES; typescript
compiler API или lightweight regex/AST walk для Fastify-литералов (решение
в research); Roslyn для C#; Vitest

**Storage**: те же `ods-graph-nodes` / `ods-graph-edges` / envelopes;
`metadata.layer=system`; id с учётом сервиса (R2). Поле узла `path` = путь
**файла исходника**; HTTP path хранить в `metadata.http_path` (+
`qualified_name` = `METHOD path`) — см. `data-model.md`.

**Testing**: unit — extract + ingest + id/path; integration — spawn parsers →
ingest → `GET .../graph/view?focus=<service>`; регресс compose/code `012`

**Target Platform**: Docker Compose `--profile full`

**Project Type**: Parser modules + backend detector/orchestrator/ingest
(frontend без обязательных изменений в CP1)

**Performance Goals**: SC-001/002 — ≥1 эндпоинт на эталоне за dig-in; парсер
не полный semantic extract (только литеральные роуты)

**Constraints**: только код как DoD; Fastify-литералы / C# controllers+Map*;
уникальность service+method+path; полный path только при статическом префиксе;
reuse registry `005`/`009`; audit «не фича сверху»

**Scale/Scope**: 2 parser_id; пилот ods-arch + 1 C# fixture; Python/Express/Nest
вне DoD

## Constitution Check

*GATE: до Phase 0 и после Phase 1.*

| Требование | Статус |
|------------|--------|
| VI. Детальная спека `013`, FR не в `001` | ✅ |
| Scope в `001` (CP1 / `014` UX) | ✅ |
| Модульные CLI-парсеры, не раздувание `typescript`/`csharp` | ✅ |
| Один канон ES `ods-graph-*` | ✅ |
| Русский UI/артефакты | ✅ |
| Код после plan/tasks | ✅ |
| Без auth/RAG/docs продукта | ✅ |

**Post-design:** research + data-model + contracts + quickstart — нарушений нет.

## Project Structure

### Documentation (this feature)

```text
specs/013-api-routes-from-code/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── detector-api-routes.md
│   ├── native-ts-api-routes.schema.json
│   ├── native-dotnet-api-routes.schema.json
│   └── ingest-api-routes.md
└── tasks.md                          # /speckit-tasks
```

### Source Code

```text
parsers/
├── ts-api-routes/          # manifest + run (Fastify literals)
└── dotnet-api-routes/      # manifest + run (controllers + Map*)

backend/
├── src/
│   ├── config/detector-rules…      # + artifact globs/signals
│   ├── services/
│   │   ├── language-detector…      # artifacts ts-api / dotnet-api
│   │   └── ingest/adapters/
│   │       ├── ts-api-routes.ingest.ts
│   │       └── dotnet-api-routes.ingest.ts
│   └── services/graph-view…        # без смены UX; http_endpoint already inside
└── tests/
    ├── unit/ingest/
    └── integration/

docker/fixtures/repos/
├── ods-arch/                       # эталон TS (уже есть)
└── api-routes-csharp-demo/         # создать: controller + MapGet (+ compose)
```

**Structure Decision**: расширение существующего дерева `parsers/` + ingest
adapters + detector; новый C#-fixture; frontend CP1 не обязателен.

## Complexity Tracking

> Нет нарушений конституции, требующих обоснования.
