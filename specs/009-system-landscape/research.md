# Research: 009-system-landscape

**Date**: 2026-07-14  
**Spec**: [spec.md](./spec.md)

## R1 — `artifacts[]` vs extension `languages[]`

**Decision:** Some array **`artifacts[]`** in `ods-language-reports` near
`languages[]`. Field entry: `artifact_type`, `file_count`, `sample_paths`,
`parser_id`, `parser_status` (mirror `LanguageEntry`).

**Rationale:** Clarify Q1; code-languages and infra-artifacts of a different nature; UI window
languages `005` do not break.

**Alternatives considered:** Pseudo-languages (`language: compose`) — confusion
with `ParserRegistryService.languageToParserId`; single `targets[]` — more
refactoring API without a win in MVP.

## R2 — Detector rules (artifact triggers)

**Decision:** Config **`detector-rules.json`** (or `backend/src/config/`) with
records `{ artifact_type, parser_id, globs[], content_signals? }`. Service
`LanguageDetectorService` after walk WC:

1. Counts `languages[]` as it is now.
2. Scans a path for globs for artifacts (compose, appsettings, openapi, sln/csproj).
3. For bus separate passage `detectBusProfile(wc)` at content_signals
   (appsettings keys, csproj PackageReference known types listeners).

Sort `artifacts[]`: `file_count` desc, `artifact_type` asc.

**Rationale:** FR-006; extensibility without editing code on every new glob.

**Alternatives considered:** Only hardcod in service — as it is now extensions;
is rejected for 009+.

## R3 — Bus: registry both spawn one tie-break Rabbit

**Decision:** `bus-rabbit` and `bus-kafka` registered in `parsers/`. The detector
puts **one** artifact entry `artifact_type: bus` with `parser_id` =
`bus-rabbit` | `bus-kafka`. If the signals **both** — **`bus-rabbit`**. The orchestrator
spawn at `artifacts[]` with dedupe `parser_id` (like languages).

**Rationale:** Clarify Q2; both parser test; driver Profile A.

**Alternatives considered:** Only one parser in registry — lays Kafka;
ambiguous → skip bus - losing data.

## R4 — databases and connection strings

**Decision:** The detector only artifact `appsettings` (file_count). The Parser
`appsettings` remove `bindings[]` with `binding_type=database` and `engine`.
Ingest: **each** recognized string → node `database`; dedup id by
`connection_name` / stable key; several services → single node, multiple
`connects_to`.

**Rationale:** Clarify Q3; without duplication detector.

**Alternatives considered:** `detected_engines[]` in artifacts rejected.

## R5 — Stable id system-nodes

**Decision:** `{parser_id}:{kind}:{stable_key}` where `stable_key`:

| kind | stable_key (example) |
|------|---------------------|
| `service` | `{compose_file}#{service_name}` |
| `http_endpoint` | `{method}:{path}` (normalized) |
| `database` | `{connection_name}` |
| `dotnet_project` | `{csproj_path}` |
| `message_topic` | `{topic_or_queue_name}` |
| `message_type` | `{type_fqn}` |

When a conflict in one run — suffix path hash (as compose multi-file).

**Edge id (ingest):** `{parser_id}:{type}:{from}->{to}` (`systemEdgeId`).

**Rationale:** FR-011; json-model C02.

**Alternatives considered:** Only compose service name — conflicting multi-compose.

## R6 — Cross-parser linking (service ↔ openapi ↔ appsettings)

**Decision:** MVP — **heuristics ingest** within a single run, without major
ES lookup:

- `exposes`: `http_endpoint` → `service` if `service_hint` / path openapi
  the same name compose service or folder `Sample.Api`.
- `connects_to`: `appsettings` `service_hint` → `service` node id from compose
  (match by name) or synthetic `service` only if compose have already created node.
- `documents`: openapi spec file → `http_endpoint` (always openapi ingest).

If the target is not found — **no edge** (FR-010).

**Rationale:** Avoiding two-phase ingest; sufficient for mini-monorepo fixture.

**Alternatives considered:** Second pass ingest at ES — harder orchestrator.

## R7 — `metadata.layer = system`

**Decision:** All system ingest adapters MUST `metadata: { layer: 'system', ... }`
on nodes and edges. Legacy code no layer — interpreted as code in UI filter.

**Rationale:** Pattern `008` (`layer=code`).

## R8 — UI layer filter and ribs

**Decision:** Client (or API) filter:

- `system`: nodes `layer=system`; edges where **both** end system.
- `code`: nodes code (layer absent or `code`); edges code↔code.
- `all`: without a layer filter on the edges.

**Rationale:** Clarify Q5; FR-008/009.

**Alternatives considered:** OR-filter on the ribs — noise system view.

## R9 — Orchestrator: order spawn

**Decision:** After code `languages[]` spawn — cycle `artifacts[]` (the same
`spawnedParserIds` set). Order artifacts: `file_count` desc. Ingest after
each envelope as it is now. Incremental: `resolveArtifactChangeSet` at globs
artifact type (new helper in `change-set.service`).

**Rationale:** FR-007; one run id.

## R10 — Parsers: technologies MVP

| parser_id | Runtime | Note |
|-----------|---------|------------|
| `compose` | Node + `yaml` | parse services/depends_on |
| `appsettings` | Node | JSON + dotenv-lite for `.env` |
| `openapi` | Node + yaml | paths/methods; skip invalid → partial |
| `dotnet-project` | .NET | sln/csproj XML |
| `bus-rabbit` | .NET Roslyn | queue listeners, handlers |
| `bus-kafka` | .NET Roslyn | consumers, MassTransit hints |

**Rationale:** Consistent with `005`; bus/dotnet on Roslyn already in the image.

## R11 — Scope analysis

**Decision:** MVP — **all** WC; `path prefix` at the start of the run — follow-up
(not in tasks MVP).

**Rationale:** Clarify Q4.

## R12 — Message cross-link between services

**Decision:** `message_type` site at FQN/generic name; `consumes`/`publishes`
from handler; cross-service link if **same** `message_type` stable_key
in the same run (two handler → one type node).

**Rationale:** US5 scenario 2; without schema registry in MVP.

**Alternatives considered:** OpenAPI schema name only — not for bus MVP.

## R13 — Code reuse audit (implement 009)

| Area | Way |
|---------|------|
| Language Detector + artifacts | `backend/src/services/language-detector.service.ts`, `backend/src/services/artifact-detector.ts`, `backend/src/config/detector-rules.json` |
| Language report | `backend/src/domain/language-report.ts`, `backend/src/repositories/language-report.repository.ts` |
| The orchestrator | `backend/src/services/analysis-orchestrator.service.ts` |
| Change set | `backend/src/services/change-set.service.ts` |
| The canon of the graph | `backend/src/domain/graph-node.ts`, `backend/src/domain/graph-edge.ts` |
| Ingest | `backend/src/services/ingest/system-layer.ts`, `backend/src/services/ingest/adapters/*.ingest.ts`, `ingest-registry.service.ts` |
| Parsers | `parsers/{compose,appsettings,openapi,dotnet-project,bus-rabbit,bus-kafka}/` |
| UI | `frontend/src/pages/GraphPage.tsx`, `frontend/src/components/analysis/LanguagesConfirmModal.tsx`, `frontend/src/utils/graphLayerFilter.ts` |
