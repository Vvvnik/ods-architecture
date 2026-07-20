# Implementation Plan: Spring system landscape (019)

**Branch**: `019-spring-system-landscape` | **Date**: 2026-07-19 |
**Spec**: [spec.md](./spec.md) | **Plan status**: ✅ implemented (2026-07-19)

**Input**: `specs/019-spring-system-landscape/spec.md` — full DoD
**A+B+C+D**: Maven → `service`, Spring config → ports/`connects_to`,
Spring MVC/WebFlux → `http_endpoint`+`exposes`, Feign+WebClient+RestClient →
`http_calls`. Reference petclinic. Clarifications 2026-07-19 (+ RestClient).

**Dependencies**:

- `specs/001-ods-vision/spec.md` — stage 15
- `specs/005-code-analysis/` — envelope, registry, orchestrator
- `specs/009-system-landscape/` — system-canon, compose, appsettings-pattern
- `specs/013-api-routes-from-code/` — API-from-code → `exposes`
- `specs/014-graph-view-ux/` — `http_calls`, UI «Publishes / Calls
- `specs/018-parser-extension-playbook/` — checklist + `java` symbols (do not touch HTTP)

## Summary

Four new **system** artifact-module (not `parsers/java/`):

| CP | parser_id | Canon |
|----|-----------|--------|
| A | `maven-project` | Spring Boot application-modules → `service`; merge with compose at unambiguous match (display = compose) |
| B | `spring-config` | `application*.yml`/`.properties` → port attrs + `connects_to` → `database` |
| C | `java-api-routes` | MVC/WebFlux literals → `http_endpoint` + `exposes`; Gateway SHOULD |
| D | `java-http-calls` | Feign **and** WebClient → `http_calls` (SC-007); **RestClient**
  on petclinic (SC-008); fixture Feign/WebClient upon shortage at the reference |

Detector → `artifacts[]` → spawn in the same run → ingest in detector, `ods-graph-*`.
UI graph-view without change DoD `014`. Audit by checklist `018`.

## Technical Context

**Language/Version**: Java 17+ (CLI extract for routes/calls/maven — reuse
JDK/JavaParser tooling next to `parsers/java/`, **separate catalogs** `parser_id`);
TypeScript 5.x / Node 20 (detector, ingest); YAML/properties parse for
`spring-config` (Node or Java CLI — research R8)

**Primary Dependencies**: existing Fastify backend + ES; JavaParser /
Maven reactor walk; Vitest; Docker image with JDK 17 (already for `java`)

**Storage**: same `ods-graph-nodes` / `ods-graph-edges`;
`metadata.layer=system`; id schema as in `009`/`013`/`014` (see data-model)

**Testing**: unit extract + ingest + merge ids; integration spawn→ingest→
graph-view on petclinic; fixture WebClient if not on the baseline; regression
`java` symbols / compose

**Target Platform**: Docker Compose `--profile full`

**Project Type**: 4 artifact CLI parsers + detector rules + 4 ingest adapters
(+ opt. fixture); frontend without mandatory changes

**Performance Goals**: petclinic multi-module — full run of 4 modules in
timeouts registry; SC-001…007

**Constraints**: DoD = A+B+C+D; only Boot-application → service; Feign+WebClient
(SC-007) + RestClient petclinic (SC-008); Gateway SHOULD; without OpenAPI merge;
Gradle outside DoD.
mandatory; Gateway not a blocker; HTTP outside `parsers/java/`; without the second
orchestrator; without merge OpenAPI; Gradle outside DoD

**Scale/Scope**: 4 parser_id; dogfood petclinic
(`c736c364-96b1-442b-8bd4-3a8c2ea05d2d`); 1 additional fixture for WebClient upon
need

## Constitution Check

*GATE: before Phase 0 and after Phase 1.*

| Requirement | Status |
|------------|--------|
| VI. FR in detector, `019`, do not bloat `001` | ✅ |
| Scope in detector, `001` (`019` before pause `015`) | ✅ |
| Modular CLI, not a monolith / not in `java` symbols | ✅ |
| Single canon ES | ✅ |
| Russian UI/artifacts | ✅ |
| Code after plan/tasks | ✅ |
| Without auth/RAG/docs product | ✅ |
| DoD A+B+C+D (clarify) | ✅ |

**Post-design:** research + data-model + contracts + quickstart — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/019-spring-system-landscape/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── detector-spring-system.md
│   ├── native-maven-project.schema.json
│   ├── native-spring-config.schema.json
│   ├── native-java-api-routes.schema.json
│   ├── native-java-http-calls.schema.json
│   ├── ingest-maven-project.md
│   ├── ingest-spring-config.md
│   ├── ingest-java-api-routes.md
│   └── ingest-java-http-calls.md
└── tasks.md                            # /speckit-tasks
```

### Source Code

```text
parsers/
├── maven-project/          # pom.xml reactor → modules
├── spring-config/          # application*.yml / .properties
├── java-api-routes/        # MVC / WebFlux (+ Gateway SHOULD)
└── java-http-calls/        # Feign + WebClient + RestClient

backend/
├── src/
│   ├── config/…            # artifact detector rules
│   ├── services/
│   │   ├── language-detector…
│   │   └── ingest/adapters/
│   │       ├── maven-project.ingest.ts
│   │       ├── spring-config.ingest.ts
│   │       ├── java-api-routes.ingest.ts
│   │       └── java-http-calls.ingest.ts
└── tests/
    ├── unit/ingest/
    └── integration/

docker/fixtures/repos/
└── java-http-webclient-demo/   # as needed DoD WebClient
```

**Structure Decision**: extension `parsers/` + detector + ingest by checklist
`018`; reference — already imported petclinic; frontend DoD `014` do not change.

## Complexity Tracking

> No constitutional violations requiring justification.
