# Specification: Parser extension template + Java MVP

**Feature**: `018-parser-extension-playbook`

**Created**: 2026-07-19

**Status**: ✅ implemented (2026-07-19)

**Input**: Draft
`ods-help/requirements/018-parser-extension-playbook-draft.md`
(decisions recorded 2026-07-19).

**Parent spec**: `specs/001-ods-vision/spec.md` (stage 14)

**Dependency**: parser module contract `005`; canon code `006`/`008`;
system-artifacts `009` (pattern, not Spring-landscape); reference for adding
modules — `013`. Docs/RAG/auth (`015`–`017`) — **after** this feature.

## Short description

The platform receives a **canonical template** for adding a new analysis module
(language or artifact) and the **first new language module — Java** (code-layer
symbols: packages and types). The dogfood reference is
spring-petclinic-microservices: after analysis, Java is no longer reported as
“parser not installed,” and types/packages appear in the code graph. The Spring
landscape, Java HTTP, and shell symbols are **not** part of the DoD.

## Clarifications

### Session 2026-07-19

- Q: Priority vs docs? → A: **`018` before `015`** (already in `001` / constitution).
- Q: Template only or immediately Java? → A: **CP-A (template) + CP-B (Java MVP)**
  in one spec; otherwise the template is not validated on a real module.
- Q: Depth Java? → A: **packages + types** (classes/interfaces/enum); methods —
  MAY; calls/usages `008` — **not** DoD.
- Q: Shell? → A: **without** symbols-parser; wrappers `mvnw`/`gradlew`
  are **ignored** by the detector; other `.sh` files → `missing`.
- Q: Spring system (Maven, yml, Feign)? → A: **follow-up**, not DoD `018`.
- Q: Which Java-sources included in DoD of analysis? → A: **Only production** —
  `**/src/main/java/**`; exclude `**/src/test/**` and typical generated.
- Q: Nested/internal Java types in the DoD? → A: **Only top-level** types
  in the compilation unit; nested / anonymous / local — outside the DoD.
- Q: How packages enter code-graph (DoD)? → A: **Single node per FQN-package**;
  types belong to package (without segment hierarchy `com`→`com.example`).
- Q: Is a separate 'file' node required (`kind: module`)? → A: **Yes —
  as with all language parsers** (typescript/python/csharp/cpp): every parsed
  `.java` MUST have `kind: module`. Package — `kind: namespace`
  (as with the csharp namespace); types — class/interface/enum. (Post-analysis
  decision: consistency; the previous “path only” approach was superseded.)
- Q: SC-001 only petclinic? → A: **petclinic or** fixture
  `java-symbols-demo` (equivalent for CI); dogfood petclinic — SHOULD
  (analyze C1).

**Term:** «playbook» / «extension template" = canon
`contracts/parser-extension-checklist.md` (checklist).

## Spec boundaries

### Included

**A — Parser extension template**

- normative checklist touchpoints: decision language vs artifact vs ignore;
  detection; module; ingest in canon; orchestration; delivery; runtime;
  fixtures/acceptance; UI-statuses; module documentation;
- anti-patterns (one module for everything; new canon types without contracts;
  `missing` as a "bug" etc.);
- artifact: `contracts/parser-extension-checklist.md`;
- proof: checklist pass upon addition Java (tasks).

**B — Java MVP (language)**

- analysis module for the language **java** (separate CLI);
- extraction to the canonical code layer **as with other language parsers**: each
  `.java` — **`module`**; package — **`namespace`** (FQN, as namespace in
  csharp); **top-level types** — from **production** `**/src/main/java/**`
  (without test and typical generated);
- report by languages: for Java module status **available** when installed
  module;
- reference acceptance: spring-petclinic-microservices (+ compact fixture
  as needed);
- isolation: module disabled/absent → status 'not installed' without
  breakages of other modules (including compose / already supported languages).

**General**

- build wrappers (`mvnw`, `gradlew`, and basename analogues) are **not** treated
  as shell-language source files in the report;
- integration into existing analysis pipeline `005`/`006` without the second
  orchestrator.

### Not included

- docs / RAG / auth (`015`–`017`);
- Spring system landscape (Maven/Gradle-project as services, `application*.yml`,
  Gateway/Feign, Java HTTP-routes / http_calls);
- Kotlin / Scala;
- calls / usages depths `008` for Java;
- nested / inner / anonymous / local types Java (DoD — only top-level);
- symbols-parser shell; artifact «build-scripts»;
- merge OpenAPI ↔ code; change the platform backend stack;
- new node/edge types in the canon beyond existing ones code-types
  (reuse the model `008`/symbols).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Template 'how to add a parser' (Priority: P1)

How **platform command**, I rely on a single canonical checklist of steps
upon adding any new analysis module and not reinventing the process

**Why this priority**: without template; each language/artifact rebuilt from scratch
goal of the entire feature.

**Independent Test**: in the spec/contracts checklist; upon closure Java
tasks checklist item passed

**Acceptance Scenarios**:

1. **Given** feature canon `018`, **When** opened
   **Then** I see the full list touchpoints (module-type decision → detection →
   module → ingest → supply → acceptance) and anti-patterns.
2. **Given** faster, but for Go), **When** planning a spec
   module, **Then** sufficient to reference this checklist + describe
   extraction subject — without new 'meta-process specs".
3. **Given** closure CP-B Java, **When** I review language report, tasks/DoD, **Then**
   checklist pass recorded (not just 'parser works')

---

### User Story 2 — Java no entry in report code-graph (Priority: P1)

How **architect**, on Java-microservice repository (petclinic) after
of analysis, I see that Java **is supported**, and in code-layer has packages/types
from source — not just 'parser not installed'

**Why this priority**: main gap dogfood; validates the template on the live
module.

**Independent Test**: sync/detect petclinic → Java available → analysis →
in detector, code-graph contains types/packages from `.java`.

**Acceptance Scenarios**:

1. **Given** petclinic after sync with installed Java-module, **When**
   I review connections, **Then** at `java` module status **available**
   (not 'not set').
2. **Given** verified analysis run, **When** I review language report, code-layer
   (or code graph nodes) by Java-files, **Then** are visible **module** (files)
   **namespace** (FQN-packages) and **top-level types** from `src/main/java`.
3. **Given** same project, **When** code-layer, **Then** not a substitution
   code-symbols system-entities Spring (HTTP/Feign and similar are missing
   as DoD this feature); types only from test/generated **not** must
   to be present.

---

### User Story 3 — Wrappers do not clutter the report (Priority: P2)

How **architect**, I do not see `mvnw`/`gradlew` as a "language shell» with
absent parser — they do not interfere with reading the report for real languages.

**Why this priority**: reduces noise dogfood; saved in draft.

**Independent Test**: detect petclinic → in report) — basename-wrappers
build as files shell (or they are excluded from the count shell).

**Acceptance Scenarios**:

1. **Given** repository with `mvnw` and `.java`, **When** detector completed,
   **Then** `mvnw`/`gradlew` **not** increase `shell` how standard
   sources (excluded by basename).
2. **Given** standard `.sh` scripts without module shell, **When** report,
   **Then** they MAY remain mandatory styles `shell` with status **not installed** —
   without analysis failure for other languages.

---

### User Story 4 — Module isolation (Priority: P2)

How **platform operator**, I can work without Java-module: the rest
modules (compose, already supported languages) continue analysis; Java simple
«not installed.

**Why this priority**: swappable component to language; `005`/`013`.

**Independent Test**: remove/do not register Java-module → missing for
java; compose and so forth. available and they run.

**Acceptance Scenarios**:

1. **Given** Java-module missing, **When** detect + analysis, **Then**
   `java` → not installed; run does not fail due to this missing.
2. **Given** compose (or another available-module) on the same project,
   **When** analysis, **Then** its result on-still available

---

### Edge Cases

- Equal `file_count` at languages — order as in `005` (name).
- Empty set `.java` after filters — the module is not required to create nodes;
  status available is preserved when the module is installed.
- Single file extraction error — does not fail entire run (partial /
  module errors by rules `005`/`006`).
- Re-analysis / Increment — obsolete code-nodes by changed path
  are updated or removed per rules ingest platforms.
- Standalone file / non-standard layout — still canonical
  with best-effort bound to the file.
- `.java` outside `src/main/java` (test, generated) — outside the extraction DoD;
  the detector MAY still include them in the language `file_count` (or not —
  not a blocker), but the module is **not** required to create code nodes for them.
- Nested / inner / anonymous / local types — outside DoD; absence of nodes in
  not considered a failure.
- Packages — **flat FQN-nodes** (not a segment chain; type without `package`
  — best-effort (default/unnamed), without segment hierarchy requirement

## Requirements *(mandatory)*

### Functional Requirements

**A — Template**

- **FR-001**: Platform MUST have a canonical parser extension checklist
  (`contracts/parser-extension-checklist.md`) with sections: module-type decision
  module; detection; CLI-module; ingest in code/
  acceptance; UI-statuses; module documentation; anti-patterns.
- **FR-002**: Checklist MUST distinguish **language**, **artifact** and
  **not a parser** (ignore/noise) and MUST prevent mixing symbols language and
  system/HTTP in one module without separate spec.
- **FR-003**: Closure Java-module in this feature MUST accompanied by explicit
  checklist pass (tasks / DoD), demonstrating the pattern in practice.

**B — Java + detection; module;**

- **FR-004**: Platform MUST provide a swappable analysis module for
  language **java**, pipeline-compatible `005` (envelope + registry).
- **FR-005**: After successful analysis of a Java project, the module MUST produce
  canon code-entities **in the same manner as typescript/csharp/python/cpp**:
  - **`module`** — on each parsed `.java` from
    **`**/src/main/java/**`** (`path` / `qualified_name` = file path);
  - **`namespace`** — package FQN (same role as a csharp namespace; **one** node
    on FQN with synthetic path `java-package/...`, without segment
    hierarchies `com`→`com.example`);
  - **`class` / `interface` / `enum`** — only **top-level** in the compilation
    unit; MUST have `path` to `.java` and be linked to the package
    (`parent_qualified_name` = FQN namespace).
  Methods — MAY. Files in `**/src/test/**` and typical generated MUST NOT
  be required in DoD canon. Nested, anonymous and local types MUST NOT to belong
  in detector, DoD.
- **FR-006**: In the language report for Java MUST display module status
  **available**, if the module is installed and healthy; otherwise **not installed**
  or **error** by rules `005`.
- **FR-007**: Detector MUST exclude from classification shell basename
  wrappers build: at least `mvnw`, `gradlew` (and agreed analogues).
- **FR-008**: Absence Java-module MUST NOT block closure
  available-modules of the same run.
- **FR-009**: Module Java MUST in
  pipeline and without requiring the orchestrator to change Java».
- **FR-010**: Feature MUST NOT require new NodeType/EdgeType system-layer
  and MUST NOT to include Spring HTTP / Feign / Maven-as-services in detector, DoD.

### Key Entities

- **Parser extension checklist**: normative list touchpoints and
  anti-patterns for any new module.
- **Analysis module (language)**: swappable java — first
  new after the base set `005`.
- **Language report**: language, number of files, module status, path examples.
- **Code-entities Java**: **`module`** (file) **`namespace`** (FQN-package,
  as csharp), **top-level type**; type belongs to package; module — file.
- **Wrapper builds**: see.`mvnw`/`gradlew`), not source for
  symbols.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After analysis on **petclinic** or on fixture
  `java-symbols-demo` at the language Java module status — **available** (not 'not
  installed). Dogfood on petclinic — SHOULD (manual verification in tasks).
- **SC-002**: After analysis of same reference (petclinic or fixture) in detector,
  code-layer has nodes **`module`**, **`namespace`** (FQN) and **top-level**
  types from `src/main/java` (sample: not empty; on petclinic — classes like
  Application / Controller).
- **SC-003**: `mvnw`/`gradlew` not included in the report as accounted
  shell-sources after detection.
- **SC-004**: In absence of Java-module run with compose (and/or other
  available) completes without crashing due to Java missing.
- **SC-005**: The specs repository contains an extension checklist; tasks Java
  refer to checklist pass (feature closure audit).
- **SC-006**: Adding the next language in the future is planned using the same
  checklist without new meta-process specs (plan/specs review checked)
  follow-up).

## Assumptions

- Map `001` already sets `018` following `014`; spec status
  is updated on implement.
- Detector already recognizes `.java` how language java; work — module + ingest +
  filter wrappers.
- Canon code-layer. parsers: **`module` + `namespace` + type**
  (`008`/symbols); new system-types not needed.
- Reference: **fixture `java-symbols-demo`** for CI/of autotests; **petclinic**
  for dogfood (SHOULD).
- Extraction technology: **JavaParser + Maven** CLI — see plan/research.
- DoD Java-extract — **production** `src/main/java`; test/generated not
  mandatory in the canon; types — **only top-level**; packages **FQN
  `namespace`** (not a segment hierarchy).
- Others `.sh` without module remain `missing` — acceptable noise up to
  separate solution; as in follow-up.

## Related artifacts

- Draft: `ods-help/requirements/018-parser-extension-playbook-draft.md`
- Template contract: `contracts/parser-extension-checklist.md`
- `specs/005-code-analysis/` — envelope, registry, module statuses
- `specs/008-code-graph-depth/` — depth code (calls — outside DoD `018`)
- `specs/009-system-landscape/` — pattern artifact-modules (follow-up Spring)
- `specs/013-api-routes-from-code/` — reference for swappable module addition
- Dogfood: `https://github.com/spring-petclinic/spring-petclinic-microservices.git`
