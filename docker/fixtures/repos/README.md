# Тестовые git-репозитории для ODS MVP

Каталог монтируется в backend-контейнер как `/repos:ro` (см. `docker/.env.example`).

## `sample-project`

Минимальный репозиторий для quickstart, пилота и интеграционных тестов backend:

- `README.md` — текстовый файл для просмотра в портале
- `src/hello.ts` — пример исходника (UTF-8)

В git хранятся **файлы**, без вложенного `.git` (иначе submodule). После `git clone` один раз:

```bash
./docker/fixtures/repos/setup-fixtures.sh
```

Скрипт делает `git init` в `sample-project` — backend требует git-репозиторий при импорте.

### Использование

**Локальный backend** (`npm run dev`):

```bash
source_type: local_path
source_value: <абсолютный путь>/docker/fixtures/repos/sample-project
```

**Backend в Docker** (профиль `full`):

```bash
source_type: local_path
source_value: /repos/sample-project
```

## `code-graph-depth-demo` (спека 008)

Демо C# + TypeScript для проверки `calls` / `injects` после анализа:

- `csharp/Repo.cs`, `csharp/Service.cs` — `Create` → `Save`, ctor DI
- `typescript/save.ts`, `typescript/create.ts` — `create` → `save`

Подробности: [code-graph-depth-demo/README.md](./code-graph-depth-demo/README.md).

**Docker:** `local_path` = `/repos/code-graph-depth-demo`

```bash
curl -s -X POST http://localhost:3000/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{"source_type":"local_path","source_value":"/repos/code-graph-depth-demo","name":"008 Demo"}'
```

## `system-landscape-demo` (спека 009)

Демо compose + openapi + appsettings + dotnet + bus для system-слоя графа:

- `docker-compose.yml`, `contracts/openapi.yaml`, `src/Api/appsettings.json`
- `*.csproj`, RabbitMQ handlers, golden links в `backend/tests/fixtures/system-landscape/`

**Docker:** `local_path` = `/repos/system-landscape-demo`

```bash
./docker/fixtures/repos/setup-fixtures.sh
```

## `graph-demo` (импорты, 006)

Небольшой TypeScript-проект с рёбрами `imports` между модулями (без `calls`).  
Подробности: [graph-demo/README.md](./graph-demo/README.md). Docker: `/repos/graph-demo`.

## Добавить свой репозиторий

1. Склонировать или выполнить `git init` в новой папке под `docker/fixtures/repos/`.
2. Убедиться, что это git-репозиторий (есть каталог `.git`).
3. Добавить хотя бы один коммит с файлами.
4. Зарегистрировать через API (`POST /api/v1/projects`) или UI портала.

### Рекомендации

- Используйте **локальный путь** для пилота; Git URL требует сети и `git` в контейнере backend.
- Не коммитьте секреты и большие бинарники — фикстуры в git только для dev/smoke.
- Для нагрузочных тестов (`backend/tests/integration/*`) репозитории создаются во временных каталогах автоматически.
- **`perf-bulk`** и **`large-repo`** — локальные демо-репозитории (не коммитятся в git); создать: `./docker/fixtures/repos/setup-fixtures.sh --demo`

## Подготовка фикстур после clone

```bash
./docker/fixtures/repos/setup-fixtures.sh          # sample-project + code-graph-depth-demo + graph-demo + system-landscape-demo
./docker/fixtures/repos/setup-fixtures.sh --demo   # + perf-bulk, large-repo
```

## Демо: `perf-bulk` и `large-repo`

Для показа пагинации и большого sync (аналоги интеграционных тестов, но пути стабильны в Docker):

| Каталог | Файлов | Импорт в Docker (`local_path`) | Имя в UI |
|---------|--------|--------------------------------|----------|
| `perf-bulk/` | 520 | `/repos/perf-bulk` | Perf Bulk |
| `large-repo/` | 1000 | `/repos/large-repo` | Large Repo |

Создать или пересоздать каталоги:

```bash
./docker/fixtures/repos/setup-demo-repos.sh
# то же: ./docker/fixtures/repos/setup-fixtures.sh --demo
```

После `setup-demo-repos.sh` зарегистрировать через UI (**Импорт**) или API. Sync должен завершиться со статусом **Готово**.

## Связанные документы

- [specs/002-domain-model/quickstart.md](../../specs/002-domain-model/quickstart.md)
- [docker/docker-compose.dev.yml](../docker-compose.dev.yml)
