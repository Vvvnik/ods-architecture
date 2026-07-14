# Quickstart: проверка 009-system-landscape

**Цель:** после анализа mini-monorepo виден system-граф (compose, OpenAPI, БД,
bus), фильтр слоя работает, code-only repo без регрессии. Детали —
[contracts/](./contracts/), [data-model.md](./data-model.md).

## Предусловия

1. Стек: `docker compose --profile full` (`docker/`).
2. Реализованы детектор `artifacts[]`, system parsers + ingest, UI filter
   (после `/speckit-implement`).
3. Fixture: `docker/fixtures/repos/system-landscape-demo/` (git init через
   `setup-fixtures.sh`).

## 1. Language report — artifacts (FR-006)

```bash
# после sync проекта с fixture
curl -s "http://localhost:8080/api/v1/projects/$PROJECT_ID/analysis/language-report/latest" | jq '.artifacts'
```

**Ожидание:** массив с `compose`, `appsettings`, `openapi`, `dotnet-project`;
при Rabbit-fixture — `bus` с `parser_id: bus-rabbit`.

## 2. Compose graph (US1, SC-004)

1. Импорт `system-landscape-demo` (`local_path`).
2. Sync → confirm → analysis.
3. «Граф» → фильтр **system**.
4. **Ожидание:** узлы `service` (`api`, `worker`, …), ребро `depends_on`.

**SC-004 (автотест):** `backend/tests/integration/system-landscape-e2e.test.ts`
сверяет канон с golden-манифестом
`backend/tests/fixtures/system-landscape/expected-links.json` — не менее **90%**
размеченных связей (compose, openapi, БД, project_reference, bus).

## 3. OpenAPI + appsettings (US2–US3)

1. **Ожидание:** `http_endpoint` с method+path; `documents` / `exposes`.
2. **Ожидание:** узлы `database` по connection strings; `connects_to`.
3. Несколько connection strings → несколько `database` узлов.

## 4. Bus (US5)

1. Fixture с Rabbit listener.
2. **Ожидание:** `consumes` (и при наличии `publishes`) к `message_topic` /
   `message_type`.
3. При mixed Kafka+Rabbit signals в repo — spawn только `bus-rabbit`.

## 5. Layer filter (US6, SC-002)

1. Проект с code + system данными.
2. Переключить `code` → `system` → `all`.
3. **Ожидание:** состав узлов/рёбер меняется; system↔system только в `system`;
   mixed edges только в `all`.

## 6. Регрессия code (SC-003)

1. Проект только `code-graph-depth-demo` / `sample-project` (без compose).
2. **Ожидание:** `artifacts[]` пуст или без system parsers; code-граф как до `009`.

## 7. Elasticsearch smoke

```bash
curl -s "http://localhost:9200/ods-graph-nodes/_search" -H 'Content-Type: application/json' -d '{
  "size": 3,
  "query": { "bool": { "must": [
    { "term": { "project_id": "'"$PROJECT_ID"'" } },
    { "term": { "metadata.layer": "system" } }
  ]}}}
' | jq '.hits.hits[]._source.kind'
```

## 8. json-model (SC-005)

После implement: `implementation_status: done` в
`ods-help/requirements/json-model/` для C02, C04, P01–P07; example JSON
валидируется против schema в CI или unit test.
