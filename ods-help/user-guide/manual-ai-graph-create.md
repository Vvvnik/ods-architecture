# Manual: AI graph from working copy

**Feature**: `027-ai-graph-from-wc` (S1)  
**Prompt template**: `prompts/code-agent-prompt.md`  
**API base (local)**: `http://localhost:8080/api/v1`

Optional **full** Canon rebuild (Code / System / UI) from the working copy via
an **external** agent. ODS does **not** run the LLM. Same Graph View product
as parsers — last successful publish wins (parsers **or** AI), not a hybrid
run.

AI never runs on import or sync and is not an import toggle. Cold import and
the **first** analysis stay on the **parser** path.

Pilot overview: [`user-guide.md`](./user-guide.md).  
Docs from ES (`AGENT-DOC.md`): [`manual-docs-create.md`](./manual-docs-create.md).

---

## Before you start

1. Stack is up (`docker compose … --profile full`).
2. Project is imported; portal at `http://localhost:8080`.
3. At least one successful **parser** graph-ready analysis exists (seeds
   `AGENT-CODE.md` and enables **Download code prompt**).

| Artifact | Location |
|----------|----------|
| Code prompt template | `prompts/code-agent-prompt.md` |
| Code prompt | `docs/{projectId}/AGENT-CODE.md` (ODS-owned; seeded after first parser success; re-rendered on code-download) |
| Working copy | `working-copies/{projectId}/` — via job-scoped APIs only |

---

## 1. Resync when source changed

1. Open the project → **Sync**.
2. Run **Analysis** (parsers); wait for success.
3. Confirm **Graph View** shows a landscape (badge **Built by parsers**).

Skip only if sync + parser analysis are already current.

---

## 2. Download and run

1. Open **Documentation** (`/projects/{id}/docs`).
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

---

## 3. Re-run after AI is current

Later code-downloads require any graph-ready run (parser or AI). The **first**
code-download still requires a prior **parser** success in project history.

---

## 4. Status scope

Paths marked `not_needed` are omitted from parser inventory **and** AI WC
scope. File-tree Status labels stay `auto_found` / `needed` / `not_needed`
— they do **not** mean “found by AI”.

---

## Checklist

- [ ] Parser analysis succeeded at least once  
- [ ] Download code prompt → `AGENT-CODE.md`  
- [ ] Agent finished → `graph_from_wc` `succeeded`  
- [ ] Graph View badge **Built by AI**; landscape present  

---

## Agent rules (short)

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
| [`user-guide.md`](./user-guide.md) | Short pilot path |
| [`manual-docs-create.md`](./manual-docs-create.md) | Docs (`AGENT-DOC`) |
| `specs/027-ai-graph-from-wc/quickstart.md` | Implementer / operator smoke |
| `specs/027-ai-graph-from-wc/spec.md` | Requirements |
| `prompts/code-agent-prompt.md` | Rendered into project `AGENT-CODE.md` |
