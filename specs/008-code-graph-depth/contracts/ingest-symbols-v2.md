# Ingest: symbols model v1 + v2

**Спека**: [../spec.md](../spec.md)  
**Research**: [../research.md](../research.md) (R2–R4, R7)

## Адаптер

Shared factory (`symbols-model.ingest.ts`, ранее `symbols-model-v1.ingest.ts`):

| Свойство | Значение |
|----------|----------|
| `parser_id` | `typescript` \| `csharp` (и python/cpp — только v1) |
| `supported_schema_versions` | `['1', '2']` |

## Алгоритм transform

1. Разобрать `model.symbols[]` → узлы (как v1).
2. Построить map `qualified_name → node.id` (и при коллизиях —
   `path:qualified_name` как в текущем коде).
3. `symbols[].refs[]` → рёбра, если `isEdgeType(ref.type)` (как v1).
4. Если `schema_version === '2'` (из контекста envelope) **или** присутствует
   `model.usages`:
   - для каждого usage с `type` ∈ {`calls`, `injects`}:
     - найти `fromId` / `toId` по map; если нет **любого** — **пропустить**
       usage (не ошибка transform);
     - иначе ребро: `type`, `from`, `to`, `path`, `location`, id через
       `buildEdgeId`.
   - usages иных типов (`creates`, `references`, …) — **игнорировать**.
5. Для **всех** узлов и рёбер результата: `metadata.layer = 'code'` (мерж).

## Контекст версии

Оркестратор/ingest service передаёт `envelope.schema_version` в
`IngestContext` (если ещё нет поля — добавить). Адаптер не обязан отказывать
v1 при пустом `usages`.

## Регрессия v1

Fixture `typescript-model-v1` / `csharp-model-v1`: тот же набор imports/
inherits (± layer в metadata). Наличие `layer` на регрессионных ожиданиях —
обновить тесты (допустимое расширение metadata).

## Инкремент

Без смены политики `006`: удаление/замена узлов и рёбер по `path` файла
включает `calls`/`injects` с тем же `path`.
