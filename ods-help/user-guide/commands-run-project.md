# Запуск ODS MVP в Docker (полный стек)

Elasticsearch + backend + frontend. Портал: **http://localhost:8080**.

Все команды — из **корня** репозитория `ods-architecture`.

| Сервис | Порт | Назначение |
|--------|------|------------|
| `elasticsearch` | 9200 | Метаданные |
| `backend` | 3000 | API `/api/v1/*` |
| `frontend` | 8080 | SPA + nginx (`/api` → backend) |

Фикстура на хосте: `docker/fixtures/repos/sample-project` → в контейнере: `/repos/sample-project`.

---

## Подготовка (один раз)

```bash
cp docker/.env.example docker/.env
./docker/fixtures/repos/setup-fixtures.sh
```

`setup-fixtures.sh` создаёт `.git` в `sample-project` (файлы в репозитории, каталог `.git` — локально после clone). Без этого импорт `/repos/sample-project` даст «не git-репозиторий».

Опционально демо Perf Bulk / Large Repo: `./docker/fixtures/repos/setup-fixtures.sh --demo`

В `docker/.env` задано `COMPOSE_PROJECT_NAME=ods-mvp` — контейнеры ODS называются `ods-mvp-elasticsearch-1`, `ods-mvp-backend-1`, `ods-mvp-frontend-1` и **не смешиваются** с другими compose из каталога `docker/` (asciidoc и т.п.).

---

## Запуск

Если контейнеры уже крутятся — сначала остановить:

```bash
docker compose -f docker/docker-compose.dev.yml --profile full down
```

Поднять стек:

```bash
docker compose -f docker/docker-compose.dev.yml --profile full up -d
```

После изменений в коде — с пересборкой образов:

```bash
docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
```

Проверка:

```bash
curl -s http://localhost:8080/api/v1/health
# {"status":"ok","elasticsearch":"ok"}
```

Браузер: **http://localhost:8080**

Логи: `docker compose -f docker/docker-compose.dev.yml --profile full logs -f backend` (или `frontend`).

Другой порт UI — в `docker/.env`: `FRONTEND_PORT=8080`.

---

## Импорт проекта (Docker)

1. **Импорт** → тип **Локальный путь** → путь `/repos/sample-project` (не путь Mac).
2. После sync: **Проекты** → открыть проект → `src/hello.ts`.

Повторный импорт **того же пути** откроет существующий проект; имя при повторе не меняется. Удаление одного проекта — в [later.md](./later.md).

Для демо БД можно не чистить (`down` без `-v`).

---

## Остановка

Остановить, **проекты в ES сохранятся**:

```bash
docker compose -f docker/docker-compose.dev.yml --profile full down
```

Полная очистка данных ODS (все проекты в списке):

```bash
docker compose -f docker/docker-compose.dev.yml --profile full down -v
```

Фикстура `sample-project` на диске не удаляется.

---

## Dev без frontend-контейнера

Hot reload на :5173 — [commands.md](./commands.md) (ES в Docker + `npm run dev`).

---

## Troubleshooting

| Симптом | Действие |
|---------|----------|
| 502 на `/api` | `logs backend`; ES healthy? |
| «Локальный путь недоступен» | В Docker — `/repos/...`, не `/Users/...`; выполнить `./docker/fixtures/repos/setup-fixtures.sh` |
| `ERR_MODULE_NOT_FOUND` / граф не строится после clone | Убедиться, что **нет** mount `../parsers` (только `docker-compose.dev.yml`, без `parsers-dev`); пересобрать backend: `… up --build -d` |
| Лишние проекты в списке | Нормально; тесты `npm test` или старые импорты — см. [later.md](./later.md) |
| WARN orphan containers (asciidoc…) | Старый проект `docker`; в `.env` должен быть `COMPOSE_PROJECT_NAME=ods-mvp` — см. ниже |

### Переход со старого имени проекта `docker`

Если раньше поднимали без `COMPOSE_PROJECT_NAME`, контейнеры назывались `docker-*` и появлялся WARN про asciidoc.

1. Остановить **старый** стек ODS (asciidoc не трогает):

```bash
docker compose -p docker -f docker/docker-compose.dev.yml --profile full down
```

2. В `docker/.env` добавить или проверить: `COMPOSE_PROJECT_NAME=ods-mvp`

3. Поднять заново (читает `.env` автоматически):

```bash
docker compose -f docker/docker-compose.dev.yml --profile full up -d
```

Появятся контейнеры `ods-mvp-elasticsearch-1`, `ods-mvp-backend-1`, `ods-mvp-frontend-1`. WARN про orphan исчезнет.

**Данные ES:** у нового имени проекта — **новые** volumes (`ods-mvp_es-data`). Старые проекты остались в `docker_es-data` (не используются). Для демо можно импортировать заново; старый volume позже: `docker volume rm docker_es-data docker_ods-data` (если не нужен).

Контейнеры asciidoc (`asciidoc-site`, …) остаются в проекте `docker` для вашего другого репозитория — ODS их не удаляет.

Явно задать имя в команде (без `.env`): `docker compose -p ods-mvp -f docker/docker-compose.dev.yml ...`

Имена **без** префикса (`elasticsearch-1`) Compose не даёт — всегда `{проект}-{сервис}-1`, если не задавать `container_name` вручную (не рекомендуется: конфликты портов).

Ссылки: [fixtures README](../../docker/fixtures/repos/README.md) · [quickstart](../../specs/003-portal-mvp/quickstart.md)


## Образы — актуальные (оставить)

| Образ | Откуда | Зачем |
|-------|--------|-------|
| `ods-mvp-backend:latest` | docker compose ... up --build | backend API |
| `ods-mvp-frontend:latest` | то же | nginx + SPA (Vue 3 + Vite) |
| `docker.elastic.co/elasticsearch/elasticsearch:8.11.0` | pull с Elastic | Elasticsearch |

