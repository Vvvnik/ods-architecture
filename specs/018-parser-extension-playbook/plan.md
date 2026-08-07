# Implementation Plan: Parser extension playbook + Java MVP (018)

**Branch**: `018-parser-extension-playbook` | **Date**: 2026-07-19 |
**Spec**: [spec.md](./spec.md)

**Input**: `specs/018-parser-extension-playbook/spec.md` — **CP-A** normative
parser extension checklist + **CP-B** language-module `java` (production
`src/main/java`, top-level types, FQN-packages). Clarifications 2026-07-19.
Spring HTTP / shell symbols — outside DoD.

**Dependencies**:

- `specs/001-ods-vision/spec.md` — stage 14
- `specs/005-code-analysis/` — envelope, registry, orchestrator, statuses
- `specs/006-project-graph/` + `008` — canon code / symbols ingest
- `specs/013-api-routes-from-code/` — reference for swappable module addition
- Template contract already in [contracts/parser-extension-checklist.md](./contracts/parser-extension-checklist.md)

## Summary

1. **CP-A:** checklist already canonical in tasks — explicit walkthrough of items upon closure Java.
2. **CP-B:** CLI `parsers/java/` (**JavaParser + Maven** jar) → envelope
   `symbols[]` (schema 1) → reuse
   `createSymbolsModelIngestAdapter('java','java')`; filter spawn/extract
   `**/src/main/java/**`; detector ignores `mvnw`/`gradlew`.
3. Package = `kind: namespace` (one node per FQN, role as csharp); on each
   `.java` — **`module`** (as all language-parsers); type =
   class/interface/enum top-level with `parent_qualified_name` = FQN package;
   parent resolve by qn in detector, shared ingest.
4. Reference CI: **java-symbols-demo** (MUST); dogfood SHOULD: petclinic.

## Technical Context

**Language/Version**: Java 17+ (CLI extract); TypeScript 5.x / Node 20
(backend ingest, detector); bash/`run.sh` entry how at csharp/python

**Primary Dependencies**: JavaParser (javaparser-core) + **Maven** for
builds CLI; existing symbols-model ingest; Vitest; Docker image —
JDK 17 for `mvn package` / `java -jar` (next to existing .NET)

**Storage**: same `ods-graph-nodes` / `ods-graph-edges` / envelopes;
`metadata.layer=code`; no new indexes

**Testing**: unit extract (package + top-level types; ignore nested/test);
unit detector wrappers; integration spawn→ingest→graph on fixture/petclinic;
negative missing java

**Target Platform**: Docker Compose `--profile full`

**Project Type**: 1 language CLI parser + detector tweak + ingest register +
docs checklist (already exists)

**Performance Goals**: petclinic ~dozens `.java` in detector, main — full run
module in timeout registry (how others language-parsers); SC-001/002

**Constraints**: only production paths; only top-level types; FQN-packages
without segment hierarchy; without calls/`008`; without Spring system; EN
artifacts; reuse orchestrator `005`; audit by checklist

**Scale/Scope**: 1 parser_id `java`; dogfood petclinic; Go/Kotlin/Spring HTTP —
follow-up by the same checklist

## Constitution Check

*GATE: before Phase 0 and after Phase 1.*

| Requirement | Status |
|------------|--------|
| VI. FR in detector, `018`, do not bloat `001` | ✅ |
| Scope in detector, `001` (`018` before `015`) | ✅ |
| Modular CLI, not a monolith backend | ✅ |
| Single canon ES | ✅ |
| Language policy (constitution) | ✅ |
| Code after plan/tasks | ✅ |
| Without auth/RAG/docs product | ✅ |
| Playbook + Java in oneclarify) | ✅ |

**Post-design:** research + data-model + contracts + quickstart — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/018-parser-extension-playbook/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── parser-extension-checklist.md   # CP-A (already exists)
│   ├── native-java-symbols.schema.json
│   ├── native-java-symbols.example.json
│   ├── detector-java-wrappers.md
│   └── ingest-java.md
└── tasks.md                            # /speckit-tasks
```

### Source Code

```text
parsers/java/                           # manifest, run.sh, Maven + JavaParser
├── manifest.json
├── README.md
├── run.sh
├── pom.xml
└── src/main/java/...                   # CLI entry + extract

backend/
├── src/services/language-detector.service.ts   # ignore mvnw/gradlew
├── src/services/change-set.service.ts          # optional: filter main/java for spawn
│   # (or filter only within parsers/java — see research R4)
└── src/services/ingest/
    ├── adapters/java.ingest.ts                 # thin re-export symbols-model
    ├── adapters/symbols-model.ingest.ts        # parent resolve by qn (R3)
    └── ingest-registry.service.ts

backend/Dockerfile                        # JDK + build parsers/java
docker/fixtures/repos/                    # MUST: java-symbols-demo (CI SC-001/002)
```

**Structure Decision**: language-module as `python`/`csharp`; shared symbols
ingest; checklist CP-A already in contracts — do not duplicate processes in code.

## Complexity Tracking

> No constitutional violations requiring a table.
