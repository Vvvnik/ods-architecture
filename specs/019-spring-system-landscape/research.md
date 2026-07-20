# Research: 019-spring-system-landscape

**Date**: 2026-07-19  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## R1 — Four separate parser_id

**Decision:** `maven-project`, `spring-config`, `java-api-routes`,
`java-http-calls` — separate `parsers/<id>/` + ingest adapters.
**Not** expand `parsers/java/` HTTP/Feign/config.

**Rationale:** FR-005/014; parity `typescript` ≠ `ts-api-routes`,
`csharp` ≠ `dotnet-api-routes`; checklist `018`.

**Alternatives considered:** Single mega Spring-parser; sewing into `java`.

## R2 — Which Maven-modules → service

**Decision:** Candidate for `service` only if module **deployable Spring Boot
application**:

1. Exists `spring-boot-maven-plugin` **or** dependencies
   `spring-boot-starter*` + `main` class / `SpringBootApplication` in detector, module path
   (heuristic implement: plugin sufficient for petclinic).
2. Exclude: packaging `pom` (parent/aggregator), `*-api`/`*-client` libraries
   without Boot plugin, test-only modules, modules with `skip`/`none` as app.

Exact details detector — in detector, implement; DoD is validated on application-
microservices petclinic (customers, vets, visits, api-gateway, …).

**Rationale:** Clarify Q2; parity `dotnet-project` web/worker ≠ classlib.

**Alternatives considered:** All sheet-based jar; only compose-matched.

## R3 — Merge Maven ↔ compose

**Decision:**

1. Normalize names: compose service name vs Maven `artifactId` / directory
   name (lowercase, strip `-service`/`_service` suffix for comparison).
2. At **exactly one** unambiguous match → **one** canonical `service`:
   - stable id remains in **compose**-key (`compose:…`), if compose-node
     already exists in run;
   - Maven writes `metadata.maven_*` (groupId, artifactId, module_path) on
     same node (or via ingest merge pass).
3. Display `name` = **compose** service name.
4. None match / multiple candidates → Maven MAY create separate
   `service` with id `maven-project:service:{artifactId}` **without** false stitching.

Order: compose and maven in one module without separate justification. run; merge in detector, ingest maven (or shared
post-pass) after appearance compose nodes — as affiliation in detector, `013`.

**Rationale:** Clarify Q5; FR-002.

**Alternatives considered:** Always two nodes; Maven only attrs without service.

## R4 — spring-config scope

**Decision:** Local files in only WC:

- `application.yml` / `application-*.yml` / `.yaml`
- `application.properties` / `application-*.properties`
- profile-files alongside the module

Extract:

- `server.port` → `metadata.port` (or attrs) linked service
- datasource: `spring.datasource.url` / `jdbc:` hints → `database` +
  `connects_to` (parity `appsettings` / FR-013 from `009`: without engine —
  without node)

Without: Config Server remote, full Cloud, secrets placeholders → skip edge.

**Rationale:** FR-009; clarify DoD B.

**Alternatives considered:** Full Spring Cloud; only ports without DB.

## R5 — java-api-routes extract

**Decision:** DoD-patterns (JavaParser / annotation scan):

- Class `@RequestMapping` + method `@GetMapping`/`@PostMapping`/… /
  `@RequestMapping(method=…)`
- Build **full path** = class prefix + method path at both literals
- `RouterFunction` / `route()` with literal path — if found on the baseline
- Gateway YAML/`RouteLocator` statically — **SHOULD**, not a blocker DoD

Id endpoint: how `013` —
`java-api-routes:http_endpoint:{serviceStable}|{METHOD}|{path}`.

`exposes`: service → endpoint upon affiliation (module path → service).

**Rationale:** Clarify Q4; FR-003/004/007/008.

**Alternatives considered:** Gateway in detector, DoD; only Gateway.

## R6 — java-http-calls: Feign + WebClient + RestClient

**Decision:**

| Style | Extract |
|-------|---------|
| **Feign** | `@FeignClient` interface + method mapping annotations → method + path (or path from 006). name/url attributes in static mode) |
| **WebClient** | chain `.method().uri("…")` / `hostname + "path"` with resolvable literal |
| **RestClient** | chain `.method().uri(…)` how at WebClient; callee from literal hostname **or** `DiscoveryClient.getInstances("service-id")` inside helper-method; path from concat literals + `{param}` for identifiers |

Feign+WebClient **MUST** withinSC-007). RestClient **MUST** on petclinic
(SC-008) — genai `AIDataProvider` → customers. If on petclinic none
WebClient/Feign — fixture `java-http-webclient-demo`.

Integration: existing only `http_endpoint` (prefer
`java-api-routes:…`, else openapi); else skip. Edge `http_calls`.
Do not create endpoint from client.

RestTemplate without call-site / raw HttpURLConnection — outside DoD.

**Rationale:** Clarify Q3 + RestClient dogfood; FR-010; parity `014` wider.

**Alternatives considered:** Only Feign; any HTTP-client; RestClient outside scope.

## R7 — Detector artifacts

**Decision:**

| artifact_type | parser_id | Trigger |
|---------------|-----------|---------|
| `maven-project` | `maven-project` | `pom.xml` (root or modules) |
| `spring-config` | `spring-config` | `application*.yml`/`yaml`/`properties` |
| `java-api-routes` | `java-api-routes` | `.java` + content hints: `@RestController`, `@Controller`, `@RequestMapping`, `@GetMapping`, `RouterFunction` |
| `java-http-calls` | `java-http-calls` | `.java` + `@FeignClient` / `WebClient` / `webClient.` / `RestClient` |

Presence `language: java` **not** auto-start routes/calls — are needed hints.
Incremental: globs + change-set as `009`/`013`.

**Alternatives considered:** Spawn routes on all `.java`.

## R8 — Runtime spring-config

**Decision:** Preferred **Node CLI** (yaml + properties) in detector,
`parsers/spring-config/` — simpler deps; Maven/Java CLI if
more suitable for a unified JDK-image. Does not affect canon.

**Rationale:** Minimum friction; analogue `appsettings` (TS).

**Alternatives considered:** Only Java CLI for all four.

## R9 — Shared JavaParser libs

**Decision:** Shared code extract MAY reside in `parsers/_shared/java-ast/`
(or alternative) for `java-api-routes` / `java-http-calls`; **not** change
output/contract `parsers/java/` symbols.

**Rationale:** Constitution reuse; mixing prohibition symbols+HTTP in one module without separate justification. id.

**Alternatives considered:** Full copy-paste; one JAR on symbols+HTTP.

## R10 — Order in analysis run

**Decision:** Orchestrator without strict DAG: stable id. Practical
order SHOULD: compose → maven-project (merge) → spring-config →
java-api-routes → java-http-calls (as `014` after endpoints). View loader
already fetches missing ends by edges.

**Rationale:** FR-012; experience `014`.

## R11 — UI

**Decision:** No changes DoD `014`. Publishes card/`exposes` and
«Calls»/`http_calls` already exists; data Java populate the same types.

**Rationale:** FR-016.

## R12 — SC-001 number of services

**Decision:** DoD: **≥5** `service` on petclinic after merge; mandatory
minimum recognizable names: `customers-service`, `vets-service`,
`visits-service`, `api-gateway` (+ ≥1 additional Boot-service from WC: config /
discovery / admin / genai). Display after merge — compose. Parent/library —
not services. Checklist — in `quickstart.md`.

**Rationale:** measurable SC-001; reference names spring-petclinic-microservices.

---

All items Technical Context closed; NEEDS CLARIFICATION none remain.
