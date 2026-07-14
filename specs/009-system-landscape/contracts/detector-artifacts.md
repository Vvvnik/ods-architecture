# Контракт: artifacts[] в Language Report (009)

**Спека**: [spec.md](../spec.md)  
**Модель**: [data-model.md](../data-model.md)  
**Правила**: [detector-rules.md](./detector-rules.md)

## Назначение

Расширение отчёта детектора (`005`) для запуска **system-парсеров** без
смешивания с `languages[]` code-слоя.

## API

`GET /api/v1/projects/:projectId/analysis/language-report/latest` — в теле
ответа добавляется массив `artifacts` (может быть пустым).

```typescript
interface ArtifactEntry {
  artifact_type: string;   // compose | appsettings | openapi | dotnet-project | bus
  file_count: number;
  sample_paths: string[];
  parser_id: string | null;
  parser_status: 'available' | 'missing' | 'failed';
}
```

## Поведение детектора

1. После построения `languages[]` выполнить artifact scan по WC.
2. Для каждого matched `artifact_type` — одна entry (агрегация file_count).
3. `parser_id` из rules или bus resolver (см. research R3).
4. `parser_status` — как для languages (`ParserRegistryService` + failed carryover).

## Поведение оркестратора

1. Spawn code parsers из `languages[]` (без изменений порядка/семантики).
2. Spawn system parsers из `artifacts[]` с тем же `spawnedParserIds`.
3. Пропуск при `missing` / `file_count=0` / duplicate `parser_id`.

## UI (005 modals, расширение 009)

**Окно 1** (`LanguagesConfirmModal`) MUST показывать **два списка** в одном
диалоге (тот же визуальный паттерн, что у языков):

1. **Языки** — `languages[]` (без изменений `005`).
2. **Системные артефакты** — сводка `artifacts[]`: **не более одной строки на
   `artifact_type`** (`compose`, `appsettings`, `openapi`, `dotnet-project`,
   `bus`).

Строка артефакта: человекочитаемый тип, `file_count`, `sample_paths[0]`, badge
`parser_status`. Для `artifact_type=bus` подпись профиля из `parser_id`
(`bus-rabbit` → «RabbitMQ», `bus-kafka` → «Kafka») — **одна** строка, не оба.

Отдельные БД, сервисы compose, HTTP-операции и топики **не** перечисляются в
модалке — только после ingest в графе.

Триггер окна 1: `languages.length > 0` **или** `artifacts.length > 0`. Тост
«нет анализируемых языков» — только если **оба** массива пусты.

Окно 2 (change set) без изменений — пути кода, без детализации system-графа.

## Elasticsearch

Добавить nested mapping `artifacts` в bootstrap `ods-language-reports`
(см. `005/contracts/elasticsearch-indices.md` — обновить в implement).

## Обратная совместимость

- Старые отчёты без `artifacts` → читать как `[]`.
- Клиенты, игнорирующие поле, продолжают работать с `languages[]`.
