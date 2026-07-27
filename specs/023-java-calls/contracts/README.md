# Contracts: 023-java-calls

Java language **v2** reuses the shared native symbols schema from `008`.

| Artifact | Role |
|----------|------|
| [`../../008-code-graph-depth/contracts/native-symbols-v2.schema.json`](../../008-code-graph-depth/contracts/native-symbols-v2.schema.json) | Canonical native v2 JSON Schema (`symbols` + `usages`) |
| [`../../008-code-graph-depth/contracts/native-symbols-v2.example.json`](../../008-code-graph-depth/contracts/native-symbols-v2.example.json) | Example shape (TS/C#; Java follows same fields) |
| [`../../008-code-graph-depth/contracts/ingest-symbols-v2.md`](../../008-code-graph-depth/contracts/ingest-symbols-v2.md) | Shared usages → Canon algorithm |
| [`../../008-code-graph-depth/contracts/canonical-edge-types.md`](../../008-code-graph-depth/contracts/canonical-edge-types.md) | Canon edge type `calls` |
| [ingest-java-v2.md](./ingest-java-v2.md) | Java-specific dual emit + adapter notes |
| [java-calls-fixture.md](./java-calls-fixture.md) | ODS-owned multi-module DoD fixture contract |

Do **not** duplicate the v2 JSON Schema under `023`; change the shared `008`
schema only if a true cross-language gap appears (out of expected 023 scope).
