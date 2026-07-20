# Quickstart: check 008-code-graph-depth

**Goal:** make sure after analyzing TS/C# appear in the graph edges
`calls` (and `injects` for C# DI), v1 not regressing, the ambiguity is not
gives the false ribs. Details — [contracts/](./contracts/), [data-model.md](./data-model.md).

## Prerequisites

1. Stack: `docker compose --profile full` from `docker/` (or local backend + ES).
2. Implemented parsers v2 + ingest dual (after `/specit-implement`).
3. UI portal screen "Count" (`007`).

## 1. C# — method call (SC-001)

1. Project/fixture: method `Create` is the unequivocal `Save` (another method
   of the same or neighboring file in the run).
2. Run the analysis (sync → confirm languages as usual).
3. **Expectation:** in ES / UI there is an edge `type=calls` from→to relevant
   node methods; the edge `metadata.layer=code`.
4. (UI) Node search / communications `Create` show a call.

## 2. TypeScript — call (SC-002)

1. Fixture: unambiguous call `caller` → `callee` in the project.
2. Analysis → **waiting:** edge `calls`, `layer=code`.
3. Envelope parser: `schema_version: "2"` in `model.usages` there is a record
   `type=calls`.

## 3. C# — constructor injection (US4)

1. A class with a "ctor-"parameter for the interface type/class of the project.
2. **Expectation:** edge `type=injects` class of consumer to the type of dependence.
3. Primitive/unknown type parameter → **no** about `injects`.

## 4. Ambiguity (SC-005)

1. Fixture with overloads / unresponsive call.
2. **Expectation:** analysis run success; **no** ribs `calls` for this place.

## 5. Regression of v1 (SC-003)

1. To banish unit/integration on envelope/`model` with `schema_version: "1"`
   (existing fixtures ingest).
2. **Expectation:** imports/inherits how to `008` (acceptable appearance
   `metadata.layer=code`).

## 6. Smoke UI (SC-004)

1. Open the "Graph" of the project with `calls`.
2. Find an edge/node through the search or link panel — without a new screen.

## Commands (landmarks)

```bash
# unit ingest v1/v2
cd backend && npm test -- --run tests/unit/ingest/

# parser calls + ambiguous (dotnet / node)
cd backend && npm test -- --run tests/integration/csharp-parser-calls.test.ts \
  tests/integration/typescript-parser-calls.test.ts \
  tests/integration/csharp-ambiguous-calls.test.ts
```

**Checked (implement 2026-07-14):** unit ingest v2; C#/TS CLI → usages `calls` (+ C# `injects`); ambiguous → 0 calls; ES ingest assert — if available ES (otherwise skip).

Manual parser (as `005`):

```bash
node parsers/typescript/run.mjs --project-id … --working-copy-root … \
  --analysis-run-id … --files '[…]' --output /tmp/env-ts.json
# check schema_version === "2" and usages
```
