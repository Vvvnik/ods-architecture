# Quickstart: Backend — модель данных MVP

**Спека**: [spec.md](./spec.md) | **План**: [plan.md](./plan.md)

Проверка API backend без frontend (SC-001–SC-005 на уровне HTTP).

## Предусловия

- Node.js 20+, npm
- Docker (для Elasticsearch)
- Тестовый репозиторий: `docker/fixtures/repos/sample-project` (см. [README](../../../docker/fixtures/repos/README.md))

## 1. Поднять Elasticsearch

```bash
docker compose -f docker/docker-compose.dev.yml up -d elasticsearch
```

Дождаться: `curl -s http://localhost:9200/_cluster/health | grep green\|yellow`

## 2. Конфигурация

```bash
cp docker/.env.example docker/.env
```

Минимум:

```env
ELASTICSEARCH_URL=http://localhost:9200
DATA_ROOT=./data
PORT=3000
```

## 3. Запуск backend (после реализации)

```bash
cd backend
npm install
npm run dev
```

Проверка:

```bash
curl -s http://localhost:3000/api/v1/health
```

## 4. Сценарий SC-001 — регистрация и sync

### Локальный путь (пилот)

Тестовый репозиторий для compose — `docker/fixtures/repos/sample-project` (git).
В контейнере backend он доступен как `/repos/sample-project`.

**Локально** (`npm run dev` на хосте):

```bash
# путь к фикстуре на хосте (от корня репозитория ods-architecture)
export SAMPLE_REPO="$(pwd)/docker/fixtures/repos/sample-project"

curl -s -X POST http://localhost:3000/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d "{
    \"source_type\": \"local_path\",
    \"source_value\": \"$SAMPLE_REPO\",
    \"name\": \"Sample\"
  }"
```

**В Docker** (профиль `full`, mount `./fixtures/repos` → `/repos`):

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

Сохранить `id` из ответа → `PROJECT_ID`.

Ожидание sync (polling):

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

## 5. Дерево файлов

```bash
curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/elements?parent_path=&limit=100"
```

Ожидание: `items[]` без путей `.git/...`.

## 6. Содержимое файла

Взять `elementId` файла `.md` или `.txt` из дерева:

```bash
curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/elements/$ELEMENT_ID/content"
```

Ожидание: `"kind": "text"` и поле `content`.

## 7. Смена статуса (SC-002)

```bash
curl -s -X PATCH "http://localhost:3000/api/v1/projects/$PROJECT_ID/elements/$ELEMENT_ID" \
  -H 'Content-Type: application/json' \
  -d '{"status": "needed"}'
```

Перезапустить backend → GET element → `status: needed`.

## 8. Повторный sync (SC-003)

```bash
curl -s -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/sync"
```

Повторить GET children — число активных элементов с тем же `path` не растёт.

## 9. Ошибка sync_in_progress (409)

Два быстрых POST sync подряд — второй ответ:

```json
{ "code": "sync_in_progress", "message": "..." }
```

## Связь с порталом и полным стеком

После реализации `003` тот же сценарий — через UI
([quickstart портала](../003-portal-mvp/quickstart.md)).

**Полный стек (backend + frontend + ES)** — уже описан в `docker/docker-compose.dev.yml`
(профиль `full`):

```bash
docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
curl -s http://localhost:8080/api/v1/health   # через nginx
```

Этап `004-mvp-runtime` (планируется) формализует smoke-тесты, CI и production-like
приёмку; до его появления пилотный compose в `docker/` — источник правды.

## Ссылки

- [openapi.yaml](./contracts/openapi.yaml)
- [data-model.md](./data-model.md)
- [elasticsearch-indices.md](./contracts/elasticsearch-indices.md)
