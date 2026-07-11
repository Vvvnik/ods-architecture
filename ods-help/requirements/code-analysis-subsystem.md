# ODS — Архитектура подсистемы анализа кода

> **Контекст.** Post-MVP анализ (спеки `005-code-analysis`, `006-project-graph`).
> Платформа MVP (`002` + `003`) — импорт, sync, дерево, read-only файлы — **реализована**.
> Каноническая модель графа — [`canonical-graph-model.md`](./canonical-graph-model.md).
> Черновик требований — [`data-model-persig-analysis-draft.md`](./data-model-persig-analysis-draft.md).
>
> **Обновлено:** 2026-07-11 (единый канал парсеров → ingest → канон ES)

## 1. Назначение

Подсистема анализа: определение языков репозитория, запуск **модульных** парсеров,
ingest в **канонический граф** (Elasticsearch), отображение в UI.

---

## 2. Общая архитектура

```text
Git URL / Local Repo
        ↓
Repository Sync (002)
        ↓
Working Copy (volume / mount в контейнере)
        ↓
┌───────────────────────────────────────────────────────────┐
│ 005: Language Detector → отчёт по языкам (ES)              │
└───────────────────────────────────────────────────────────┘
        ↓  UX: два модальных окна (языки → изменения)
        ↓  парсеры — только после двух «Продолжить»
        ├─ Parser module (typescript) → envelope ───────────────┐
        ├─ Parser module (csharp)     → envelope ─────────────┤
        ├─ Parser module (python)     → envelope ─────────────┤
        ├─ Parser module (cpp)        → envelope ─────────────┤
        │   (model = native extract, свой у каждого модуля)     │
        └─ …                                                      │
                                                                  ↓
                                                    006: Ingest adapters
                                                                  ↓
                        ES: graph_nodes / graph_edges / analysis_runs / …
                                                                  ↓
                                          ODS API + минимальный UI «Граф» (006)
```

**Не делаем:** единый «unified extract JSON» на выходе всех парсеров; один JSON
всего проекта от языковых парсеров. **Делаем:** envelope + свободный `model` → канон в ES.

---

## 3. Технологический стек

### Backend (оркестрация)

- **TypeScript** — ODS Service: sync (002), оркестратор анализа (005), API графа (006)
- Парсеры — **отдельные subprocess** (CLI), не код внутри monolith

### Parser modules (целевой набор 005)

| Модуль | Технология (ориентир) | Выход | Поставка (разработка) |
|--------|----------------------|-------|------------------------|
| `typescript` | TS Compiler API (Node) | envelope, `model` = TS extract | инкремент 1 |
| `csharp` | Roslyn (.NET CLI) | envelope, `model` = C# extract | инкремент 2 |
| `python` | ast / libcst (TBD) | envelope, `model` = Python extract | инкремент 3 |
| `cpp` | libclang / tree-sitter (TBD) | envelope, `model` = C++ extract | инкремент 4 |
| прочие | новый каталог `parsers/<id>/` | свой `model`, статус `missing` до регистрации | по мере надобности |

**Порядок запуска (runtime):** по убыванию `file_count` в отчёте детектора — **не** по
колонке «Поставка» и не по языку backend. Канон: `specs/005-code-analysis/spec.md` (FR-004, FR-008).

### Извлечение кода

| Канал | Инструмент | Выход | Слияние |
|-------|------------|-------|---------|
| Языковые парсеры | N CLI-модулей | envelope × N | ingest → **канон ES** |

### Размещение парсеров в ODS

```text
┌─ ODS (docker-compose / образ) ────────────────────────────────────┐
│  ODS Service (TS)     Parser CLIs              Working Copy         │
│  оркестратор     →    subprocess × N      ←   WC из 002            │
│       │                    │ stdout / буфер → ES                      │
│       └──── ingest adapters (006) ───────────────────────────────  │
│  Elasticsearch (es-data volume)                                      │
└────────────────────────────────────────────────────────────────────┘
```

| Вариант | Суть | Когда |
|---------|------|-------|
| **A. CLI в образе** | `parsers/*` в PATH; Service `spawn` | целевая поставка |
| **B. Sidecar** | общие volumes | тяжёлые deps |
| **C. Внешний** | ручная установка | только dev |

### Хранилище

- **Elasticsearch** — канон графа (`006`), метаданные платформы (`002`), отчёт по
  языкам, сырые результаты парсеров, `analysis_runs`
- **Volume / mount в контейнере** (`ods-data`, `/repos`) — **только исходники** проекта
- RAG (ChromaDB и аналоги) — `012-rag-mcp`, отдельное решение

Парсер при запуске может отдавать JSON через stdout; **постоянное хранение** — в ES,
не на FS как основной слой.

### Frontend

- Минимальный UI «Граф» — в scope **`006`** (список узлов, простая визуализация);
  заменяет заглушку `003`
- Полноценный graph viewer (React Flow) — `010-ods-graph-viewer`, после `008`/`009`

---

## 4. Работа с репозиториями

Импорт и sync — **`002-domain-model`** (реализовано).

### 4.1 Запуск анализа (005)

```text
sync или импорт завершён
→ Language Detector (автоматически)
→ UI: окно 1 (языки, сортировка по file_count) → «Продолжить» / «Отмена»
→ UI: окно 2 (изменения в коде) → «Продолжить» / «Отмена»
→ для каждого language с parser_status=available (порядок как в отчёте):
      spawn parser module(изменённые или все файлы языка)
→ envelope + отчёты → ES
→ 006 ingest → graph_nodes / graph_edges
```

Парсеры **не** стартуют без двух подтверждений пользователя.

### 4.2 Инкрементальное обновление (обязательно в первой итерации)

```text
git diff (или сравнение с прошлым sync) → только изменённые файлы
→ перезапуск затронутых модулей (005)
→ удаление nodes/edges для удалённых/изменённых path в ES (006)
→ ingest новых (006)
```

---

## 5. Языковые парсеры (005)

### Envelope (общий контракт)

```json
{
  "parser_id": "typescript",
  "schema_version": "1",
  "project_id": "uuid",
  "analysis_run_id": "uuid",
  "generated_at": "ISO-8601",
  "files_analyzed": ["src/app.ts"],
  "model": { }
}
```

Поле `model` — **native extract**; схема **разная** у каждого `parser_id`.

### Каталог `parsers/`

```text
parsers/
  typescript/
    manifest.json
    run.mjs
  csharp/
    manifest.json
    run.sh
  python/
    ...
  cpp/
    ...
```

Оркестратор: manifest → spawn → проверка exit code → envelope в ES → ingest 006.

### Канон в ES (006) — примеры

Упрощённо; полная схема — `canonical-graph-model.md`.

**Node:**

```json
{
  "id": "typescript:src/app.ts:App",
  "kind": "class",
  "name": "App",
  "language": "typescript",
  "parser_id": "typescript",
  "path": "src/app.ts",
  "project_id": "uuid"
}
```

**Edge:**

```json
{
  "from": "typescript:src/app.ts:App.render",
  "to": "typescript:src/utils.ts:format",
  "type": "calls",
  "language": "typescript",
  "parser_id": "typescript",
  "project_id": "uuid"
}
```

---

## 6. Обновление графа

- пересчёт **только изменённых** файлов (`git diff`, 005 + 006)
- удаление старых nodes/edges для `path` + `parser_id` при изменении/удалении файла
- DELETE проекта (002) каскадирует **все** индексы анализа по `project_id`

---

## 7. Elasticsearch

**Отдельные индексы** (как `ods-projects` / `ods-elements` в `002`), связь через
`project_id` — **не** nested внутри документа проекта.

| Индекс | Назначение | Спека |
|--------|------------|-------|
| `ods-projects`, `ods-elements` | проект, дерево | `002` ✅ |
| `graph_nodes`, `graph_edges` | канон графа | `006` |
| `analysis_runs` | прогоны анализа | `006` |
| отчёт по языкам, payload парсеров | артефакты 005 | `005` / `006` |

Фильтрация по `project_id` (и `analysis_run_id` для версий прогона).

---

## 8. Принципы

- **модульные парсеры** — отдельный CLI на язык; новый язык = новый модуль
- **envelope общий**, **`model` свой** у каждого парсера
- **канон единый** в ES после ingest (006)
- **все артефакты анализа в ES**; на volume — только исходники
- оркестратор в TS Service; Roslyn — subprocess, не смена стека 002
- `project_id` как ключ изоляции
- языки в отчёте — **сортировка по `file_count` убыв.**

---

## 9. Что НЕ входит в первую итерацию 005/006

- Redis, Kafka, микросервисы
- RAG (`012-rag-mcp`), полноценный graph viewer (React Flow) — `010-ods-graph-viewer`
- Auth
- единый unified JSON в `model` для всех языков
- монолитный JSON всего проекта от парсеров

---

## 10. Итоговая модель

```text
Repo → Sync (002) → Working Copy (volume)
                        └→ Detector → отчёт по языкам (ES)
                              └→ UX (2 окна) → Parsers → envelope (ES) → Ingest (006) → канон ES → UI (006)
```
