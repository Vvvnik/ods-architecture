# Research: The project graph (006)

**Date**: 2026-07-09

## R1. ES index names

**Decision:** `ods-graph-nodes`, `ods-graph-edges` (prefix `ods-` as in `002`/`005`).

**Rationale:** Unified platform style; draft `graph_nodes`/`graph_edges`  logical names
(in API and data-model); physical indexes  with prefix.

**Alternatives:** `graph_nodes` without prefix  divergence from `ods-elements`.

## R2. Model of the graph

**Decision:** The nodes/reps are stored `analysis_run_id`; current  project graph = last
The carriageway `status` ∈ {success, partial} **and** `ingest_status` ∈ {success, partial}
(in the field of ingest  patch `006` on `ods-analysis-runs`).

**Rationale:** FR-007, FR-011; the history of the protrusions is preserved until DELETE of the project.

**Alternatives:** Only the latest run is easier, but it's history.

## R3. Stable id of the node

**Decision:** Prefer human-readable
`id = {parser_id}:{path}:{kind}:{qualified_name}` (POSIX path); on collision
append `:line:{start}`.

**ES constraint (scale):** Elasticsearch `_id` max length is **512 bytes**. ODS
stores documents as `_id = {analysis_run_id}:{logicalId}` (UUID + `:` ≈ 37
bytes), so the logical id MUST stay ≤ **475** UTF-8 bytes. When the readable
form would exceed that, ingest replaces it with a **stable hash form**
`{parser_id}:h:{sha256(full)[0:40]}` via `fitLogicalIdForEs` in
`backend/src/services/ingest/node-id.ts` (also applied to system/UI edge ids).
`path` / `qualified_name` / `kind` remain on the document for display and
search; only the link key is shortened.

**Rationale:** Upsert stability for incremental ingest; uniqueness in
`(project_id, id, analysis_run_id)`; large monorepo paths must not fail
ingest with `id is too long`.

**Alternatives:** UUID per ingest — breaks increments and edges. Truncate
without hash — collision risk.

## R4. Ingest trigger

**Decision:** `IngestService.ingestEnvelope(envelopeDocId)` is called from
`analysis-orchestrator.service.ts` (`005`) ** after successful entry in `ods-parser-envelopes`;
The orchestrator will only transmit the document id / envelope of the DTO without understanding `model`.

**Rationale:** FR-012, FR-004; the boundary is 005/006.

**Alternatives:** Separate queue/walker  is too much for the pilot.

## R5. Increased ingest

**Decision:** Before upsert for `analysis_run_id`:
1. `delete_by_query` `project_id`project_id`analysis_run_id`analysis_run_id`path`path`parser_id`parser_id`
2. `delete_by_query` nodes with the same filters
3. upsert new nodes/rope from the adapter

For `deleted`s paths from change set (`005`)  just delete without upsert.

**Rationale:** FR-005, D-006-3; not to reassemble the whole project.

**Alternatives:** Full reassembly run  slowly (SC-003).

## R6. Adapter ingest

**Decision:** Interface `IngestAdapter`:

```text
parser_id, supported_schema_versions[]
transform(model: unknown, ctx: IngestContext): { nodes: GraphNode[], edges: GraphEdge[] }
```

Register `ingest/adapters/*.ingest.ts`; registering at the start of the backend (as parser registry in `005`).

**Rationale:** FR-013, SC-005 expandability; contract at `ingest-pipeline.md`.

**Alternatives:** One universal mapper  contradicts the free `model`.

## R7. element_id resolution

**Decision:** When ingesting lookup `ods-elements` on `(project_id, path, is_active=true)`;
If found  write `element_id` to the node; otherwise only `path`.

**Rationale:** FR-008; best-effort, does not block ingest.

## R8. UI minimum graph

**Decision:** Replace `GraphStubPage` with `GraphPage`: left column  list of nodes
(pagination); right  ribbon table of the selected node (1 hop); without canvas layout.

**Rationale:** FR-009, D-006-6; React Flow is out of scope.

**Alternatives:** SVG force-graph  optional post-MVP.

## R9. API pageing

**Decision:** `limit` default 50, max 100; `offset` for nodes; edge  for the selected node
Or a file with no unlimited answer.

**Rationale:** Edge case of large files in spec.

## R10. Connection with indices `005`

**Decision:** `006` **no** creates/does not change the schemes `ods-parser-envelopes`, `ods-analysis-runs`,
`ods-language-reports`; only reads. The DELETE cascade extends `project.service` (`005` T057)
on the  `ods-graph-nodes`, `ods-graph-edges`.

**Rationale:** Assumptions spec `006`; division of responsibility.
