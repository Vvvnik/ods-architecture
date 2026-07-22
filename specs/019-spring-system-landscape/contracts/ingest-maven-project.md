# Ingest: maven-project (019)

**Spec**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

## Adapter

| parser_id | File |
|-----------|------|
| `maven-project` | `backend/src/services/ingest/adapters/maven-project.ingest.ts` |

`supported_schema_versions`: `["1"]`.

## Transform

For each `modules[]` with `is_boot_app: true`:

1. Build `service_name_hint` (artifactId / dir, normalize R3).
2. Find existing compose `service` with unambiguous match.
3. **Match:** enrich node (`metadata.maven_*`); display name do not modify
   (remains in compose).
4. **No match:** create `service` id `maven-project:service:{stableKey}`,
   `metadata.layer=system`.
5. Parent / library / `is_boot_app: false` — **not** create `service`.

## Idempotency

Upsert by stable id. Retry run do not proliferate duplicates after merge.

## Errors

Empty `modules[]` / none Boot apps → success, 0 new services.
Do not fail run.

## Do not do

- Treat Gradle as part of this adapter (see `ingest-gradle-project.md`).
- Merge with multiple candidates.
- HTTP / config.
