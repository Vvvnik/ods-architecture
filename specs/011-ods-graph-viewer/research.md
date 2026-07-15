# Research: 011-ods-graph-viewer

**Дата**: 2026-07-15  
**Спека**: [spec.md](./spec.md)

## R1 — Библиотека схемы (React Flow)

**Decision:** `@xyflow/react` (React Flow v12+) на frontend.

**Rationale:** Уже зафиксировано в `001` как направление canvas; зрелый pan/zoom,
custom nodes, selection; экосистема layout. Vision и черновик совпадают.

**Alternatives considered:**

| Вариант | Почему нет |
|---------|------------|
| Cytoscape.js | Другой mental model; слабее React-интеграция в текущем стеке |
| Самописный SVG | Высокая стоимость pan/zoom/hit-test |
| Graphviz только server-side PNG | Нет интерактива FR-011/014 |

## R2 — Серверный срез vs клиентский N+1

**Decision:** Обязательный `GET .../graph/view` для DoD; клиент только рендерит
ответ. Клиентский обход `.../edges` — не приёмка (dev fallback запрещён в SC).

**Rationale:** Правило «фокус + внешние» + усечение на large repo (`010`) иначе
непредсказуемы по latency и объёму.

**Alternatives considered:** Сначала уровень «Система» на клиенте из
`nodes?kind=service` — хрупко для связей/топиков/cap; отклонено для MVP DoD.

## R3 — Лимиты среза

**Decision:** Default **max_nodes = 200**, **max_edges = 500** (константы
backend; MAY query override вниз, не вверх без auth). При усечении на уровне
«Система»: сначала все `service` (пока влезают), затем инфро по числу связей с
уже выбранным множеством / степени, затем остальные peer kinds. Поле ответа
`truncated: true` + `truncation_message` (русский шаблон на клиенте или server).

**Rationale:** Clarifications: приоритет сервисы→инфро; зум не заменяет лимит.
Ориентиры черновика 150–250 / 400–600 округлены до круглых констант.

**Alternatives considered:** Только сервисы на «Системе» при любой тесноте —
теряем БД/шины на обзоре; отклонено.

## R4 — Layout позиций

**Decision:** Авто-layout на клиенте после получения среза (dagre или
`@dagrejs/dagre` / ELK wasm — выбрать в implement по размеру бандла; **одна**
библиотека). Позиции MAY в `sessionStorage` по ключу
`projectId+runId+focusId` на сессию; **не** писать в ES.

**Rationale:** FR-017; достаточно для пилота. Persist в канон запрещён.

## R5 — Service-контекст из code-узла

**Decision:** Resolve order для «Открыть на схеме» из code:

1. Цепочка `parent_id` вверх до узла `kind=service` (если появится в данных).
2. Иначе: system-узел `service`, связанный рёбрами/`path` prefix с путём
   code-узла (эвристика: longest matching `path` prefix среди services /
   compose-derived services).
3. Иначе: уровень «Система» + пояснение (не ошибка).

Не добавляем `metadata.service_id` в ingest MVP (`FR-021`), пока эвристика
не провалится на фикстуре — тогда follow-up task в tasks/research note.

**Rationale:** Clarify Q2; не раздувать парсеры.

## R6 — Участники уровня «Система»

**Decision:** Peer kinds на корне (focus пуст):

- всегда кандидаты: `service`, `database`, `broker`, `external_api`, `storage`
  (и иные system peer из `009`, **кроме** `message_topic` / `message_type` /
  `http_endpoint` / `dotnet_project` как peer — они «внутри»).

`message_topic`: если есть ребро/parent к `broker` → только внутри брокера;
иначе peer на «Системе» (clarify).

**Inside focus:**

| Focus kind | Inside |
|------------|--------|
| `service` | system children via `parent_id` + endpoints/projects linked to service |
| `broker` | `message_topic` (+ message_type if parented) |
| `database` / `storage` / `external_api` | empty inside; externals = connected services |

**External:** узлы, связанные ребром с focus или с любым inside-узлом, не
входящие в inside; `role: "external"` в ответе API.

## R7 — Выбор vs вход (UX)

**Decision:** Selection state ≠ focus state. Click → select + inspector;
«Войти» / double-click → refresh view with `focus=<id>`; крошки из стека
фокусов на клиенте (или `focus_path` в ответе, если удобнее — MAY).

**Rationale:** Clarify Q5.

## R8 — Зависимости меню/маршрутов

**Decision:**

| Пункт | Route |
|-------|-------|
| Граф анализ | `/projects/:projectId/graph` (как сейчас) |
| Граф просмотр | `/projects/:projectId/graph-view` |

Query (канон = UI/OpenAPI contract):

| Param | Где | Значение |
|-------|-----|----------|
| `focus` | `/graph-view` | id фокуса схемы; нет = Система |
| `resolve_from` | `/graph-view` | id узла из анализа → resolve в service / Система |
| `select` | `/graph` (анализ) | id узла для выделения после «Показать в анализе» |

Устарело / не использовать: `?node=`, `?from=analysis&node=`.  
`/graph` redirect без project — как сейчас.

## R9 — Нерешённое → implement only

- Конкретный пакет layout (dagre vs ELK) — выбрать по bundle size в T0xx.
- Точный ES query (terms vs nested) — в graph-view.service при implement.
- Playwright e2e — optional в tasks, не блокер unit/integration.
