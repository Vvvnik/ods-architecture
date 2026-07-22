# Ingest: gradle-project (019 follow-up)

**Spec**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)  
**Native model**: [native-gradle-project.schema.json](./native-gradle-project.schema.json)

Outside original 019 DoD (Maven = petclinic). Parity with `maven-project` for
Gradle Groovy/Kotlin DSL.

## Adapter

| parser_id | File |
|-----------|------|
| `gradle-project` | `backend/src/services/ingest/adapters/gradle-project.ingest.ts` |

`supported_schema_versions`: `["1"]`.

## Transform

For each `modules[]` with `is_boot_app: true`:

1. Build `service_name_hint` (project name / dir, normalize R3).
2. Find existing compose `service` with unambiguous match
   (`maven-compose-merge` helpers).
3. **Match:** enrich node (`metadata.gradle_*`); keep compose display name.
4. **No match:** create `service` id `gradle-project:service:{stableKey}`,
   `metadata.layer=system`.
5. Library / `is_boot_app: false` / `settings.gradle*` — **not** create `service`.

## Detection

`build.gradle`, `build.gradle.kts` via artifact detector. Wrappers (`gradlew*`)
are not detected.

## Idempotency

Upsert by stable id. Retry run must not proliferate duplicates after merge.

## Errors

Empty `modules[]` / none Boot apps → success, 0 new services.
Do not fail run.

## Do not do

- Treat Gradle as mandatory 019 DoD for petclinic (Maven remains DoD).
- Merge with multiple ambiguous compose candidates.
- HTTP / config (other modules).
