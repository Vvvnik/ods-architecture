# ODS — Каноническая модель графа кода

> **Контекст.** Модель **уровня 3** (хранение в ES, спека `006-project-graph`).
> Поток и оркестрация — [`code-analysis-subsystem.md`](./code-analysis-subsystem.md).
> Черновик требований 005/006 — [`data-model-persig-analysis-draft.md`](./data-model-persig-analysis-draft.md).
> Визуализация — [`schema-project.puml`](./schema-project.puml).
>
> **Обновлено:** 2026-07-09 (синхронизировано с `data-model-persig-analysis-draft.md`)

## 1. Три уровня данных

| Уровень | Что | Формат | Где |
|---------|-----|--------|-----|
| **1** | Выход парсера | **Envelope** + свободный `model` | **Elasticsearch** (привязка `project_id`) |
| **1b** | Native `model` | свой у каждого `parser_id` | внутри envelope в ES |
| **2** | Артефакты прогона | N документов (по модулю) + отчёт по языкам | **Elasticsearch** |
| **3** | Канонический граф | **Единая** модель nodes/edges | **Elasticsearch** (`graph_*`) |
| — | Исходники проекта | файлы репозитория | volume / mount в контейнере (`002`) |
| — | Дерево файлов | `elements` | **Elasticsearch** (`002`), не дублировать |

AST (Roslyn, TS Compiler API) и native `model` **не** являются каноном для API/UI.
Они — источник для адаптера ingest; постоянное хранение envelope — в ES.

**Graphify** (`007`) — отдельный канал: **один JSON на весь репозиторий** (дизайн
инструмента); adapter сопоставляет с каноном ES и/или UI. Не смешивать с envelope
языковых парсеров.

## 2. Поток обработки

### Канал A — языковые парсеры (005 → 006)

```text
Working copy (002, volume)
  → Language Detector → отчёт по языкам (ES), сортировка по file_count
  → UX: окно языков → окно изменений (два «Продолжить»)
  → для каждого доступного parser_id (порядок как в отчёте):
        Parser CLI → envelope (model = native extract) → ES
  → Ingest adapter (per parser_id) → canonical nodes/edges
  → Elasticsearch (отдельные индексы)
  → API + минимальный UI «Граф» (006)
```

- **Не** один JSON на все языки в `model`.
- **Не** один JSON на весь проект от парсеров — отдельный envelope на модуль.
- **Инкремент:** только изменённые файлы (005); точечный ingest и удаление узлов (006).
- Межъязыковые связи (если нужны) — на уровне канона ES, не в native JSON.

### Канал B — Graphify (007)

```text
Working copy
  → Graphify CLI (subprocess)
  → Graphify JSON (один файл на репозиторий)
  → Graphify adapter → ES / UI / RAG
```

Оба канала могут работать параллельно; сырой Graphify JSON **не** основной формат
хранения — как и native `model` парсеров (хранится в ES до ingest в канон).

## 3. Каноническая модель (уровень 3, ES)

Единый формат **только здесь** — для API, UI и поиска.

### Node (сущность)

- kind: class, method, interface, function, field, property, …
- поля:
  - `id` — стабильный в рамках `project_id`
  - `kind`, `name`, `language`
  - `parser_id` — источник (typescript, csharp, python, cpp, …)
  - `parent_id`
  - `signature` (опционально)
  - `path`, `location` (строка/диапазон)
  - `element_id` или `path` — связь с деревом 002
  - `metadata` — расширения без смены схемы

### Edge (связь)

- type: calls, inherits, implements, usesType, references, imports, …
- поля:
  - `from`, `to` — id узлов канона
  - `type`, `language`, `parser_id`
  - `path`, `location` (контекст ребра)

### Analysis run

- `analysis_run_id`, `project_id`, `started_at`, `completed_at`, статус
- ссылка на отчёт по языкам и список envelope-артефактов (в ES)

## 4. Языковые парсеры (уровень 1)

### Envelope (общий контракт 005)

Все модули **MUST** отдавать JSON с полями: `parser_id`, `schema_version`,
`project_id`, `analysis_run_id`, `generated_at`, `files_analyzed`, `model`.

Содержимое `model` — **свободное** (см. `data-model-persig-analysis-draft.md` §4.1).

### Целевые модули (005)

| `parser_id` | Примечание |
|-------------|------------|
| `typescript` | первый инкремент |
| `csharp` | Roslyn subprocess |
| `python` | ИИ-стек |
| `cpp` | нативные библиотеки |
| прочие | `missing` в отчёте до регистрации модуля |

Каждый модуль — отдельный parser module + adapter в 006 → canonical nodes/edges.

## 5. Elasticsearch (006)

**Отдельные индексы** (как `ods-projects` / `ods-elements` в `002`), связь через
`project_id` — **не** nested в документе проекта.

| Индекс | Содержание |
|--------|------------|
| `graph_nodes` | канонические узлы |
| `graph_edges` | канонические рёбра |
| `analysis_runs` | метаданные прогонов |
| отчёт по языкам, payload парсеров | артефакты 005 (имена — в спеке `006`) |

Фильтрация всегда по `project_id`. Дерево файлов — `ods-elements` (`002`), не дублировать.

Удаление проекта — `delete_by_query` по `project_id` во всех индексах анализа.

## 6. Итоговая архитектура

```text
                    ┌─ TS parser   → envelope (ES) ─┐
WC → Detector (ES) ─┼─ C# parser   → envelope (ES) ─┼→ Ingest → ES (канон) → API/UI (006)
       UX 2 окна    ┼─ Python      → envelope (ES) ─┤
                    └─ C++ parser  → envelope (ES) ─┘
WC → Graphify ──────────────── Graphify JSON (1 файл) ─── adapter (007)
```

## 7. Хранилища вне графа кода

| Назначение | Кандидаты | Когда |
|------------|-----------|-------|
| Платформа (проект, дерево, анализ) | Elasticsearch | `002` ✅, `005`/`006` |
| Исходники | Docker volume / mount | `002` |
| Векторный поиск / RAG | ChromaDB и аналоги | `009` |

## 8. Ключевой результат

- **единый канон графа** в ES для всех языков и каналов (после ingest)
- **разный native `model`** у парсеров — нормально и ожидаемо
- **артефакты анализа в ES**, исходники — только в volume
- **отдельные индексы**, не nested
- **инкрементальный** пересчёт изменённых файлов (005 + 006)
- модульное добавление языков без смены envelope и без смены канона
