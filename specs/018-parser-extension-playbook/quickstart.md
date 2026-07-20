# Quickstart: check 018 (playbook + Java)

**Goal:** Java — `available` + code-nodes (FQN-packages and top-level types from
`src/main/java`); wrappers not in shell; checklist CP-A passed in tasks.

**References:** CI — `java-symbols-demo`; dogfood SHOULD — petclinic.

Contracts: [contracts/](./contracts/).

## Preconditions

1. `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
   (image with JDK + `mvn package` for `parsers/java`).
2. Imported **java-symbols-demo** and/or petclinic; sync + language report;
   module `java` → **available**.

## 1. Language report (SC-001, SC-003)

1. Open modal/report after sync (fixture or petclinic).
2. **Awaiting:** `java` — status **available**.
3. **Awaiting (petclinic):** `mvnw` / `gradlew` **not** in detector, shell how the source code
4. API:  
   `GET /api/v1/projects/:id/analysis/language-report/latest`

## 2. Analysis → code-graph (SC-002)

1. Confirm analysis.
2. Code-layer / graph: exists **`module`** (files) **`namespace`** (FQN-packages)
   and **top-level types** with `path` in detector, `src/main/java` (how at csharp:
   module+namespace+class).
3. Types from `src/test/java` and nested — **not** mandatory.
4. Auto-check: integration on `java-symbols-demo` (tasks T018).

## 3. Isolation (SC-004)

1. Remove/Break `parsers/java` (or simulate missing).
2. Analysis → `java` missing; compose / other available do not fail the run.

## 4. Checklist CP-A (SC-005)

1. In `tasks.md` marked pass
   [parser-extension-checklist.md](./contracts/parser-extension-checklist.md).
2. Links: `parsers/README.md` + `specs/005-code-analysis/quickstart.md`.
3. `parsers/README.md` — `java` **available** after implement.

## Not validated here

- Spring HTTP / Feign / Maven-as-services
- calls / usages `008`
- shell symbols-parser
- docs / RAG / auth
