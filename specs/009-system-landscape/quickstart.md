# Quickstart: check 009-system-landscape

**Goal:** after analyzing mini-monorepo visible system-count (compose, OpenAPI, DB,
bus), the layer filter is working, code-only repo without regression. Details —
[contracts/](./contracts/), [data-model.md](./data-model.md).

## Prerequisites

1. Stack: `docker compose --profile full` (`docker/`).
2. Implemented detector `artifacts[]`, system parsers + ingest, UI filter
   (after `/specit-implement`).
3. Fixture: `docker/fixtures/repos/system-landscape-demo/` (git init via
   `setup-fixtures.sh`).

## 1. Language report — artifacts (FR-006)

```bash
# after sync project fixture
curl -s "http://localhost:8080/api/v1/projects/$PROJECT_ID/analysis/language-report/latest" | jq '.artifacts'
```

**Expectation:** array `compose`, `appsettings`, `openapi`, `dotnet-project`;
when Rabbit-fixture — `bus` with `parser_id: bus-rabbit`.

## 2. Compose graph (US1, SC-004)

1. Import `system-landscape-demo` (`local_path`).
2. Sync → confirm → analysis.
3. "Graph" → filter **system**.
4. **Expectation:** nodes `service` (`api`, `worker`, ...), edge `depends_on`.

**SC-004 (autotest):** `backend/tests/integration/system-landscape-e2e.test.ts`
checks the canon against the "golden-"manifesto
`backend/tests/fixtures/system-landscape/expected-links.json` — at least **90%**
spaced ties (compose, openapi, DB, project_reference, bus).

## 3. OpenAPI + appsettings (US2–US3)

1. **Expectation:** `http_endpoint` with method+path; `documents` / `exposes`.
2. **Expectation:** nodes `database` at connection strings; `connects_to`.
3. Several connection strings → several `database` nodes.

## 4. Bus (US5)

1. Fixture with Rabbit listener.
2. **Expectation:** `consumes` (and in the presence `publishes`) to `message_topic` /
   `message_type`.
3. When mixed Kafka+Rabbit signals in repo — spawn only `bus-rabbit`.

## 5. Layer filter (US6, SC-002)

1. A project with code + system data.
2. Switch `code` → `system` → `all`.
3. **Expectation:** composition of nodes/edges is changing; system↔system only `system`;
   mixed edges only `all`.

## 6. Regression of code (SC-003)

1. The project only `code-graph-depth-demo` / `sample-project` (without compose).
2. **Expectation:** `artifacts[]` empty or without system parsers; code graph before `009`.

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

After implement: `implementation_status: done` in
`ods-help/requirements/json-model/` for C02, C04, P01–P07; example JSON
validarea against schema in CI or unit test.
