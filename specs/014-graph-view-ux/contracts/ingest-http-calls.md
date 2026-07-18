# Ingest: ts-http-calls (014)

**Спека**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

## Adapter

| parser_id | File |
|-----------|------|
| `ts-http-calls` | `backend/src/services/ingest/adapters/ts-http-calls.ingest.ts` |

`supported_schema_versions`: `["1"]`.

## Transform

Для каждого `calls[]`:

1. Resolve **caller** service id (`service_hint` / path → `frontend`, compose file
   heuristic как `013` `api-routes-ids`).
2. Нормализовать METHOD + http_path.
3. Resolve **target** `http_endpoint` **id без создания узла**:
   - Prefer code id: `ts-api-routes:http_endpoint:{backendStable}|{METHOD}|{path}`
     (callee_service_hint default `backend` на ods-arch / path heuristics).
   - Else openapi id: `openapi:http_endpoint:{METHOD}:{path}` если code id
     не применим.
   - При сомнении — **пропуск** вызова (не stub endpoint).
4. Edge `http_calls` caller → target; `metadata.layer=system`, `source=code`.

## Порядок в analysis run

Парсер MAY выполняться до/после `ts-api-routes`. Рёбра ссылаются на
стабильные id; узлы endpoint появляются из `013`/`openapi` в том же run.
View loader подтягивает missing ends по incident edges (как сейчас).

## Ошибки

Пустой `calls[]` → success, 0 edges. Не валить run (FR изоляции модулей).

## Не делать

- Создавать `http_endpoint`.
- Merge/delete openapi или code endpoints.
- `exposes` / `documents` / `depends_on` подменять `http_calls`.
