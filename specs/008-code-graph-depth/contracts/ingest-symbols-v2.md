# Ingest: symbols model v1 + v2

**Spec**: [../spec.md](../spec.md)  
**Research**: [../research.md](../research.md) (R2–R4, R7)

## Adapter

Shared factory (`symbols-model.ingest.ts` previously `symbols-model-v1.ingest.ts`):

| Property | Meaning |
|----------|----------|
| `parser_id` | `typescript` \| `csharp` (and python/cpp — only v1) |
| `supported_schema_versions` | `['1', '2']` |

## Algorithm transform

1. Disassemble `model.symbols[]` → nodes (as v1).
2. Build map `qualified_name → node.id` (and, when confronted —
   `path:qualified_name` as in the current code).
3. `symbols[].refs[]` → ribs, if `isEdgeType(ref.type)` (as v1).
4. If `schema_version === '2'` (out of context envelope) **or** present
   `model.usages`:
   - for each usage with `type` ∈ {`calls`, `injects`}:
     - find `fromId` / `toId` at map; if not **any** — **miss**
       usage (not a bug transform);
     - otherwise the edge: `type`, `from`, `to`, `path`, `location`, id via
       `buildEdgeId`.
   - usages other types (`creates`, `references`, ...) — **ignore**.
5. For **all** of nodes and edges result: `metadata.layer = 'code'` (MERG).

## Version context

The Orchestrator/ingest service reports `envelope.schema_version` in
`IngestContext` (if there is no field yet, add it). The adapter does not have to refuse
v1 empty `usages`.

## Regression v1

Fixture `typescript-model-v1` / `csharp-model-v1`: the same set imports/
inherits (± layer in metadata). Availability of `layer` on regression expectations —
update the tests (valid extension metadata).

## Increment

Without a change of policy `006`: the replacement/deletion of nodes and edges for `path` file
includes `calls`/`injects` with the same `path`.
