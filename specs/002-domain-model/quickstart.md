# Quickstart: Backend  MVP data model

**Spec**: [spec.md] | **Plan**: [plan.md]

Verify the backend API without the frontend (SC-001SC-006 at HTTP level).

## The preamble

- Node.js 20+, npm
- Docker (for Elasticsearch)
- Test repository: `docker/fixtures/repos/sample-project` (see [README](../../../../docker/fixtures/repos/README.md))

## 1. Upload the Elasticsearch

```bash
docker compose -f docker/docker-compose.dev.yml up -d elasticsearch
```

Wait: `curl -s http://localhost:9200/_cluster/health | grep green\|yellow`

## 2. Configuration

```bash
cp docker/.env.example docker/.env
```

At least:

```env
ELASTICSEARCH_URL=http://localhost:9200
DATA_ROOT=./data
PORT=3000
```

## 3. Starting the backend (after implementation)

```bash
cd backend
npm install
npm run dev
```

Check it out .

```bash
curl -s http://localhost:3000/api/v1/health
```

## 4. SC-001 scenario  registration and sync

### Local route (pilot)

Test repository for compose  `docker/fixtures/repos/sample-project` (git).
In the backend container it is available as `/repos/sample-project`.

**Locally** (`npm run dev` on the host):

```bash
# The path to the host's fixtures (from the root of the ods-architecture repository)
export SAMPLE_REPO="$(pwd)/docker/fixtures/repos/sample-project"

curl -s -X POST http://localhost:3000/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d "{
    \"source_type\": \"local_path\",
    \"source_value\": \"$SAMPLE_REPO\",
    \"name\": \"Sample\"
  }"
```

**In Docker** (profile `full`, mount `./fixtures/repos` → `/repos`):

```bash
curl -s -X POST http://localhost:3000/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{
    "source_type": "local_path",
    "source_value": "/repos/sample-project",
    "name": "Sample"
  }'
```
```

Save `id` from the answer → `PROJECT_ID`.

Sync (polling) waiting:

```bash
curl -s http://localhost:3000/api/v1/projects/$PROJECT_ID
# sync_status: running → success
```

### Git URL

```bash
curl -s -X POST http://localhost:3000/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{
    "source_type": "git_url",
    "source_value": "https://github.com/octocat/Hello-World.git",
    "name": "Hello-World"
  }'
```

## 5 - The File Tree

```bash
curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/elements?parent_path=&limit=100"
```

Wait: `items[]` without the roads `.git/...`.

## 6 - The contents of the file

Take the `elementId` file `.md` or `.txt` from the tree:

```bash
curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/elements/$ELEMENT_ID/content"
```

Expectation: `"kind": "text"` and field `content`.

## 7. Changing of status (SC-002)

```bash
curl -s -X PATCH "http://localhost:3000/api/v1/projects/$PROJECT_ID/elements/$ELEMENT_ID" \
  -H 'Content-Type: application/json' \
  -d '{"status": "needed"}'
```

Restart the backend → GET element → `status: needed`.

## 8. Repeated sync (SC-003)

```bash
curl -s -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/sync"
```

Repeat GET children  the number of active elements with the same `path` does not increase.

## 9. sync_in_progress error (409)

Two quick POST sync in a row  second answer:

```json
{ "code": "sync_in_progress", "message": "..." }
```

## 10. Deleting the project (SC-006)

Make sure that sync is complete (`sync_status` ≠ `running`).

```bash
curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  "http://localhost:3000/api/v1/projects/$PROJECT_ID"
# Wait for the next 204.
```

Check the list  project is missing:

```bash
curl -s http://localhost:3000/api/v1/projects | jq 'map(.id) | index("'"$PROJECT_ID"'")'
# Wait: null
```

Re-registering the same source  **new** `id`:

```bash
curl -s -X POST http://localhost:3000/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d "{
    \"source_type\": \"local_path\",
    \"source_value\": \"$SAMPLE_REPO\",
    \"name\": \"Sample-Reimport\"
  }"
# The old PROJECT_ID; HTTP 201
```

Error when deleting during sync (409):

```bash
# while sync_status=running:
curl -s -X DELETE "http://localhost:3000/api/v1/projects/$PROJECT_ID"
# { "code": "sync_in_progress", "message": "..." }
```

## Link to the portal and full stack

After the sale `003` It's the same scenario. — through UI
(http://www.squickstart.md/)

**Full stack (backend + frontend + ES) **  already described in `docker/docker-compose.dev.yml`
(full name `full`):

```bash
docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
curl -s http://localhost:8080/api/v1/health # through nginx
```

The `004-mvp-runtime` stage (planned) formalizes smoke-tests, CI and production-like
The pilot composes the truth source in `docker/`

## The links

- [openapi.yaml](./contracts/openapi.yaml)
- [data-model.md](./data-model.md)
- [elasticsearch-indices.md](./contracts/elasticsearch-indices.md)
