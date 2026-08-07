# Specification: System landscape (infrastructure graph)

**Feature**: `009-system-landscape`

**Created**: 2026-07-14

**Status**: Refined (clarify 2026-07-14); plan ready (2026-07-14)

**Entrance**: System-layer in the same Canon of the graph that code-layer (`006`/`008`):
services, HTTP-contracts, message bus, database, and compose from artifacts
the repository. A source:
`ods-help/requirements/008-code-graph-and-system-landscape-draft.md` (§B);
model `ods-help/requirements/json-model/` (C02, C04, P01–P07).

**Parent Spec**: `specs/001-ods-vision/spec.md` (phase 8)

**Dependencies**: `specs/005-code-analysis/spec.md` (detector, the Orchestrator,
envelope, run); `specs/006-project-graph/spec.md` (Canon, ingest,
indexes `ods-graph-*`); `specs/007-portal-scale-ux/spec.md` (search and
graph view); `specs/008-code-graph-depth/spec.md` (pattern
`metadata.layer` for layer separation)

## Short description

After analyzing monorepo the user sees only **code graph** (characters,
calls), but **landscape system**: what services announced in compose,
how are the projects related, which HTTP-endpoints are described in OpenAPI, which databases
and brokers connect services that publish and consume messages.
All data are stored in **same** indexes Canon (`ods-graph-nodes`,
`ods-graph-edges`) marked `metadata.layer = system`. Existing
code-layer and runs **don't break**.

## Clarifications

### Session 2026-07-14

- Q: How to extend the report of the detector for system-layer `artifacts[]` separately or in `languages[]`? → A: **`artifacts[]` separately from `languages[]`** — two array language report; I artifact entry: `artifact_type`, `file_count`, `sample_paths`, `parser_id`, `parser_status` (similar language entry).
- Q: What is the "bus-"parser in "MVP" and the policy for both profiles? → A: **Both registry** (`bus-rabbit`, `bus-kafka`); detector signals exposes `parser_id` in `artifacts[]` **to** spawn; if signs **both** — priority **`bus-rabbit`** (Kafka-the parser does not run in this run).
- Q: which records databases when multiple connection strings? → A: **Only the parser `appsettings`** detector only artifact `appsettings` in `artifacts[]`; **each** recognized connection string → a separate node `database` (+ `connects_to`); total logical name for → single node, several ribs on the services; without engine/placeholder — the node is not created.
- Q: Scope analysis monorepo in MVP? → A: **Entire repository**; limitation subtree (`path prefix`) — follow-up in plan, not a blocker MVP `009`; reference fixture full mini-monorepo.
- Q: Filter `system` / `code` — which ribs show? → A: **`system`** — only edges system↔system; **`code`** — only code↔code; **`all`** — all edges (including mixed code↔system if there is in Canon).

### Session 2026-07-28 (appsettings binding kinds)

- Q: Is every `ConnectionStrings` entry a `database` node? → A: **No** — classify by **content/key**, not section alone. Provider-name-only leaves (`Provider=MSSql|Postgres|Npgsql|…`) are engine hints (`binding_type=other`), not landscape nodes. Rabbit/AMQP/Kafka under CS → `broker`; Redis (incl. StackExchange `host:port,...,defaultDatabase=`) → `cache`; object storage / search DSNs → `storage` / `search`; remaining real DSNs → `database` with `metadata.engine` (Port `5432`+`Host=` → `postgres`; sibling Provider copies engine onto DB bindings in the same file).
- Q: Structured `RabbitSettings` / `RedisSettings` / Elastic / S3-like sections — one node per leaf? → A: **No** — coalesce to **one** infra binding/node per section; scalar/credential/port leaves (e.g. `TimeoutInSeconds`) are not nodes. Owning service gets `connects_to` when `service_hint` resolves. Dedup with same-target CS entries when `target_hint`/engine match.

## The boundaries of the spec

### Is included

- expansion of the canon **system-layer**: new types of nodes and edges (neutral
  names, without reference to a single customer or stack);
- **five** new modular parsers in MVP stage (envelope → ingest):
  - `compose` — `docker-compose*.yml` / compose-manifests;
  - `appsettings` — `appsettings*.json`, `.env`, `example.env`;
  - `openapi` — OpenAPI/Swagger YAML repository;
  - `dotnet-project` — `*.sln`, `*.csproj`, the links between projects;
  - **bus** detector selects `bus-rabbit` or `bus-kafka` signals
    in config/csproj **to** spawn; both parser in registry, in one run
    start **no more than one**; if there are signs of both **`bus-rabbit`**
    (priority Rabbit);
- ingest-adapters system-layer in the same Canon ES; I **new** of nodes and edges
  system-layer **mandatory** `metadata.layer = system`;
- extension **detector** (`005`): the report is complemented by an array **`artifacts[]`**
  (apart from `languages[]`) recognition artifact types
  (`compose`, `appsettings`, `openapi`, `dotnet-project`, bus-profile, etc.)
  according to the rules of the detector; the Orchestrator runs system-parsers for `parser_id`
  from artifact entry;
- start system-parsers in **same** run analysis that code-parsers
  (one `analysis_run_id`);
 filter layer on the screen "Count": `code` | `system` | `all` (minimum UI);
- accessibility system-of nodes and edges using the existing search/viewing
  graph (`007`), taking into account the layer filter;
- pilot fixture and acceptance criteria to the repository with compose + config +
  OpenAPI (+ bus-pilot profile).

### Not included

- canvas / React Flow (→ `010-ods-graph-viewer`);
- parser `dotnet-api-routes` — follow-up after MVP `009`
  (does not block stage closure);
- second bus-parser in **one run** (if the detector is already chose one);
  the implementation of both parsers in registry — in MVP, but spawn only one;
- gRPC, cross-repo (several ODS-projects) — Phase 2;
- analysis **subtree** (`path prefix`) at the start of the run — follow-up
  after MVP (in MVP — the entire repository);
- RAG, auth, edit the graph in UI;
- separate analysis run for system-layer only;
- change file tree `002` / index `ods-elements`;
- Swagger UI for API portal ODS (outside scope analyzed repository).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Graph of services from compose (Priority: P1)

As **architect or developer**, after analyzing the repository with
`docker-compose.yml` I can see the nodes **services** and communication **dependencies**
between them (`api` depends on `worker`) to understand the topology deployment
without manual parsing compose.

**Why this priority**: Compose — the most obvious sign in system-layer;
without it, the landscape does not "stick together" into services.

**Independent Test**: Fixture compose with two services and `depends_on` →
after a run in the Canon has nodes `service` and ribs `depends_on`.

**Acceptance Scenarios**:

1. **Given** `docker-compose.yml` services `api` and `worker` where
   `api` depends on `worker`, **When** completed a successful analysis
   parser `compose`, **Then** in Canon there are sites services `api` and
   `worker` and edge `depends_on` from `api` to `worker`.
2. **Given** same fixture, **When** user opens the "Count" with
   filter `system`, **Then** only visible system-nodes/edges (without
   code-characters).
3. **Given** compose no `depends_on`, **When** analysis **Then**
   service nodes are being created; there are no extra edges `depends_on`; run
   is successful.

---

### User Story 2 — HTTP-contracts from OpenAPI (Priority: P1)

How **developer**, I can see the nodes **HTTP-endpoints** from OpenAPI-specs
repositories and communication "the **service publishes** endpoint" to compare
service contracts.

**Why this priority**: OpenAPI — the second pillar system-landscape for
integrations and review API.

**Independent Test**: Fixture with `openapi.yaml` and operations → nodes
`http_endpoint` and ribs `exposes` / `documents`.

**Acceptance Scenarios**:

1. **Given** OpenAPI-file operation `GET /api/v1/weather/forecast`,
   **When** analysis parser `openapi`, **Then** in the Canon of a node
   `http_endpoint` with meaningful `qualified_name` (method + path) and
   edge `documents` from spec to endpoint (or equivalent according to canon).
2. **Given** known to bind the endpoint to the service of compose/name
   module (rules ingest), **When** ingest, **Then** there is an edge
   `exposes` from node `service` to `http_endpoint`.
3. **Given** invalid or empty OpenAPI, **When** analysis **Then**
   the parser fixes an error in `parser_results`; the run remains
   `partial` or `success` for other parsers; ingest falls
   in its entirety.

---

### User Story 3 — connect to the database from the configuration (Priority: P1)

How **developer**, I see that the service **connects** Boolean
**database** extracted from `appsettings` / connection strings,
to understand data dependencies without searching through all config-files.

**Why this priority**: the database is a key element of the landscape near compose
and API.

**Independent Test**: Fixture `appsettings.json` with
`ConnectionStrings__DefaultConnection` → node `database` and fin
`connects_to`.

**Acceptance Scenarios**:

1. **Given** `appsettings.json` with named connection string,
   **When** analysis parser `appsettings`, **Then** in the Canon is
   node `database` (logical name) and edge `connects_to` service
   or the DB configuration context.
2. **Given** few connection strings (`DefaultConnection`, `Redis`, ...),
   **When** ingest `appsettings`, **Then** for **each** recognized
   **dependency** — a single infra node of the **content-appropriate**
   kind (`database` / `broker` / `cache` / `storage` / `search`) and edge
   `connects_to`; Redis under ConnectionStrings is `cache`, not `database`;
   with one logical target from different services — **one** infra node,
   several `connects_to`.
3. **Given** secrets / placeholder no resolvable engine,
   **When** analysis **Then** false ribs to a non-existent nodes
   are not created.
4. **Given** `ConnectionStrings:Provider` provider-name-only plus a real CS,
   **When** analysis **Then** no `database` node named `Provider`; engine from
   Provider is applied to the real DB binding when the CS lacks engine tokens.
5. **Given** structured `RabbitSettings` (Host/Port/Timeout/credentials),
   **When** analysis **Then** exactly one `broker` node for the section (no
   orphan `…__TimeoutInSeconds` / port / password nodes) and `connects_to`
   from the owning service when resolvable.

---

### User Story 4 - Links between .NET-projects (Priority: P2)

As **developer** in .NET-monorepo, I can see the nodes **projects** (`dotnet_project`)
and ribs **links** between `.csproj` to understand graph Assembly.

**Why this priority**: Complements compose and config; important for large
monorepo but does not block US1–US3.

**Independent Test**: Two `.csproj` with `ProjectReference` → fin
`project_reference`.

**Acceptance Scenarios**:

1. **Given** `Service.csproj` citing `Contracts.csproj`,
   **When** analysis `dotnet-project`, **Then** nodes of both projects and
   edge `project_reference` from consumer to dependency.
2. **Given** solution no project references, **When** analysis **Then**
   the nodes of the projects from `.sln`/catalog MAY be created; excess edges no.

---

### User Story 5 Messages on the bus (Priority: P2)

How **developer**, I can see who **consumes** or **publishes**
messages on the bus: the detector to spawn chooses `bus-rabbit` or
`bus-kafka` signals in the repository (if both Rabbit),
to trace asynchronous integrations.

**Why this priority**: Bus — required minimum draft §B;
detector resolves the profile to the parser; both modules in registry.

**Independent Test**: Fixture with consumer/handler selected tyres →
rib `consumes` (and subject — `publishes`) to `message_topic` /
`message_type`.

**Acceptance Scenarios**:

1. **Given** code/config unambiguous consumer queue or topic,
   **When** analysis of the chosen bus-parser, **Then** in the Canon is
   rib `consumes` from service/handler node `message_topic` (or
   `message_type`).
2. **Given** two handler/service in the repository refer to the same stable
   `message_type` (name DTO/schema), **When** ingest **one** bus-parser,
   the selected detector in **this** run (`bus-rabbit` or `bus-kafka`),
   **Then** MAY be cross-link between consumers and the common node
   `message_type` according to the rules of Canon (research R6); the second bus-parser that
   the same run **does not** runs.
3. **Given** signs and Rabbit, and Kafka in one repository, **When**
   the detector generates `artifacts[]`, **Then** `parser_id` = `bus-rabbit`
   and spawn only `bus-rabbit` (without `bus-kafka` in the same run).
4. **Given** code snippet without soluble topic/queue, **When**
   analysis, **Then** the edge is not created; the run does not crash.

---

### User Story 6 — layer Filter on the screen "the Count" (Priority: P1)

As a **portal user**, I switch the graph display:
**only code**, **only system** or **all** not to mix
hundreds of characters with dozens of services.

**Why this priority**: No filter system-layer for the
for daily use on large repositories.

**Independent Test**: Project code + system nodes → switch
The filter changes the node/edge lists without restarting the analysis.

**Acceptance Scenarios**:

1. **Given** project with the successful analysis code and system, **When**
   the user selects the filter `system`, **Then** lists of nodes
   and edges visible only documents `metadata.layer = system` and ribs
   **system↔system** (mixed code↔system hidden).
2. **Given** filter `code`, **When** viewing, **Then** visible code-
   the nodes and edges **code↔code**; system-nodes and system↔system hidden.
3. **Given** filter `all`, **When** viewing, **Then** both layers and
   **all** edges (including mixed code↔system); search (`007`)
   matched with the active filter.
4. **Given** project without system-data (only code), **When**
   filter `system`, **Then** clear empty state without error.

---

### Edge Cases

- In the repository there compose / openapi / appsettings successful run;
  corresponding entries in `artifacts[]` missing or
  `parser_status: missing`; `languages[]` and code graph are not affected.
- Several "compose-"files in "monorepo" — all relevant files are being processed
  or scope is limited by the detector rules; duplicates service id
  they are stably resolved (suffix path/file).
- OpenAPI no `operationId` — the endpoint is still created on
  method+path; stable id.
- Environment variables in compose (`${VAR}`) is a node of the service is created;
  unsolvable external dependencies without false edges.
- Incremental analysis: when changing the config- file, the old system-
  The nodes/edges of this file are replaced according to the rules ingest `006`.
- Repeated full run — idempotence of id system-nodes within
  one `analysis_run_id`.
- Mixed signals Rabbit + Kafka one repo — detector picks
  `bus-rabbit`; `bus-kafka` in this run not spawn.
- Rib code↔system in the Canon — only visible in the filter `all`; in
  `system` and `code` hidden (both ends must match the layer).
- Mixed repository: code + system in one run — both layers in
  is canonical; deleting a project cascades both layers.
- Very large monorepo — in MVP analysis **just repo**; limitation
  subtree (`path prefix`) — follow-up in plan; reference fixture —
  full mini-monorepo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Platform MUST to expand the Canon of the graph node types
  system-layers: at least `service`, `dotnet_project`, `http_endpoint`,
  `database`, `message_topic`, `broker` (and others from `json-model`
  C02, where applicable to MVP-parsers).
- **FR-002**: Platform MUST to expand the Canon of edge types system-layer:
  at least `depends_on`, `project_reference`, `exposes`, `documents`,
  `connects_to`, `consumes` (and `publishes` supported bus-parser).
- **FR-003**: Ingest system-layer MUST record the nodes and edges in the same
  indexes `ods-graph-nodes` / `ods-graph-edges` that code-layer,
  no regression of existing code-documents.
- **FR-004**: All **new** of nodes and edges created ingest in
  the framework `009`, MUST be `metadata.layer = system`.
- **FR-005**: Platform MUST register modular parsers (envelope)
  MVP: `compose`, `appsettings`, `openapi`, `dotnet-project`, **`bus-rabbit`**
  and **`bus-kafka`**; the Orchestrator MUST spawn **no more than one** bus-parser
  for the run — `parser_id` from `artifacts[]` (detector); the signals of both
  profile **`bus-rabbit`**.
- **FR-006**: Detector (`005`) MUST complement language report array
  **`artifacts[]`** (apart from `languages[]`); each entry MUST
  contain `artifact_type`, `file_count`, `sample_paths`, `parser_id`,
  `parser_status` and determine which system-parsers start
  (compose, appsettings, openapi, dotnet-project, bus). For bus: both
  module registry; detector exposes `parser_id` to spawn; when
  signs Rabbit **and** Kafka — `parser_id` = `bus-rabbit`.
- **FR-007**: the Orchestrator of analysis MUST start system-parsers that
  same run that code-parsers, keeping one
  `analysis_run_id`.
- **FR-008**: UI screen "Count" MUST provide a layer filter:
  `code` | `system` | `all`; **`system`** — nodes and edges system↔system;
  **`code`** — nodes and edges code↔code; **`all`** — all including
  mixed code↔system; selection is saved in session or local
  condition (details UX — in plan).
- **FR-009**: Searching and viewing ties (`007`) MUST take into account active
  layer filter (same edge visibility rules as FR-008) and display
  human-readable labels of the system-edge types.
- **FR-010**: in the absence of soluble purpose of communication (service topic, DB)
  ingest MUST skip an edge rather than create a stub node; run
  The analysis does not MUST fall completely.
- **FR-011**: Stable id system-nodes MUST to follow the pattern
  `{parser_id}:{kind}:{stable_key}` (see `canonical-node-system.schema.json`).
- **FR-012**: JSON-scheme native and canonical system-layer
  `ods-help/requirements/json-model/` MUST be synchronized with
  sintering and marked `implementation_status: done` to close the stage.
- **FR-013**: Types and components of database (`database`, `metadata.engine`) MUST
  retrieved **only** parser `appsettings` when ingest; detector
  MUST NOT list engine in `artifacts[]`; for each recognized
  connection string — separate node `database` (dedup on a stable
  the logical name within the run).
- **FR-014**: In MVP analysis system- and code-parsers MUST cover
  **all** working copy repository; filter `path prefix` for a run —
  outside MVP `009` (follow-up).

### Key Entities

- **System node (canon)**: architectural essence (service, endpoint,
  DB, topic, project .NET etc.) `kind`, `name`, `path` to the original
  the artifact `metadata.layer = system`.
- **System edge (canon)**: the relationship between system-nodes (or system ↔ code,
  if clearly supported plan) type `depends_on`, `connects_to`, ...
- **Parser envelope (system)**: wrap `005` with `parser_id` system-
  module native `model` scheme P01–P07.
- **Artifact entry (detector)**: element `artifacts[]` in language report —
  `artifact_type` (eg. `compose`, `openapi`, `bus`), `file_count`,
  `sample_paths`, `parser_id`, `parser_status`; does not mix with
  `languages[]` code-layer.
- **Artifact type (detector)**: logical file type/patterns in WC,
  , which determines which system-parsers to run.
- **Layer filter (UI)**: customizing display
  `code` | `system` | `all` on the graph screen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: pilot fixture mini-monorepo (compose + appsettings +
  openapi + csproj + bus) after one analysis run user
  sees no less **10** system-nodes and **8** system-ribs with the correct
  The types in the filter are `system`.
- **SC-002**: On the same project filter switching `code` / `system`
  / `all` changes the composition of the list of nodes for **≤ 2 with** no re-analysis
  (perceptually instantaneous on the pilot volume).
- **SC-003**: Re-analysis code-only repository (without system-
  artifacts) gives **identical** code graph to `009` (0 regressions on
  the number code-nodes/edges on the reference fixture `008`).
- **SC-004**: at least **90%** pre-labeled connections on the reference
  fixture (compose depends_on, openapi endpoint, connection string,
  project reference, bus consume) are present in the Canon after ingest.
- **SC-005**: All diagrams system-layer `json-model/` for MVP-parsers
  have the status of implementation `done` and are validated examples
  (example JSON versus schema).

## Assumptions

- Language report (`005`) stores **`languages[]`** (code) and **`artifacts[]`**
  (system) in one document. Window 1 confirmation after sync (`005` modal):
  the list of languages **without changing the semantics** `languages[]` plus summary
  `artifacts[]` (up to one line at `artifact_type`; see
  `contracts/detector-artifacts.md`). The modal **not** lists individual
  DB engine and connection strings — only artifact `appsettings` with
  `file_count` (details of the database in the column after the parser `appsettings`).
- Both bus-parser (`bus-rabbit`, `bus-kafka`) in registry; in one run
  spawn **one** by the decision of the detector; tie-break → **`bus-rabbit`**.
- Databases (postgres, mssql, ...) retrieves the parser **`appsettings`** not
  detector (in `artifacts[]` only artifact `appsettings` without a list
  engine); several connection strings → multiple nodes `database`.
- Single girder analysis combines code and system (not separate run).
- Cross-link messages between services — by stable type name
  message / schema name; details of the resolution in `plan.md`.
- `dotnet-api-routes` postponed MVP `009`; planned as a stage **`013`**
  (together with TS Fastify/Express routes; see draft
  `ods-help/requirements/013-api-routes-from-code-draft.md`).
- Analysis MVP — **entire repository**; `path prefix` — follow-up (plan).
- Portal UI labels for edge types via i18n (supported locales), by analogy with `008`.
- Backend platform remains TypeScript; system-parsers — modular
  CLI (as `005`), including .NET subprocess where appropriate.

## Related materials

- Vision: `specs/001-ods-vision/spec.md` (phase **8** — `009-system-landscape`)
- Draft: `ods-help/requirements/008-code-graph-and-system-landscape-draft.md` §B
- JSON-model: `ods-help/requirements/json-model/README.md`
- Code-layer: `specs/008-code-graph-depth/spec.md`
- Canon baseline: `specs/006-project-graph/contracts/canonical-schemas.json`
