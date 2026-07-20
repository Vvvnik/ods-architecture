# Quickstart: check 019-spring-system-landscape

**Goal:** on petclinic after analysis, the full Spring system-landscape
(A+B+C+D). Contracts — [contracts/](./contracts/).

**Reference:** project
`c736c364-96b1-442b-8bd4-3a8c2ea05d2d` (spring-petclinic-microservices).

## Preconditions

1. Stack: `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
2. Petclinic imported, sync + analysis; `java` symbols `available` (`018`).
3. Modules `maven-project`, `spring-config`, `java-api-routes`,
   `java-http-calls` in detector, registry (`available`).
4. In absence of WebClient on petclinic — fixture
   `java-http-webclient-demo` (generated in implement).

## 1. CP-A — services from Maven (SC-001)

1. Re-analysis petclinic → «Graph view → filter/slice **System**.
2. **Awaiting:** ≥5 nodes `service` from Boot-modules; **mandatory minimum
   names** (after merge — as in compose, if match):
   - `customers-service` (or compose-equivalent)
   - `vets-service`
   - `visits-service`
   - `api-gateway`
   - plus ≥1 additional Boot-reference service (config-server / discovery-server /
     admin / genai — what exists in WC)
3. Parent / library-modules **not** represented as `service`.
4. Language report: artifact `maven-project` with `parser_status=available`.

## 2. CP-B — config (SC-006)

1. Dig-in / inspector service with local `application*.yml`.
2. **Awaiting:** port and/or `connects_to` to the DB when resolvable datasource;
   without false edges on placeholder.

## 3. CP-C — API from controllers (SC-002)

1. System → service with `@RestController` / `@GetMapping` (MVC — DoD).
2. **Awaiting:** ≥1 HTTP-endpoint method+path; service **publishes** (`exposes`).
3. WebFlux / Gateway routes — preferred when available; **not** block analysis of others SC-002.
4. «Code" → Java symbols without regression (`018`, SC-003).

## 4. CP-D — Feign / WebClient (SC-007) and RestClient (SC-008)

1. Service card-client with Feign → section **«Calls»** ≥1 to the existing
   endpoint.
2. Same for WebClient (petclinic or fixture).
3. Petclinic: dig-in `genai-service` → ≥3 `http_calls` **RestClient** to
   `customers-service` (`/owners`, `/owners/{ownerId}/pets`).
4. Negative: unknown path → no new endpoint from client only.

## 5. Module disablement (SC-004)

1. Remove/Break registry entry any module `019`.
2. **Awaiting:** compose + `java` symbols available; `parser_status=missing`
   or no artifact.

## 6. Audit (SC-005)

1. No second orchestrator; spawn via `artifacts[]`.
2. Applicable checklist passed
   `specs/018-parser-extension-playbook/contracts/parser-extension-checklist.md`
   for each new `parser_id`.

## API (optional)

```text
GET /api/v1/projects/c736c364-96b1-442b-8bd4-3a8c2ea05d2d/analysis/language-report/latest
GET /api/v1/projects/c736c364-96b1-442b-8bd4-3a8c2ea05d2d/graph/view
```

Live UI:
`http://localhost:8080/projects/c736c364-96b1-442b-8bd4-3a8c2ea05d2d/graph-view`
