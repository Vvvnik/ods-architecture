# Research: 008-code-graph-depth

**Date**: 2026-07-14  
**Spec**: [spec.md](./spec.md)

## R1 — Form native v2: `usages[]` vs `refs` symbol

**Decision:** MVP writes semantics in the top level array **`usages[]`**
(as `ods-help/requirements/json-model/native-symbols-v2.*`); `symbols[].refs`
remains v1-links (`imports`/`exports`/`inherits`/`implements`). Types
`creates`/`references` in enum scheme MAY to be a stepping stone without filling.

**Rationale:** Clarify: MVP = `calls` + `injects`; private array does not break
contract refs v1 and coincides with the draft N02.

**Alternatives considered:** Push `calls`/`injects` in `refs[]` — breaks enum
native v1 mixes and levels; only refs no usages worse for DI class.

## R2 Version envelope / dual ingest

**Decision:** Parsers `typescript` and `csharp` in the normal run always give
`schema_version: "2"` + model with `symbols` (+ `usages` if available). Shared
ingest-adapter symbols: `supported_schema_versions: ['1','2']`. v1 — without
`usages` behavior as it is now. Python/cpp remain v1.

**Rationale:** Clarify Q5; FR-003.

**Alternatives considered:** Flag v1/v2 on CLI — the extra complexity; fallback on
v1 error calls — hides defects extract.

## R3 — Canonical type `injects`

**Decision:** Expand `EdgeType` and the Canon: add **`injects`**. Ingest
usage `type=injects` → edge `type=injects`. Schematics: update domain
`graph-edge.ts`, `isEdgeType`, `canonical-edge-code` (contracts 008 + mirror
json-model).

**Rationale:** Clarify Q1; search/UI see the type explicitly.

**Alternatives considered:** `references` + metadata — rejected on clarify.

## R4 — Resolution `usages.from` / `usages.to` → node id

**Decision:** `from`/`to` in native — **qualified_name** symbols of the same envelope
(or known in the current transform batch). Ingest builds map
`qualified_name → node.id` by site **this** transform; an edge if and only if
both ends are found. Cross-file: goal should be symbols same envelope
(parser includes both file into the run) **or** to indicates qn+path that
there are in symbols current model. If to not batch — **no edge** (not
to synthesize dangling to one qn no path/kind if you can't consistently
assemble id as in v1 refs).

Pilot's rule of thumb: the parser resolves the target only if it is unambiguous
the symbol of the project; in `usages.to` writes qn matching `symbols[].qualified_name`
in the same model (multi-file chunk orchestrator already yields several files
in one envelope if necessary — as in `005`).

**Rationale:** FR-006; to avoid false id; to align with the current
`buildNodeId(parser, path, kind, qn)`.

**Alternatives considered:** Always synthetic to without node existence
(as in part v1 imports) - increases noise for calls; postponed. Full
global index qn at ES on ingest — harder MVP.

## R5 — Extract calls: C#

**Decision:** Roslyn: possible **SemanticModel** (if workspace/
compilation is assembled from chunk files); otherwise, the syntax
`InvocationExpression` + simple resolution. Unambiguous method → `calls`;
overload/unknown → pass. Constructor DI: settings ctor with
named project type → `injects` (class/interface → parameter type).

**Rationale:** Today, extractor syntax-only; semantic greatly improves accuracy
cross-file calls. Fixture MVP can live in one/several `.cs` no full
solution if SemanticModel available through AdhocWorkspace.

**Alternatives considered:** Only InvocationExpression by the name — a lot
false alarms.

## R6 — Extract calls: TypeScript

**Decision:** TypeScript Compiler API + **type checker** (`getResolvedSignature` /
symbol at call). Unambiguous call → `calls`; ambiguous/unresolved → pass.
DI/`injects` for TS in MVP **not** mandatory (spec: injects C#).

**Rationale:** Parity with FR-002; checker already toolchain parser.

**Alternatives considered:** Only text AST no checker — not enough
for cross-file.

## R7 — `metadata.layer = code`

**Decision:** If any write/update the nodes and edges ingest symbols (v1 and v2
way after turning 008) to put `metadata.layer = 'code'` (to merit with
with existing keys like `parent_qualified_name`). Legacy documents in ES
without a field, we do not migrate in batches.

**Rationale:** Clarify Q4; FR-008. Application to v1-transform after 008 —
to re - ingest marked layer; do not require a separate migration.

**Alternatives considered:** Only new edges calls/injects — weaker for
layer filter.

## R8 — The "very large file" limit

**Decision:** MVP **no** hard cap by the number calls on file. The run should
is terminated; the shortage is only due to inconsistency/ambiguity. The observed
degradation should be recorded in tests/quickstart when it appears; separate soft-limit
— follow-up, not a closure blocker.

**Rationale:** Clarify postponed in plan; not to block SC-001/002.

## R9 — UI / API

**Decision:** New UI new endpoint **not** need. Existing ones
`007` search + edges node already taking `type` as string; after the appearance of
`calls`/`injects` in ES they are visible. If necessary, smoke in quickstart
(the search string is/`calls`).

**Rationale:** FR-007; US5.

## R10 Contracts json-model

**Decision:** In `specs/008-code-graph-depth/contracts/` is the canon for implementation:
scheme native v2 policy ingest, Supplement EdgeType. sources of the ideas in
`ods-help/requirements/json-model/` status updates when implement
(`implementation_status`).

**Rationale:** FR-009; Constitution — Canon in specs.

## R11 — Code reuse / python·cpp dual versions

**Decision:** Shared symbols-adapter (`symbols-model.ingest.ts`) exhibits
`supported_schema_versions: ['1','2']` for **all** parser_id this factory
(typescript, csharp, python, cpp). Parsers python/cpp in MVP `008` still
EMITT only `schema_version: "1"` (without `usages`); dual allowlist breaks v1.
Individual parameterization `['1']` only python/cpp **not** need.

Map files (reuse): see tasks T001 — `parsers/typescript/run.mjs`,
`parsers/csharp/Ods.CSharpParser/*`, `backend/src/domain/graph-edge.ts`,
`backend/src/services/ingest/types.ts`, `adapters/symbols-model.ingest.ts`,
thin typescript/csharp ingest, fixtures `backend/tests/fixtures/ingest/*` and
`backend/tests/fixtures/parsers/{csharp,typescript}-calls/`.

**Rationale:** analyze U1; single adapter without branching; FR-011 / T033.

**Alternatives considered:** Leave python/cpp on `['1']` via the parameter
factory — extra complexity without benefit in MVP.
