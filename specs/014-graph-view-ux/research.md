# Research: 014-graph-view-ux

**Дата**: 2026-07-18  
**Спека**: [spec.md](./spec.md) | **План**: [plan.md](./plan.md)

## R1 — Подписи dig-in

**Decision:** i18n: `GRAPH_VIEW_ENTER_CODE` → «Код»; dig-in system → «Система»;
ссылка анализа → «Посмотреть в анализе». Логика `onEnter` / `onEnterCode`
из `012` сохраняется.

**Rationale:** FR-001; минимальный diff.

**Alternatives considered:** Менять только tooltip; оставить «Войти».

## R2 — Анализ среза = UI-контекст

**Decision:** Navigate GraphPage `?select=<focusNodeId>` (+ при необходимости
слой в localStorage). Прогон анализа — полный project, как сейчас.
Без фокуса кнопка disabled/скрыта.

**Rationale:** Clarify Q1/Q3; не ломать оркестратор.

**Alternatives considered:** Узкий spawn по файлам сервиса; always-open full
project from overview.

## R3 — Крошки на GraphPage

**Decision:** Переиспользовать `GraphBreadcrumbs` (или тонкую обёртку с теми
же подписями **Наверх** / **К системе**). На GraphPage крошки отражают
контекст выбранного узла / путь к system-сервису; «К системе» → graph-view
overview или focus сервиса.

**Rationale:** FR-003; audit reuse, без второй реализации крошек.

**Alternatives considered:** Отдельный BreadcrumbsAnalysis.

## R4 — Единый progress overlay

**Decision:** Один portal/banner в `AnalysisProvider`, питаемый
`useSync` + analysis flow (те же сигналы, что header hints на GraphPage /
Workspace). GraphView **не** дублирует confirm-модалки. Confirm остаются
существующими Languages/Changes модалками.

**Rationale:** FR-004; explore: GraphView сейчас без progress UI.

**Alternatives considered:** Только toast; копипаста wizard на GraphViewPage.

## R5 — Parser `ts-http-calls`

**Decision:** Отдельный `parsers/ts-http-calls/` (не вшивать в `typescript`
и не в `ts-api-routes`). Detector artifact `ts-http-calls`: `.ts`/`.tsx` +
сигналы `apiFetch` / `API_BASE` / `'/api/v1'`.

**Rationale:** FR-003 style modularity из конституции/`005`; симметрия с `013`.

**Alternatives considered:** Расширить `typescript` usages; один mega-parser.

## R6 — Extract DoD (shared client)

**Decision:** Эталон: `const API_BASE = '/api/v1'` + `apiFetch(path, …)` /
`fetch(\`${API_BASE}${path}\`)`. Собрать method (из init или default GET) +
полный path `/api/v1`+relative. Игнор: внешние URL, `fetch('/?_=` stale),
не-`/api/v1` базы.

**Rationale:** Clarify Q5; реальный `frontend/src/api/client.ts`.

**Alternatives considered:** Любой fetch `/api/...`; только OpenAPI clients.

## R7 — Стыковка к endpoint

**Decision:** Вычислять target **id** без ES в transform: prefer
`ts-api-routes:http_endpoint:{backendStable}|{METHOD}|{path}`; fallback
`openapi:http_endpoint:{METHOD}:{path}`. Не создавать endpoint. При сомнении —
skip вызова.

**Rationale:** FR-006; pure ingest adapters; coexistence `013`/`009`.

**Alternatives considered:** ES lookup в adapter; stub endpoints; всегда openapi.

## R8 — Caller service resolve

**Decision:** Как `013` api-routes: сегмент path (`frontend/...`) →
`composeServiceNodeId` + `inferComposeFile` (ods-arch →
`docker/docker-compose.dev.yml`). DoD: frontend. Иные клиенты — best-effort.

**Rationale:** Reuse `api-routes-ids` / system-layer heuristics.

**Alternatives considered:** Только явное имя в envelope.

## R9 — Inspector Публикует / Вызывает

**Decision:** Секции из incident edges: out `exposes` → Публикует; out
`http_calls` → Вызывает. Пустые секции допустимы. Не показывать «публикует
API» как роль сервиса без `exposes`. Source badge на endpoint из
`metadata.source` при наличии.

**Rationale:** Clarify Q4; semantics draft.

**Alternatives considered:** Только canvas edges as DoD.

## R10 — Canvas http_calls

**Decision:** SHOULD: включать в view slice при лимитах (как прочие system
edges). DoD не требует видимости ребра, если карточка заполнена.

**Rationale:** Clarify Q4.

**Alternatives considered:** Always force edges into slice (может вытеснять
peers).
