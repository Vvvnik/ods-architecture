# Ingest: maven-project (019)

**Спека**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

## Adapter

| parser_id | File |
|-----------|------|
| `maven-project` | `backend/src/services/ingest/adapters/maven-project.ingest.ts` |

`supported_schema_versions`: `["1"]`.

## Transform

Для каждого `modules[]` с `is_boot_app: true`:

1. Построить `service_name_hint` (artifactId / dir, normalize R3).
2. Найти существующий compose `service` с однозначным match.
3. **Match:** обогатить узел (`metadata.maven_*`); display name не менять
   (остаётся compose).
4. **No match:** создать `service` id `maven-project:service:{stableKey}`,
   `metadata.layer=system`.
5. Parent / library / `is_boot_app: false` — **не** создавать `service`.

## Идемпотентность

Upsert по стабильному id. Повторный run не плодит дубли после merge.

## Ошибки

Пустой `modules[]` / нет Boot apps → success, 0 новых сервисов.
Не валить run.

## Не делать

- Gradle в DoD.
- Склейка при нескольких кандидатах.
- HTTP / config.
