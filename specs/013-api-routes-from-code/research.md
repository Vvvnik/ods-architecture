# Research: 013-api-routes-from-code

**Дата**: 2026-07-18  
**Спека**: [spec.md](./spec.md) | **План**: [plan.md](./plan.md)

## R1 — Отдельные parser_id

**Decision:** `ts-api-routes` и `dotnet-api-routes` — отдельные каталоги
`parsers/<id>/` + ingest adapters; не расширять `typescript`/`csharp`.

**Rationale:** FR-003; удаляемость; разный envelope.

**Alternatives considered:** Один mega-parser; вшивание в code-парсеры.

## R2 — Node id: сервис + method + path

**Decision:**  
`id = {parser_id}:http_endpoint:{serviceStable}|{METHOD}|{path}`  
через `systemNodeId`, где `serviceStable` = `composeFile#service` или
`unscoped:{hash(sourcePath)}` без сервиса.

**Rationale:** Clarify уникальность. OpenAPI `009` ключует только
`METHOD:path` — **не меняем** в `013` (merge вне scope).

**Alternatives considered:** Глобальный method+path; случайный UUID.

## R3 — Полный path и префикс (ods-arch)

**Decision:**

1. Строковый литерал пути → как есть (`'/api/v1/health'`).
2. `` `${prefix}/view` `` / конкатенация, если `prefix` — **const string
   literal в том же файле** → склеить.
3. Иначе → сегмент литерала хендлера без угадывания по репо.

На ods-arch встречаются оба паттерна (полный литерал и `const prefix = '/api/v1/...'`).

**Rationale:** FR-012 / SC-001.

**Alternatives considered:** Игнорировать prefix; глобальный resolve.

## R4 — Детектор artifacts

**Decision:**

| artifact_type | parser_id | Триггер |
|---------------|-----------|---------|
| `ts-api-routes` | `ts-api-routes` | `.ts`/`.js` + сигналы Fastify (`fastify`, `.get(`, `.post(`, `.route(`) |
| `dotnet-api-routes` | `dotnet-api-routes` | `.cs` + `[HttpGet`/`[Route` или `MapGet`/`MapPost` |

Denylist как languages; spawn в том же run. Incremental change-set — globs
как `009`.

**Alternatives considered:** Spawn на все `.ts` без сигналов.

## R5 — Привязка к service

**Decision:** Эвристики как `009`/`012` affiliation: сегмент path ≈ имя
compose service; иначе без `exposes`. Ребро **`exposes`**: service →
http_endpoint.

**Rationale:** FR-005; reuse.

## R6 — Handler (SHOULD)

**Decision:** В CP1 — **metadata** на эндпоинте:
`handler_name` / `handler_qualified_name` / `handler_path` при однозначном
match. Новый `EdgeType` для handler↔endpoint **не обязателен** в CP1 (избежать
cross-layer filter сюрпризов). Follow-up MAY добавить ребро (например
`handles`).

**Rationale:** FR-006 SHOULD; минимальный diff domain.

**Alternatives considered:** Новый edge сразу; не линковать вовсе.

## R7 — Extract strategy TS

**Decision:** Лёгкий разбор файла (TypeScript compiler API **или**
целевой regex/AST walk только под Fastify-паттерны DoD). Не полный semantic
graph. Предпочтение: **ts-morph / typescript** для template+const prefix в
одном файле — надёжнее regex.

**Rationale:** Точность FR-012 vs скорость; объём ods-arch умеренный.

**Alternatives considered:** Только regex — хрупко на `` `${prefix}` ``.

## R8 — Extract strategy C#

**Decision:** Roslyn (как `parsers/csharp` / bus): атрибуты на методах
контроллеров + вызовы `MapGet`/`MapPost`/`MapPut`/`MapDelete` с литералом.
Сборка route: `[Route]` на классе + метод; Map* литерал.

**Rationale:** FR-002; toolchain уже в репо.

## R9 — C# fixture

**Decision:** Новый `docker/fixtures/repos/api-routes-csharp-demo/`:
минимальный web-проект с **одним** `[HttpGet]` controller **и** одним
`MapGet`, плюс простой compose service для `exposes`. Подключить в
`setup-fixtures.sh`.

**Rationale:** SC-002 оба стиля; существующие fixtures могут не покрывать Map*.

**Alternatives considered:** Только WebApplication1 — проверить в implement;
если достаточно — reuse, иначе новый demo.

## R10 — OpenAPI coexistence

**Decision:** Не отключаем `openapi` parser. Не дедупим. Приёмка `013` —
только code-sourced endpoints. Возможные дубли yaml+code — tech debt до
docs-пространства.

**Rationale:** Clarify «только код» для DoD.

## R11 — UI / graph-view

**Decision:** CP1 **без** обязательных UI-изменений: `http_endpoint` уже в
`SYSTEM_INSIDE_KINDS` (`011`/`012`). Кнопки «Войти»/«В код» остаются.
Русская метка kind при необходимости — мелкий i18n, не CP2.

**Rationale:** Scope CP1 vs `014`.

## Неразрешённых NEEDS CLARIFICATION

Нет — все закрыты clarify + research выше.
