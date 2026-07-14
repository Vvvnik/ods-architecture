# Contract: Scale acceptance (DoD)

**Спека**: [../spec.md](../spec.md) | **Clarify**: fixtures + обязательный manual smoke;
walk-scope A; SC-003 measure; SC-005 large-repo max

## A. Automatic / fixture gate (`large-repo`)

Источник: `docker/fixtures/repos/large-repo` (через
`setup-fixtures.sh --demo` / `setup-demo-repos.sh`). Ориентир **≥1000 файлов**.

| Метрика | Порог / правило |
|---------|-----------------|
| Полный цикл sync→detect→analysis→ingest | ≤ **15 мин** (900 с) |
| Full WC walks в цикле (SC-002) | ≤ **1** — gate **на large-repo** |
| Dangling edges в run | **0** |
| Incremental SC-003 | **Обязательный замер**: wall-clock analysis+ingest после ≤1% изменений ≥**40%** быстрее full **или** явная `incremental_unavailable_reason` в отчёте |
| Graph UI SC-005 | Первая страница дерева/поиска на **фактическом** графе large-repo < ~3 с; цель ≥10 000 узлов — ориентир, не блокер |

Зафиксировать таблицу длительностей (см. quickstart), включая full vs
incremental строки.

### Политика `skipIf` (analyze remediation A1)

Интеграционные тесты T011 / T043 / T044 **MAY** делать `skipIf`, если
fixture `large-repo` отсутствует в окружении CI/агента.

- `skipIf` **≠** PASS по SC-001 / SC-002 / SC-003.
- Чтобы закрыть DoD этапа при skipped auto-gate, оператор **MUST** заполнить
  соответствующие строки таблицы в quickstart (**T047**) и при необходимости
  подтвердить на closing smoke (**T048** / §B).
- В отчёте / PR описание **MUST** явно указать: `skipped: large-repo fixture
  missing` + ссылка на заполненную таблицу (или smoke).

## B. Closing smoke (обязательный, без CI)

**Источник:** локальный git-репозиторий оператора через `local_path`.
**Не** коммитить в ODS. **Не** CI.

### Чеклист (скопировать в отчёт)

- [ ] Импорт проекта (`local_path`) успешен
- [ ] Sync завершён (`success` / `partial` с пояснением)
- [ ] Language report получен; артефакты/языки осмысленны
- [ ] Analysis run завершён (`success` / `partial` с расшифровкой `parser_results`)
- [ ] Во время run виден прогресс: на sync — этап; на analysis — парсер / N из M
- [ ] Graph summary: node_count / edge_count записаны
- [ ] Фильтр code/system/all и постраничное дерево/поиск отвечают
- [ ] Заполнена таблица wall-clock (sync / detect / analysis / total)
- [ ] SC-003: строки full vs incremental **или** причина недоступности
- [ ] Эталон **не** добавлен в `docker/fixtures` и git ODS

### DoD этапа `010`

| Условие | Обязательно |
|---------|-------------|
| A. Fixture gates SC-001…SC-005/007 (по применимости) | да — auto PASS **или** (skipIf + заполненные таблицы T047) |
| B. Closing smoke checklist выполнен и сохранён | да |
| Parser CLI SDK (US7) | нет (follow-up; tracker в tasks Notes) |
| Canvas | нет (`011`) |

## C. Out of scope напоминание

Parser CLI SDK — обязательный follow-up после закрытия A+B (FR-010).
