# План реализации: Глубина code-графа (008)

**Ветка**: `008-code-graph-depth` | **Дата**: 2026-07-14 | **Спека**: [spec.md](./spec.md)

**Вход**: `specs/008-code-graph-depth/spec.md` — native v2, calls, injects (C#),
совместимость ingest v1 (clarify 2026-07-14)

**Зависимости**:

- `specs/001-ods-vision/spec.md` — этап 7
- `specs/005-code-analysis/spec.md` — парсеры, envelope, оркестратор
- `specs/006-project-graph/spec.md` — канон, ingest, индексы `ods-graph-*`
- `specs/007-portal-scale-ux/spec.md` — поиск/просмотр рёбер (без нового UI)

## Summary

Расширение **парсеров** TypeScript и C# до native model **v2** (`usages[]` с
`calls`; C# ещё `injects`) и **ingest** shared symbols-адаптера до
`schema_version` 1+2: рёбра `calls`/`injects` в `ods-graph-edges`, у новых
документов `metadata.layer=code`. Оркестратор/UX `005` и UI графа `007` не
меняются по контракту. Python/C++, `creates`/`references`, system-слой — вне MVP.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 20 (backend, TS-парсер); C# / .NET
(Roslyn) для `parsers/csharp` — как `005`

**Primary Dependencies**: существующие TS Compiler API; Roslyn / SemanticModel
для calls+DI; Fastify + ES ingest (`006`); Vitest

**Storage**: Elasticsearch — те же `ods-graph-nodes` / `ods-graph-edges` /
`ods-parser-envelopes` (без новых индексов)

**Testing**: unit — extract calls/injects (fixtures), ingest v1 регрессия + v2
usages→edges; integration — parser CLI → envelope v2 → ingest → GET edges/
search; parser integration как `csharp-parser` / orchestrator

**Target Platform**: Docker Compose профиль `full` (`docker/`)

**Project Type**: Parser modules + backend ingest extension (frontend без
обязательных изменений)

**Performance Goals**: SC-001/002 — 100% на пилотных fixture; прогон не падает
на нерезолве (SC-005); без жёсткого cap calls на файл (research R8)

**Constraints**: Обычный прогон TS/C# → всегда v2; неоднозначность → нет ребра;
нет нового UI; нет system/`009`; русские сообщения оркестратора без смены UX

**Scale/Scope**: Пилот; 2 языка v2; типы рёбер MVP: `calls`, `injects`; целевые
объёмы как `006` (~до 50k узлов)

## Constitution Check

*GATE: до Phase 0 и после Phase 1.*

| Требование | Статус |
|------------|--------|
| VI. Детальная спека `008`, не FR в `001` | ✅; фокус этапа в `001` обновлён |
| TypeScript backend + модульные парсеры | ✅ |
| ES метаданные, один канон `ods-graph-*` | ✅ без новых индексов |
| Расширение scope в `001` до plan | ✅ (`008` = следующий) |
| Черновик ≠ канон | ✅ → `spec.md` + contracts |
| Код после plan/tasks | ✅ |
| Русский язык артефактов | ✅ |
| Без canvas / system / auth / RAG | ✅ |

**Post-design:** research + data-model + contracts + quickstart ниже; нарушений
конституции нет (Complexity Tracking пуст).

## Project Structure

### Documentation (this feature)

```text
specs/008-code-graph-depth/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── native-symbols-v2.schema.json   # N02 канон для реализации
│   ├── canonical-edge-types.md         # EdgeType + injects + layer
│   └── ingest-symbols-v2.md            # маппинг usages → канон, dual v1/v2
└── tasks.md                            # /speckit-tasks (не этот шаг)
```

### Source Code

```text
parsers/
├── typescript/
│   ├── run.mjs                         # schema_version 2, usages calls
│   └── manifest.json                   # schema_version "2"
├── csharp/
│   ├── Ods.CSharpParser/
│   │   ├── CSharpExtractor.cs          # calls + ctor injects
│   │   ├── Program.cs                  # SchemaVersion = "2"
│   │   └── Models.cs                   # Usage DTOs
│   └── manifest.json

backend/
├── src/
│   ├── domain/graph-edge.ts            # + injects в EdgeType
│   └── services/ingest/
│       ├── types.ts                    # isEdgeType + injects
│       ├── adapters/symbols-model.ingest.ts     # dual v1/v2 + usages + layer
│       ├── adapters/typescript.ingest.ts
│       └── adapters/csharp.ingest.ts
└── tests/
    ├── fixtures/ingest/                # + typescript/csharp model v2, envelopes
    ├── unit/ingest/                    # v2 usages → calls/injects; v1 regress
    └── integration/                    # parser→ingest calls; ambiguous skip

# Опционально (пилотные исходники)
backend/tests/fixtures/parsers/         # или parsers/*/fixtures/
├── csharp-calls/                       # Create → Save (+ DI)
└── typescript-calls/                   # unambiguous call
```

**Structure Decision:** Расширяем существующие модули `parsers/` и shared
symbols ingest (`006`/`005`); отдельный пакет или новый индекс не вводим.
Frontend — только ручная проверка через `007` (quickstart).

## Complexity Tracking

> Нет нарушений конституции, требующих обоснования.
