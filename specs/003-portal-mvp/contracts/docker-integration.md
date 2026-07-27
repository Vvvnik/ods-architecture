# Integration with Docker

**Plan**: [plan.md]
**Backend**: [002/plan.md](../../002-domain-model/plan.md)

## Location

The entire compose infrastructure of MVP  is in the [`docker/`](../../../docker/).

```text
docker/
├── docker-compose.dev.yml
├── .env.example
── (nginx snippets when needed)
```

## Services and profiles

| The service | The profile | Port (host) | The assignment |
|--------|---------|-------------|------------|
| `elasticsearch` | default, full | 9200 | Metadata (`002`) |
| `backend` | full | 3000 | REST API (`002`) |
| `frontend` | full | 8080 | SPA + nginx proxy (`003`) |

## The Commands

```bash
# Only Elasticsearch (developing the backend/frontend locally)
docker compose -f docker/docker-compose.dev.yml up -d

# Full MVP stack (after the backend + frontend is sold)
docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
```

Stop the car .

```bash
docker compose -f docker/docker-compose.dev.yml --profile full down
```

## The changing environment

Copy `docker/.env.example` → `docker/.env`:

| Variable | The assignment |
|------------|------------|
| `LOCAL_REPOS_HOST_PATH` | Host directory mounted at `/repos`; **absolute** value also enables Import with that same host path (rewritten to `/repos/...` in the container) |
| `LOCAL_REPOS_EXTRA_HOST_PATH` | Optional second host directory → `/repos-extra` |
| `LOCAL_PATH_MAP` | Optional extra `host:container` pairs (comma-separated), e.g. `/absolute/path/to/other-repos:/repos-extra` |
| `ELASTICSEARCH_URL` | Inside compose: `http://elasticsearch:9200` |

Frontend in compose does not require `.env` for API  nginx proxy `/api` on the backend.

## Nginx (frontend)

```nginx
location /api/ {
    proxy_pass http://backend:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}

location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
}
```

Browser: `http://localhost:8080`  same-origin for `/api/v1/*`.

## Vite dev (without frontend container)

`vite.config.ts`:

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': { target: 'http://localhost:3000', changeOrigin: true },
  },
},
```

UI: `http://localhost:5173`, API through proxy.

## Running order (full)

1. ES healthy
2. Backend starts, creates ES indexes
3. frontend (nginx) depends_on backend
4. Check: `curl http://localhost:8080/api/v1/health` (through proxy)

## Connection with the hot `004-mvp-runtime`

The current `docker-compose.dev.yml`  **pilot dev/full** stack is MVP.
Speca `004-mvp-runtime` (planned) MAY perform production-like compose,
smoke-tests and a fixed repository; before it appears `docker/`  source of truth
for the link `002`+`003`.
