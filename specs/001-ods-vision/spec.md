# Specifications: ODS platform  vision and road map

**Fiction**: `001-ods-vision`

**Created**: 2026-06-26

**Updated**: 2026-07-22 (**`021-angularjs-ui-landscape`** ✅ — petclinic AngularJS
→ Graph UI; `019`/`020`/`021` ✅; UI = structure+function, **not** pixel/Figma;
color-legend backlog; `015`–`017`/`004` pause)

**Statute**: Agreed

**Input**: ODS top-level view; MVP and post-MVP boundaries; spec map.
The Constitution v1.2.19, p. VI.

## Purpose and Value

**Problem:** code, documentation and knowledge about the repository are scattered across the country
Tools and terminals.

**Solution:******ODS platform**  single web portal where the main actions of
The code and (in the long run) the knowledge they have accumulated are executed in one interface.

**Distinctions:** own architecture and UX ODS.

## What it is and what it is made of

**ODS**  web application (**frontend + backend**), deployed in **Docker**:

| The component | The assignment | Right now. |
|-----------|------------|--------|
| **Frontend** (`003`) | UI, menu, dashboard, import, sync | ✅ MVP |
| **Backend** (`002`) | REST API, sync, ES, working copies | ✅ MVP |
| **Elasticsearch** | JSON metadata (project, tree, status) | ✅ MVP |
| **Filesystem** | A working copy of the git repository | ✅ MVP |
| **Docker Compose** (`docker/`) | Dev/full stack (portal `:8080`) | ✅ Pilot |
| ** Parseers / Count** | Code analysis, dependency analysis | ✅ `005`/`006`; further `007+` |

** MVP text:** TypeScript (frontend + backend). ** UI language and artifacts:** Russian.

**State (2026-07-19):** MVP (`002` + `003`), analysis/graph (`005``014`),
playbook + Java (`018`), Spring system (`019`) ** are released** on local
The pilot (including the petclinic). **`015``017` and `004` on a break**.
The following is a list of the commands and their descriptions.
In the daughters' clubs.

## MVP of the border

### It 's coming in .

| Area | The heat |
|---------|-------|
| Project, tree, status, sync, read-only files, DELETE the project | `002-domain-model` |
| Menu, import, list of projects, 3 panels, sync UX, DELETE in UI | `003-portal-mvp` |
| OpenAPI (`002`  canon; `003`  consumer mirror) | `002` / `003` |
| Compose: ES; profile `full`  backend + frontend | `docker/` |
| Access without entrance (internal pilot) | `002`, `003` |

### Not included (MVP `002`/`003`)

- RAG, auth, roles;
- editing files in UI, Git push/merge;
- PDF, AsciiDoc, Q&A, agents, and all that.

Analysis and minimum column  in `005`/`006` (realised).
**not included** in the current stages, see §Post-MVP backlog.

Detailed user stories and FR MVP  **only** in `002` and `003`.

## Post-MVP  directions

**Analysis of the code (`005` → `006`) **  ✅ is implemented (detector, parser, ingest, min. UI `/graph`).

Briefly recorded decisions `005`/`006`:

1. Language detector → report; parser by `file_count`.
2. Modular parser (TS, C#, Python, C++); envelope → ingest → canon in ES.
3. UX: Two modal windows after sync; incremental analysis.
4. The canon graph  individual ES indexes; view with the list + edge (not canvas).

Details are as follows: `specs/005-code-analysis/spec.md`, `specs/006-project-graph/spec.md`.

**Code graph depth (`008`) **  calls, usages, semantic extract (expansion of the 005 parser).

**System landscape (`009`) **  services, API, Kafka/Rabbit, BD, compose, OpenAPI (new parser)

**Scale pipeline (`010-scale-pipeline`) **  ✅ hardening sync/detektor/orchestratorctor/
Parser/ingest/API for large repositories (closed 2026-07-15).

**Canvas (`011-ods-graph-viewer`) **  ✅ is being implemented (2026-07-18): React Flow,
**system**-card (services + infrared, drill focus + external).

**Code-drill (`012-code-graph-bottom`) **  ✅ is implemented (2026-07-18): entrance
In code from system-service, drill module→type→method, affiliation view-only.

**API from code (`013`) **  ✅ CP1 is implemented (2026-07-18): routing parser →
`http_endpoint` + `exposes` into the system (without merge OpenAPI).

**UX + client HTTP (`014`) **  ✅ implemented (2026-07-18): Code/System buttons,
The analysis, sync-over, the edges **`http_calls`** (client → endpoints `013`),
Canon: `specs/014-graph-view-ux/`. Follow-up outside the DoD:
transitions to files; `connects_to` (ES/MinIO/BD) drawings; **canvas color
legend** (see Post-MVP §graph chrome). Drafts:
`014-graph-view-ux-draft.md`, `system-api-links-semantics-draft.md`.

**Further (after `018`/`019`):** by the team  `015``017`/`004` ** or** point
Post-MVP (§cover stacks / any language).
The current next step  ** is not recorded** (pause / backlog in `001`).

### Post-MVP backlog (without specific specs yet)

**Annotations and concealment of nodes (not editing the column):**

- Now: just build and view data; edit/remove nodes and edges
  In UI, the context menu in column  **not planned** in `007`.
- The next thing I know, the notes in the "Property" panel are not needed.
  not used; to hide such nodes in graph visualization.
- **Open question:** repeat sync/analysis creates a node from the code again  need a policy
  (save the tags on `id`, overlay in ES, merge when ingested).

**Graph list layout:** scroll down the column Uzly / Connections independently;
Even the root  is attached to the bottom of the node panel  done in `010` (GraphPage layout).

**Interactive scheme (canvas):** ✅ `011-ods-graph-viewer` (system MVP);
code-drill to bottom  **`012`** (✅); API from code  **`013`** (✅);
UX/`http_calls` — **`014`** (✅).

**UI landscape / Graph UI:** **`020-ui-landscape-from-code`** — ✅ Implemented
2026-07-22 (React/TS dogfood; Graph UI + `react-ui` parser).
**`021-angularjs-ui-landscape`** — ✅ Implemented 2026-07-22 (AngularJS → same
canon/Graph UI; petclinic dogfood).

**What UI landscape is (normative boundary):**
- **In scope:** **structure + function** — screens/routes, schematic frames,
  forms/controls when extracted, navigation, UI→API binds, style **artifacts**
  (CSS file / module refs), Graph UI as a structural overview/drill.
- **Out of scope (not planned as Figma clone):** **pixel-perfect** layout,
  true design-tool fidelity, computed sizes/fonts/colors as in Figma, or
  regenerating a full working UI 1:1 from ES/JSON alone. Data is an architect
  landscape / spec input — not a pixel mockup store.

AngularJS / other non-React stacks: empty Graph UI until their parser lands
(`021`+); that does not change the structure-vs-pixel boundary above.

**Portal UI consistency:** Workspace, Graph analysis, Graph view, and future
Graph UI **MUST** share one chrome (left-aligned title bar, fonts, tree/inspector
surfaces, shared CSS tokens/`page-chrome`). **MUST NOT** invent per-page or
per-widget style forks. Constitution v1.4.1 — Portal UI consistency + Language;
normative detail in `020` FR-009–FR-012.

**Graph / analysis color meanings (today, no legend yet):**

| Surface | Cue | Means |
|---------|-----|--------|
| Graph view | Teal fill/border (`.rfNodeCode`) | Code-layer node (`metadata.layer=code` or symbol kind) |
| Graph view | Blue border (`.rfNodeFocus`) | Slice focus |
| Graph view | Amber outline (`.rfNodeSelected`) | Selection |
| Graph view | Muted card (`.rfNodeExternal`) | External / stub in slice |
| Graph UI | Violet card (`.rfFrameFlow`) | `ui_flow` / flow-derived modal frame |
| Graph UI | Amber outline (`.rfFrameSelected`) | Selection |
| Analysis confirm modal | Green row fill (`#dcfce7`) | **New** language/artifact **and** `parser_status=available` |
| Analysis confirm modal | Red row fill (`#fee2e2`) | **New** entry **and** `parser_status=missing` |
| Analysis confirm modal | No fill | Unchanged vs previous report, or first report / other statuses |

Green on the modal is **not** the same signal as Graph view teal (code layer): it marks
*newly detected* available parsers. Users currently see both without explanation.

**Post-MVP UX (portal polish — not `019`, not a parser):** ship a **visible color
legend** (or equivalent affordance) covering Graph view, Graph UI, **and** analysis
confirm modals; i18n `en`/`ru`; keep one shared vocabulary under portal chrome.
Implementation home when scheduled: small follow-up spanning `014` + `020` +
portal analysis chrome (or next portal UX feature), not Spring/system extract.

**Stock coverage / large repository (memory, not stage and not one speck):**

This is a general rule for all languages and the infra is not a Java tail.
Already closed pilots (TS/C#/Python/C++ code; .NET/TS system; Java/`019`)
Go, Kotlin and any next stack go the same way.
By way of **** (`018` + daughterspeck), without a new canon n any case.

**Capability-layers** (repeat for each stack according to the reference):

| The layer | Canon (roughly) | Examples already / later |
|------|------------------|---------------------|
| **Language (code)** | symbols, calls, … (`008`) | ✅ TS, C#, Python, C++, Java → Go, Kotlin, … |
| **Project / modules → service** | `service` (+ merge compose) | ✅ `dotnet-project`, `maven-project`, `gradle-project` → go.mod, pip/poetry layout, … |
| **Config → port / DB / broker hints** | `connects_to`, metadata | ✅ appsettings, spring-config → analog on the stack |
| **HTTP API from code** | `http_endpoint` + `exposes` | ✅ ts/dotnet/java-api-routes → gin/echo, Ktor, FastAPI, … |
| **HTTP/RPC clients** | `http_calls` | ✅ ts-http-calls, java Feign/WC/RestClient/RestTemplate → HttpClient/.NET, requests, gRPC, … |
| ** Messaging from code** | `publishes` / `consumes` | ✅ bus-* (.NET + Java Spring AMQP/Kafka hints) → more stacks |
| **UI landscape (screens/forms)** | `ui_*` + `invokes_api` | ✅ structure+function (`020` React; `021` AngularJS) — **not** pixel/Figma fidelity → Angular 2+, Vue, … |
| **Infrastructure vs. domain (UX/docs) ** | Don 't confuse an empty dig-in with a hole . | Config/Eureka/Admin, sidecars  on any stack |
| Pilot scale | `010`+ | large monorepo: time limits, not semantics |

**Do not do:** monolingual speculation all languages at once; mix symbols + HTTP in
one `parser_id` without justification (`018`); enum canon without reference.
The source of the ideas is: `ods-help/requirements/`; canon  `specs/**/spec.md`.

## Road map

| Stage | The heat | Focus | The status |
|------|-------|-------|--------|
| 0 | `001-ods-vision` | The vision, the boundaries | ✅ agreed |
| 1 | `002-domain-model` | Backend, ES, API | ✅ Fulfilled |
| 2 | `003-portal-mvp` | The MVP portal | ✅ Fulfilled |
| 3 | `004-mvp-runtime` | CI, deploy, smoke, fixtures | **pause** (not start without a command; goal of TBD deployment) |
| 4 | `005-code-analysis` | Detector, orchestrator, parser | ✅ Fulfilled |
| 5 | `006-project-graph` | The graph in ES, ingest, API, min UI | ✅ Fulfilled |
| 6 | `007-portal-scale-ux` | Columns of workspace, hierarchy of nodes, search by column (nodes/reber), **cascade of folder status** | ✅ Fulfilled |
| 7 | `008-code-graph-depth` | Calls, usages, semantic extract (C#/TS v2) | ✅ Fulfilled |
| 8 | `009-system-landscape` | API, shell, Bd, compose, OpenAPI (system layer) | ✅ Fulfilled |
| 9 | `010-scale-pipeline` | Payline scale for large repo (up to canvas) | ✅ Fulfilled |
| 10 | `011-ods-graph-viewer` | Canvas system MVP (React Flow; code → `012`) | ✅ Fulfilled |
| 11 | `012-code-graph-bottom` | Canvas: drill code to bottom from the system component | ✅ Fulfilled |
| 12 | `013-api-routes-from-code` | CP1: HTTP API from code → `http_endpoint` in system | ✅ Fulfilled |
| 13 | `014-graph-view-ux` | CP2: UX layers + `http_calls` client→API | ✅ Fulfilled |
| 14 | `018-parser-extension-playbook` | Template to add parser + Java MVP (dogfood) | ✅ Fulfilled |
| 15 | `019-spring-system-landscape` | Spring system: Maven/config/API/Feign/RestClient (petclinic) | ✅ sold (dogfood) |
| 16 | `020-ui-landscape-from-code` | UI landscape from frontend + Graph UI; portal chrome align | ✅ Fulfilled (2026-07-22) |
| 17 | `021-angularjs-ui-landscape` | AngularJS UI → Graph UI; dogfood petclinic (not Angular 2+) | ✅ Fulfilled (2026-07-22) |
| 18 | `015-project-docs` | Project documentation in the portal (AsciiDoc, PDF) | Paused |
| 19 | `016-rag-mcp` | RAG, MCP, agents | Paused |
| 20 | `017-auth` | The entrance, the roles | Paused |

`004` ** does not block** the analysis development; the pilot compose in `docker/` is sufficient
for local development.

## How we develop

**Spec-Driven Development** (constitution `.specify/memory/constitution.md`):

```text
001 (view) → specify/plan/tasks/implement by subsidiary spec → code
```

- **`001`**  only vision and map; no detailed FR (e.g. VI).
- **MVP:** `002` (block) → `003` → code  ** is executed**.
- **`005`/`006`:** are implemented (2026-07-10); **`007`:** are implemented (2026-07-14);
  **`008`:** is implemented (2026-07-14); **`009`:** is implemented (2026-07-15);
  **`010`:** It 's been done . (2026-07-15); **`011`/`012`:** - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - (2026-07-18);
  **`013`/`014`:** - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - (2026-07-18); **`018`/`019`:** - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  (2026-07-19, dogfood).
- **Next:** backlog color legend (`001`); resume `015`–`017`/`004` only on
  explicit command. `019`/`020`/`021` closed (`021` AngularJS → Graph UI).
- The scope extension **MUST** is first reflected in `001`, then in the daughter speck.
- Chernoviki `ods-help/requirements/`  ideas, not replacement `specs/**/spec.md`.

## The call decisions

- The metadata  ** JSON in Elasticsearch**; the files  on the **filesystem** WC.
- Project source: **Git URL** or **local path** to git-repo (backend available).
- Sync **asynchronous**; repeat when `running`  refusal.
- The MVP files are  **only viewing**; Graph analysis  `GraphPage` on `006` (list + edge);
  Graph of view   canvas `011`+`012`+`013`+`014` (system + code-drill +
  API from code + UX/`http_calls`).
- Backend on .NET  is possible as a ** separate parser module** (subprocess), not a stack change `002`.
- After the source **MAY** is analyzed, remove the metadata  post-MVP.

## Criteria for success of vision

- **SC-V01**: The roadmap covers MVP and post-MVP destinations.
- **SC-V02**: The limits of MVP are unambiguous; the scope outside the list does not fall into `002`/`003` without the correction `001`.
- **SC-V03**: `002`/`003`/`005`/`006` refer to `001`, have plan/tasks; the vision does not duplicate them FR.
- **SC-V04**: ✅ Pilot (2026-07-09): Import and view the file in one web UI without a terminal.

## Assumptions

- Pilot  one instance, internal command, no auth.
- `local_path` in Docker  through mount (`/repos/...`); on the host  absolute path.
- Known limitations of the pilot  `ods-help/user-guide/later.md` (PAT in URL, duplicate paths, etc.).

## Related materials

- Constitution: `.specify/memory/constitution.md` (v1.2.17)
- MVP: `specs/002-domain-model/`, `specs/003-portal-mvp/`
- Post-MVP: `specs/005-code-analysis/`, `specs/006-project-graph/` (✅)
- `007`: `specs/007-portal-scale-ux/` (✅)
- `008`: `specs/008-code-graph-depth/` (✅; entry  `008-…-draft.md` §A)
- `009`: `specs/009-system-landscape/` (✅; API-from-code → `013`)
- `010`: `specs/010-scale-pipeline/` (✅)
- `011`: `specs/011-ods-graph-viewer/` (✅)
- `012`: `specs/012-code-graph-bottom/` (✅)
- `013`: `specs/013-api-routes-from-code/` (✅)
- `014`: `specs/014-graph-view-ux/` (✅; follow-up transitions/infra drawings +
  **color legend** with `020`)
- `018`: `specs/018-parser-extension-playbook/` (✅; entry
  `018-parser-extension-playbook-draft.md`)
- `019`: `specs/019-spring-system-landscape/` (✅ dogfood; Java follow-ups closed
  2026-07-22 except gRPC/RSocket/SOAP → Post-MVP; draft outdated)
- `020`: `specs/020-ui-landscape-from-code/` (✅ 2026-07-22; UI = structure+function,
  **not** pixel/Figma; follow-up **color legend** with `014`; entry
  `ods-help/requirements/020-ui-landscape-from-code-draft.md`)
- `021`: `specs/021-angularjs-ui-landscape/` (✅ 2026-07-22; same UI boundary
  structure+function not pixel/Figma; draft
  `ods-help/requirements/021-angularjs-ui-landscape-draft.md`; AngularJS /
  petclinic — not Angular 2+)
- `015`–`017`, `004`: ** pause** (not start without a clear command)
- Chernobyl: `008-code-graph-and-system-landscape-draft.md` (§B → `009`), `json-model/`
- UI landscape draft: `ods-help/requirements/020-ui-landscape-from-code-draft.md`
- AngularJS UI draft: `ods-help/requirements/021-angularjs-ui-landscape-draft.md`
- Compose: `docker/docker-compose.dev.yml`
- The post-MVP draft is `ods-help/requirements/data-model-persig-analysis-draft.md`
- The pilot's backlog is: `ods-help/user-guide/later.md`
