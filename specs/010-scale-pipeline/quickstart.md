# Quickstart: проверка 010-scale-pipeline

**Цель:** один walk на цикл (inventory из sync), прогресс UI, полный цикл на
`large-repo` ≤15 мин, SC-003 замер, dangling=0, closing smoke на внешнем
эталоне. Детали — [contracts/](./contracts/), [data-model.md](./data-model.md).

## Предусловия

1. Стек: `docker compose --profile full` (`docker/`) **или** локальный backend+ES.
2. Fixture large: `./docker/fixtures/repos/setup-fixtures.sh --demo` → `/repos/large-repo`.
3. Реализованы инкременты A–F плана (после `/speckit-implement`).

## 1. File inventory / walk ≤1 (SC-002)

```bash
# после implement: integration на large-repo (не unit alone)
cd backend && npm test -- inventory   # имя уточнит tasks
```

**Ожидание (DoD):** за sync+detect+changeset на **large-repo (≥1000 файлов)** —
**1** full walk; detector/change-set без второго полного walk.
Мелкие unit — только регрессия. Если auto-тест `skipIf` (нет fixture) —
заполнить `walk_count` в таблице отчёта вручную (T047); skip ≠ PASS
(см. `contracts/scale-acceptance.md` §A).

## 2. Timing gate large-repo (SC-001)

1. Импорт `local_path` = `/repos/large-repo` (Docker) или абсолютный путь на хосте.
2. Sync → confirm languages/artifacts → analysis.
3. Заполнить таблицу:

| Этап | ms / s |
|------|--------|
| sync | |
| detect / language report | |
| analysis run (parsers) | |
| ingest (если отдельно) | |
| **total** | **≤ 900 s** |

**Ожидание:** status `success` или `partial` с `parser_results`; total ≤15 мин.

## 3. Incremental vs full (SC-003) — обязательный замер

1. Baseline: полный analysis+ingest после п.2 → `t_full`.
2. Изменить ≤1% файлов WC (или эквивалент в fixture-скрипте).
3. Повторный analysis+ingest → `t_incr`.
4. Записать:

| Метрика | Значение |
|---------|----------|
| `t_analysis_ingest_full_ms` | |
| `t_analysis_ingest_incremental_ms` | |
| speedup % | ≥ **40%** **или** |
| `incremental_unavailable_reason` | (если инкремент недоступен) |

**Ожидание:** либо speedup ≥40%, либо явная причина в отчёте (не молчаливый skip).

## 4. Progress UI (SC-007)

- Sync: виден этап «Синхронизация…» (без обязательного N/M).
- Analysis ≥30 с: этап + активный парсер и/или `N/M`.

## 5. Graph pagination (SC-005)

На снимке после п.2 (фактический `node_count` large-repo; ≥10 000 — ориентир):

1. Открыть «Граф», листать корни / поиск.
2. **Ожидание:** первая страница < ~3 с; нет загрузки всего графа в браузер.
3. Фильтр слоя: списки/счётчики согласованы.
4. Записать `node_count` в отчёт.

## 6. Dangling edges (SC-004)

Рёбра снимка run без from/to в nodes того же `analysis_run_id` = **0**.

## 7. Closing smoke (обязательный DoD)

См. [contracts/scale-acceptance.md](./contracts/scale-acceptance.md) §B.

1. Импорт **внешнего** git WC (`local_path`) — без копирования в git ODS.
2. Полный цикл + таблицы п.2–3 + заметка прогресса.
3. Зафиксировать результат; **не** пушить эталон в ODS.

## 8. Follow-up (не блокирует DoD)

Parser CLI SDK — FR-010 / US7; вне этого quickstart.
