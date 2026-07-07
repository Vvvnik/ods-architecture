# Интеграция с Docker

**План**: [plan.md](../plan.md)  
**Backend**: [002/plan.md](../../002-domain-model/plan.md)

## Расположение

Вся compose-инфраструктура MVP — в каталоге [`docker/`](../../../docker/).

```text
docker/
├── docker-compose.dev.yml
├── .env.example
└── (nginx snippets при необходимости)
```

## Сервисы и профили

| Сервис | Профиль | Порт (host) | Назначение |
|--------|---------|-------------|------------|
| `elasticsearch` | default, full | 9200 | Метаданные (`002`) |
| `backend` | full | 3000 | REST API (`002`) |
| `frontend` | full | 8080 | SPA + nginx proxy (`003`) |

## Команды

```bash
# Только Elasticsearch (разработка backend/frontend локально)
docker compose -f docker/docker-compose.dev.yml up -d

# Полный MVP-стек (после реализации backend + frontend)
docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
```

Остановка:

```bash
docker compose -f docker/docker-compose.dev.yml --profile full down
```

## Переменные окружения

Скопировать `docker/.env.example` → `docker/.env`:

| Переменная | Назначение |
|------------|------------|
| `LOCAL_REPOS_HOST_PATH` | Хост-путь к тестовым репо → mount `/repos` в backend |
| `ELASTICSEARCH_URL` | Внутри compose: `http://elasticsearch:9200` |

Frontend в compose не требует `.env` для API — nginx проксирует `/api` на backend.

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

Браузер: `http://localhost:8080` — same-origin для `/api/v1/*`.

## Vite dev (без frontend-контейнера)

`vite.config.ts`:

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': { target: 'http://localhost:3000', changeOrigin: true },
  },
},
```

UI: `http://localhost:5173`, API через proxy.

## Порядок запуска (full)

1. ES healthy
2. backend стартует, создаёт индексы ES
3. frontend (nginx) depends_on backend
4. Проверка: `curl http://localhost:8080/api/v1/health` (через proxy)

## Связь со спекой `004-mvp-runtime`

Текущий `docker-compose.dev.yml` — **пилотный dev/full** стек MVP.
Спека `004-mvp-runtime` (планируется) MAY вынести production-like compose,
smoke-тесты и фикстурный репозиторий; до её появления `docker/` — источник правды
для связки `002`+`003`.
