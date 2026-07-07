# Quickstart: Портал MVP

**Спека**: [spec.md](./spec.md) | **План**: [plan.md](./plan.md)

Проверка UI и связки **frontend → backend (`002`) → Elasticsearch** через `docker/`.

## Предусловия

- Docker Compose v2+
- Реализованы `backend/` (`002`) и `frontend/` (`003`) — или частично mock

## Режим 1: Полный стек (рекомендуется для приёмки)

```bash
cp docker/.env.example docker/.env
# опционально: LOCAL_REPOS_HOST_PATH=/path/to/sample-git-repo

docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
```

Дождаться health:

```bash
curl -s http://localhost:8080/api/v1/health
curl -s http://localhost:9200/_cluster/health
```

Открыть портал: **http://localhost:8080**

### SC-001 (5 минут)

1. Меню → **Импорт** → Git URL или локальный путь (`/repos/...` в контейнере).
2. Дождаться sync (статус «Синхронизация…» → «Готово»).
3. **Проекты** → открыть проект → три панели.
4. Раскрыть папку → открыть `.md` / `.ts` файл.
5. Убедиться: read-only, нет кнопок сохранения.

### SC-006

Цепочка только через UI (см. [spec.md](./spec.md) SC-006); API — канон
[`002/contracts/openapi.yaml`](../002-domain-model/contracts/openapi.yaml).

## Режим 2: Разработка UI (hot reload)

```bash
# Терминал 1 — ES
docker compose -f docker/docker-compose.dev.yml up -d elasticsearch

# Терминал 2 — backend (см. 002/quickstart.md)
cd backend && npm run dev

# Терминал 3 — frontend
cd frontend && npm install && npm run dev
```

Открыть: **http://localhost:5173** (Vite proxy `/api` → `:3000`).

## Режим 3: Только API (без UI)

См. [`002-domain-model/quickstart.md`](../002-domain-model/quickstart.md) — curl на `:3000`.

## Остановка

```bash
docker compose -f docker/docker-compose.dev.yml --profile full down
```

Данные ES: volume `es-data` (сохраняется между перезапусками).

## Troubleshooting

| Симптом | Действие |
|---------|----------|
| 502 на `/api` | Проверить `docker logs` backend; ES healthy? |
| CORS в dev | Использовать Vite proxy, не прямой `:3000` из браузера |
| Пустой список проектов | Backend up? `curl localhost:3000/api/v1/projects` |
| Sync failed | Смотреть `last_error_message` в UI; логи backend |

## Ссылки

- [docker-integration.md](./contracts/docker-integration.md)
- [ui-routes.md](./contracts/ui-routes.md)
- [002 quickstart](../002-domain-model/quickstart.md)
- [docker/docker-compose.dev.yml](../../docker/docker-compose.dev.yml)
