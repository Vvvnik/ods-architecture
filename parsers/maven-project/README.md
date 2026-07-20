# maven-project

Artifact parser for a Maven reactor. Reads all `pom.xml` files, returns `modules[]`
under contract 019, and marks deployable Spring Boot JAR/WAR modules as
`is_boot_app`. A parent/aggregator with `packaging=pom` is not considered a service.

The orchestrator runs it through `node run.mjs`.
Shared Spring/Java normalization code is in `../_shared/java-spring/`.
