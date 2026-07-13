# Research: Масштаб UX портала (007)

**Дата**: 2026-07-13

## R1. Атомарность каскада в Elasticsearch

**Decision:** Один `update_by_query` по `project_id` + активным документам ветки
(`path` = путь папки **или** `path` с префиксом `папка/`), поля
`status` + `status_manually_set: true`, `conflicts=abort`, `refresh=wait_for`.
Успех = `failures` пуст и операция завершена без ошибки API. Перед записью —
оценка числа потомков; при **> 5000** активных потомков — **отказ 422** без
изменения (русский текст). Массовая миграция старых проектов не делается.

**Rationale:** ES не даёт ACID multi-doc транзакций; одна `update_by_query` —
практичный эквивалент для пилота и проверяема SC-003. Soft-limit снижает риск
долгих/частичных прогонов. Clarifies «полный успех или полный отказ».

**Alternatives considered:**

- Scroll + bulk + ручной rollback — сложнее, тоже не ACID.
- Асинхронный job с прогрессом — отклонён clarify (синхронно).
- Обновление папки отдельно, потом потомки — выше риск «половины» ветки.

## R2. Когда каскад, а когда только папка

**Decision:**

| Ситуация | Поведение |
|----------|-----------|
| `type=file` | Только элемент |
| `type=directory`, новый статус **из** `not_needed` → другой | Только папка (FR-012) |
| `type=directory`, любой другой переход (вкл. → `not_needed`, → `needed`, …) | Каскад папка + активные потомки |

**Rationale:** Соответствует US1/FR-010–013 и clarify.

**Alternatives:** Каскад только для `not_needed` — отвергнуто spec (симметрия для `needed`).

## R3. Наследование `not_needed` при sync

**Decision:** В `resolveStatusOnSync`: если у элемента нет `status_manually_set`,
пройти цепочку предков по `parent_path` / пути; если найден предок с
`status=not_needed` **и** `status_manually_set=true`, назначить новому/обновляемому
`not_needed` и **`status_manually_set=false`** (унаследовано, не «своя» ручная
пометка) — пока пользователь сам не поставит статус. Если у самого элемента уже
`status_manually_set`, статус сохраняется.

**Rationale:** FR-014; новый файл под `not_needed`-веткой сразу скрыт от «нужных»
веток без ложного «ручного» флага у каждого листа.

**Alternatives:** Ставить `status_manually_set=true` при наследовании — нельзя
отличить собственную пометку от унаследованной; подъём папки из `not_needed`
оставлял бы ложные ручные флаги.

*Уточнение к формулировке FR-014:* наследник получает статус `not_needed`;
признак ручной пометки у наследника **false**, пока нет своего PATCH.

## R4. Иерархия узлов: `parent_id`

**Decision:** Расширить `GET .../graph/nodes`: query `parent_id` —

- отсутствует / пусто / специальное `root` → узлы с `parent_id` null/missing
  (верхний уровень текущего `analysis_run_id`);
- иначе → прямые дети с `parent_id=<id>`.

Пагинация `limit` (default 50, max 100) + `offset`. Опционально поле
`has_children` (boolean или count) через secondary agg/`exists` детей — рекомендуется
для UX стрелок без лишнего раскрытия.

Плоский список без `parent_id` на UI **не** используется (`007`); API без фильтра
может остаться для отладки/FileGraphPanel, но `GraphPage` его не показывает.

**Rationale:** Уже есть `parent_id` в каноне `006`; lazy load = FR-004/005.

**Alternatives:** Дерево только по `qualified_name` prefix — хрупко для разных
парсеров; хуже, чем явный `parent_id`.

## R5. Поиск узлов и рёбер

**Decision:** `GET .../graph/search?q=&limit=&offset=&analysis_run_id?`

- `q` trim, длина ≥ 2; иначе 400 с русским сообщением.
- Один запрос → два независимых ES multi-match (nodes + edges), каждая страница
  со своим `total`.
- Nodes: `name`, `path`, `kind`, `qualified_name` (и при наличии `signature`).
- Edges: `type`, `from`, `to`, `path` (контекст).
- Ответ: `{ nodes: Page, edges: Page }` (всегда оба блока).
- **Задел (не реализовывать в `007`):** зарезервировать query-параметры
  `filter.*` / будущие фасеты в комментарии OpenAPI; сервер `007` их **игнорирует**
  или отвечает 400 «не поддерживается» — предпочтительно **игнор без ошибки**,
  чтобы клиенты-разведки не ломались. FR фильтров нет.

**Rationale:** Clarify A; SC-002; фильтры вынесены.

**Alternatives:** Два endpoint / scope enum — усложняет UI без выигрыша.

## R6. UX клика по результату

**Decision:**

- Узел: загрузить цепочку предков (последовательные `GET` / `ancestors` helper
  или клиентский walk `parent_id`), раскрыть узлы, scrollIntoView + selected.
- Ребро: показать в `EdgeTable`/панели связей; якорь иерархии = узел `from`.

Опциональный helper API `GET .../graph/nodes/{id}/path` (список предков от корня)
— **рекомендуется** в contracts, чтобы не N+1 с клиента.

**Rationale:** Clarify B / A для ребра.

## R7. Ширины панелей workspace

**Decision:** Client-only: `localStorage` key `ods.workspace.panelWidths.v1` =
`{ tree, main, props }` в px. Defaults: tree **260**, main **flex**, props **280**.
Минимумы: tree **180**, main **240**, props **220**. Drag на вертикальных
разделителях; clamp к минимумам. SC-004: погрешность ≤5% после reload.

**Rationale:** Пилот без auth; FR-001–003; без серверного API.

**Alternatives:** Серверный user prefs — избыточно до `013-auth`.

## R7b. Высота результатов поиска на Графе

**Decision:** Client-only: `ods.graph.searchResultsHeight.v1` = `{ list }` px.
Default **180**, min **100**, max **60vh**. Горизонтальный splitter под списком;
`startRowResize` рядом с `startColumnResize`. Одна высота на вкладки Узлы/Рёбра.

**Rationale:** Фиксированный `max-height` неудобен при большом числе совпадений
на странице; тот же паттерн prefs, что панели (без API).

## R8. Совместимость с `002`/`003` текстами

**Decision:** Не правим `spec.md` `002`/`003` целиком; семантика PATCH/sync и
API scale — в контрактах **`007`** (`openapi-portal-scale.yaml`,
`status-cascade.md`, `graph-ui-scale.md`). Канон OpenAPI `002` **не** обязан
содержать cascade/`search`/`parent_id`: extension YAML `007` — тот же стиль, что
`006` для graph. Зеркало в `002`/`api-consumer` — опционально (T033), не DoD.

**Rationale:** Явная граница в spec `007`; один источник правды для scale UX.

## R9. Code reuse audit

> Заполняется задачами **T001/T003** при implement. Ниже — стартовые правила
> (analyze remediation), чтобы не ждать пустого шаблона.

**Правила (зафиксировано до кода):**

| Тема | Решение |
|------|---------|
| `GraphPage` | Только `GraphNodeTree` + поиск; маршрут `/projects/:id/graph` |
| `EdgeTable` | Переиспользовать с `006` |
| `NodeList` | **Удалён** (2026-07-14); FileGraphPanel — свой список |
| Splitters | `WorkspaceLayout` + `GraphPage`; util `startColumnResize` |
| Каскад | Расширить `element.repository` / thin service; не второй ElementRepository |
| Граф API | `nodes/*` wildcard + decode; ingest TS → `symbols-model-v1` thin |
| Карта файлов | Список путей — **в этой секции R9**, не новый файл в `contracts/` |
| DoD (T030) | Нет migration job; нет canvas / edit-delete узлов и рёбер |

**Статус:** R9 done + post-implement cleanup (2026-07-14) — см. `spec.md`
«Post-implement notes».

**Карта файлов (T001):**

- `backend/src/repositories/element.repository.ts`
- `backend/src/services/element.service.ts`
- `backend/src/services/sync.service.ts`
- `backend/src/api/routes/elements.ts`, `graph.ts`
- `backend/src/services/graph.service.ts`
- `backend/src/repositories/graph-node.repository.ts`, `graph-edge.repository.ts`
- `backend/src/services/ingest/adapters/symbols-model-v1.ingest.ts`, `typescript.ingest.ts`
- `frontend/src/pages/GraphPage.tsx`, `frontend/src/app/GraphRoutes.tsx`
- `frontend/src/layouts/WorkspaceLayout.tsx`, `frontend/src/styles/workspace.css`
- `frontend/src/components/graph/GraphNodeTree.tsx`, `GraphSearch.tsx`, `EdgeTable.tsx`
- `frontend/src/hooks/usePanelWidths.ts`, `useGraphPanelWidths.ts`,
  `useGraphSearchResultsHeight.ts`
- `frontend/src/utils/startColumnResize.ts` (`startColumnResize` + `startRowResize`),
  `reloadIfStaleBundle.ts`
