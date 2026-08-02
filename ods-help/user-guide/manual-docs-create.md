# Manual: create and refresh project docs

**Feature**: `015-project-docs`  
**Prompt template**: `prompts/docs-agent-prompt.md`  
**API base (local)**: `http://localhost:8080/api/v1`

ODS stores Markdown under `DATA_ROOT/docs/{projectId}/` and keeps the graph in
Elasticsearch. An **external** agent writes the docs over REST. ODS does **not**
run the LLM.

---

## Before you start

1. Stack is up (`docker compose … --profile full`).
2. Project is imported.
3. You can reach the portal at `http://localhost:8080`.

| Artifact | Location |
|----------|----------|
| Prompt template | `prompts/docs-agent-prompt.md` |
| Docs prompt | `docs/{projectId}/AGENT-DOC.md` (ODS-owned — agents must not overwrite) |
| Code prompt | `docs/{projectId}/AGENT-CODE.md` (ODS-owned — created by code download only) |
| Generated docs | `docs/{projectId}/spec-*.md` (+ optional `contracts/`, …) |
| Working copy | `working-copies/{projectId}/` — **not** used for docs generation |

---

## 1. Resync the project (when source changed)

Do this whenever the repo on disk changed and the graph should catch up.

1. Open the project in the portal.
2. Run **Sync** (project sync / refresh from source).
3. Wait until sync succeeds.
4. Start **Analysis** and wait until it finishes successfully (full run).
5. Confirm Graph / Documentation can see a current analysis run.

Docs are built from the **latest successful graph**, not from the working copy.
Skip this section only if sync + analysis are already current.

---

## 2. First-time docs (tree has only `AGENT-DOC.md` or is empty)

1. Open **Documentation** (`/projects/{id}/docs`).
2. Set language **en** / **ru** in the right panel (default = portal locale).
3. Click **Download docs prompt** → save `AGENT-DOC.md`.
   - ODS fills ids, base URL, language, and starts AiJob `docs_from_es` (`running`).
4. Give that file to an external agent (Cursor, Claude Code, …) that can call HTTP:
   > Follow `AGENT-DOC.md` and build the project docs.
5. Wait until the right panel shows job **`succeeded`** and the tree lists
   `spec-*.md` (and optional thematic files).
6. Optional: click **Export** → zip with `docs/` + `es-data/` + README
   (`BASE_ES_URL` for the recipient). Enabled only when the job is `succeeded`.

**Checklist**

- [ ] Sync + analysis succeeded  
- [ ] Download docs prompt → `AGENT-DOC.md`
- [ ] Agent finished → job `succeeded`  
- [ ] (Optional) Export  

---

## 3. Rebuild docs (docs already exist)

Same flow as first-time. Default write mode is **overwrite**.

1. If the source or graph may be stale → do **§1 Resync** first.
2. Open **Documentation** → set language if needed.
3. Click **Download docs prompt** again.
   - Starts a **new** AiJob; a previous `running` job is superseded (`cancelled`).
   - Old `job_id` can no longer write or complete.
4. Run the external agent on the **new** `AGENT-DOC.md`.
5. On `succeeded`, existing `spec-*.md` paths are replaced; tree and summary refresh.
6. Export again if you need a fresh pack.

You do **not** delete docs by hand. Do **not** ask the agent to touch `AGENT-DOC.md`.

Debug-only: `versioned` + `generation_id` writes under `_generations/{id}/` and
leaves the current tree unchanged (not the usual path).

---

## Agent rules (short)

- Read **only** ODS REST (project, analysis, graph, docs, ai-jobs).
- Do **not** read the working copy; do **not** mutate the ES graph.
- Write Markdown via docs API with the **current** `job_id`.
- Keep ES names/ids; mark gaps as `GAP` / `UNKNOWN`.
- Complete the AiJob with `succeeded` or `failed` + a short summary.

---

## Code graph prompt

After a parser-built graph is ready, **Download code prompt** creates
`AGENT-CODE.md` and starts a separate `graph_from_wc` job. Give that file to an
external code agent. It reads only the job-scoped, Status-allowed working-copy
paths and submits Canon graph batches. It must not overwrite either prompt file.

---

## Related

| File | Role |
|------|------|
| `specs/015-project-docs/quickstart.md` | Implementer smoke path |
| `specs/015-project-docs/spec.md` | Requirements |
| `prompts/docs-agent-prompt.md` | Prompt rendered into project `AGENT-DOC.md` |
