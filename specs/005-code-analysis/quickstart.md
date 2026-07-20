# Quickstart: Code analysis (005)

**Spec**: [spec.md] | **Plan**: [plan.md]

Check the sync → detector → confirmation → analysis (after implementation on `tasks.md`).

** New parser module:** Expansion checklist
[`../018-parser-extension-playbook/contracts/parser-extension-checklist.md`](../018-parser-extension-playbook/contracts/parser-extension-checklist.md)
(The fuck `018`).

## The preamble

- MVP stack is up: `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
- Multi-language fixture (or `sample-project` + manual files `.py`)
- AC increment from [plan.md](./plan.md) is implemented

## 1. Import and sync

```bash
curl -s -X POST http://localhost:8080/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{
    "source_type": "local_path",
    "source_value": "/repos/sample-project",
    "name": "Analysis pilot"
  }'
```

Wait for the `sync_status: success` (GET `/api/v1/projects/{id}`).

## 2. SC-001  report on languages

```bash
PROJECT_ID="<uuid>"
curl -s "http://localhost:8080/api/v1/projects/$PROJECT_ID/analysis/language-report/latest" | jq .
```

**Waiting for you:**

- `languages` sorted by `file_count` decrease.
- For languages without the module  `parser_status: missing`.
- Time after sync  <30 seconds on the pilot volume.

## Change set (window 2)

```bash
curl -s "http://localhost:8080/api/v1/projects/$PROJECT_ID/analysis/change-set" | jq .
```

**First analysis:** `incremental: false`, lists reflect the full set or empty `added`/`modified`/`deleted` on the contract.

**After file editing and repeated sync:** in `modified` or `added`  only changed paths.

## 4. Start the analysis (API, without UI)

It's a two-way street.

```bash
REPORT_ID="<language_report_id>"
curl -s -X POST "http://localhost:8080/api/v1/projects/$PROJECT_ID/analysis/runs" \
  -H 'Content-Type: application/json' \
  -d "{
    \"language_report_id\": \"$REPORT_ID\",
    \"confirmed_change_set\": true
  }"
```

Poll:

```bash
RUN_ID="<run_id>"
curl -s "http://localhost:8080/api/v1/projects/$PROJECT_ID/analysis/runs/$RUN_ID" | jq .status
```

**Waiting:** `success` or `partial` (if there is `missing`); not `failed` because of missing-only languages.

## 5. Envelope

```bash
curl -s "http://localhost:8080/api/v1/projects/$PROJECT_ID/analysis/runs/$RUN_ID/envelopes" | jq .
```

**Waiting for you:**

- One envelope for each `available` module.
- The wrapping field is [envelope-schema.json]
- `model` is not empty for a successful typescript module.

## 6. Running order (US3 / FR-008)

Multi-language repository, the modules `typescript` and `python` available, `file_count(python) > file_count(typescript)`:

- In the orchestrator's logs first spawn  `python`, then `typescript`.

## 7. UI (SC-004)

1. Open the project in the portal after sync.
2. The project languages model is in the same order as the API.
3. Continue → modalCode changes
4. Continue  → indicator of analysis → toast Analysis completed.

Opting  at step 1 or 2  the parser is not running.

## 8 Increement (SC-003)

1. Full analysis to record the time.
2. Change one file, sync, confirm the analysis.
3. The second time of the push is noticeably less (target -50% for ≤5% of files).

## 9. DELETE of the project

After the `DELETE /api/v1/projects/{id}`:

```bash
curl -s "http://localhost:9200/ods-language-reports/_search?q=project_id:$PROJECT_ID"
curl -s "http://localhost:9200/ods-parser-envelopes/_search?q=project_id:$PROJECT_ID"
```

**Expected:** 0 hits.

## The links

- [data-model.md](./data-model.md)
- [contracts/openapi-analysis.yaml](./contracts/openapi-analysis.yaml)
- [contracts/analysis-ui.md](./contracts/analysis-ui.md)
