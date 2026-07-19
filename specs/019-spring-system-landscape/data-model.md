# Data Model: 019-spring-system-landscape

**Спека**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Канон остаётся в ES `ods-graph-nodes` / `ods-graph-edges`. Новых индексов и
NodeType/EdgeType сверх `009`/`013`/`014` **нет**.

## Entities (канон)

### Service (`kind: service`, `metadata.layer: system`)

| Источник | Правило |
|----------|---------|
| compose (`009`) | как сейчас |
| `maven-project` | Boot application-модуль → кандидат; **merge** с compose при однозначном match (R3) |
| id после merge | compose id (`compose:service:…`) |
| id без match | `maven-project:service:{artifactId}` (или path-stable key) |
| `name` | compose display при merge; иначе artifactId / dir name |
| `metadata.maven_group_id` / `maven_artifact_id` / `module_path` | при Maven-источнике |
| `metadata.port` | из `spring-config` при наличии |

### HTTP-эндпоинт (`kind: http_endpoint`)

Как `013`, parser_id = `java-api-routes`:

| Поле | Правило |
|------|---------|
| `id` | `java-api-routes:http_endpoint:{serviceStable}\|{METHOD}\|{path}` |
| `qualified_name` | `{METHOD} {path}` |
| `path` | путь **исходника** |
| `metadata.http_path` / `http_method` | HTTP |
| `metadata.source` | `code` |
| `language` | `java` |

Уникальность: **сервис + method + http_path**.

### Database (`kind: database`)

Как `009` appsettings: логическое имя / engine из JDBC URL; без engine —
узел не создавать.

### Вызов (ребро, не узел)

Caller service → existing `http_endpoint` через `http_calls` (`014`).

## Relationships

| type | from → to | Модуль |
|------|-----------|--------|
| `exposes` | service → http_endpoint | `java-api-routes` |
| `http_calls` | caller service → http_endpoint | `java-http-calls` |
| `connects_to` | service → database | `spring-config` |
| (merge) | — | `maven-project` обогащает/дедупит `service` |

Не путать: `depends_on` (compose) ≠ `http_calls`.

## Native envelopes (логическое)

| parser_id | Корневые коллекции |
|-----------|-------------------|
| `maven-project` | `modules[]` (artifactId, path, packaging, is_boot_app, …) |
| `spring-config` | `configs[]` (source_path, service_hint, port?, datasources[]) |
| `java-api-routes` | `routes[]` (method, path, source_path, service_hint?, …) |
| `java-http-calls` | `calls[]` (method, path, source_path, client_kind: feign\|webclient\|restclient, …) |

Схемы: [contracts/](./contracts/).

## Validation

- Boot-only → service (R2).
- Merge только при однозначном match (R3).
- Path эндпоинта не выдумывать (R5).
- `http_calls` без создания endpoint (R6).
- Placeholder DB → skip `connects_to` (R4).
- Идемпотентный upsert по `id` в рамках `analysis_run_id`.

## Detector artifacts

См. [contracts/detector-spring-system.md](./contracts/detector-spring-system.md).
