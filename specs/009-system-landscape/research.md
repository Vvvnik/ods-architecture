# Research: 009-system-landscape

**Дата**: 2026-07-14  
**Спека**: [spec.md](./spec.md)

## R1 — `artifacts[]` vs расширение `languages[]`

**Decision:** Отдельный массив **`artifacts[]`** в `ods-language-reports` рядом с
`languages[]`. Поля entry: `artifact_type`, `file_count`, `sample_paths`,
`parser_id`, `parser_status` (зеркало `LanguageEntry`).

**Rationale:** Clarify Q1; code-языки и infra-артефакты разной природы; UI окна
языков `005` не ломаем.

**Alternatives considered:** Pseudo-languages (`language: compose`) — путаница
с `ParserRegistryService.languageToParserId`; единый `targets[]` — больше
рефакторинг API без выигрыша в MVP.

## R2 — Правила детектора (artifact triggers)

**Decision:** Конфиг **`detector-rules.json`** (или `backend/src/config/`) с
записями `{ artifact_type, parser_id, globs[], content_signals? }`. Сервис
`LanguageDetectorService` после walk WC:

1. Считает `languages[]` как сейчас.
2. Сканирует пути по globs для artifacts (compose, appsettings, openapi, sln/csproj).
3. Для bus — отдельный проход `detectBusProfile(wc)` по content_signals
   (appsettings keys, csproj PackageReference, известные типы listeners).

Сортировка `artifacts[]`: `file_count` desc, `artifact_type` asc.

**Rationale:** FR-006; расширяемость без правки кода на каждый новый glob.

**Alternatives considered:** Только хардкод в service — как сейчас extensions;
отклонено для 009+.

## R3 — Bus: registry обоих, spawn одного, tie-break Rabbit

**Decision:** `bus-rabbit` и `bus-kafka` зарегистрированы в `parsers/`. Детектор
выставляет **одну** artifact entry `artifact_type: bus` с `parser_id` =
`bus-rabbit` | `bus-kafka`. Если сигналы **обоих** — **`bus-rabbit`**. Оркестратор
spawn по `artifacts[]` с дедупом `parser_id` (как для languages).

**Rationale:** Clarify Q2; оба парсера тестируемы; пилот Profile A.

**Alternatives considered:** Только один парсер в registry — откладывает Kafka;
ambiguous → skip bus — теряем данные.

## R4 — Типы БД и connection strings

**Decision:** Детектор только artifact `appsettings` (file_count). Парсер
`appsettings` извлекает `bindings[]` с `binding_type=database` и `engine`.
Ingest: **каждая** распознанная строка → узел `database`; дедуп id по
`connection_name` / stable key; несколько сервисов → один узел, несколько
`connects_to`.

**Rationale:** Clarify Q3; без дублирования в детекторе.

**Alternatives considered:** `detected_engines[]` в artifacts — отклонено.

## R5 — Стабильные id system-узлов

**Decision:** `{parser_id}:{kind}:{stable_key}` где `stable_key`:

| kind | stable_key (пример) |
|------|---------------------|
| `service` | `{compose_file}#{service_name}` |
| `http_endpoint` | `{method}:{path}` (normalized) |
| `database` | `{connection_name}` |
| `dotnet_project` | `{csproj_path}` |
| `message_topic` | `{topic_or_queue_name}` |
| `message_type` | `{type_fqn}` |

При коллизии в одном прогоне — суффикс path hash (как compose multi-file).

**Edge id (ingest):** `{parser_id}:{type}:{from}->{to}` (`systemEdgeId`).

**Rationale:** FR-011; json-model C02.

**Alternatives considered:** Только compose service name — коллизии в multi-compose.

## R6 — Cross-parser linking (service ↔ openapi ↔ appsettings)

**Decision:** MVP — **эвристики ingest** внутри одного прогона, без глобального
ES lookup:

- `exposes`: `http_endpoint` → `service` если `service_hint` / путь openapi
  совпадает с именем compose service или папкой `Sample.Api`.
- `connects_to`: `appsettings` `service_hint` → `service` node id из compose
  (match по имени) или synthetic `service` только если compose уже создал узел.
- `documents`: openapi spec file → `http_endpoint` (всегда в openapi ingest).

Если цель не найдена — **нет ребра** (FR-010).

**Rationale:** Избегаем двухфазного ingest; достаточно для mini-monorepo fixture.

**Alternatives considered:** Второй pass ingest по ES — сложнее orchestrator.

## R7 — `metadata.layer = system`

**Decision:** Все system ingest adapters MUST `metadata: { layer: 'system', ... }`
на узлах и рёбрах. Legacy code без layer — трактовать как code в UI filter.

**Rationale:** Паттерн `008` (`layer=code`).

## R8 — UI layer filter и рёбра

**Decision:** Клиентский (или API) фильтр:

- `system`: узлы `layer=system`; рёбра где **оба** конца system.
- `code`: узлы code (layer absent или `code`); рёбра code↔code.
- `all`: без фильтра слоя на рёбрах.

**Rationale:** Clarify Q5; FR-008/009.

**Alternatives considered:** OR-фильтр на рёбрах — шум в system view.

## R9 — Оркестратор: порядок spawn

**Decision:** После code `languages[]` spawn — цикл по `artifacts[]` (тот же
`spawnedParserIds` set). Порядок artifacts: `file_count` desc. Ingest после
каждого envelope как сейчас. Incremental: `resolveArtifactChangeSet` по globs
artifact type (новый helper в `change-set.service`).

**Rationale:** FR-007; один run id.

## R10 — Парсеры: технологии MVP

| parser_id | Runtime | Примечание |
|-----------|---------|------------|
| `compose` | Node + `yaml` | parse services/depends_on |
| `appsettings` | Node | JSON + dotenv-lite для `.env` |
| `openapi` | Node + yaml | paths/methods; skip invalid → partial |
| `dotnet-project` | .NET | sln/csproj XML |
| `bus-rabbit` | .NET Roslyn | queue listeners, handlers |
| `bus-kafka` | .NET Roslyn | consumers, MassTransit hints |

**Rationale:** Согласовано с `005`; bus/dotnet на Roslyn уже в образе.

## R11 — Scope анализа

**Decision:** MVP — **весь** WC; `path prefix` на старте прогона — follow-up
(не в tasks MVP).

**Rationale:** Clarify Q4.

## R12 — Message cross-link между сервисами

**Decision:** `message_type` узел по FQN/generic name; `consumes`/`publishes`
от handler; cross-service link если **одинаковый** `message_type` stable_key
в том же run (два handler → один type node).

**Rationale:** US5 scenario 2; без schema registry в MVP.

**Alternatives considered:** OpenAPI schema name only — не для bus MVP.

## R13 — Code reuse audit (implement 009)

| Область | Путь |
|---------|------|
| Детектор языков + artifacts | `backend/src/services/language-detector.service.ts`, `backend/src/services/artifact-detector.ts`, `backend/src/config/detector-rules.json` |
| Language report | `backend/src/domain/language-report.ts`, `backend/src/repositories/language-report.repository.ts` |
| Оркестратор | `backend/src/services/analysis-orchestrator.service.ts` |
| Change set | `backend/src/services/change-set.service.ts` |
| Канон графа | `backend/src/domain/graph-node.ts`, `backend/src/domain/graph-edge.ts` |
| Ingest | `backend/src/services/ingest/system-layer.ts`, `backend/src/services/ingest/adapters/*.ingest.ts`, `ingest-registry.service.ts` |
| Парсеры | `parsers/{compose,appsettings,openapi,dotnet-project,bus-rabbit,bus-kafka}/` |
| UI | `frontend/src/pages/GraphPage.tsx`, `frontend/src/components/analysis/LanguagesConfirmModal.tsx`, `frontend/src/utils/graphLayerFilter.ts` |
