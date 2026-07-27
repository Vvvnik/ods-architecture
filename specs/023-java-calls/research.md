# Research: 023-java-calls

**Date**: 2026-07-27  
**Spec**: [spec.md](./spec.md)

## R1 — Native contract: reuse `008` v2 schema

**Decision:** Java emits the same native symbols **v2** shape as TypeScript/C#
(`schema_version: "2"`, `model.symbols[]`, `model.usages[]` with
`type: "calls"`). Do **not** fork a separate JSON Schema; reference
`specs/008-code-graph-depth/contracts/native-symbols-v2.schema.json`. Update
`018` Java notes / `native-java-symbols` docs only to state that normal runs
now emit v2 (methods + usages).

**Rationale:** Ingest already maps this shape via
`createSymbolsModelIngestAdapter('java', 'java')` with
`supported_schema_versions: ['1','2']`. Parity with `008` reduces dual models.

**Alternatives considered:** Java-only schema file — rejected (duplicate enum /
validation drift). Push `calls` into `symbols[].refs` — rejected in `008` R1.

## R2 — Resolution engine: JavaParser Symbol Solver (project-scoped)

**Decision:** Keep **JavaParser** AST extract; add **JavaSymbolSolver**
(`javaparser-symbol-solver-core`) configured with:

- `JavaParserTypeSolver` roots = each discovered production
  `**/src/main/java` directory under the analysis root (multi-module);
- `ReflectionTypeSolver` for JDK types only (targets resolving to JDK →
  unresolved for project `calls`, skip edge).

Resolve `MethodCallExpr` / static calls to a unique project method
declaration that maps to a symbol `qualified_name` already emitted in
`symbols[]`. If symbol info is missing, multi-candidate, or maps to more than
one in-project QN → **skip** (no usage). Do **not** add
`javaparser-symbol-solver` dogfood path priorities or monorepo name stripping.

**Rationale:** Spec requires unique resolution including cross-module and
interface method symbols; bare name matching creates false edges (rejected in
`008`). Project type solvers from discovered `src/main/java` roots stay
generic (FR-012).

**Alternatives considered:**

- Name-only / regex MVP (like weak C++ path) — rejected (false positives;
  contradicts FR-006 / anti-dogfood depth bar).
- Full Maven classpath + dependency JARs for every module — deferred; DoD is
  in-project production sources only.
- Stay on AST-only without solver — insufficient for cross-file/cross-module.

## R3 — Method symbols and overload identity

**Decision:** Emit a `kind: method` symbol for **every** method declared on
top-level types in production sources (any visibility).  
`qualified_name` = `{typeQn}.{methodName}` when the simple name is unique on
that type; when overloads exist, disambiguate with a stable signature suffix
consistent with existing Java/C# style in the repo (parameter type list in
`signature` / QN as implemented for uniqueness). Call resolution must bind to
**exactly one** method symbol; overload ambiguity → no `usages` row.

Constructors are **not** method symbols for DoD `calls` (clarify: constructors
out of DoD). Nested/anonymous/local types remain out of DoD (`018`).

**Rationale:** Clarify Q2 (all visibilities); FR-002; FR-006.

**Alternatives considered:** Public-only methods — rejected (clarify). Lazy
symbols only for call endpoints — rejected (incomplete graph / harder ingest
map).

## R4 — Call shapes and interface receivers

**Decision:**

| Shape | DoD |
|-------|-----|
| Instance method call, unique project target | Emit `calls` |
| Static method call, unique project target | Emit `calls` |
| Cross-file / cross-module (same ODS root) | Emit when unique |
| Static receiver = interface/abstract type | `to` = that type’s method QN; **never** a concrete impl |
| Constructor / `super` / reflective | Skip (not DoD) |
| Unresolved / ambiguous overload / multi-impl pick | Skip |

Usage row: `{ from, to, type: "calls", path, location? }` with `from`/`to` =
`qualified_name` present in the same envelope `symbols[]` (same rule as
`008` R4).

**Rationale:** Clarify Q1, Q3, Q5; FR-001/006/013/014.

**Alternatives considered:** Edge to sole concrete impl for interface calls —
rejected (clarify B). Always skip interface receivers — rejected (less useful
for Java).

## R5 — Always v2 emit; ingest unchanged path

**Decision:** `manifest.json` + `Main` set `schema_version: "2"` on normal
runs. Ingest adapter remains the shared factory; add **fixture + unit tests**
for `java-model-v2` (methods + usages → `calls`) and keep `java-model-v1`
regression. Document dual support in
[contracts/ingest-java-v2.md](./contracts/ingest-java-v2.md) (supersedes the
“emit only 1” note from `018` for new runs; stored v1 envelopes still valid).

**Rationale:** Parity with TS/C# after `008`; FR-004/005.

**Alternatives considered:** CLI flag to force v1 — unnecessary complexity.
Separate `java-v2` parser_id — rejected (breaks `018` identity).

## R6 — DoD fixture (anti-dogfood)

**Decision:** Add ODS-owned multi-module tree
`docker/fixtures/repos/java-calls-demo/` with **synthetic** module/package
names (no external pilot naming). Minimum content:

- Module A + Module B under `src/main/java`;
- Instance call same-type; static call; cross-module call;
- Interface-typed receiver → interface method;
- Ambiguous overload site (expect no edge);
- Test-only call under `src/test/java` (expect no production `calls` from it).

Optional second tree / external dogfood = SHOULD smoke only (clarify Q4).

**Rationale:** FR-009/012; SC-001/003/005/006; US6.

**Alternatives considered:** Extend only `java-symbols-demo` (single-module) —
insufficient for cross-module SC. Reuse HTTP multi-module fixtures — wrong
layer and dogfood-adjacent patterns.

## R7 — Vision / constitution alignment

**Decision:** During implement tasks, update `specs/001-ods-vision/spec.md`
to move “Java language schema v2 `calls`” from **Deferred** to an active /
in-progress feature pointing at `023`. Do not put FR detail into `001`.
Optionally refresh constitution ODS Spec Structure row when closing the
feature (not required to start plan).

**Rationale:** Constitution III / VI — child scope reflected in vision
roadmap before code.

**Alternatives considered:** Implement without `001` touch — gate fail.

## R8 — Explicit non-goals (tech)

**Decision:** No changes to `java-http-calls`, `java-api-routes`,
`maven-project`, `spring-config`, or `_shared/java-spring` service-hint
stripping for this feature. No portal i18n/screens. No Java `injects`.

**Rationale:** Spec Not included / FR-010/011.
