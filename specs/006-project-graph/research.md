# Research: Граф проекта (006)

**Дата**: 2026-07-09

## R1. Имена индексов ES

**Decision:** `ods-graph-nodes`, `ods-graph-edges` (префикс `ods-` как в `002`/`005`).

**Rationale:** Единый стиль платформы; черновик `graph_nodes`/`graph_edges` — логические имена
(в API и data-model); физические индексы — с префиксом.

**Alternatives:** `graph_nodes` без префикса — расхождение с `ods-elements`.

## R2. Модель версий графа

**Decision:** Узлы/рёбра хранят `analysis_run_id`; «текущий» граф проекта = последний
прогон с `status` ∈ {success, partial} **и** `ingest_status` ∈ {success, partial}
(поля ingest — patch `006` на `ods-analysis-runs`).

**Rationale:** FR-007, FR-011; история прогонов сохраняется до DELETE проекта.

**Alternatives:** Только latest run (удалять старые) — проще, но теряется история.

## R3. Стабильный id узла

**Decision:** `id = {parser_id}:{path}:{kind}:{qualified_name}` (POSIX path, URL-safe
нормализация); при коллизии — суффикс `:line:{start}`.

**Rationale:** Идемпотентный upsert при инкременте; уникальность в `(project_id, id, analysis_run_id)`.

**Alternatives:** UUID на каждый ingest — ломает инкремент и ссылки рёбер.

## R4. Ingest trigger

**Decision:** `IngestService.ingestEnvelope(envelopeDocId)` вызывается из
`analysis-orchestrator.service.ts` (`005`) **после** успешной записи в `ods-parser-envelopes`;
оркестратор передаёт только id документа / envelope DTO без разбора `model`.

**Rationale:** FR-012, FR-004; граница 005/006.

**Alternatives:** Отдельная очередь/воркер — избыточно для пилота.

## R5. Инкрементальный ingest

**Decision:** Перед upsert для `analysis_run_id`:
1. `delete_by_query` рёбер с `project_id` + `analysis_run_id` + `path` ∈ affected paths + `parser_id`
2. `delete_by_query` узлов с теми же фильтрами
3. upsert новых узлов/рёбер из адаптера

Для `deleted` paths из change set (`005`) — только delete без upsert.

**Rationale:** FR-005, D-006-3; не пересобирать весь проект.

**Alternatives:** Полная пересборка run — медленно (SC-003).

## R6. Адаптер ingest

**Decision:** Интерфейс `IngestAdapter`:

```text
parser_id, supported_schema_versions[]
transform(model: unknown, ctx: IngestContext): { nodes: GraphNode[], edges: GraphEdge[] }
```

Реестр `ingest/adapters/*.ingest.ts`; регистрация при старте backend (как parser registry в `005`).

**Rationale:** FR-013, SC-005 расширяемости; контракт в `ingest-pipeline.md`.

**Alternatives:** Один универсальный маппер — противоречит свободному `model`.

## R7. element_id resolution

**Decision:** При ingest lookup `ods-elements` по `(project_id, path, is_active=true)`;
если найден — записать `element_id` на узел; иначе только `path`.

**Rationale:** FR-008; best-effort, не блокирует ingest.

## R8. UI минимальный граф

**Decision:** Заменить `GraphStubPage` на `GraphPage`: левая колонка — список узлов
(пагинация); правая — таблица рёбер выбранного узла (1 hop); без canvas layout.

**Rationale:** FR-009, D-006-6; React Flow вне scope.

**Alternatives:** SVG force-graph — опционально post-MVP.

## R9. API пагинация

**Decision:** `limit` default 50, max 100; `offset` для узлов; рёбра — по выбранному узлу
или файлу без unbounded ответа.

**Rationale:** Edge case больших файлов в spec.

## R10. Связь с индексами `005`

**Decision:** `006` **не** создаёт/не меняет схемы `ods-parser-envelopes`, `ods-analysis-runs`,
`ods-language-reports`; только читает. Каскад DELETE расширяет `project.service` (`005` T057)
на `ods-graph-nodes`, `ods-graph-edges`.

**Rationale:** Assumptions spec `006`; разделение ответственности.
