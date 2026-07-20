# Quickstart: The project graph (006)

**Spec**: [spec.md] | **Plan**: [plan.md]

Check the chain analysis (`005`) → ingest → API/UI column (after implementation on `tasks.md`).

## The preamble

- MVP: `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
- AC increment from [plan.md](./plan.md) is implemented
- The TypeScript project (or another language with ingest adapter) has been fully analyzed (`005` quickstart)

The contracts:

- [contracts/ingest-pipeline.md](./contracts/ingest-pipeline.md)
- [contracts/elasticsearch-indices.md](./contracts/elasticsearch-indices.md)
- [contracts/openapi-graph.yaml](./contracts/openapi-graph.yaml)

## 1. Make sure the analysis is complete

```bash
PROJECT_ID="<uuid>"
curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/analysis/runs" | jq '.[0]'
```

**Waiting:** `status` ∈ `success`, `partial`; after ingest — `ingest_status: success` (field from `006`).

## 2. Summary of the column

```bash
curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/graph/summary" | jq .
```

**Waiting for you:**

- `node_count` > 0 for the code project
- `analysis_run_id` coincides with the last successful run
- Answer < 1 second

## 3. File nodes (FR-006)

```bash
FILE_PATH="src%2Findex.ts"
curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/graph/files/$FILE_PATH/dependencies" | jq .
```

**Waiting for you:**

- `nodes[]` contains the characters from the file (`kind`, `name`, `path`)
- `edges[]`  links `imports`, `calls`, ...
- Pagination: with `limit=50` and large file  `total` or the cutoff list by contract

## 4. The subgraph of the node

```bash
NODE_ID="<id from nodes>"
curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/graph/nodes/$NODE_ID/edges" | jq .
```

**Waiting:** outgoing and inbound edges (1 hop).

## 5. UI `/graph` (SC-001)

1. Open the portal, select the project.
2. Go to the graph.
3. See the list of nodes; click  edge table.

**Wait:** data appears within **10 s** after the ingest (pilot) is completed.

## 6. Increased ingest (increased D)

1. Change one `.ts` file in the source.
2. Sync + analysis (incremental, `005`).
3. Repeat the request for the file dependencies.

**Waiting for you:**

- The nodes of the distant symbols have disappeared.
- New symbols appeared without a complete reassembly of the entire project
- The time ingest is noticeably less than full (SC-003, orientation -50% with ≤5% files)

## 7. DELETE of the project (FR-010)

```bash
curl -s -X DELETE "http://localhost:3000/api/v1/projects/$PROJECT_ID" -w "%{http_code}"
```

Check in ES (dev):

```bash
curl -s "http://localhost:9200/ods-graph-nodes/_count?q=project_id:$PROJECT_ID"
curl -s "http://localhost:9200/ods-graph-edges/_count?q=project_id:$PROJECT_ID"
```

**Wait:** count = 0; cascade together with `005` indices.

## 8. Lack of adapter

The project is in a language with no ingest adapter:

- The analysis can be `partial`
- `ingest_errors` on the run contains `parser_id`
- `/graph` shows the data of the available adapters or empty state

## Troubleshooting

| The symptom | Checking it |
|---------|----------|
| 404 summary | envelope missing from `ods-parser-envelopes`? ingest hook missing from orchestrator? |
| Empty nodes | Adapter `typescript` is registered? fixture model in logs |
| The old Count | Query without `analysis_run_id`  latest: `status` and `ingest_status` ∈ {success, partial} |
