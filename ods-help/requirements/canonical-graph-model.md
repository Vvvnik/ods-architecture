# ODS — Каноническая модель графа кода

> **Контекст.** Дополняет [`text-2.md`](text-2.md) (поток и стек) и этапы 2–3
> из [`text.md`](text.md). Визуализация — [`schema.puml`](schema.puml).

## 1. Общий принцип системы
Система не хранит AST (Roslyn или TypeScript) как основной формат. AST используется только как промежуточный источник данных.

Основная цель — построение единой графовой модели кода:

- узлы (nodes)
- связи (edges)
- файловый контекст

## 2. Поток обработки данных

### Канал A — языковые парсеры

Исходный код
→ парсер языка (C# / TypeScript)
→ извлечение семантической модели (extract model)
→ преобразование в **unified graph**
→ индексация в Elasticsearch

### Канал B — Graphify (отдельный инструмент, в составе ODS)

Working copy (общий с каналом A)
→ **Graphify CLI** (процесс в поставке ODS, не библиотека в Service)
→ **Graphify JSON** (собственная схема)
→ Graphify adapter в ODS Service → unified graph и/или UI / поиск
→ при необходимости — Elasticsearch

Оба канала могут работать параллельно; AST и сырой JSON Graphify **не** являются основным форматом хранения.

## 3. Каноническая модель

### Node (сущности)
- class, method, interface, function, field, property
- содержит:
  - id
  - kind
  - name
  - language
  - parentId
  - signature
  - location
  - metadata

### Edge (связи)
- calls
- inherits
- implements
- usesType
- references
- creates
- reads / writes

Содержит:
- from
- to
- type
- language

## 4. Языковые парсеры

### C# (Roslyn)
- используется только для извлечения семантики
- формирует C# extract model
- далее преобразуется в unified graph model

### TypeScript (TS Compiler API)
- аналогично C#
- формирует TS extract model
- далее преобразуется в unified graph model

### Graphify (отдельно от парсеров, внутри поставки ODS)

- **логика**: внешний по формату инструмент; не использует extract model Roslyn/TS;
- **развёртывание**: бинарь/образ Graphify **входит в ODS**; Service запускает subprocess, не импортирует как SDK;
- общий working copy и каталог вывода (`graphify-out/{repo_id}/`);
- выдаёт **собственный JSON**;
- adapter в ODS Service сопоставляет с unified graph / UI;
- детали — этап 6 (`006-graphify-integration`).

## 5. Elasticsearch (граф кода, этапы 2–3)

### Индекс nodes
- хранит все сущности кода
- поддерживает текстовый и структурный поиск

### Индекс edges
- хранит все связи между сущностями
- используется для построения графа зависимостей

### Индекс files
- метаданные файлов
- статистика и хэши

## 6. Итоговая архитектура

```text
C# / TypeScript → Language Parser → Extract Model → Unified Graph → Elasticsearch
Working copy    → Graphify         → Graphify JSON → Adapter      → Elasticsearch / UI
```

## 7. Хранилища вне графа кода (на оценку)

| Назначение | Кандидаты | Когда решать |
|------------|-----------|--------------|
| Структурные метаданные платформы | PostgreSQL и аналоги | Этап 1 |
| Векторный поиск / RAG | ChromaDB и аналоги | Этап 7 |

Окончательный выбор — по целесообразности в спецификациях domain model и RAG; в этом документе зафиксирован только **unified graph** и Elasticsearch для графа кода.

## 8. Ключевой результат

- единый формат графа для всех языков
- отсутствие зависимости от AST в хранилище
- возможность масштабируемого анализа кода
- поддержка поиска, графового анализа и LLM-интерпретации