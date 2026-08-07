# Specification: Spring system landscape (petclinic)

**Feature**: `019-spring-system-landscape`

**Created**: 2026-07-19

**Status**: ✅ implemented (2026-07-19, dogfood petclinic + fixture;
SC-001…008; follow-ups Gradle / RestTemplate / Java bus / OpenAPI↔code —
2026-07-22; gRPC/RSocket/SOAP deferred Post-MVP)


**Input**: Draft `ods-help/requirements/019-spring-system-landscape-draft.md`;
dogfood [spring-petclinic-microservices](https://github.com/spring-petclinic/spring-petclinic-microservices.git)
(`project_id` `c736c364-96b1-442b-8bd4-3a8c2ea05d2d`) after closing `018`
(Java symbols `available`).

**Parent spec**: `specs/001-ods-vision/spec.md` (stage 15)

**Dependency**: `specs/009-system-landscape/spec.md` (system-canon, compose,
ingest); `specs/013-api-routes-from-code/spec.md` (pattern API-from-code →
`http_endpoint` + `exposes`); `specs/014-graph-view-ux/spec.md` (pattern
`http_calls` consumer); `specs/018-parser-extension-playbook/spec.md`
(checklist of new artifact-modules); language-module `java` (`018`) —
**not** expand HTTP/Feign.

## Clarifications

### Session 2026-07-19

- Q: What constitutes closure DoD `019`? → A: **A+B+C+D all together**
  (full equivalent of the extraction set C#/TS; as `014` with blocks A+B).
  Phased acceptance only A+C **not** covers a feature.
- Q: Which Maven-modules become services? A: **Only deployable /
  Spring Boot application**-modules → `service`; parent, library, test — none
  (parity with `dotnet-project`: web/worker, not classlib/test).
- Q: Required client calls for CP-D (DoD)? → A: **Feign and
  WebClient both mandatory** (two different client patterns; not duplicates).
  Acceptance MUST explicitly cover both styles (one or two scenarios/fixture).
- Q: Gateway routes — required for DoD CP-C? → A: **DoD = Spring MVC /
  WebFlux** (controllers / RouterFunction); **Gateway — SHOULD**, does not block
  closure (narrow DoD how at `ts-api-routes`).
- Q: If Maven-module and compose-service is the "same" service, what to do?
  → A: **Merge into a single** `service` at unambiguous match; display-name —
  **compose** (without mass merging on ambiguity).

### Session 2026-07-19 (RestClient dogfood)

- Q: On petclinic genai → customers via `RestClient` +
  `DiscoveryClient.getInstances("customers-service")` — extract?
  → A: **Yes.** These are working inter-service calls to the reference; `java-http-calls`
  MUST extract **RestClient** at statically resolvable method+path and
  callee (including service-id from `getInstances("…")` / literal hostname).
  Feign+WebClient remain mandatory for SC-007; RestClient is
  required to close dogfood petclinic (SC-008). RestTemplate without
  call-site and raw HttpURLConnection — still outside the DoD.

## Short description

After `018`, petclinic has Java **code** symbols and **compose** services,
but no Spring-specific system-layer model: Maven modules as services, config, or HTTP
from Spring MVC / Gateway / Feign — «who calls whom» in microservices.

The feature adds **separate artifact modules** (analogous to .NET/TS) instead of
mixing them into the `java` language module (as `typescript` ≠ `ts-api-routes`,
`csharp` ≠ `dotnet-api-routes`). Acceptance reference — **petclinic**.

### Compliance with standards C# / TypeScript

| Capability | C# / .NET | TypeScript | Spring / Java (`019`) |
|-------------|-----------|------------|------------------------|
| Project module → service / project | `dotnet-project` (`009`) | services mainly from compose; separate solution; as in `ts-project` none | **CP-A** `maven-project` → `service` (+ module identity) |
| Config → ports / DB hints | `appsettings` (`009`) | `.env` / appsettings-pattern | **CP-B** `spring-config` |
| HTTP API from code → `http_endpoint` + `exposes` | `dotnet-api-routes` (`013`) | `ts-api-routes` (`013`) | **CP-C** `java-api-routes` |
| Client → API (`http_calls`) | outside DoD `014` | `ts-http-calls` (`014`) | **CP-D** `java-http-calls` (Feign **and** WebClient) |
| Language symbols (code) | `csharp` | `typescript` | `java` (`018`) — **outside** changes `019` |

## Spec boundaries

### Included

One spec, multiple capability-packages (as `013`/`014`), reference — petclinic.

| CP | Focus | Priority DoD | Analogue |
|----|--------|---------------|--------|
| **A** | **Project modules** — Maven → system `service` (+ module identity); connection with compose where possible | **P1 (mandatory DoD)** | `dotnet-project` |
| **B** | **Spring config** — `application*.yml` / `.properties`: ports, key `connects_to` hints (DB); without full Cloud | **P1 (mandatory DoD)** | `appsettings` |
| **C** | **Java API routes** — Spring MVC / WebFlux → `http_endpoint` + `exposes`; Gateway routes — SHOULD (not a blocker DoD) | **P1 (mandatory DoD)** | `ts-api-routes` / `dotnet-api-routes` |
| **D** | **Java HTTP calls** — **Feign and WebClient** (both in DoD) + **RestClient**
  on petclinic (SC-008) → `http_calls` | **P1 (mandatory DoD)** | `ts-http-calls` |

**Feature closure:** DoD = **A+B+C+D** together (+ disableability, without regression Java).
Partial acceptance only A+C **not** sufficient.

Also includes:

- registration of new artifact-modules in the pipeline `005`/`009` without the second
  orchestrator;
- each new module — per checklist
  `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`;
- disabling any new module → `missing` / no artifact; rest is ok;
- code-layer Java without regression (`018`).

### Module candidates (artifact)

| parser_id | Input | Canon | CP |
|-----------|------|--------|-----|
| `maven-project` | `pom.xml` (and if present — multi-module reactor) | `service` (+ module identity); connection with compose where possible | A |
| `spring-config` | `application*.yml`, `*.properties` | attrs / `connects_to` hints (ports, DB) | B |
| `java-api-routes` | `.java` with `@RequestMapping` / `@GetMapping` and analogues; RouterFunction; Gateway route-definitions (SHOULD, not DoD) | `http_endpoint`, `exposes` | C |
| `java-http-calls` | Feign, WebClient (both in DoD SC-007) **and** RestClient upon
  resolvable target (petclinic SC-008) | `http_calls` | D |

**Forbidden:** HTTP / Feign / Gateway routes inside `parsers/java/` (language symbols).

### Not included

- `015` docs / `016` RAG / `017` auth / `004` mvp-runtime (**pause** before explicit command);
- deepening Java calls/usages (`008`) in detector, language-parser;
- symbols shell / build-scripts;
- merge OpenAPI ↔ code endpoints (separate `013`);
- full Spring Cloud (Config Server, Eureka UI, Circuit Breaker, full discovery UI…);
- separate swappable Gateway (routes Gateway — in detector, `java-api-routes`
  as SHOULD at statically visible paths; **not** required for DoD CP-C;
  else — skip, no fabrication path);
- Gradle as a **mandatory** DoD item (see Assumptions: Maven = petclinic DoD;
  Gradle — best-effort MAY / follow-up);
- module swappability — principle ODS;
- change DoD / FR `013` / `014` / `018`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Services from Maven-modules (CP-A) (Priority: P1)

How **architect**, after analysis petclinic I see system-services not only
from compose, but also from **Maven-modules** (deployable / application-modules),
so the landscape reflects the structure Spring-microservices.

**Why this priority**: covers the main gap after `018` + compose;
analogue `dotnet-project` for .NET-monorepo.

**Independent Test**: petclinic → re-analysis → in detector, system services exist,
comparable to Maven-modules (not only compose-names).

**Acceptance Scenarios**:

1. **Given** successful analysis petclinic with `maven-project`, **When** filter /
   slice `system`, **Then** services corresponding to are visible **deployable /
   Spring Boot application**-reference module (recognizable names); parent /
   library / test not presented as `service`.
2. **Given** same run and compose-services, **When** name/path unambiguously
   match, **Then** Maven and compose provide **one** node `service` with
   display-by name from compose; upon ambiguity — without mass false
   merges.
3. **Given** repository without `pom.xml`, **When** analysis, **Then**
   `maven-project` absent or `missing`; compose and code Java do not break.

---

### User Story 2 — HTTP API from Spring-controllers (CP-C) (Priority: P1)

How **architect**, I am included in the service petclinic on 'Graph Viewer' (system)
and I see HTTP-endpoints from **Spring MVC / WebFlux** (annotations /
RouterFunction), without reliance on OpenAPI. Gateway routes preferred at
static path, not required for acceptance.

**Why this priority**: parity with `013` (TS Fastify + C# controllers/minimal APIs);
without API-from-code system-service interior is empty for Java.

**Independent Test**: petclinic → dig-in service with controllers → ≥1
endpoint method+path.

**Acceptance Scenarios**:

1. **Given** analysis petclinic with controllers `@RequestMapping` /
   `@GetMapping` (and analogues) **When** system-interior of the linked service,
   **Then** are visible HTTP-endpoints with method and path.
2. **Given** endpoint from code and a comparable service, **When** inspect connections,
   **Then** it is visible that the service **publishes** (`exposes`) this endpoint.
3. **Given** service mapping impossible, **When** analysis,
   **Then** endpoint preserved without false binding to all services.
4. **Given** same project, **When** code-layer ('Code') **Then** Java-symbols
   `018` available without regression.

---

### User Story 3 — Modules are pluggable / do not break others (Priority: P1)

How **platform command**, new Spring system-modules are pluggable: failure or
absence does not break compose, OpenAPI, language Java-analysis and already
existing.NET/TS system-modules.

**Why this priority**: platform contract `005`/`009`/`018`; parser library (it is in
dogfood risky.

**Independent Test**: run with the new module disabled → rest
on-site results `parser_status: missing` / no artifact.

**Acceptance Scenarios**:

1. **Given** any new module `019` disabled or crashed, **When** analysis
   completed, **Then** compose-services and code-symbols Java available.
2. **Given** module included, but no relevant files/signals found, **When**
   analysis, **Then** without false nodes; full run does not fail.
3. **Given** failure of a single new module (e.g., only `java-api-routes`),
   **When** analysis, **Then** remain in MAY complete
   successfully

---

### User Story 4 — Config Spring: ports and DB hints (CP-B) (Priority: P1)

How **developer**, I see from `application*.yml` / `.properties` useful
hints: service port and key database connections (`connects_to`), without
full parse Spring Cloud.

**Why this priority**: parity with `appsettings` (`009`); belongs to full
DoD A+B+C+D (clarify 2026-07-19).

**Independent Test**: fixture / petclinic config with datasource → node
`database` and/or attrs port of the service.

**Acceptance Scenarios**:

1. **Given** `application.yml` with `server.port` (or equivalent), **When**
   analysis `spring-config`, **Then** port reflected at the associated service
   (attrs / display — by rules plan) without false services.
2. **Given** recognizable datasource / JDBC URL (or named hint),
   **When** ingest, **Then** exists `connects_to` to the logical DB when
   resolvable engine/name; placeholder without purpose — edge not created
3. **Given** full Spring Cloud Config / remote config, **When** analysis,
   **Then** MUST NOT require full Cloud for DoD; sufficient local
   `application*` files in WC.

---

### User Story 5 — Caller API (Feign, WebClient, RestClient) (CP-D) (Priority: P1)

How **architect**, on system-slice petclinic I see that the service-client
**invokes** already known HTTP-endpoints via **Feign**, **WebClient** and
**RestClient** (when calls are statically resolvable), separate from
another service **publishes**.

**Why this priority**: parity with `ts-http-calls` (`014`); Feign+WebClient in detector,
DoD (clarify 2026-07-19); RestClient on petclinic — real calls genai→
customers (clarify RestClient dogfood); belongs to full DoD A+B+C+D.

**Independent Test**: (a) Feign → «Calls» / `http_calls`; (b) WebClient →
same;c) RestClient on petclinic → genai→customers; styles are validated
explicitly (petclinic and/or additional fixture).

**Acceptance Scenarios**:

1. **Given** analysis with **Feign** and already extracted provider endpoints,
   **When** service card-client, **Then** in detector, **«Calls»** exists ≥1
   call to existing HTTP-endpoint (or edge `http_calls` at limits
   canvas).
2. **Given** analysis with **WebClient** and already extracted endpoints,
   **When** service card-client, **Then** visible ≥1 call to
   existing endpoint (same criteria as for Feign).
3. **Given** on petclinic `RestClient` + resolvable callee
   (`getInstances("customers-service")` / equivalent) and path, **When**
   analysis, **Then** ≥3 `http_calls` genai→customers to the existing
   endpoints (SC-008).
4. **Given** client-side URL/path did not match any known endpoint,
   **When** ingest, **Then** no connection created; new endpoints only
   from client MUST NOT to appear.
5. **Given** service only invokes API and they do not publish themselves, **When**
   card, **Then** no assertion that it "publishes API».

---

### Edge Cases

- Unambiguous match Maven↔compose — one `service` with display-by name
  compose; upon ambiguity, duplicates are preferable to false merges
  (clarify 2026-07-19).
- None Maven / none Spring controllers — successful run; corresponding
  artifacts absent or `missing`; Java symbols and compose are not affected.
- Multi-module reactor: **only** deployable / Spring Boot application-
  modules → candidates for `service`; parent POM, library and test-modules —
  without nodes `service` (clarify 2026-07-19; heuristic details Spring Boot —
  in detector, plan).
- Dynamic path / SpEL / runtime-only Gateway — MAY absent; not
  fabricate path.
- Prefix `@RequestMapping` on class + method — **full** path, if both
  literals are statically visible; otherwise — method literal without guessing the repo
  (as FR path in detector, `013`).
- Multiple services with a single method+path — **two** endpoint
  (service + method + path), as in `013`.
- Gateway routes: only if statically extractable path in the same module
  `java-api-routes`; SHOULD, not a blocker DoD CP-C (clarify 2026-07-19);
  separate module only for parser_id is not introduced.
- Gradle-only repository — optional DoD petclinic; MAY best-effort
  or follow-up, without lock on close A+B+C+D on Maven-reference.
- Incremental analysis: change `pom.xml` / controller / Feign — update
  linked system-nodes/edges by rules ingest `006`/`009`.
- OpenAPI from `009` MAY still write to the canon **outside** the acceptance merge
  with code endpoints (`013`-policy).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The platform MUST extract system-`service` candidates from Maven
  (`pom.xml`, multi-module) through the separate `maven-project` artifact module
  (not part of `parsers/java/`). **Only**
  deployable / Spring Boot application-modules; parent POM, library and
  test-modules MUST NOT become services (clarify 2026-07-19).
- **FR-002**: Unambiguous mapping Maven-service with compose-service
  ingest MUST merge them into **one** node `service`; display name MUST
  future new language (e.g. **compose** (clarify 2026-07-19). On ambiguity —
  MUST NOT massively stitch 'all-to-all'; details match — in detector, plan.
- **FR-003**: Platform MUST extract HTTP-routes from **code** Java /
  Spring for DoD: annotations MVC (`@RequestMapping` / `@GetMapping` /
  `@PostMapping` and analogues) and, where applicable on the reference, WebFlux
  `RouterFunction` with literal path — to nodes `http_endpoint` system-layer:
- **FR-004**: Gateway route-definitions SHOULD to be processed **in the same**
  module `java-api-routes`, only if path **statically** extract;
  absence Gateway routes MUST NOT block feature closure. Support CP-C
  (clarify 2026-07-19). Separate artifact-module only for Gateway
  MUST NOT to be ingested into `019`.
- **FR-005**: API and HTTP-client extraction MUST remain **separate** in the
  artifact modules (`java-api-routes`, `java-http-calls`) and MUST NOT be
  part of the `java` language module.
- **FR-006**: The HTTP API source for DoD CP-C MUST be **code only**.
  OpenAPI MUST NOT be required for acceptance; merge with yaml — outside scope `019`.
- **FR-007**: Endpoint MUST connect to service via `exposes` upon
  possible mapping. Node uniqueness MUST be based on
  **service + method + path** (as in `013`).
- **FR-008**: The displayed path MUST be **complete** when class-level and
  method-level literals (or equivalent) are statically extractable; otherwise —
  handler literal without a fabricated prefix.
- **FR-009**: Platform MUST extract from local
  `application*.yml` / `.properties` port and key `connects_to` hints
  to the DB via module `spring-config` (without full Spring Cloud).
- **FR-010**: Platform MUST reflect consumer-connection **Feign**, **WebClient**
  and **RestClient** (at statically resolvable method+path and callee) as
  `http_calls` to **existing** endpoints with module `java-http-calls`;
  Feign **and** WebClient both in DoD SC-007 (clarify 2026-07-19); RestClient —
  MUST on baseline petclinic (SC-008). MUST NOT create endpoints only
  from client-side URL. RestTemplate without call-site and raw HttpURLConnection
  MUST NOT be required for DoD.
- **FR-011**: Failure or disconnection of any module `019` MUST NOT break
  remaining new and old modulescompose, `java` symbols, existing
  TS/C# artifact-modules) in terms of the platform contract.
- **FR-012**: Implementation MUST integrate into existing pipeline
  (`005` orchestrator, `artifacts[]`, ingest `009`/`013`/`014`) without the second
  orchestrator without parallel duplicate canon
- **FR-013**: Each new parser_id MUST pass applicable checklist items
  `018` (detector, CLI, native schema, ingest, registry, disable module (remove catalog / do not build in image)
- **FR-014**: Code-layer Java (`018`) MUST preserve behavior symbols without
  regression; HTTP/Feign MUST NOT added to `parsers/java/`.
- **FR-015**: DoD `019` MUST to be disable/deletable without breaking **Maven**-reference petclinic
  **without** parser Gradle. Absence `gradle-project` / parsing
  `build.gradle*` MUST NOT derive from Gradle —
  separate module only for follow-up (MAY), not part of acceptance A+B+C+D.
- **FR-016**: On 'Graph View' in system-user in the service interior
  MUST to view endpoints CP-C (slice `011`/`014` UX); for CP-D — sections
  «Publishes / Calls by semantics `014`, without modification DoD `014`.

### Key Entities

- **Maven module / service**: deployable / Spring Boot application-module
  as system-`service` (identity: group/artifact or path/name by plan);
  parent / library / test — not services.
- **HTTP-endpoint (system)**: method + path from **Spring-code**; identity
  **service + method + path**.
- **Spring config hint**: port / datasource from local `application*` files.
- **Call API (http_calls)**: service connection-client with known
  endpoint; client sources — **Feign**, **WebClient** (SC-007) and
  **RestClient** (SC-008 / petclinic).
- **Artifact entry**: write to `artifacts[]` detectors with `parser_id` one
  from modules `019`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On petclinic after one successful analysis in the filter /
  slice `system` user sees services from Maven Boot-modules
  (**CP-A**): **no less than 5** nodes `service`, among which are recognizable as
  minimum `customers-service`, `vets-service`, `visits-service`,
  `api-gateway` (names after merge — as in compose, if match); parent /
  library-modules not represented as `service`.
- **SC-002**: On petclinic after analysis at dig-in to the service
  controllers are visible **≥1** HTTP-endpoint from code (MVC/WebFlux) with
  recognizable method+path (**CP-C**); OpenAPI not mandatory; absence of
  Gateway routes does not violate SC-002.
- **SC-003**: Code-layer Java same services preserves symbols (`018`) —
  smoke without regression in count/types code-nodes on the reference slice
- **SC-004**: Run with modules disabled `019` leaves compose-
  services and code-graph Java available.
- **SC-005**: Audit reuse: no second analysis pipeline
  «aside; new modules accounted for in `artifacts[]` and checklist `018`.
- **SC-006**: When enabled `spring-config` on petclinic / fixture —
  ≥1 useful hint port or `connects_to` to the DB without false edges on
  placeholder (**CP-B**, required to close)
- **SC-007**: After analysis: (a) ≥1 relationship 'Calls' / `http_calls` from
  **Feign** and (b) ≥1 from **WebClient** to existing endpoints — either
  petclinic covers both styles, or two scenarios/fixture; each style
  is explicitly validated; without endpoints created solely from the client (**CP-D**).
- **SC-008**: On petclinic after analysis ≥3 `http_calls` from **RestClient**
  (genai → customers: `/owners`, `/owners/{ownerId}/pets`) to the existing
  endpoints; without creation endpoint only from client.

## Assumptions

- Feature name and directory: **`019-spring-system-landscape`** (as in `001` and
  constituencies).
- **DoD closures** = **CP-A + CP-B + CP-C + CP-D** together (+ disableability,
  without regression Java). Full equivalent of extraction set C#/TS in one spec; otherwise template not verified on live module.
  partial acceptance only A+C **not** covers a feature (clarify 2026-07-19).
- Reference — **spring-petclinic-microservices**; Maven — mandatory stack DoD.
  Candidates `service` from Maven — only deployable / Spring Boot application
  (clarify 2026-07-19).
- CP-D DoD: **Feign and WebClient** both mandatory (SC-007); upon shortage
  one style per petclinic — additional fixture. **RestClient** required for
  dogfood petclinic (SC-008), when calls are statically resolvable.
  RestTemplate without call-site / raw HttpURLConnection — outside DoD.
- Gradle: ✅ follow-up `gradle-project` (outside original mandatory DoD).
  RestTemplate / HttpURLConnection: ✅ static call-sites in `java-http-calls`.
  gRPC / RSocket / SOAP: deferred Post-MVP (no new canon in 019).
- Gateway: not a separate module; static routes — SHOULD in detector,
  `java-api-routes`, not required for DoD CP-C (clarify 2026-07-19).
- Runtime parsers routes/calls: separate module only for CLI artifact-module; reuse
  JDK/JavaParser tooling with `parsers/java/` at the shared libs
  in detector, plan, without confusion symbols+HTTP in one module without separate justification. `parser_id`.
- Endpoint→service / module→compose — heuristics in the spirit of `009`/`013`
  (name, path); at unambiguous match Maven↔compose — **one** `service`,
  display-name from compose (clarify 2026-07-19); details match in detector, plan.
- "Publishes" / "Calls" semantics and UI graph-view already set `014`;
  `019` populates data for Java/Spring, does not rewrite UX-DoD.
- Priority relative to pause: **`019` earlier** `015`–`017` and `004`, so far
  user explicitly does not pause.
- Artifacts: English. Portal UI: supported locales via i18n (constitution).

## Follow-up (not in DoD `019`, not a separate project)

**Java/Spring**-specifically after A+B+C+D (+ SC-008). Common model for **C# /
Python / Go / Kotlin / …** — in detector, Post-MVP `001` (§stack coverage) and constitution
(Post-MVP: capability-layers; do not duplicate language queues here.

| Topic (Java) | Note |
|-------------|---------|
| Gradle → `service` | ✅ `gradle-project` (parity Maven; outside original DoD) |
| RestTemplate / raw HTTP | ✅ `java-http-calls` `resttemplate` / `httpurlconnection` (static URLs) |
| gRPC / RSocket / SOAP | deferred Post-MVP `001` (no new canon in 019) |
| Java language `calls` (schema v2 / `008` parity with C#/TS) | deferred — separate feature; not `019` |
| Bus from Java-code | ✅ `bus-rabbit` / `bus-kafka` scan `.java` |
| Framework-only API | Config/Eureka/Admin — empty dig-in OK |
| OpenAPI merge with code routes | ✅ OpenAPI `documents` → code `http_endpoint` when METHOD+path match |

Canon JSON **does not require** extensions for these tails — we hit the parser limit
and standards (as in any other stack)

## Related artifacts

- Draft: `ods-help/requirements/019-spring-system-landscape-draft.md`
- Module references: `dotnet-project` (`009`), `ts-api-routes` /
  `dotnet-api-routes` (`013`), `ts-http-calls` (`014`)
- Checklist: `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`
- Live dogfood: `http://localhost:8080/projects/c736c364-96b1-442b-8bd4-3a8c2ea05d2d/graph-view`
- Vision: `specs/001-ods-vision/spec.md` (stage **15**)
