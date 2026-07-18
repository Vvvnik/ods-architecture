# Quickstart: Анализ кода (005)

**Спека**: [spec.md](./spec.md) | **План**: [plan.md](./plan.md)

Проверка цепочки sync → детектор → подтверждение → анализ (после реализации по `tasks.md`).

**Новый модуль парсера:** чеклист расширения —
[`../018-parser-extension-playbook/contracts/parser-extension-checklist.md`](../018-parser-extension-playbook/contracts/parser-extension-checklist.md)
(фича `018`).

## Предусловия

- Стек MVP поднят: `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
- Фикстура с несколькими языками (или `sample-project` + ручные файлы `.py`)
- Реализованы инкременты A–C из [plan.md](./plan.md)

## 1. Импорт и sync

```bash
curl -s -X POST http://localhost:8080/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{
    "source_type": "local_path",
    "source_value": "/repos/sample-project",
    "name": "Analysis pilot"
  }'
```

Дождаться `sync_status: success` (GET `/api/v1/projects/{id}`).

## 2. SC-001 — отчёт по языкам

```bash
PROJECT_ID="<uuid>"
curl -s "http://localhost:8080/api/v1/projects/$PROJECT_ID/analysis/language-report/latest" | jq .
```

**Ожидание:**

- `languages` отсортированы по `file_count` убыв.
- Для языков без модуля — `parser_status: missing`.
- Время после sync — < 30 с на пилотном объёме.

## 3. Change set (окно 2)

```bash
curl -s "http://localhost:8080/api/v1/projects/$PROJECT_ID/analysis/change-set" | jq .
```

**Первый анализ:** `incremental: false`, списки отражают полный набор или пустые `added`/`modified`/`deleted` по контракту.

**После правки файла и повторного sync:** в `modified` или `added` — только изменённые пути.

## 4. Запуск анализа (API, без UI)

Имитирует два «Продолжить»:

```bash
REPORT_ID="<language_report_id>"
curl -s -X POST "http://localhost:8080/api/v1/projects/$PROJECT_ID/analysis/runs" \
  -H 'Content-Type: application/json' \
  -d "{
    \"language_report_id\": \"$REPORT_ID\",
    \"confirmed_change_set\": true
  }"
```

Poll:

```bash
RUN_ID="<run_id>"
curl -s "http://localhost:8080/api/v1/projects/$PROJECT_ID/analysis/runs/$RUN_ID" | jq .status
```

**Ожидание:** `success` или `partial` (если есть `missing`); не `failed` из-за missing-only языков.

## 5. Envelope

```bash
curl -s "http://localhost:8080/api/v1/projects/$PROJECT_ID/analysis/runs/$RUN_ID/envelopes" | jq .
```

**Ожидание:**

- Один envelope на каждый `available` модуль.
- Поля обёртки по [envelope-schema.json](./contracts/envelope-schema.json).
- `model` непустой для успешного typescript-модуля.

## 6. Порядок запуска (US3 / FR-008)

Многиязычный репозиторий, модули `typescript` и `python` available, `file_count(python) > file_count(typescript)`:

- В логах оркестратора первый spawn — `python`, затем `typescript`.

## 7. UI (SC-004)

1. Открыть проект в портале после sync.
2. Модаль «Языки проекта» — порядок как в API.
3. «Продолжить» → модаль «Изменения в коде».
4. «Продолжить» → индикатор анализа → тост «Анализ завершён».

«Отмена» на шаге 1 или 2 — парсеры не запускаются.

## 8. Инкремент (SC-003)

1. Полный анализ — зафиксировать время.
2. Изменить один файл, sync, подтвердить анализ.
3. Время второго прогона — заметно меньше (цель −50% при ≤5% файлов).

## 9. DELETE проекта

После `DELETE /api/v1/projects/{id}`:

```bash
curl -s "http://localhost:9200/ods-language-reports/_search?q=project_id:$PROJECT_ID"
curl -s "http://localhost:9200/ods-parser-envelopes/_search?q=project_id:$PROJECT_ID"
```

**Ожидание:** 0 hits.

## Ссылки

- [data-model.md](./data-model.md)
- [contracts/openapi-analysis.yaml](./contracts/openapi-analysis.yaml)
- [contracts/analysis-ui.md](./contracts/analysis-ui.md)
