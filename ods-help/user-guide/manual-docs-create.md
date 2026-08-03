# Manual: project docs and AI graph prompts

**Features**: `015-project-docs` (S2 — docs from ES) + `027-ai-graph-from-wc`
(S1 — AI graph from working copy)  
**Prompt templates**: `prompts/docs-agent-prompt.md`,
`prompts/code-agent-prompt.md`  
**API base (local)**: `http://localhost:8080/api/v1`

ODS stores Markdown under `DATA_ROOT/docs/{projectId}/` and the Canon graph in
Elasticsearch. An **external** agent writes docs or rebuilds the graph over
REST. ODS does **not** run the LLM.

**Two downloads on one Documentation panel.** Docs download needs a current
successful analysis (`015`). Code download needs a prior **parser**
graph-ready success at least once (`027`). After that parser run, both
controls are available:

| Download | Prompt file | AiJob kind | Reads | Writes |
|----------|-------------|------------|-------|--------|
| **Download docs prompt** | `AGENT-DOC.md` | `docs_from_es` | ODS REST (ES graph) | Markdown docs |
| **Download code prompt** | `AGENT-CODE.md` | `graph_from_wc` | Job-scoped WC paths | Canon graph (AI provenance) |

Cold import, tree sync, and **first** analysis stay on the **parser** path.
AI graph rebuild is **optional and later** — an alternate full landscape when
parsers are incomplete for that tree. AI never runs on sync and is not an
import toggle. Docs are built from the **latest successful graph** (parser or
AI), not from the working copy.

---

## Before you start

1. Stack is up (`docker compose … --profile full`).
2. Project is imported.
3. You can reach the portal at `http://localhost:8080`.
4. For **code** prompt / AI rebuild: at least one successful **parser**
   graph-ready analysis exists for the project (first code-download gate).

| Artifact | Location |
|----------|----------|
| Docs prompt template | `prompts/docs-agent-prompt.md` |
| Code prompt template | `prompts/code-agent-prompt.md` |
| Docs prompt | `docs/{projectId}/AGENT-DOC.md` (ODS-owned; agents must not overwrite; seeded on import) |
| Code prompt | `docs/{projectId}/AGENT-CODE.md` (ODS-owned; seeded after first successful parser analysis; re-rendered on code-download) |
| Generated docs | `docs/{projectId}/spec-*.md` (+ optional `contracts/`, …) |
| Working copy | `working-copies/{projectId}/` — not used for docs; used via job-scoped APIs for AI graph rebuild |

---

## 1. Resync the project (when source changed)

Do this whenever the repo on disk changed and the graph should catch up.

1. Open the project in the portal.
2. Run **Sync** (project sync / refresh from source).
3. Wait until sync succeeds.
4. Start **Analysis** (parsers) and wait until it finishes successfully.
5. Confirm Graph View shows a current landscape (badge **Built by parsers**
   after a parser run) and Documentation can see a current analysis run.

Docs generation reads the **latest successful graph**. Skip this section only
if sync + analysis are already current.

---

## 2. First-time docs (no `spec-*.md` yet)

`AGENT-DOC.md` may already exist from import. After parser analysis,
`AGENT-CODE.md` may also be present (seed). This section is only about the
**first docs generation** run.

1. Open **Documentation** (`/projects/{id}/docs`).
2. Set language **en** / **ru** in the right panel (default = portal locale).
3. Click **Download docs prompt** → save `AGENT-DOC.md`.
   - Requires a current successful analysis (blocked until then).
   - ODS fills ids, base URL, language, and starts AiJob `docs_from_es`
     (`running`).
4. Give that file to an external agent that can call HTTP:
   > Follow `AGENT-DOC.md` and build the project docs.
5. Wait until the right panel shows job **`succeeded`** and the tree lists
   `spec-*.md` (and optional thematic files).
6. Optional: click **Export** → zip with `docs/` + `es-data/` + README
   (`BASE_ES_URL` for the recipient). Enabled only when the docs job is
   `succeeded`.

**Checklist**

- [ ] Sync + parser analysis succeeded  
- [ ] Download docs prompt → `AGENT-DOC.md`
- [ ] Agent finished → job `succeeded`  
- [ ] (Optional) Export  

---

## 3. Rebuild docs (docs already exist)

Same flow as first-time. Default write mode is **overwrite**.

1. If the source or graph may be stale → do **§1 Resync** first (or refresh
   the graph via AI rebuild in §4, then regenerate docs from that graph).
2. Open **Documentation** → set language if needed.
3. Click **Download docs prompt** again.
   - Starts a **new** AiJob `docs_from_es`; a previous `running` docs job is
     superseded (`cancelled`).
   - Old docs `job_id` can no longer write or complete.
4. Run the external agent on the **new** `AGENT-DOC.md`.
5. On `succeeded`, existing `spec-*.md` paths are replaced; tree and summary
   refresh.
6. Export again if you need a fresh pack.

You do **not** delete docs by hand. Do **not** ask the agent to touch
`AGENT-DOC.md` or `AGENT-CODE.md`.

Debug-only: `versioned` + `generation_id` writes under `_generations/{id}/`
and leaves the current tree unchanged (not the usual path).

---

## 4. AI graph rebuild (alternate landscape from WC)

Use when the parser graph is incomplete for the tree and you want a full
Canon-shaped rebuild (Code / System / UI) with AI provenance. Same Graph View
product — last successful publish wins (parsers **or** AI), not a hybrid run.

### 4.1 Prerequisites

1. Successful **parser** analysis at least once (seeds `AGENT-CODE.md` in
   the docs tree and enables **Download code prompt**). Use §1 when the
   source or graph may be stale.
2. Cold import alone is not enough — no AI on import/sync; the button stays
   disabled until parser graph-ready success.

### 4.2 Download and run

1. Open **Documentation**.
2. Confirm dual controls: **Download docs prompt** and **Download code
   prompt**.
3. Click **Download code prompt** → save `AGENT-CODE.md`.
   - Starts AiJob `graph_from_wc` (`running`) and a new analysis run with
     `graph_builder=ai`.
   - Re-renders `AGENT-CODE.md` with live `CODE_JOB_ID` /
     `ANALYSIS_RUN_ID`.
   - A previous `running` **code** job is superseded; docs jobs are
     **not** cancelled (docs + code may both be `running`).
4. Give the file to an external agent that can call HTTP:
   > Follow `AGENT-CODE.md` and rebuild the project graph from the working
   > copy.
5. Agent lists/reads only job-scoped, Status-allowed WC paths (file size
   cap `AI_GRAPH_WC_MAX_FILE_BYTES`, default 1 MiB), posts Canon ingest
   batches, completes `succeeded` or `failed`.
6. Refresh **Graph View** — landscape from the AI run; badge **Built by AI**.
   Failed / cancelled / empty (zero nodes) / invalid kinds → previous
   successful graph unchanged.

### 4.3 Re-run after AI is current

Later code-downloads require any graph-ready run (parser or AI). First
code-download still requires a prior **parser** success in project history.

### 4.4 Status scope

Paths marked `not_needed` are omitted from parser inventory **and** AI WC
scope. File-tree Status labels stay `auto_found` / `needed` / `not_needed`
— they do **not** mean “found by AI”.

**Checklist**

- [ ] Parser analysis succeeded at least once  
- [ ] Download code prompt → `AGENT-CODE.md`  
- [ ] Agent finished → `graph_from_wc` `succeeded`  
- [ ] Graph View badge **Built by AI**; landscape present  

---

## Agent rules (short)

### Docs agent (`AGENT-DOC.md` / `docs_from_es`)

- Read **only** ODS REST (project, analysis, graph, docs, ai-jobs).
- Do **not** read the working copy; do **not** mutate the ES graph.
- Write Markdown via docs API with the **current** docs `job_id`.
- Keep ES names/ids; mark gaps as `GAP` / `UNKNOWN`.
- Complete the AiJob with `succeeded` or `failed` + a short summary.

### Code agent (`AGENT-CODE.md` / `graph_from_wc`)

- Read only job-scoped WC APIs and related AiJob/analysis endpoints in the
  prompt.
- Submit Canon in the **same** six-schema frame as parsers (Code / System /
  UI × node + edge); parser-parity depth, not System-only.
- Do **not** overwrite `AGENT-DOC.md` or `AGENT-CODE.md`.
- Do **not** spawn parsers; invalid/empty Canon must fail the job.
- Complete with `succeeded` or `failed` + a short summary.

---

## Related

| File | Role |
|------|------|
| `specs/015-project-docs/quickstart.md` | Docs (S2) implementer smoke |
| `specs/015-project-docs/spec.md` | Docs requirements |
| `specs/027-ai-graph-from-wc/quickstart.md` | AI graph (S1) operator smoke |
| `specs/027-ai-graph-from-wc/spec.md` | AI graph requirements |
| `prompts/docs-agent-prompt.md` | Rendered into project `AGENT-DOC.md` |
| `prompts/code-agent-prompt.md` | Rendered into project `AGENT-CODE.md` |
| [`manual-speckit-feature.md`](./manual-speckit-feature.md) | Full Spec Kit feature lifecycle |
| [`commands.md`](./commands.md) | Spec Kit commands + stack |
