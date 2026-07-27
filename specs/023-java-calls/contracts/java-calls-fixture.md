# Fixture contract: `java-calls-demo`

**Spec**: [../spec.md](../spec.md)  
**Path**: `docker/fixtures/repos/java-calls-demo/` (ODS-owned)

## Purpose

Prove Java language `calls` end-to-end without external pilot naming or
path heuristics (FR-009, FR-012, SC-001…006).

## Layout (normative intent)

```text
java-calls-demo/
├── module-alpha/src/main/java/...   # synthetic packages
├── module-beta/src/main/java/...    # different module name
└── module-alpha/src/test/java/...   # call site must NOT yield DoD calls
```

Exact package/class names are chosen at implement time; they MUST be synthetic
(ODS-owned). MUST NOT copy folder or service naming from a single external
dogfood monorepo.

## Required scenarios

| Id | Scenario | Expected |
|----|----------|----------|
| F1 | Instance method call, same type, unique target | `calls` edge |
| F2 | Static method call, unique in-project target | `calls` edge |
| F3 | Cross-module call alpha → beta (or reverse), unique | `calls` edge |
| F4 | Call via interface-typed receiver | `calls` to **interface** method symbol, not impl |
| F5 | Ambiguous overload call site | **no** `calls` edge; run OK |
| F6 | Call only under `src/test/java` | **no** DoD `calls` from that site |
| F7 | Unresolved / library-only target | **no** edge; run OK |

## Anti-patterns (forbidden in product logic for this fixture)

- Hard-coded preferential paths to this fixture’s folder names in shared
  helpers used for all repos
- Stripping a fixed monorepo/service prefix to invent resolution hints
- Assertions that only pass when names match an external pilot tree

Fixture-local test paths that open `java-calls-demo` by relative fixture
location in ODS tests are allowed (test harness, not product heuristics).

## Optional (SHOULD)

- Second separate ODS-owned tree with different names
- Smoke on an external multi-module Java service tree (not DoD oracle)
