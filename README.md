# ods-architecture

**ODS** — веб-портал для git-проектов: sync, просмотр кода, анализ и граф зависимостей в одном интерфейсе. Репозиторий собран вокруг **[GitHub Spec Kit](https://github.com/github/spec-kit)** — [Spec-Driven Development](https://github.com/github/spec-kit): идея → `spec.md` → `plan.md` → `tasks.md` → код в Cursor (`/speckit-*`).

**Стек:** TypeScript (Fastify + React), Elasticsearch, Docker Compose.

---

## Назначение

Проект предназначен для **просмотра, анализа и документирования архитектуры** программных систем **на основе исходного кода** git-репозиториев с целью централизованного доступа к структуре проекта, зависимостям между компонентами и сопутствующим метаданным без переключения между разрозненными инструментами.

Платформа импортирует репозиторий, выполняет языковой анализ, формирует канонический граф в Elasticsearch и отображает результат в веб-интерфейсе. Исходные файлы хранятся в рабочей копии; метаданные и граф — в ES.

| Часть | Что делает |
|-------|------------|
| **Портал** | Импорт и sync, дерево файлов, read-only просмотр, UI «Граф» |
| **Анализ** | Детектор языков → модульные парсеры (`parsers/`) → канон в ES |
| **Spec Kit** | Требования и задачи в `specs/`, агент в Cursor по slash-командам |

Требования и roadmap не дублируем здесь — канон в [`specs/**/spec.md`](specs/), видение в [`specs/001-ods-vision/spec.md`](specs/001-ods-vision/spec.md).

---

## Структура (кратко)

Код, спеки и инфраструктура Spec Kit лежат рядом; подробности по фиче — всегда в её `plan.md`.

| Путь | Назначение |
|------|------------|
| `backend/`, `frontend/` | API и SPA портала |
| `parsers/` | CLI-парсеры (TypeScript, C#, Python, C++) |
| `docker/` | Compose, `.env`, демо-репозитории |
| `specs/` | Спецификации, планы, задачи (SDD) |
| `.specify/`, `.cursor/` | Spec Kit и skills для агента |
| `ods-help/` | User guide и черновики (не канон) |

---

## Требования

Для пилота на Docker достаточно Git и Docker; Node и Cursor — если разрабатываете или ведёте SDD-цикл локально.

| Компонент | Зачем |
|-----------|--------|
| **Git** | Клонирование, фикстуры |
| **Docker Compose** v2 | Запуск ES + backend + frontend |
| **Node.js 20+** | Локальный `npm run dev` без Docker |
| **Cursor** | Slash-команды Spec Kit (`cursor-agent`, v0.11.9) |

---

## Клонирование

```bash
git clone git@gitlab.com:vvvnik/ods-architecture.git
cd ods-architecture
```

---

## Установка и запуск

Рекомендуемый путь — **полный профиль** Compose (портал на `:8080`). Команды — из корня репозитория.

```bash
# cp docker/.env.example docker/.env

# 1) git init в обязательных фикстурах (sample + демо 006/008/009/…)
./docker/fixtures/repos/setup-fixtures.sh

# 2) опционально: демо-папки (не в git ODS) — perf-bulk, large-repo, ods-arch
./docker/fixtures/repos/setup-demo-repos.sh
# то же одной командой:
# ./docker/fixtures/repos/setup-fixtures.sh --demo

docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
```

| Скрипт | Что делает |
|--------|------------|
| `setup-fixtures.sh` | `git init` + первый коммит в `sample-project`, `code-graph-depth-demo`, `graph-demo`, `system-landscape-demo`, `api-routes-csharp-demo` (без `.git` импорт в UI падает) |
| `setup-demo-repos.sh` | Сначала fixtures, затем **создаёт** `perf-bulk`, `large-repo` и **копирует** dogfood `ods-arch` (`backend`/`frontend`/`parsers` + compose) |

После скриптов каталоги видны в контейнере как `/repos/<имя>` (mount `docker/fixtures/repos` → `/repos`). Подробности и таблица путей: [`docker/fixtures/repos/README.md`](docker/fixtures/repos/README.md).

---

## Проверка

Убедитесь, что API и Elasticsearch отвечают:

```bash
curl -s http://localhost:8080/api/v1/health
# {"status":"ok","elasticsearch":"ok"}
```

Откройте **http://localhost:8080** → **Импорт** → тип **Локальный путь** (путь **в контейнере**, не на Mac):

| Демо | `local_path` |
|------|----------------|
| Quickstart | `/repos/sample-project` |
| Dogfood ODS | `/repos/ods-arch` (после `setup-demo-repos.sh`) |
| Large / perf | `/repos/large-repo`, `/repos/perf-bulk` |

---

## Остановка

```bash
docker compose -f docker/docker-compose.dev.yml --profile full down
```

Том ES не удаляется — проекты в индексе сохранятся (не добавляйте `-v`, если данные нужны).

---

## Spec Kit в Cursor

Обычный цикл — от описания фичи до кода по задачам:

| Шаг | Команда |
|-----|---------|
| Спецификация | `/speckit-specify` |
| План | `/speckit-plan` |
| Задачи | `/speckit-tasks` |
| Реализация | `/speckit-implement` |

Полный список, включая `analyze`, `converge`, `agent-context.update`: [`ods-help/user-guide/commands.md`](ods-help/user-guide/commands.md).

---

## Документация

Если README не хватает — загляните сюда:

| Тема | Файл |
|------|------|
| Запуск, импорт, troubleshooting | [`commands-run-project.md`](ods-help/user-guide/commands-run-project.md) |
| Демо-репозитории `/repos/…` | [`docker/fixtures/repos/README.md`](docker/fixtures/repos/README.md) |
| Архитектура MVP | [`architecture.md`](ods-help/user-guide/architecture.md) |
| Конституция SDD | [`constitution.md`](.specify/memory/constitution.md) |
| Spec Kit (upstream) | [github.com/github/spec-kit](https://github.com/github/spec-kit) |
