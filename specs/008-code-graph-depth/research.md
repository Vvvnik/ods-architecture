# Research: 008-code-graph-depth

**Дата**: 2026-07-14  
**Спека**: [spec.md](./spec.md)

## R1 — Форма native v2: `usages[]` vs `refs` на символе

**Decision:** MVP пишет семантику в верхнеуровневый массив **`usages[]`**
(как `ods-help/requirements/json-model/native-symbols-v2.*`); `symbols[].refs`
остаётся для v1-связей (`imports`/`exports`/`inherits`/`implements`). Типы
`creates`/`references` в enum схемы MAY остаться заделом без наполнения.

**Rationale:** Clarify: MVP = `calls` + `injects`; отдельный массив не ломает
контракт refs v1 и совпадает с черновиком N02.

**Alternatives considered:** Пихать `calls`/`injects` в `refs[]` — ломает enum
native v1 и смешивает уровни; только refs без usages — хуже для DI на классе.

## R2 — Версия envelope / dual ingest

**Decision:** Парсеры `typescript` и `csharp` в обычном прогоне всегда отдают
`schema_version: "2"` + model с `symbols` (+ `usages` при наличии). Shared
ingest-адаптер symbols: `supported_schema_versions: ['1','2']`. v1 — без
`usages`, поведение как сейчас. Python/cpp остаются на v1.

**Rationale:** Clarify Q5; FR-003.

**Alternatives considered:** Флаг v1/v2 на CLI — лишняя сложность; fallback на
v1 при ошибке calls — скрывает дефекты extract.

## R3 — Канонический тип `injects`

**Decision:** Расширить `EdgeType` и канон: добавить **`injects`**. Ingest
usage `type=injects` → ребро `type=injects`. Схемы: обновить domain
`graph-edge.ts`, `isEdgeType`, `canonical-edge-code` (contracts 008 + зеркало
json-model).

**Rationale:** Clarify Q1; поиск/UI видят тип явно.

**Alternatives considered:** `references` + metadata — отклонено на clarify.

## R4 — Резолюция `usages.from` / `usages.to` → node id

**Decision:** `from`/`to` в native — **qualified_name** символов того же envelope
(или известных в текущем transform batch). Ingest строит map
`qualified_name → node.id` по узлам **этого** transform; ребро только если
оба конца найдены. Cross-file: цель должна быть в symbols того же envelope
(парсер включает оба файла в прогон) **или** to указывает на qn+path, который
есть в symbols текущего model. Если to не в batch — **нет ребра** (не
синтезировать «висячий» to из одного qn без path/kind, если нельзя стабильно
собрать id как в v1 refs).

Практическое правило пилота: парсер резолвит цель только при однозначном
символе проекта; в `usages.to` пишет qn, совпадающий с `symbols[].qualified_name`
в том же model (мультифайловый chunk оркестратора уже даёт несколько файлов
в одном envelope при необходимости — как в `005`).

**Rationale:** FR-006; избегать ложных id; согласовать с текущим
`buildNodeId(parser, path, kind, qn)`.

**Alternatives considered:** Всегда синтетический to без существования узла
(как частично v1 imports) — для calls повышает шум; отложено. Полный
глобальный индекс qn по ES на ingest — тяжелее MVP.

## R5 — Извлечение calls: C#

**Decision:** Roslyn: по возможности **SemanticModel** (если workspace/
compilation собирается из файлов chunk); иначе синтаксис
`InvocationExpression` + простая резолюция. Однозначный метод → `calls`;
перегрузки/неизвестно → пропуск. Constructor DI: параметры ctor с
именованным типом проекта → `injects` (класс/интерфейс → тип параметра).

**Rationale:** Сегодня extractor syntax-only; semantic сильно повышает точность
межфайловых calls. Fixture MVP может жить в одном/нескольких `.cs` без полного
solution, если SemanticModel доступен через AdhocWorkspace.

**Alternatives considered:** Только InvocationExpression по имени — много
ложных срабатываний.

## R6 — Извлечение calls: TypeScript

**Decision:** TypeScript Compiler API + **type checker** (`getResolvedSignature` /
symbol at call). Однозначный call → `calls`; ambiguous/unresolved → пропуск.
DI/`injects` для TS в MVP **не** обязателен (spec: injects C#).

**Rationale:** Паритет с FR-002; checker уже в toolchain парсера.

**Alternatives considered:** Только текстовый AST без checker — недостаточно
для cross-file.

## R7 — `metadata.layer = code`

**Decision:** При любой записи/обновлении узлов и рёбер ingest symbols (v1 и v2
пути после включения 008) выставлять `metadata.layer = 'code'` (мержить с
существующими ключами вроде `parent_qualified_name`). Legacy документы в ES
без поля не мигрируем пакетно.

**Rationale:** Clarify Q4; FR-008. Применение и к v1-transform после 008 —
чтобы повторный ingest пометил слой; не требует отдельной миграции.

**Alternatives considered:** Только новые рёбра calls/injects — слабее для
фильтра слоёв.

## R8 — Лимит «очень большой файл»

**Decision:** MVP **без** жёсткого cap на число calls на файл. Прогон должен
завершиться; недобор только из‑за нерезолва/неоднозначности. Наблюдаемую
деградацию фиксировать в тестах/quickstart при появлении; отдельный soft-limit
— follow-up, не блокер закрытия.

**Rationale:** Clarify отложил в plan; не блокировать SC-001/002.

## R9 — UI / API

**Decision:** Новый UI и новые endpoint **не** нужны. Существующие
`007` search + edges узла уже принимают `type` как string; после появления
`calls`/`injects` в ES они видны. При необходимости — смоук в quickstart
(поиск строки/`calls`).

**Rationale:** FR-007; US5.

## R10 — Контракты и json-model

**Decision:** В `specs/008-code-graph-depth/contracts/` — канон для реализации:
схема native v2, политика ingest, дополнение EdgeType. Исходники идей в
`ods-help/requirements/json-model/` обновить статусы при implement
(`implementation_status`).

**Rationale:** FR-009; конституция — канон в specs.

## R11 — Code reuse / python·cpp dual versions

**Decision:** Shared symbols-адаптер (`symbols-model.ingest.ts`) выставляет
`supported_schema_versions: ['1','2']` для **всех** parser_id на этой factory
(typescript, csharp, python, cpp). Парсеры python/cpp в MVP `008` по-прежнему
эмитят только `schema_version: "1"` (без `usages`); dual allowlist не ломает v1.
Отдельная параметризация `['1']` только для python/cpp **не** нужна.

Карта файлов (reuse): см. tasks T001 — `parsers/typescript/run.mjs`,
`parsers/csharp/Ods.CSharpParser/*`, `backend/src/domain/graph-edge.ts`,
`backend/src/services/ingest/types.ts`, `adapters/symbols-model.ingest.ts`,
thin typescript/csharp ingest, fixtures `backend/tests/fixtures/ingest/*` и
`backend/tests/fixtures/parsers/{csharp,typescript}-calls/`.

**Rationale:** analyze U1; единый adapter без ветвления; FR-011 / T033.

**Alternatives considered:** Оставить python/cpp на `['1']` через параметр
factory — лишняя сложность без выгоды в MVP.
