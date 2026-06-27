# ODS MVP — Архитектура подсистемы анализа кода

> **Контекст.** Этот документ детализирует этапы 2–3 из [`text.md`](text.md)
> (анализ кода и хранилище графа). Портал, дерево файлов и статусы — отдельный
> MVP платформы (`specs/001-ods-vision`). Каноническая модель графа — в
> [`text-3.md`](text-3.md). Схема — [`schema.puml`](schema.puml).

## 1. Назначение

ODS — сервис анализа исходного кода репозиториев с построением графа сущностей
и зависимостей, а также индексацией результатов для поиска.

---

## 2. Общая архитектура

```text
Git URL / Local Repo
        ↓
Repository Sync (clone + fetch)
        ↓
Working Copy (/workspace/repos/{repo_id})
        ↓
        ├─ Language Parsers (Roslyn / TS Compiler API)
        │       ↓
        │   Extract Model → Unified Graph (nodes + edges)
        │
        └─ Graphify (встроенный CLI в поставке ODS)
                ↓
            Graphify JSON (собственный формат, не Roslyn/AST)
                ↓
        Graph Adapter → Unified Graph / поиск / UI
        ↓
Elasticsearch (nodes / edges / files)
        ↓
ODS API (C# / TypeScript)
        ↓
Web UI (graph viewer)
```

---

## 3. Технологический стек

### Backend
- C# (Roslyn для анализа C# кода)
- TypeScript (AST анализ + API слой)
- **Graphify** — отдельный инструмент по логике и формату JSON; **входит в поставку ODS** (не внешний сервис)

### Извлечение кода (два независимых канала)

| Канал | Инструмент | Где живёт | Выход | Роль в ODS |
|-------|------------|-----------|-------|------------|
| Языковые парсеры | Roslyn, TS Compiler API | внутри ODS Service | Extract model → unified graph | Граф по C#/TS |
| Graphify | CLI, отдельный процесс | **в образе ODS**, рядом с Service | **Свой JSON** | Знания о репо, Q&A, UI; адаптер в Service |

Graphify **не** является парсером Roslyn/AST и **не** пишет напрямую в Elasticsearch — ODS Service нормализует JSON для хранения и отображения.

### Размещение Graphify в ODS (рекомендация для MVP)

Логика отделена от кода Service, но пользователь **не ставит Graphify отдельно** — он идёт в комплекте с ODS.

```text
┌─ ODS (одна поставка: docker-compose / образ) ─────────────────────┐
│  ODS Service          Graphify CLI          Working Copy           │
│  (оркестратор)   →    (subprocess)     ←    /workspace/repos/...   │
│       │                    │ JSON file / stdout                     │
│       └──── Graphify adapter ────────────────────────────────────  │
│  Elasticsearch (общий для платформы)                               │
└────────────────────────────────────────────────────────────────────┘
```

| Вариант | Суть | Когда |
|---------|------|-------|
| **A. CLI в образе Service** *(MVP)* | бинарь `graphify` в PATH или `/opt/ods/graphify`; Service делает `spawn` | один контейнер, проще эксплуатация |
| **B. Sidecar-контейнер** | тот же compose, общие volumes `workspace` и `graphify-cache` | если Graphify тяжёлый по deps или нужен отдельный lifecycle |
| **C. Внешний Graphify** | установка вручную на хосте | только dev/отладка, не целевая поставка |

Общее для A и B:
- общий **working copy** с sync репозитория;
- каталог артефактов, например `/workspace/graphify-out/{repo_id}/`;
- версия Graphify **пинится** в образе/compose (воспроизводимые сборки);
- Service не линкует Graphify как библиотеку — только **процесс + JSON**.

Graphify **не** отдельный микросервис с HTTP API в MVP: вызов через CLI из ODS Service (или sidecar по localhost, если понадобится позже).

### Хранилище (MVP анализа кода)
- Elasticsearch (индексы `nodes`, `edges`, `files` — см. text-3.md)

### Хранилище платформы и RAG (на оценку, не зафиксировано)
- PostgreSQL (или аналог) — структурные метаданные, статусы, спецификации (этап 1)
- ChromaDB (или аналог) — векторный поиск / RAG (этап 7)

Выбор PostgreSQL и ChromaDB — отдельное решение по целесообразности на соответствующих этапах; для графа кода на этапах 2–3 базовый ориентир — Elasticsearch.

### Runtime
- Docker (единый сервис или несколько контейнеров)

### Frontend
- TypeScript (React или аналог)
- графовая визуализация (React Flow / Cytoscape)

---

## 4. Работа с репозиториями

### 4.1 Импорт репозитория
Единый формат источника:
- Git URL
- локальный репозиторий (через локальный сервер или путь)

Процесс:
```text
clone → /workspace/repos/{repo_id}
```

---

### 4.2 Обновление репозитория

```text
git fetch
→ detect changes (diff)
→ analyze only changed files
→ update graph + Elasticsearch
```

Обновление запускается:
- вручную
- по таймеру

---

## 5.1 Graphify (отдельный инструмент, встроенный в ODS)

**Логически** — свой инструмент и свой JSON. **Физически** — часть установки ODS.

- поставляется **вместе с ODS** (образ Docker / compose); отдельная установка для пользователя не предполагается;
- запускается ODS Service как **subprocess** (вариант A) или sidecar с общим volume (вариант B);
- читает тот же **working copy**, что и языковые парсеры;
- на выходе — **собственный JSON** (схема Graphify, не unified graph), файл или stdout;
- Service: запуск → ожидание → приём JSON → **Graphify adapter** → UI / Elasticsearch;
- инкрементальное обновление и повторный запуск — по политике интеграции (этап 6).

Пример вызова (эскиз):

```text
graphify analyze --repo /workspace/repos/{repo_id} \
  --out /workspace/graphify-out/{repo_id}/graph.json
```

---

## 5.2 Анализ через языковые парсеры

Канонические поля узлов и рёбер unified graph — в [`text-3.md`](text-3.md). Ниже — упрощённые примеры.

### Сущности:
- классы
- методы
- функции
- импорты
- зависимости
- вызовы

### Nodes
```json
{
  "entity_id": "ClassA",
  "type": "class",
  "file": "A.cs",
  "repo_id": "repo1"
}
```

### Edges
```json
{
  "source": "ClassA.method1",
  "target": "ClassB.method2",
  "type": "calls",
  "file": "A.cs",
  "repo_id": "repo1"
}
```

---

## 6. Обновление графа

- пересчёт только изменённых файлов
- удаление старых nodes/edges для файла
- добавление новых данных

---

## 7. Хранение данных (Elasticsearch)

- index: `nodes` — сущности кода (class, method, function, …)
- index: `edges` — связи (calls, inherits, implements, …)
- index: `files` — метаданные файлов, хэши, статистика

Фильтрация всегда по `repo_id`.

---

## 8. Пользователи

- до ~10 пользователей (MVP)
- без сложной инфраструктурной изоляции

---

## 9. UI функции

- список репозиториев
- выбор репозитория
- просмотр графа
- навигация по зависимостям
- уведомление об обновлениях

---

## 10. Кэширование (MVP)

- in-memory cache
- кэш подграфов (опционально)
- без Redis и распределённых систем

---

## 11. Принципы MVP

- единый источник: repository URL
- инкрементальный анализ (git diff) для языковых парсеров
- Graphify — отдельный канал со своим JSON, **встроен в поставку ODS**
- один сервис ODS (оркестрация, API, адаптеры; Graphify — subprocess, не библиотека)
- Elasticsearch для графа кода на этапах 2–3
- repo_id как ключ изоляции данных

---

## 12. Что НЕ входит в MVP

- Redis
- микросервисы, API Gateway, брокеры сообщений (Kafka / RabbitMQ)
- распределённые инстансы ODS
- сложные системы синхронизации
- multi-cluster Elasticsearch
- сложный lifecycle репозиториев
- финальный выбор PostgreSQL / ChromaDB для платформы и RAG (решается на этапах 1 и 7)
- полноценные ИИ-агенты и Telegram (этап 8)

---

## 13. Итоговая модель

```text
Repo → Sync → Working Copy
                  ├→ Parsers → Unified Graph ─┐
                  └→ Graphify → Graphify JSON → Adapter ─┤
                                                          ↓
                                                   Elasticsearch → UI
          ↓
     incremental updates (парсеры)
```