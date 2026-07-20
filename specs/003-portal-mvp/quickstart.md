# Quickstart: The MVP portal

**Spec**: [spec.md] | **Plan**: [plan.md]

Check the UI and the links **frontend → backend (`002`) → Elasticsearch** through `docker/`.

## The preamble

- Docker Compose v2+
- Realised `backend/` (`002`) and `frontend/` (`003`)  or partially mock

## Mode 1: Full stack (recommended for reception)

```bash
cp docker/.env.example docker/.env
# Optionally: Local_REPOS_HOST_PATH=/path/to/sample-git-repo

docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
```

Waiting for health:

```bash
curl -s http://localhost:8080/api/v1/health
curl -s http://localhost:9200/_cluster/health
```

Open the portal:

### SC-001 (5 minutes)

1. Verify the header: ODS brand on the left and EN/RU selector on the right (`en` default).
2. Navigate to **Import** → Git URL or local path (`/repos/...` in the container).
3. On **Projects**, verify icon-only Open/Delete/Sync actions and their tooltips/`aria-label`s.
4. Start Sync from the project's circular-arrows action and wait for the status to change from Syncing to Ready.
5. Use the open-folder action to open the project → three panels.
6. Open the folder → open the `.md` / `.ts` file.
7. Make sure it's read-only, with no save buttons.

### SC-006

Chain only through UI (see [spec.md](./spec.md) SC-006); API  canon
[`002/contracts/openapi.yaml`](../002-domain-model/contracts/openapi.yaml).

### SC-007  Removing the project

On **http://localhost:8080** (or `:5173` in dev):

1. **Projects**  in the test project line press **Delete**.
2. Confirm the dialog: *Delete the project?
3. The project disappears from the list without a full page reload.
4. **Import**  register the same source with **new name** → new project in the list.
5. (Optional) Open the project → delete it from the list by leaving the workspace tab
   waiting for redirect to `/projects`.

When `sync_status=running` the delete button or API returns the message on
The project remains on the list.

## Mode 2: Developing the UI (hot reload)

```bash
# Terminal 1  ES
docker compose -f docker/docker-compose.dev.yml up -d elasticsearch

# Terminal 2  backend (see 002/quickstart.md)
cd backend && npm run dev

# Terminal 3  frontend
cd frontend && npm install && npm run dev
```

Open: **http://localhost:5173** (Vite proxy `/api` → `:3000`).

## Mode 3: API only (without UI)

See also [`002-domain-model/quickstart.md`](../002-domain-model/quickstart.md)  curl to `:3000`.

## Stop the car

```bash
docker compose -f docker/docker-compose.dev.yml --profile full down
```

ES data: volume `es-data` (kept between restarts).

## Troubleshooting

| The symptom | The action |
|---------|----------|
| 502 on `/api` | Check `docker logs` backend; ES healthy? |
| CORS in dev | Use Vite proxy, not direct `:3000` from the browser |
| A blank list of projects | Backend up? `curl localhost:3000/api/v1/projects` |
| Sync failed | See `last_error_message` in the UI; logs backend |

## The links

- [docker-integration.md](./contracts/docker-integration.md)
- [ui-routes.md](./contracts/ui-routes.md)
- [002 quickstart](../002-domain-model/quickstart.md)
- [docker/docker-compose.dev.yml](../../docker/docker-compose.dev.yml)
