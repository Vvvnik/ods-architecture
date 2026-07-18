# Data model: 012-code-graph-bottom

**Спека**: [spec.md](./spec.md)  
**Канон узлов/рёбер**: без изменений индексов (`006` / `009`).  
**Срез просмотра**: расширение DTO `011` ([data-model 011](../011-ods-graph-viewer/data-model.md)).

## Сущности просмотра (read-model)

### GraphViewSlice (расширение)

| Поле | Тип | Описание |
|------|-----|----------|
| (поля `011`) | | `focus_id`, nodes, edges, truncated, limits, counts, resolve_status, empty_reason |
| `layer` | `system` \| `code` | Активный слой среза |
| `affiliation` | object? | MAY: `{ mode: 'explicit'\|'view_only'\|'none', service_id? }` |

### GraphViewNode (как `011` +)

| Поле | Описание |
|------|----------|
| `role` | `focus` \| `inside` \| `external` |
| `stub` | true для упрощённых внешних |
| `metadata.layer` | `system` \| `code` (из канона) |

### empty_reason (дополнение)

| Значение | Когда |
|----------|--------|
| `no_graph` | как `011` |
| `no_system_participants` | как `011` |
| `no_related_code` | `layer=code` у сервиса/контекста без affiliated code |

### resolve_status (дополнение)

| Значение | Когда |
|----------|--------|
| `exact` | как `011` (system peer) |
| `resolved_service` | как `011` R5 |
| `system_fallback` | как `011` |
| `exact_code` | `resolve_from` / focus на code-узле успешен |

## Принадлежность (view-only, не сущность ES)

**ServiceCodeAffiliation** (вычисляется в `GraphViewService`):

| Поле | Описание |
|------|----------|
| `service_id` | id узла `kind=service` |
| `service_name` | имя compose-сервиса |
| `code_node_ids` | множество id code-узлов, прошедших R1 |
| `mode` | `explicit` если были parent/рёбра; иначе `view_only` |

**Правила валидации:**

- Не создавать документы в ES.
- Один code-узел MAY попасть в несколько сервисов только если эвристики
  конфликтуют — тогда побеждает longest path match / более специфичный
  сегмент; при ничьей — первый по стабильному sort id (детерминизм тестов).

## Иерархия drill (логические уровни)

Не отдельные таблицы — уровни из `kind` канона:

```text
service (system) --«В код»--> module|file|namespace → class|interface|… → method|function|…
```

Связи в срезе: любые существующие типы рёбер, инцидентные focus∪inside
(`calls`, `injects`, `depends_on`, …).

## State transitions (навигация клиента)

```text
Система --Войти--> service/system-interior
service --«В код»--> code roots (layer=code)
code-node --Войти--> child focus | external neighbor focus
* --К системе--> Система (layer=system, focus=null)
* --Наверх--> previous crumb
analysis --resolve_from code--> focus=code (exact_code) | fallback 011
```

## Out of model

- Запись affiliation в канон
- Иерархия БД физика→логика→схема
- Координаты узлов в ES
