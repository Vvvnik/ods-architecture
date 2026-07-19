# Implementation Plan: Spring system landscape (019)

**Branch**: `019-spring-system-landscape` | **Date**: 2026-07-19 |
**Spec**: [spec.md](./spec.md) | **Статус плана**: ✅ реализовано (2026-07-19)

**Input**: `specs/019-spring-system-landscape/spec.md` — полный DoD
**A+B+C+D**: Maven → `service`, Spring config → порты/`connects_to`,
Spring MVC/WebFlux → `http_endpoint`+`exposes`, Feign+WebClient+RestClient →
`http_calls`. Эталон petclinic. Clarifications 2026-07-19 (+ RestClient).

**Зависимости**:

- `specs/001-ods-vision/spec.md` — этап 15
- `specs/005-code-analysis/` — envelope, registry, оркестратор
- `specs/009-system-landscape/` — system-канон, compose, appsettings-паттерн
- `specs/013-api-routes-from-code/` — API-из-кода → `exposes`
- `specs/014-graph-view-ux/` — `http_calls`, UI «Публикует»/«Вызывает»
- `specs/018-parser-extension-playbook/` — чеклист + `java` symbols (не трогать HTTP)

## Summary

Четыре новых **system** artifact-модуля (не `parsers/java/`):

| CP | parser_id | Канон |
|----|-----------|--------|
| A | `maven-project` | Spring Boot application-модули → `service`; merge с compose при однозначном match (display = compose) |
| B | `spring-config` | `application*.yml`/`.properties` → port attrs + `connects_to` → `database` |
| C | `java-api-routes` | MVC/WebFlux литералы → `http_endpoint` + `exposes`; Gateway SHOULD |
| D | `java-http-calls` | Feign **и** WebClient → `http_calls` (SC-007); **RestClient**
  на petclinic (SC-008); fixture Feign/WebClient при нехватке на эталоне |

Детектор → `artifacts[]` → spawn в том же run → ingest в `ods-graph-*`.
UI graph-view без смены DoD `014`. Audit по чеклисту `018`.

## Technical Context

**Language/Version**: Java 17+ (CLI extract для routes/calls/maven — reuse
JDK/JavaParser tooling рядом с `parsers/java/`, **отдельные** `parser_id`);
TypeScript 5.x / Node 20 (detector, ingest); YAML/properties parse для
`spring-config` (Node или Java CLI — research R8)

**Primary Dependencies**: существующий Fastify backend + ES; JavaParser /
Maven reactor walk; Vitest; Docker image с JDK 17 (уже для `java`)

**Storage**: те же `ods-graph-nodes` / `ods-graph-edges`;
`metadata.layer=system`; id-схемы как `009`/`013`/`014` (см. data-model)

**Testing**: unit extract + ingest + merge ids; integration spawn→ingest→
graph-view на petclinic; fixture WebClient если нет на эталоне; регресс
`java` symbols / compose

**Target Platform**: Docker Compose `--profile full`

**Project Type**: 4 artifact CLI parsers + detector rules + 4 ingest adapters
(+ опц. fixture); frontend без обязательных изменений

**Performance Goals**: petclinic multi-module — полный прогон 4 модулей в
таймаутах registry; SC-001…007

**Constraints**: DoD = A+B+C+D; только Boot-application → service; Feign+WebClient
(SC-007) + RestClient petclinic (SC-008); Gateway SHOULD; без OpenAPI merge;
Gradle вне DoD.
обязательны; Gateway не блокер; HTTP вне `parsers/java/`; без второго
оркестратора; без merge OpenAPI; Gradle вне DoD

**Scale/Scope**: 4 parser_id; dogfood petclinic
(`c736c364-96b1-442b-8bd4-3a8c2ea05d2d`); 1 доп. fixture для WebClient при
нужде

## Constitution Check

*GATE: до Phase 0 и после Phase 1.*

| Требование | Статус |
|------------|--------|
| VI. FR в `019`, не раздувать `001` | ✅ |
| Scope в `001` (`019` перед паузой `015`) | ✅ |
| Модульные CLI, не монолит / не в `java` symbols | ✅ |
| Один канон ES | ✅ |
| Русский UI/артефакты | ✅ |
| Код после plan/tasks | ✅ |
| Без auth/RAG/docs продукта | ✅ |
| DoD A+B+C+D (clarify) | ✅ |

**Post-design:** research + data-model + contracts + quickstart — нарушений нет.

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
└── java-http-webclient-demo/   # при необходимости DoD WebClient
```

**Structure Decision**: расширение `parsers/` + detector + ingest по чеклисту
`018`; эталон — уже импортированный petclinic; frontend DoD `014` не меняем.

## Complexity Tracking

> Нет нарушений конституции, требующих обоснования.
