# Quickstart: 023-java-calls

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Contracts**: [contracts/README.md](./contracts/README.md)

Validation guide after implementation (not a full test suite).

## Prerequisites

- Repo root checkout on branch `023-java-calls`
- Node/backend test toolchain as for other ingest unit tests
- JDK + Maven for `parsers/java` (same as `018`)
- Optional: Docker Compose `full` for end-to-end portal graph check

## 1. Parser unit (methods + calls)

```bash
cd parsers/java
mvn -q test
```

**Expect:** tests covering fixture scenarios F1–F7 in
[contracts/java-calls-fixture.md](./contracts/java-calls-fixture.md)
(or equivalent temp trees): unique instance/static/cross-module/interface
edges present; ambiguous/unresolved/test-only absent; run success.

## 2. Parser CLI → envelope v2

```bash
# From repo root — exact wrapper may match parsers/java/README.md
./parsers/java/run.sh /absolute/path/to/docker/fixtures/repos/java-calls-demo
```

**Expect:** JSON envelope with `parser_id: "java"`, `schema_version: "2"`,
`model.symbols` including `kind: "method"`, and `model.usages` entries with
`type: "calls"` for F1–F4.

## 3. Ingest unit (v1 regress + v2 calls)

```bash
cd backend
npx vitest run tests/unit/ingest/java.ingest.test.ts
# plus any new java-model-v2 cases added under the same suite
```

**Expect:** v1 fixture still builds module/namespace/type nodes; v2 fixture
creates `calls` edges with `metadata.layer: "code"`; missing/ambiguous usage
targets produce no edge and no throw.

## 4. Optional: look in the portal Graph (not required for DoD)

**You can do this** after implement if you want to see Java `calls` with your
eyes in the same Graph UI as C#/TS. **Not required** to close SC-004 or merge
the feature — that is covered by the API/integration assert (T026), same as
`008`.

What you would see (existing UI only, no new screen):

1. Open **Graph** for a project that already has Java `calls` in Canon
   (after analysis of `java-calls-demo` or equivalent).
2. Find a **method** node (caller).
3. In search or the node’s **links** panel, an edge typed **calls** to another
   method — same pattern as C#/TS calls today.

Skip this section entirely if you only care about CI/DoD.

**Checked (implement 2026-07-27):** `mvn test` in `parsers/java`; CLI envelope v2 on
`java-calls-demo`; Vitest `java.ingest` v1+v2; integration
`java-parser-calls` (parser usages + ES `calls` search when ES available).
Portal §4 not run (optional).

## 5. Anti-dogfood check

- Grep product extract/resolution code for hard-coded external pilot path
  fragments or fixed service-prefix strip logic added for 023 — **none**.
- DoD tests reference ODS fixture path only as test input.

## Success mapping

| SC | How verified here |
|----|-------------------|
| SC-001 | §1–§2 F1–F3 |
| SC-002 | §3 v1 fixture |
| SC-003 | §1 F5/F7 |
| SC-004 | T026 API assert (required); §4 portal look = optional “you can do” |
| SC-005 | §1 F6 |
| SC-006 | §5 + multi-module fixture names |
