# Manual: project docs from the graph

**Feature**: `015-project-docs` (S2 — docs from ES)  
**Prompt template**: `prompts/docs-agent-prompt.md`  
**API base (local)**: `http://localhost:8080/api/v1`

ODS stores Markdown under `DATA_ROOT/docs/{projectId}/` and the Canon graph in
Elasticsearch. An **external** agent writes docs over REST. ODS does **not**
run the LLM.

Docs are built from the **latest successful graph** (parser or AI), not from
the working copy. For optional **AI graph rebuild** (`AGENT-CODE.md`), see
[`manual-ai-graph-create.md`](./manual-ai-graph-create.md). Pilot overview:
[`user-guide.md`](./user-guide.md).

**Two downloads on one Documentation panel.** Docs download needs a current
successful analysis (`015`). Code download needs a prior **parser**
graph-ready success at least once (`027`); details in the AI graph manual.

| Download | Prompt file | AiJob kind | Reads | Writes |
|----------|-------------|------------|-------|--------|
| **Download docs prompt** | `AGENT-DOC.md` | `docs_from_es` | ODS REST (ES graph) | Markdown docs |
| **Download code prompt** | `AGENT-CODE.md` | `graph_from_wc` | Job-scoped WC paths | Canon graph (AI provenance) |

---

## Before you start

1. Stack is up (`docker compose … --profile full`).
2. Project is imported.
3. You can reach the portal at `http://localhost:8080`.
4. A current successful analysis exists (parser or AI) so docs download is
   enabled.

| Artifact | Location |
|----------|----------|
| Docs prompt template | `prompts/docs-agent-prompt.md` |
| Docs prompt | `docs/{projectId}/AGENT-DOC.md` (ODS-owned; agents must not overwrite; seeded on import) |
| Generated docs | `docs/{projectId}/spec-*.md` (+ optional `contracts/`, …) |
| Working copy | Not used for docs generation |

---

## 1. Resync the project (when source changed)

Do this whenever the repo on disk changed and the graph should catch up.

1. Open the project in the portal.
2. Run **Sync** (project sync / refresh from source).
3. Wait until sync succeeds.
4. Start **Analysis** (parsers) and wait until it finishes successfully —
   or refresh the graph via AI rebuild
   ([`manual-ai-graph-create.md`](./manual-ai-graph-create.md)), then generate
   docs from that graph.
5. Confirm Graph View shows a current landscape and Documentation can see a
   current analysis run.

Docs generation reads the **latest successful graph**. Skip this section only
if sync + analysis are already current.

---

## 2. First-time docs (no `spec-*.md` yet)

`AGENT-DOC.md` may already exist from import. This section is only about the
**first docs generation** run.

1. Open **Documentation** (`/projects/{id}/docs`).
2. Set docs language **en** / **ru** in the right panel (default = portal
   locale). This chooses the language of generated Markdown from the current
   docs-language options (aligned with the portal locale catalog; may grow
   with it) — not a separate product stack.
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

- [ ] Sync + analysis succeeded (or AI graph current)  
- [ ] Download docs prompt → `AGENT-DOC.md`  
- [ ] Agent finished → job `succeeded`  
- [ ] (Optional) Export  

---

## 3. Rebuild docs (docs already exist)

Same flow as first-time. Default write mode is **overwrite**.

1. If the source or graph may be stale → do **§1 Resync** first.
2. Open **Documentation** → set docs language (**en** / **ru**) if needed.
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

## Agent rules (short)

- Read **only** ODS REST (project, analysis, graph, docs, ai-jobs).
- Do **not** read the working copy; do **not** mutate the ES graph.
- Write Markdown via docs API with the **current** docs `job_id`.
- Keep ES names/ids; mark gaps as `GAP` / `UNKNOWN`.
- Complete the AiJob with `succeeded` or `failed` + a short summary.

---

## Related

| File | Role |
|------|------|
| [`user-guide.md`](./user-guide.md) | Short pilot path |
| [`manual-ai-graph-create.md`](./manual-ai-graph-create.md) | AI graph (`AGENT-CODE`) |
| `specs/015-project-docs/quickstart.md` | Docs implementer smoke |
| `specs/015-project-docs/spec.md` | Docs requirements |
| `prompts/docs-agent-prompt.md` | Rendered into project `AGENT-DOC.md` |
| [`manual-speckit-feature.md`](./manual-speckit-feature.md) | Spec Kit feature lifecycle |
| [`commands.md`](./commands.md) | Spec Kit commands + stack |
