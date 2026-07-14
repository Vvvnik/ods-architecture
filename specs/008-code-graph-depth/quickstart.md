# Quickstart: проверка 008-code-graph-depth

**Цель:** убедиться, что после анализа TS/C# в графе появляются рёбра
`calls` (и `injects` для C# DI), v1 не регрессирует, неоднозначность не
даёт ложных рёбер. Детали — [contracts/](./contracts/), [data-model.md](./data-model.md).

## Предусловия

1. Стек: `docker compose --profile full` из `docker/` (или локальный backend + ES).
2. Реализованы парсеры v2 + ingest dual (после `/speckit-implement`).
3. UI портала с экраном «Граф» (`007`).

## 1. C# — вызов метода (SC-001)

1. Проект/fixture: метод `Create` вызывает однозначный `Save` (другой метод
   того же или соседнего файла в прогоне).
2. Запустить анализ (sync → confirm languages как обычно).
3. **Ожидание:** в ES / UI есть ребро `type=calls` from→to соответствующих
   узлов методов; у ребра `metadata.layer=code`.
4. (UI) Поиск / связи узла `Create` показывают вызов.

## 2. TypeScript — вызов (SC-002)

1. Fixture: однозначный call `caller` → `callee` в проекте.
2. Анализ → **ожидание:** ребро `calls`, `layer=code`.
3. Envelope парсера: `schema_version: "2"`, в `model.usages` есть запись
   `type=calls`.

## 3. C# — constructor injection (US4)

1. Класс с ctor-параметром типа интерфейса/класса проекта.
2. **Ожидание:** ребро `type=injects` от класса-потребителя к типу зависимости.
3. Примитивный/неизвестный тип параметра → **нет** ложного `injects`.

## 4. Неоднозначность (SC-005)

1. Fixture с перегрузками / нерезолвимым вызовом.
2. **Ожидание:** analysis run success; **нет** ребра `calls` для этого места.

## 5. Регрессия v1 (SC-003)

1. Прогнать unit/integration на envelope/`model` с `schema_version: "1"`
   (существующие fixtures ingest).
2. **Ожидание:** imports/inherits как до `008` (допустимо появление
   `metadata.layer=code`).

## 6. Смоук UI (SC-004)

1. Открыть «Граф» проекта с `calls`.
2. Найти ребро/узел через поиск или панель связей — без нового экрана.

## Команды (ориентиры)

```bash
# unit ingest v1/v2
cd backend && npm test -- --run tests/unit/ingest/

# parser calls + ambiguous (dotnet / node)
cd backend && npm test -- --run tests/integration/csharp-parser-calls.test.ts \
  tests/integration/typescript-parser-calls.test.ts \
  tests/integration/csharp-ambiguous-calls.test.ts
```

**Проверено (implement 2026-07-14):** unit ingest v2; C#/TS CLI → usages `calls` (+ C# `injects`); ambiguous → 0 calls; ES ingest assert — при доступном ES (иначе skip).

Парсер вручную (как `005`):

```bash
node parsers/typescript/run.mjs --project-id … --working-copy-root … \
  --analysis-run-id … --files '[…]' --output /tmp/env-ts.json
# проверить schema_version === "2" и usages
```
