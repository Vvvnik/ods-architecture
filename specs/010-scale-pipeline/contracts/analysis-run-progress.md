# Contract: Analysis run progress (API + UI)

**Спека**: [../spec.md](../spec.md) | **Research**: R2 | Clarify: этап + парсер / N из M;
sync = только этап

## Цель

Оператор видит ход длинного анализа (FR-013 / SC-007), не принимая его за hang.

## Расширение GET `/projects/{id}/analysis/runs/{runId}`

Additive JSON fields (optional для обратной совместимости):

| Field | Type | Meaning |
|-------|------|---------|
| `progress_phase` | string \| null | **Канон:** `queued` \| `parsing` \| `ingest` \| `done` |
| `progress_active_parser_id` | string \| null | Текущий парсер |
| `progress_parsers_completed` | number | Завершено |
| `progress_parsers_total` | number | Запланировано в этом run |
| `progress_updated_at` | string \| null | ISO timestamp |

Существующие `status`, `parser_results` — канон итога.

**Не** в каноне: `detecting`, `sync` (sync — на проекте, не на run).

## Отображение UI (Workspace / Graph hints)

| Фаза | Текст (ориентир, i18n) |
|------|-------------------------|
| sync (`project.sync_status=running`) | «Синхронизация…» (**без** обязательного N/M) |
| `parsing` + active id | «Анализ: {parser} ({completed}/{total})» |
| `parsing` без active | «Анализ: {completed}/{total}» |
| `ingest` | «Построение графа…» |
| terminal | скрыть прогресс / финальный toast |

Процентная полоса **не** обязательна.

## MUST

- Оркестратор **MUST** обновлять progress не реже чем при старте/финише модуля.
- Poll интервал UI **MAY** остаться текущим для `running`.
- При `completed == total` и status ещё running — фаза **MAY** быть `ingest`.

## Проверка

E2E/manual: прогон ≥30 с — валидный этап + N/M на analysis; sync показывает
этап; unit: schema progress.
