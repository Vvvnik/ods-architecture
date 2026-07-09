# Quickstart: Граф проекта (006)

**Спека**: [spec.md](./spec.md) | **План**: [plan.md](./plan.md)

Проверка цепочки анализ (`005`) → ingest → API/UI графа (после реализации по `tasks.md`).

## Предусловия

- Стек MVP: `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
- Реализованы инкременты A–C из [plan.md](./plan.md)
- Проект с TypeScript (или другим языком с адаптером ingest) прошёл полный анализ (`005` quickstart)

Контракты:

- [contracts/ingest-pipeline.md](./contracts/ingest-pipeline.md)
- [contracts/elasticsearch-indices.md](./contracts/elasticsearch-indices.md)
- [contracts/openapi-graph.yaml](./contracts/openapi-graph.yaml)

## 1. Убедиться, что анализ завершён

```bash
PROJECT_ID="<uuid>"
curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/analysis/runs" | jq '.[0]'
```

**Ожидание:** `status` ∈ `success`, `partial`; после ingest — `ingest_status: success` (поле из `006`).

## 2. Сводка графа

```bash
curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/graph/summary" | jq .
```

**Ожидание:**

- `node_count` > 0 для проекта с кодом
- `analysis_run_id` совпадает с последним успешным прогоном
- Ответ < 1 с

## 3. Узлы файла (FR-006)

```bash
FILE_PATH="src%2Findex.ts"
curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/graph/files/$FILE_PATH/dependencies" | jq .
```

**Ожидание:**

- `nodes[]` содержит символы из файла (`kind`, `name`, `path`)
- `edges[]` — связи `imports`, `calls`, …
- Пагинация: при `limit=50` и большом файле — `total` или усечённый список по контракту

## 4. Подграф узла

```bash
NODE_ID="<id из nodes>"
curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/graph/nodes/$NODE_ID/edges" | jq .
```

**Ожидание:** исходящие и входящие рёбра (1 hop).

## 5. UI `/graph` (SC-001)

1. Открыть портал, выбрать проект.
2. Перейти «Граф».
3. Увидеть список узлов; клик — таблица рёбер.

**Ожидание:** данные появляются в течение **10 с** после завершения ingest (пилот).

## 6. Инкрементальный ingest (инкремент D)

1. Изменить один `.ts` файл в источнике.
2. Sync + анализ (incremental, `005`).
3. Повторить запрос зависимостей файла.

**Ожидание:**

- Узлы удалённых символов исчезли
- Новые символы появились без полной пересборки всего проекта
- Время ingest заметно меньше полного (SC-003, ориентир −50% при ≤5% файлов)

## 7. DELETE проекта (FR-010)

```bash
curl -s -X DELETE "http://localhost:3000/api/v1/projects/$PROJECT_ID" -w "%{http_code}"
```

Проверка в ES (dev):

```bash
curl -s "http://localhost:9200/ods-graph-nodes/_count?q=project_id:$PROJECT_ID"
curl -s "http://localhost:9200/ods-graph-edges/_count?q=project_id:$PROJECT_ID"
```

**Ожидание:** count = 0; каскад вместе с `005` индексами.

## 8. Отсутствие адаптера

Проект только на языке без ingest-адаптера:

- анализ может быть `partial`
- `ingest_errors` на run содержит `parser_id`
- `/graph` показывает данные доступных адаптеров или empty state

## Troubleshooting

| Симптом | Проверка |
|---------|----------|
| 404 summary | envelope в `ods-parser-envelopes`? ingest hook в orchestrator? |
| Пустые nodes | адаптер `typescript` зарегистрирован? fixture model в логах |
| Старый граф | query без `analysis_run_id` — latest: `status` и `ingest_status` ∈ {success, partial} |
