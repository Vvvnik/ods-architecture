# Research: 018-parser-extension-playbook

**Date**: 2026-07-19  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## R1 — Extract: JavaParser CLI on **Maven** (not tree-sitter Node)

**Decision:** Module `parsers/java/` — minor **Java CLI** on
**JavaParser** (javaparser-core), build **Maven** (`parsers/java/pom.xml`
→ jar), entry `run.sh` → `java -jar` / classpath, contract argv as `005`.
Without JavaSymbolSolver in detector, MVP. Source catalog CLI:
`parsers/java/src/main/java/...` (artifact name like `ods-java-parser`).

**Rationale:** DoD — package + top-level class/interface/enum; JavaParser
provides stable AST declarations; supply pattern as `csharp` (toolchain in detector,
in the image). **Maven** — one fixed build method (analyze U1; not
Gradle). Tree-sitter to be MVP predictability is more important package/type.

**Alternatives considered:** Gradle mini; tree-sitter-java (Node/native);
regex-only; full javac/ECJ.

## R2 — Native model = symbols schema 1

**Decision:** Envelope `model` = `{ "symbols": [ ... ] }` compatible with
`008`/`native-symbols` v1; `schema_version: "1"` in detector, manifest. Usages/calls —
do not emit (outside DoD).

| kind | When |
|------|--------|
| `module` | **MUST** — one per parsed `.java` (as TS/Python/C#/C++) |
| `namespace` | FQN package (role as csharp namespace; **one** node on FQN) |
| `class` / `interface` / `enum` | top-level type in compilation unit |

Type: `qualified_name` = `package.Type` (or `Type` in detector, default package);
`parent_qualified_name` = FQN package (if available).

**Rationale:** reuse `createSymbolsModelIngestAdapter`; FR-005; FR-010 without
new NodeType.

**Alternatives considered:** Separate native JSON only for Java; schema 2
with empty usages.

## R3 — `module` + FQN-`namespace` + parent resolve by qn

**Decision:**

1. **`module` MUST** on each `.java` (path = relative WC; as csharp/TS).
2. **`namespace` MUST** on FQN package: stable `path` =
   `java-package/<FQN-with-slashes>` — **one** node on FQN (csharp sometimes
   duplicates namespace per-file; for Java DoD — without duplicates).
3. Types: `parent_qualified_name` = FQN package.
4. In `symbols-model.ingest`: fallback parent by unique
   `qualified_name`, if path-keyed miss (package on synthetic path).

**Rationale:** Consistency with language-parsers + role namespace as in
csharp; unique FQN more suitable for the graph.

**Alternatives considered:** Only path without module; duplicate namespace
on each file as csharp; segment hierarchy `com`→`com.example`.

## R4 — Filter `src/main/java`

**Decision:** Parser **self** separate spec at baseline `**/src/main/java/**`
(and typical generated: `**/target/generated-sources/**`,
`**/build/generated/**`). The orchestrator MAY still pass all `.java`
from change-set; CLI filters. Detector `file_count` language **not required to**
narrow down to main (MAY leave all `.java` in report; DoD canon = only main.

**Rationale:** Clarify production-only; minimal diff orchestrator;
explicit contract in README module.

**Alternatives considered:** Filter only in `pathsForLanguage`; change
language report counts.

## R5 — Wrappers `mvnw` / `gradlew`

**Decision:** In language-detector: basename ∈ `{mvnw, gradlew, mvnw.cmd,
gradlew.bat, mvnw.ps1, gradlew.ps1}` → **not** classify as shell
(and not as another language). Others `.sh` — how currently (`shell` / missing).

**Rationale:** FR-007 / SC-003; petclinic `mvnw`.

**Alternatives considered:** Ignore all shell; artifact build-scripts.

## R6 — JDK in detector, Docker-in the image

**Decision:** In `backend/Dockerfile` set **Temurin/OpenJDK 17**
(JRE+JDK sufficient for `javac`/startup fat-jar or `java -cp`), collect
`parsers/java` on build-stage or in the same stage as csharp `dotnet build`.
Dev compose already mount’it `parsers/`.

**Rationale:** Image already pulls .NET; JDK — conscious analog Sidecar —
redundant for MVP.

**Alternatives considered:** Sidecar container; only host-installed JDK in detector,
dev; Graal native-image.

## R7 — Ingest registration

**Decision:** `java.ingest.ts` = `createSymbolsModelIngestAdapter('java',
'java')`; register in detector, `registerBuiltinIngestAdapters`. Do not add to
`ARTIFACT_PARSER_IDS`.

**Rationale:** Language-module, not artifact; pattern python/cpp.

## R8 — Fixtures and petclinic

**Decision:** **Auto/CI DoD (SC-001/002):** fixture
`docker/fixtures/repos/java-symbols-demo/`. **Dogfood SHOULD:** petclinic
Git URL (T019). Nested/test in detector, fixture — only as negative «not included in
canon».

**Rationale:** SC after analyze C1; CI without network to GitHub.

**Alternatives considered:** Only petclinic; only fixture without dogfood.

## R9 — CP-A checklist

**Decision:** Normative already in
[contracts/parser-extension-checklist.md](./contracts/parser-extension-checklist.md).
In tasks — checklist-pass (checkmarks) as DoD CP-A; link from `parsers/README.md`
and if necessary `005` quickstart.

**Rationale:** FR-001–FR-003; do not create a second process document.
