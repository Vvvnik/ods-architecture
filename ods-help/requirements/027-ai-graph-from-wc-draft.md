# Draft: S1 — AI graph from working copy

**Status**: historical entry — **Closed** 2026-08-02 →
`specs/027-ai-graph-from-wc/` (spec/plan/tasks complete; Compose dogfood)  
**Proposed feature id**: `027-ai-graph-from-wc`  
**Vision label**: **S1** (AI import / graph from WC; counterpart to closed
`015` = S2 `docs_from_es`)  
**AiJob kind**: `graph_from_wc` (unchanged technical kind from `015` notes;
feature folder/slug uses `ai-graph-from-wc` for clarity)  
**Parent**: `001-ods-vision`  
**Depends on**: `002`/`003` (project, WC, sync/import), `005`/`006` (analysis
run + Canon ES), `007`/`011`/`014` (graph view consumption), `015` (shared
**AiJob** bus / runner / status — first client was `docs_from_es`; reuse, do
not fork a second job framework), `010` replace-after-success / full-analysis
policy as already applied for graph writes  
**Related**: stub prompt `prompts/code-agent-prompt.md`; prior notes in
`ods-help/requirements/015-project-docs-draft.md` §8 (S1 vs S2 split)  
**Out / later**: MCP (`016`), auth (`017`), C++ API parsers, RAG/Q&A,
codegen, mixing `docs_from_es` reader/writer into this feature  
**Created**: 2026-07-29  
**Priority**: **Closed** (was next after `026`); C++ API parsers remain
deferred (libs-heavy C++ trees; optional later via `018`)  
**Dogfood**: ODS-owned fixture (or existing demo WC) where AI path produces a
Canon-shaped graph visible in Graph View; external large local tree —
confidence only; **no** foreign path / project UUID / localhost URL hardcodes
in tracked artifacts.

## Problem

Modular parsers build the graph from code with high control and known gaps
(stack coverage, false-call bars). Architects sometimes need a **broader or
alternate landscape** from an imported working copy when parsers are
incomplete for that tree — without inventing a second graph product.

`015` already shipped S2 (`docs_from_es`) on a shared **AiJob** shape.
**S1** (`graph_from_wc`) was deferred: WC reader + Canon writer on the same
bus, different adapters. **AI does not replace tree import/sync.**

## Goal

1. Add **AiJob** `kind=graph_from_wc`: read allowlisted WC paths (size
   limits; respect element Status scope — see Locked below), produce
   ingest-compatible Canon (same shape as parser ingest;
   provenance=`ai` or equivalent), write via existing analysis-run /
   replace-after-success rules.
2. **Cold import + first analysis** stay the current **parser** path. After
   successful parser analysis, the docs/prompt area exposes **two** downloadable
   prompts (docs + code/graph). AI graph rebuild is **optional and later** via
   the code prompt + external agent (parity with `015`); **no** radio on import,
   **never** AI on sync.
3. Reuse `015` AiJob runner/status API; extend adapters only — **do not**
   merge docs generation into this feature.
4. Grow `prompts/code-agent-prompt.md` into the S1 playbook template (rendered
   project file alongside the docs prompt). Delivery MVP = **external agent +
   download** (same habit as `015`); in-process LLM stays clarify/out unless
   chosen later.
5. Graph View / Canon consumers keep working unchanged (no new node/edge
   kinds required for MVP unless clarify proves need).
6. English specs; portal strings via i18n `en`/`ru` only if new UI appears.

## Non-goals

| In | Out |
|----|-----|
| AI → same Canon shape as parsers | Second graph model / parallel ES schema |
| Shared AiJob with `015` | One mega-prompt “repo → docs” |
| WC read for graph job only | AI writing Markdown docs (`015` owns that) |
| Replace-after-success full graph | Quiet partial overwrite of live graph |
| Status scope at analysis (`not_needed` out) | AI / status filter changing sync or import |
| Optional confidence on large local tree | Foreign paths/UUIDs in repo |
| Skip / fail-loud on invalid Canon | Inventing false edges to “look complete” |

## Canon frame (must match constitution)

AI writes into the **same** six Canon schemas as parsers — **Code / System /
UI** × (node + edge) under `ods-help/requirements/json-model/`. Unknown
`kind` / shape → reject or drop; **no** parallel AI-only graph model. New
infra concepts land by extending layer schemas + ingest (child feature),
not by inventing a seventh base contract. See constitution «Canonical
graph frame» and `json-model/README.md`.

## Locked: operator flow (2026-07-29)

| Step | Decision |
|------|----------|
| Cold **tree import** | Always creates elements as `auto_found`; **no** AI; **no** Parsers/AI radio |
| **Tree sync** | Unchanged FS↔ES walk; **never** AI; preserves statuses (see below) |
| **First analysis** | Parsers (current path); Status scope applies; pipeline unchanged |
| **After parser success** | Docs/prompt zone offers **two** files (see dual prompts below) |
| **Later (optional)** | Re-sync → mark Status → download **code** prompt → external agent rebuilds graph **or** download **docs** prompt → docs as today (`015`) |
| AI vs sync | AI rebuilds **graph** only (replace-after-success); does **not** replace sync |

Preferred shape: sync + parsers always run first; AI is a **post** path via
downloaded prompt — not a second sync and not an import toggle.

## Locked: dual downloadable prompts (2026-07-29; clarify 2026-08-02)

Same portal habit as S2 (`015`): after a successful analysis, operator
downloads a rendered project prompt and runs an **external** agent.

| File | Role | Template in repo |
|------|------|------------------|
| `AGENT-DOC.md` | Docs generation (S2 / `docs_from_es`) | `prompts/docs-agent-prompt.md` |
| `AGENT-CODE.md` | Graph rebuild from WC (S1 / `graph_from_wc`) | `prompts/code-agent-prompt.md` |

**Clarify lock:** rename today’s `AGENT.md` → **`AGENT-DOC.md`**; add
**`AGENT-CODE.md`**. Both rendered under `DATA_ROOT/docs/{projectId}/`
(not inside WC). Portal UI: **two download buttons** (docs prompt / code
prompt) — not a single picker, not “download both at once”. Agent either
writes docs or returns Canon for ingest.

**Do not** change tree Status to “found by AI”. Graph vs parsers provenance
is a **run/graph header badge** only (see Locked: provenance badge).

Access (same project, same ES cluster):

| Prompt | Reads | Writes |
|--------|-------|--------|
| Docs (`AGENT-DOC`) | ES / ODS REST only (not WC) | Markdown under `DATA_ROOT/docs/{projectId}/` |
| Code (`AGENT-CODE`) | WC via ODS allowlisted APIs | Canon nodes/edges in ES (replace-after-success) |

## Locked: element Status × analysis scope (2026-07-29; clarify 2026-08-02)

Tree **Status** lives on `ProjectElement` (file/folder Properties). It is
**not** graph provenance (parsers vs AI). Sync behavior stays as today.

| Rule | Decision |
|------|----------|
| Import (cold tree write) | Always `auto_found` («Found automatically») |
| Sync | Unchanged: still walks full WC (minus denylist); **all** paths remain in the tree; preserves manually set status; `not_needed` inheritance under manual ancestor unchanged |
| UI choices (keep 3) | `auto_found` · `needed` · `not_needed` only |
| UI choices (drop / hide) | `found` · `unused` — hide from new picker; leave existing ES rows readable (no mandatory remap migration in first cut) |
| Analysis include (parsers **and** AI) | `auto_found` and `needed` — **same scope**: both **in** inventory / graphs |
| Analysis exclude | `not_needed` — **out** of inventory / graphs (and descendants with that status) |
| Operator meaning of `needed` vs `auto_found` | Intent only (`needed` = manually affirmed); **no** different analysis rule |
| First import + first analysis | Current parser path; status filter still applies (`not_needed` excluded if already set — normally all `auto_found` after import) |
| Later | Re-sync (statuses kept) → download code prompt / re-run parsers on in-scope paths |

Cross-feature note: exclude-at-analysis may also amend `002`/`005`/`007` at
specify time; this draft owns the S1 product intent. **Do not** overload
Status with “found by parsers / found by AI”.

## Locked: graph provenance badge (clarify 2026-08-02)

| Rule | Decision |
|------|----------|
| What | Run / Graph View header shows who built the **current** graph |
| Labels (i18n) | e.g. “Built by parsers” / “Built by AI” (`en`/`ru`) |
| Source | Analysis-run (or equivalent) **provenance** — not `ProjectElement.status` |
| MVP | **In** this feature |
| Out | Replacing `auto_found` with parser/AI variants on the file tree |

## Locked: rebuild policy (clarify 2026-08-02)

| Rule | Decision |
|------|----------|
| Hybrid parsers+AI in one run | **Out** of first cut |
| What the operator sees | Full graph from the **last successful** rebuild (parsers **or** AI) |
| Failure / cancel | Does **not** replace the previous successful graph (replace-after-success) |

## Volume / first-cut DoD (locked clarify 2026-08-02)

| Dimension | MUST | Not in first cut |
|-----------|------|------------------|
| Job | `graph_from_wc` on AiJob bus | New job framework |
| Output | Same Canon frame as parsers (Code / System / UI × node+edge); dogfood visible in Graph View | Claiming day-one parity with every parser module’s edge quality |
| Entry | Parsers first; dual prompts after success; AI via `AGENT-CODE.md` download | AI radio on import/sync; silent AI override |
| UI download | Two buttons: docs + code | Single picker; download-both |
| Delivery | External agent + downloadable prompts (same habit as `015`) | In-process LLM / MCP as MVP |
| Provenance | Run/graph badge parsers vs AI | Overloading tree Status |
| Status UI | Three picks only; hide `found`/`unused` | Mandatory ES remap of legacy statuses |
| Safety | Path allowlist, file size caps, no secrets exfiltration requirements beyond existing pilot norms | Full enterprise DLP product |
| Quality bar | No claim of parser-grade `calls` honesty unless measured; label provenance AI | Replacing `008` false-call bar with AI guesses |

## Proposed acceptance (draft → lock at specify)

1. Cold import + first parser analysis still work as today on an ODS fixture.
2. After successful parser analysis, operator can download **both** prompts via
   **two buttons** (`AGENT-DOC.md` + `AGENT-CODE.md`); choosing docs does not
   require S1; choosing code drives `graph_from_wc` ingest path.
3. Operator marks some paths `not_needed` → later analysis/AI scope omits
   those paths from inventory/graphs; tree still lists them after sync.
4. Successful `graph_from_wc` → Graph View shows that run’s Canon; run/graph
   header badge distinguishes parsers vs AI (Status tree unchanged).
5. Failed / cancelled AI job does **not** replace the previous successful
   graph (replace-after-success); last successful full rebuild wins.
6. Docs AiJob (`docs_from_es`) behavior preserved aside from
   `AGENT.md` → `AGENT-DOC.md` rename + second download button.
7. Tracked artifacts have no foreign paths / project UUIDs / localhost URLs.

## Clarify decisions (locked 2026-08-02)

| # | Topic | Decision |
|---|-------|----------|
| 1 | Filenames | Rename `AGENT.md` → `AGENT-DOC.md`; add `AGENT-CODE.md` |
| 2 | Canon depth | Same six-schema frame as parsers (Code / System / UI) |
| 3 | Prompt storage | `DATA_ROOT/docs/{projectId}/` (confirmed) |
| 4 | Download UI | Two buttons |
| 5 | Hybrid / visibility | No hybrid run; full rebuild; last successful wins |
| 6 | Legacy statuses | UI picker: three only; leave `found`/`unused` readable in ES; no mandatory remap |
| 7 | Provenance UI | MVP badge on run/graph header; **do not** mix with tree Status |
| 8 | In-process LLM | Deferred — same external-agent path as docs (`015`) |

Open questions for clarify: **none remaining**.

## Entry → SpecKit

**Closed 2026-08-02:** `specs/027-ai-graph-from-wc/` (spec/plan/tasks +
Compose dogfood). Graph View System root/focus slice rules locked in
`014` / `011`. Keep this file as historical entry.

## References

- Vision: `specs/001-ods-vision/spec.md` (S1 optional → this draft)
- AiJob / S1 vs S2 split: `ods-help/requirements/015-project-docs-draft.md` §8
- Prompt stub: `prompts/code-agent-prompt.md`
- Closed S2: `specs/015-project-docs/`
- Perf prerequisite useful for WC work: `specs/026-parser-pipeline-perf/`
  (tree import vs warm sync)
