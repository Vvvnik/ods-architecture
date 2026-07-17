# Тестовые git-репозитории для ODS MVP

Каталог монтируется в backend-контейнер как `/repos:ro` (см. `docker/.env.example`, volume в `docker-compose.dev.yml`).

## Каталоги

| Каталог | В git ODS? | Как подготовить | `local_path` в Docker |
|---------|------------|-----------------|------------------------|
| `sample-project/` | файлы да, `.git` нет | `setup-fixtures.sh` | `/repos/sample-project` |
| `code-graph-depth-demo/` | файлы да | `setup-fixtures.sh` | `/repos/code-graph-depth-demo` |
| `graph-demo/` | файлы да | `setup-fixtures.sh` | `/repos/graph-demo` |
| `system-landscape-demo/` | файлы да | `setup-fixtures.sh` | `/repos/system-landscape-demo` |
| `perf-bulk/` | нет | `setup-fixtures.sh --demo` | `/repos/perf-bulk` |
| `large-repo/` | нет | `setup-fixtures.sh --demo` | `/repos/large-repo` |
| `ods-arch/` | нет | `setup-fixtures.sh --demo` | `/repos/ods-arch` |

После `git clone` родительского репозитория вложенные `.git` в фикстурах отсутствуют (иначе submodule). Backend при импорте требует настоящий git-репозиторий — это и делают скрипты ниже.

## Подготовка после clone

Из **корня** `ods-architecture`:

```bash
# обязательные фикстуры (sample + 006/008/009); ods-arch — только git init, если каталог уже есть
./docker/fixtures/repos/setup-fixtures.sh

# + локальные демо: perf-bulk, large-repo, ods-arch
./docker/fixtures/repos/setup-fixtures.sh --demo

# то же, что --demo:
./docker/fixtures/repos/setup-demo-repos.sh
```

| Скрипт | Что делает |
|--------|------------|
| `setup-fixtures.sh` | `git init` + первый коммит в `sample-project`, `code-graph-depth-demo`, `graph-demo`, `system-landscape-demo`; если есть `ods-arch/` без `.git` — тоже `git init` (файлы не копирует) |
| `setup-fixtures.sh --demo` | то же, затем вызывает `setup-demo-repos.sh` |
| `setup-demo-repos.sh` | сначала `setup-fixtures.sh`, затем **пересоздаёт** демо-репы: генерирует `perf-bulk` и `large-repo`; для `ods-arch` копирует актуальные `backend/`, `frontend/`, `parsers/` и `docker/docker-compose.dev.yml` из корня monorepo (`rsync`/`cp` без `node_modules/`, `bin/`, `obj/`, `dist/` …), затем делает `git init` и коммит |

## `sample-project`

Минимальный репозиторий для quickstart, пилота и интеграционных тестов backend:

- `README.md` — текстовый файл для просмотра в портале
- `src/hello.ts` — пример исходника (UTF-8)

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

## `graph-demo` (импорты, 006)

Небольшой TypeScript-проект с рёбрами `imports` между модулями (без `calls`).  
Подробности: [graph-demo/README.md](./graph-demo/README.md). Docker: `/repos/graph-demo`.

## `ods-arch` (dogfood — ODS на себе)

Локальный демо-репозиторий: актуальные исходники самого ODS для импорта «реального» многоязычного дерева в портал.

- **Не** хранится в git ODS (см. корневой `.gitignore`).
- Обычный `setup-fixtures.sh` **не копирует** файлы — только `git init`, если каталог `ods-arch/` уже есть.

### Как создаётся (`setup-demo-repos.sh` / `--demo`)

1. Удаляет старый `docker/fixtures/repos/ods-arch/` (если был).
2. Копирует из корня monorepo актуальные пути (как в реальном репо):
   - `backend/` → `ods-arch/backend/`
   - `frontend/` → `ods-arch/frontend/`
   - `parsers/` → `ods-arch/parsers/`
   - `docker/docker-compose.dev.yml` → `ods-arch/docker/docker-compose.dev.yml`
3. Исключает при `rsync` папок: `node_modules/`, `bin/`, `obj/`, `dist/`, `build/`, `coverage/`, `data/` и т.п.
4. Делает `git init` + первый коммит — без `.git` backend не примет импорт.

```bash
./docker/fixtures/repos/setup-demo-repos.sh
# или:
./docker/fixtures/repos/setup-fixtures.sh --demo
```

**Docker:** `local_path` = `/repos/ods-arch`

```bash
curl -s -X POST http://localhost:3000/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{"source_type":"local_path","source_value":"/repos/ods-arch","name":"ODS Arch"}'
```

Если каталог уже скопирован вручную (без `.git`), достаточно:

```bash
./docker/fixtures/repos/setup-fixtures.sh
```

## Демо-репы: `perf-bulk`, `large-repo`, `ods-arch`

Локальные каталоги (не в git ODS). Создаются одним скриптом:

```bash
./docker/fixtures/repos/setup-demo-repos.sh
# то же: ./docker/fixtures/repos/setup-fixtures.sh --demo
```

| Каталог | Как появляется | Импорт в Docker | Имя в UI |
|---------|----------------|-----------------|----------|
| `perf-bulk/` | скрипт **генерирует** ~520 `.txt` → `git init` | `/repos/perf-bulk` | Perf Bulk |
| `large-repo/` | скрипт **генерирует** ≥1000 файлов (ts/cs/compose + pad) → `git init` | `/repos/large-repo` | Large Repo |
| `ods-arch/` | скрипт **копирует** актуальные `backend/`, `frontend/`, `parsers/`, `docker/docker-compose.dev.yml` из monorepo (без `node_modules`/`bin`/`obj`) → `git init` | `/repos/ods-arch` | ODS Arch |

**010 / SC-002:** DoD walk-count — `large-repo` (≥1000 файлов). Отсутствие fixture в тестах — не PASS: сначала создать демо.

Пустые `.txt`-only уже не цель: для SC-003/SC-005 и парсеров нужны ts/cs/compose из генерации `large-repo`.

После скрипта зарегистрировать через UI (**Импорт**) или API. Sync должен завершиться со статусом **Готово**.

## Добавить свой репозиторий

1. Склонировать или выполнить `git init` в новой папке под `docker/fixtures/repos/`.
2. Убедиться, что это git-репозиторий (есть каталог `.git`).
3. Добавить хотя бы один коммит с файлами.
4. Зарегистрировать через API (`POST /api/v1/projects`) или UI портала.

### Рекомендации

- Используйте **локальный путь** для пилота; Git URL требует сети и `git` в контейнере backend.
- Не коммитьте секреты и большие бинарники — фикстуры в git только для dev/smoke.
- Для нагрузочных тестов (`backend/tests/integration/*`) репозитории создаются во временных каталогах автоматически.
- **`perf-bulk`**, **`large-repo`**, **`ods-arch`** — локальные демо (не в git ODS); создать: `./docker/fixtures/repos/setup-fixtures.sh --demo`.

## Связанные документы

- [specs/002-domain-model/quickstart.md](../../specs/002-domain-model/quickstart.md)
- [specs/010-scale-pipeline/quickstart.md](../../specs/010-scale-pipeline/quickstart.md)
- [docker/docker-compose.dev.yml](../docker-compose.dev.yml)
