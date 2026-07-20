# Data Model: 019-spring-system-landscape

**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Canon remains in ES `ods-graph-nodes` / `ods-graph-edges`. New indexes and
NodeType/EdgeType over `009`/`013`/`014` **none**.

## Entities (canon)

### Service (`kind: service`, `metadata.layer: system`)

| Source | Rule |
|----------|---------|
| compose (`009`) | how currently |
| `maven-project` | Boot application-module → candidate; **merge** with compose at unambiguous match (R3) |
| id after merge | compose id (`compose:service:…`) |
| id without match | `maven-project:service:{artifactId}` (or path-stable key) |
| `name` | compose display upon merge; else artifactId / dir name |
| `metadata.maven_group_id` / `maven_artifact_id` / `module_path` | upon Maven-in the source |
| `metadata.port` | from `spring-config` upon availability |

### HTTP-endpoint (`kind: http_endpoint`)

How `013`, parser_id = `java-api-routes`:

| Field | Rule |
|------|---------|
| `id` | `java-api-routes:http_endpoint:{serviceStable}\|{METHOD}\|{path}` |
| `qualified_name` | `{METHOD} {path}` |
| `path` | path **of the source** |
| `metadata.http_path` / `http_method` | HTTP |
| `metadata.source` | `code` |
| `language` | `java` |

Uniqueness: **service + method + http_path**.

### Database (`kind: database`)

How `009` appsettings: logical name / engine from JDBC URL; without engine —
do not create node

### Call (edge, not node)

Caller service → existing `http_endpoint` via `http_calls` (`014`).

## Relationships

| type | from → to | Module |
|------|-----------|--------|
| `exposes` | service → http_endpoint | `java-api-routes` |
| `http_calls` | caller service → http_endpoint | `java-http-calls` |
| `connects_to` | service → database | `spring-config` |
| (merge) | — | `maven-project` enriches/deduplicates `service` |

Note: `depends_on` (compose) ≠ `http_calls`.

## Native envelopes (logical)

| parser_id | Root collections |
|-----------|-------------------|
| `maven-project` | `modules[]` (artifactId, path, packaging, is_boot_app, …) |
| `spring-config` | `configs[]` (source_path, service_hint, port?, datasources[]) |
| `java-api-routes` | `routes[]` (method, path, source_path, service_hint?, …) |
| `java-http-calls` | `calls[]` (method, path, source_path, client_kind: feign\|webclient\|restclient, …) |

Schemas: [contracts/](./contracts/).

## Validation

- Boot-only → service (R2).
- Merge only if unambiguous match (R3).
- Path endpoint not to invent (R5).
- `http_calls` without creation endpoint (R6).
- Placeholder DB → skip `connects_to` (R4).
- Idempotent upsert by `id` within `analysis_run_id`.

## Detector artifacts

See [contracts/detector-spring-system.md](./contracts/detector-spring-system.md).
