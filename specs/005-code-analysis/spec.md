# Specifications: Code analysis  language detector, orchestrator and parser

**File**: `005-code-analysis`

**Created**: 2026-07-09

**Statute**: Fulfilled (US1US5, all 4 parseers, polish T061T063)

**Input**: Formalisation of post-MVP code analysis: language detector, modular parser,
The launch orchestration, the contract envelope, the UX confirmation after the sync.
Source of the : `ods-help/requirements/data-model-persig-analysis-draft.md` (§3 D-005-*,
§3.1, §4, §5).

**Parental specs**: `specs/001-ods-vision/spec.md` (stage 4)

**Dependency**: `specs/002-domain-model/spec.md` (project, sync, working copy, tree)

**User**: `specs/006-project-graph/spec.md` (ingest of the results of the parser into the canonical graph)

**Downstream prerequisite for `015-project-docs` (spec note only — no code yet):**
When implementing `015`, analysis MUST become **always-full** (retire
incremental / `force_full` as the default path) so docs generation always
binds to a complete successful run. **Do not change `005` code until `015`
implement starts.**

## A brief description

After synchronizing the project work copy, the platform will automatically determine the languages.
The source code, shows the user the report and then starts the ** by clear confirmation**
**modular parser**  individual executable components for each supported language.
Each parser returns the result in a ** single envelope** with ** free
The orchestrator does not interpret the internal structure.
**The parser start order** is determined by the language report: the first language goes.
with the largest `file_count`, further down  **regardless of the backend language
The results of the detector and the parser are stored as metadata for analysis.
merging into the canonical column  in the responsibility zone `006`.

## The limits of heat

### It 's coming in .

- **Language Detector** after sync or import: bypass working copy, classification
  languages (extensions, shebang, project manifests);
- **Language report** with file count, path examples and parser status;
- **parser register** (identifier, supported languages, start command, version of the scheme);
- **orchestrator** of the launch of the modules: order of report, parallel/order, timetable, logs;
- **contrata envelope**  the total wrapping of the parser result;
- **modular parser** as separate CLI processes; target set: TypeScript/JavaScript,
  C#, Python, C++ (modules are delivered one at a time per development increment);
- **the order of start** of the parser when analyzing  by report (`file_count` decrease), the same
  It 's not on the platform stack .
- **Incremental analysis**  reboot only on the changed files;
- **UX confirmation**  two consecutive modal windows after sync (languages → changes);
- Keeping the detector report and the parser results in the platform's metadata repository.

### Not included

- the canonical model of the graph, the ingest-adapters, the index of the graph, the API of the subgraph (`006-project-graph`);
- UI of graph visualization (replacing the Graph  in `006`);
- RAG, vector search, authentication;
- a single JSON format inside the `model` field for all parseers;
- one JSON monolith of the entire project from the outputs of the parser;
- AST parsing at the detector stage (only file classification);
- duplicate the tree of files from `002` (use existing tree and working copy).

## User Scenarios & Testing *(mandatory)*

### User Story 1  Auto-definition of languages after sync (Priority: P1)

As a developer, after I finish sync, I see what languages are present in the project,
how many files in each language and whether there is a parser for them  without automatically running the analysis.

**Why this priority**: Detector  first step of the analysis chain; without it it is impossible
It makes sense to run the parser and display the status in the UI.

**Independent Test**: Sync multiple language files into a repository
The metadata shows a report: all the languages found, sorted by decline
number of files; for each language  parser status (`available` / `missing` / `failed`).

**Acceptance Scenarios**:

1. **Given** project with files `.ts`, `.py`, `.cpp`, `.go` after successful sync,
   **When** the detector is done, **Then** the report contains all four languages;
   TypeScript, Python and C++  with status `available` or `missing` depending on
   the presence of the module; Go without the module  `missing`; the order of languages  by `file_count` decrease.
2. **Given** two languages with the same `file_count`, **When** a report is formed,
   **Then** with the same number of language files are sorted by name (alphabet).
3. Given the detector is complete, the user has not yet confirmed the analysis,
   Then the parser doesn't start automatically.
4. **Given** file with a non-standard extension, **When** it has a shebang or
   The design manifest indicates the language, then the detector can assign the file to the language
   for these heuristics (in addition to the extension).

---

### User Story 2  Confirmation of the analysis in the UI (Priority: P1)

As a developer, I go through two steps of confirmation after sync: I first look at
I'll run the programming languages, then I'll run the code changes list, and then I'll run the parser.

**Why this priority**: Clear user consent prevents unwanted
It's a long analysis and it's a control of the increments.

**Independent Test**: After sync, window 1 opens (languages) → Continue → window 2
(changes) → Continuing → starting the orchestrator; Cancel stops at any step
The chain without the parser running.

**Acceptance Scenarios**:

1. **Given** sync just finished, **When** is displayed **window 1  languages**,
   **Then** list of languages from the report (top  more files); buttons Continue and Optmen.
2. **Given** **new project** (first sync), **When** window 1, **Then** languages are shown
   **without ** lights up on the past analysis.
3. **Given** **re-sync**, **When** window 1, **Then** languages that first appeared,
   The lights are red (no parser) or green (parser is available).
4. **Given** user clicked on Continu in window 1, **When** opens **Window 2**,
   **Then** shows changes from previous sync: added, altered, deleted files.
5. **Given** window 2, **When** Continue, **Then** the orchestrator starts the parser
   for languages with the status `available`.
6. **Given** window 1 or 2, **When** Optmen, **Then** the parser is not running;
   if the analysis is cancelled at step 2 the previous analysis result (if any) is retained .

---

### User Story 3  Modular parser and orchestration (Priority: P1)

As a platform, I only run registered language parser modules.
With the available parser, I get envelope results and don't fall because of a missing module.

**Why this priority**: The core of the chip  expanding architecture one language  one module
With a single contract at the border.

**Independent Test**: Repository with TS, Python, C++, C# and Go → modules run
for languages with `available`; for Go  `missing`, the rest of the analysis is completed successfully;
Each module returns an envelope with a list of the files analyzed.

**Acceptance Scenarios**:

1. **Given** language with status `available`, **When** the orchestrator launches the module,
   **Then** module receives project identifier, root work copy and file list
   (or glob); returns the envelope and the completion code.
2. **Given** language with status `missing`, **When** orchestration, **Then** module
   **no** is called; the status is clear in the report/logs; other parser continues to work.
3. **Given** module ended with an error, **When** the orchestrator is processing the result,
   **Then** language status  `failed`; other modules are not blocked.
4. **Given** several languages with `available`, **When** orchestration, **Then** first
   The language parser with the largest ** `file_count` in the report is run;
   The backend language of the platform **not** gets priority if the user
   It has fewer files than other project languages.
5. **Given** successful module drive, **When** result saved, **Then** envelope
   contains the required fields: parser identifier, schema version, project identifier,
   The identifier of the analysis path, the generation time, the list of paths analyzed,
   field `model` (free structure); the orchestrator **not** validates the content of `model`.
6. **Given** N successful modules, **When** analysis is complete, **Then** in storage
   **N individual artifacts** (not one unified JSON of the entire project).

---

### User Story 4  Incremental analysis (Priority: P2)

As a developer, I only analyze the changed files when I sync again.
Not the whole repository again.

**Why this priority**: Reduces analysis time on large projects;
in the first iteration `005` according to the agreed draft.

**Independent Test**: First full analysis → one file edit → sync →
Confirmation in UI → parser ** corresponding language** only receives changed
file (and related by module rules if applicable).

**Acceptance Scenarios**:

1. **Given** repeat sync, **When** are defined changes relative to past sync,
   **Then** list includes added, altered and deleted files (for display in window 2
   and for parser transmission .
2. **Given** user confirmed the analysis after incremental sync,
   When the parser is running, then every module is analyzing only.
   the affected files of their language from the list of changes (not a complete repository).
3. **Given** the first sync of the project (no previous analysis), **When** the analysis is started,
   **Then** parser receives a complete set of files in the corresponding languages.

---

### User Story 5  Stage delivery of the parser-modules (Priority: P2)

As a platform team, we connect the parser modules one at a time.
(TypeScript/JavaScript, C#, Python, C++); each new module follows a single
The contract envelope and is registered in the register without changing the orchestrator.

**Why this priority**: Reduces the risk of a big explosion; first **work** chase
It's possible once there's a language module in the register that's at the top.
`file_count` (or lower  for languages with fewer files when
They 'll have a module .

**Independent Test**: One module (e.g. Python) → repository is registered,
where Python  is the language with the largest `file_count` → after confirming envelope c
The corresponding `parser_id` and the empty `model` are stored in the storage; modules for
Other languages with `missing` status do not block the language.

**Acceptance Scenarios**:

1. **Given** module is registered in the register and language in the report with status `available`,
   **When** user has confirmed the analysis, **Then** module is launched in position
   language in the report list (in `file_count`) and returns a valid envelope.
2. **Given** module in the parser catalog, **When** check the register,
   **Then** the module has a manifest: `id`, `languages`, `schema_version`, `command`,
   The input (root of the WC, files, project_id) and output (way to JSON envelope) are described.
3. **Given** repository where TypeScript  is not the dominant language (less than files,
   than C# or Python), **When** are available in multiple languages,
   **Then** the first **launch** language parser with the largest `file_count`, not
   TypeScript by default.

---

### Edge Cases

- Empty repository or only binary/unknown files: report without languages or with
  the only category is unknown; the parser is not running; UI reports no
  the languages being analyzed.
- Sync is complete with `partial`/`failed`: detector only runs when
  The current working copy; when the critical error sync  is clear, the message is not suspended.
- Timeout module: status `failed` for language, log with reason; orchestrator completes the procession.
- Sync and analysis run parallel: analysis doesn 't start until sync is complete (agreed)
  with blocking of project operations from `002`).
- Deleting the project (`002` DELETE): the artifacts of the analysis `005` in the metadata storage
  are deleted in cascading order (coordinate the details of the indexes with `006`).
- Language with `file_count` = 0 after filtering: does not enter the report and does not start.
- TypeScript  is the backend language of the platform, but it has few files in the repository: TS parser
  is run **after** languages with a large `file_count`, not the first.
- Repeat pressing Continue or double-starting the analysis:
  The obvious blockage of analysis is already being performed (as in sync).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST run ** Language Detector** automatically after
  successful sync or import of the project (before the parser is launched).
- **FR-002**: The detector MUST classify the workflow files by language using
  The following are the options for the extension and optionally shebang, `package.json`, `*.csproj` and similar markers.
- **FR-003**: The detector MUST form a **lingual report** with fields: language, number of files,
  examples of paths, attachment to `parser_id` (or null), status of the parser (`available` /
  `missing` / `failed`). Status `failed` MUST reflect the **most recent** result for that
  `parser_id` only; a later success MUST clear it (not OR across older runs).
- **FR-004**: The languages in the report MUST be sorted by `file_count` by decrease;
  with the equal of  by the name of the language (alphabet).
- **FR-005**: The system MUST maintain a **parser register**: identifier, supported languages,
  Run command, native-scheme version (configuration or module catalog).
- **FR-006**: Each parser MUST be a separate executable module (CLI):
  input  project identifier, root of the work copy, file list; output  JSON envelope
  And the return code.
- **FR-007**: All of them. parser MUST to observe **envelope-The contract**: `parser_id`, `schema_version`,
  `project_id`, `analysis_run_id`, `generated_at`, `files_analyzed[]`, `model` (free payload).
- **FR-008**: The recorder MUST run the **only** modules for languages with `available` status,
  **strictly in order** list from detector report (`file_count` decrease, with equality
  language name); the order MUST match the UI (§3.1); MUST NOT give priority to the language
  platform backend; MUST maintain queue/parallel, timesheet and logging.
- **FR-009**: The recorder MUST NOT require knowledge of the structure of the field `model` inside the envelope.
- **FR-010**: Targeted parser for the phase delivery: TypeScript/JavaScript, C#, Python, C++;
  languages without the module MUST get the status of `missing` without falling all analysis.
- **FR-011**: The system MUST support ** incremental analysis**: after sync determine
  modified files and only pass them to the parser (for the first analysis  complete set).
- **FR-012**: The detector report and the parser results MUST be stored in the metadata repository.
  The source code is only in the file system working copy.
- **FR-013**: The system MUST NOT collect one JSON monolith of the entire project from the parser output;
  For each successful module, there's a separate artifact.
- **FR-014**: After sync UI MUST show ** two modular windows in a row** (languages → changes);
  Parser MUST be launched only after two confirmations Continue.
- **FR-015**: When you cancel on step 1 or 2 the parser MUST NOT run; when you cancel on step 2
  The previous test result MUST be maintained.
- **FR-016**: The target modules (TypeScript/JavaScript, C#, Python, C++) MUST be provided
  **one for each increment** of development; the delivery order in `plan.md` **no** is given
  The runtime-order is always from the report on `file_count` (FR-004, FR-008).
- **FR-017**: Each module in the register MUST have a manifest with the fields: `id`, `languages`,
  `schema_version`, `command`, description of the input and output parameters.
- **FR-018**: The detector MUST NOT perform full AST parsing  only file classification.

### Key Entities

- **Language Report**: a detector image for the project  detection time,
  List of languages with file number, path examples and parser status; one document per drive
  of detection.
- **Analysis Run: logical session from user confirmation to
  The identifier links the envelope-artefacts (storage details  in `006`).
- **Envelope of the parser**: standardised wrap of the module result; single part
  The way the orchestrator understands the outcome.
- **Native model**: the contents of the field `model` in envelope  format is determined by the module and
  adapter ingest (`006`), ne orchestrator.
- **A parser register entry**: module description  identifier, language, command, version of the scheme.
- **Change Set list**: files added, changed or deleted from the past
  sync; base for window 2 and incremental start.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After sync the multilingual repository , the user sees the full language report
  within **30 seconds** for projects up to **10 000** files (pilot volumes).
- **SC-002**: For repositories with supported and unsupported languages **100%**
  supported languages with the module `available` receive envelope-resultate; unsupported
  status `missing` without breaking the rest of the modules.
- **SC-003**: Incremental sync with up to ** 5%** of file changes analysis time
  shrinks ** by at least 50%** compared to full repeat propulsion
  (on the same pilot project).
- **SC-004**: **95%** of the pilot users can go through the sync → language window →
  The change window → analysis without reference to the documentation (observed UX testing).
- **SC-005**: Adding a new language module doesn 't require changing the orchestrator .
  except for registration in the register (checked by connecting the second module from the target set).

## Assumptions

- The working copy and tree of the files are already supported `002`; detector and parser are using
  The same root of the WC and the project ID.
- The platform's metadata storage is the same as for projects and trees (`002`); specific
  The index and schemes of documents for the analysis artifacts are specified in `006`, but `005` is obliged
  to produce data in an agreed manner (report on languages, envelope).
- UX of modal windows is sold in the portal (`003`) under the contract of this spec; backend
  provides data for windows and the API for the start/status of the analysis.
- Definition of the changed files  by comparing with the previous sync (e.g., diff
  of the working copy); The precise mechanism — is defined in `plan.md`, without changing the user script.
- Pilot without authentication; one user per instance.
- UI and message language  Russian.
- **Running vs delivery order:** Backend language priority was discussed at early stages
  (TypeScript); **conforming solution**  When analyzing the first language with the highest
  `file_count` in the report; the procedure for supplying modules in development  separate solution
  for `plan.md` and does not redefine the runtime schedule.
- **FR-004 vs FR-008:** FR-004  sorting of languages in the report; FR-008  same order
  when the orchestrator is running (intentional duplication: report and runtime are separated).
