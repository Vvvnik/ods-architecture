# Research: 012-code-graph-bottom

**Дата**: 2026-07-18  
**Спека**: [spec.md](./spec.md)  
**Базис**: `specs/011-ods-graph-viewer/research.md`

## R1 — View-only привязка code ↔ compose-service

**Decision:** Порядок определения «связанного» code для сервиса:

1. Явные связи канона: `parent_id` → service; рёбра `exposes` / иные
   service↔code, если уже есть.
2. Иначе **view-only** (без записи в ES):
   - сегмент пути code-узла совпадает с **именем сервиса**
     (`backend/...` ↔ service `backend`; case-insensitive; POSIX `/`);
   - дополнительно: longest path-prefix среди services, у которых `path`
     похож на каталог приложения (не compose-файл) — как ослабленный R5 `011`;
   - qualified_name / path содержит `/{serviceName}/` или начинается с
     `{serviceName}/`.
3. Нет кандидатов → `empty_reason=no_related_code`.

**Rationale:** Clarify Q1 (вариант B). У compose-сервисов `path` =
`docker/docker-compose.dev.yml`, поэтому чистый path-prefix R5 `011` на
`ods-arch` не сработает; имя сервиса ↔ корневая папка — типичный monorepo
паттерн эталона.

**Alternatives considered:**

| Вариант | Почему нет |
|---------|------------|
| Только явные рёбра | SC-001/SC-006 на ods-arch провалятся |
| Писать affiliation в канон в `012` | Вне scope (отложено); нет новых ingest |
| Dockerfile context → service | Хрупко; compose native уже имеет name |

## R2 — Параметр слоя `layer` vs отдельный endpoint

**Decision:** Расширить существующий `GET .../graph/view` query-параметром
`layer`:

- omit / `system` — поведение `011` (в т.ч. system-интерьер сервиса);
- `code` — code-срез для текущего `focus` (сервис или code-узел).

При `focus` = code-узел `layer` игнорируется как code (срез вокруг code).

**Rationale:** Один контракт, регресс system проще; clarify «отдельный шаг»
= смена `layer` или фокус на synthetic/entry без нового URL path.

**Alternatives considered:** `GET .../graph/view/code` — дублирование;
клиентский N+1 по `/nodes` — запрещён как в `011` R2.

## R3 — Первый code-уровень под сервисом

**Decision:** При `focus=<serviceId>&layer=code` **inside** =

- корневые code-узлы, отнесённые к сервису (R1), у которых нет родителя в
  том же affiliated-множестве **или** `kind` ∈ {`module`, `file`,
  `namespace`} и parent не в affiliated set;
- практически: узлы с минимальной глубиной parent-цепочки среди affiliated
  (обычно modules/files).

Дальше drill: inside = дети по `parent_id` с `metadata.layer=code` (или
code kinds), если есть; иначе дно.

Kinds «тип»: `class`, `interface`, `enum`, …  
Kinds «метод/лист»: `method`, `function`, `property`, `field`, …  
Не фабриковать уровни без узлов.

**Rationale:** Clarify глубина «дна»; канон `006`/`008`.

**Alternatives considered:** Всегда показывать все classes сервиса на первом
code-экране — нарушает «не весь граф» и SC-002.

## R4 — `resolve_from` для code (FR-015)

**Decision:**

1. Если `resolve_from` указывает на существующий узел с code-kind /
   `layer=code` → `focus_id` = этот узел, `resolve_status=exact_code`,
   срез code (дети + externals по рёбрам).
2. Иначе прежнее R5 `011` → service / `system_fallback`.

Баннер `011` «code на схеме не показываем» для успешного `exact_code`
**удалить/заменить**.

GraphPage «Открыть на схеме»: для code передавать `resolve_from=<id>`
(сервер сам поставит focus); MAY также `focus=<id>` напрямую.

**Rationale:** Clarify Q4.

## R5 — Загрузка узлов (performance)

**Decision:** Не грузить все code-узлы проекта.

- System slice (`011`): как сейчас `LOAD_KINDS` system.
- Code under service: **одна** из стратегий (выбор фиксирует implement в
  T009 + Notes `tasks.md`):
  - **(A)** ES query `path` prefix / wildcard по сегменту имени сервиса;
  - **(B)** filter in-memory после ограниченного scroll по `project_id` +
    `analysis_run_id` + `metadata.layer=code` с cap (ориентир ≤5k).
  Предпочтение по умолчанию: **(A)**.
- Focus code node: load focus + descendants (parent_id) + incident edge
  endpoints (externals).

Caps ответа: 200 / 500 как `011`.

**Rationale:** SC-002; large-repo из `010`.

## R6 — UX «В код»

**Decision:** В inspector при фокусе на service (system-interior) кнопка
**«В код»** (рус.): запрос `focus=<service>&layer=code`. Если
`empty_reason=no_related_code` — пустое состояние, system-навигация жива.
Double-click на service **не** прыгает в code (сохраняет `011` enter =
system).

**Rationale:** Clarify Q2 — отдельный явный шаг.

## R7 — Свободный вход в соседа

**Decision:** «Войти» / double-click на `role=external` (в т.ч. code другого
сервиса) → `focus=<neighborId>` (layer выводится из kind). Без фильтра
«только свой компонент».

**Rationale:** Clarify Q5.

## R8 — Регресс и эталон

**Decision:** Приёмка code — `ods-arch`; регресс system —
`system-landscape-demo` + system-сценарии на `ods-arch`. Elasticsearch
service → empty code допустим.

**Rationale:** SC-001…SC-007; spec эталон.
