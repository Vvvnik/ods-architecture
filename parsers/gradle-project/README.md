# gradle-project

Artifact parser for Gradle builds (Groovy / Kotlin DSL). Reads `build.gradle`
and `build.gradle.kts`, returns `modules[]` in the same shape as `maven-project`,
and marks Spring Boot application modules as `is_boot_app`.

`settings.gradle(.kts)` is not a module. Wrappers (`gradlew*`) are ignored by
the detector. A library module without the Boot plugin / starter is not a service.

The orchestrator runs it through `node run.mjs`.
Shared Spring/Java path helpers live in `../_shared/java-spring/`.
