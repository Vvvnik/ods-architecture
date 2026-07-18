# UI contract: graph-view UX (014 блок A + inspector B)

**Спека**: [spec.md](../spec.md)

## Dig-in labels (`GraphInspector`)

| Было | Стало | Условие |
|------|-------|---------|
| «В код» | **«Код»** | service + layer system → code |
| «Войти» | **«Система»** | dig-in system / peers |
| «В анализе» | **«Посмотреть в анализе»** | enabled **только** при focus на узле/сервисе |

Navigate анализ: `/projects/:id/graph?select=<focusId>`.

## Крошки

- GraphView: существующий `GraphBreadcrumbs`.
- GraphPage: тот же компонент / API подписей; **Наверх** / **К системе**
  (→ graph-view с focus сервиса или overview).

## Progress overlay

- Источник состояния: `AnalysisProvider` (+ sync/analysis hooks).
- Один portal/banner на layout; виден на **GraphView** и прочих экранах.
- Confirm Languages/Changes — без дубля на GraphViewPage.

## Inspector секции (блок B)

При focus `kind=service`:

1. **Публикует** — исходящие `exposes` (пусто OK).
2. **Вызывает** — исходящие `http_calls` (пусто OK).

Не показывать сервис как «публикует API», если нет `exposes`.

На `http_endpoint`: при `metadata.source` — подпись «код» / «OpenAPI».

## Подписи узлов / рёбер (короткие имена)

В UI **не** показывать сырой id (`compose:service:…#frontend`,
`ts-api-routes:http_endpoint:…#backend|POST|/api/…`).

| Контекст | Правило |
|----------|---------|
| graph-view inspector «Связи» | `frontend: → …` / `backend: ← frontend`; у эндпоинта `frontend: → HTTP-вызов` |
| `/graph` EdgeTable, поиск рёбер | `shortGraphRefLabel`: `#name` → имя сервиса; `…\|METHOD\|path` → `METHOD path` |
| Полный id | только `title` (hover), не основной текст |

Утилита: `frontend/src/utils/graphNodeLabel.ts`.

## Canvas

Рёбра `http_calls` в срезе — SHOULD при лимитах; DoD по секции **Вызывает**.
