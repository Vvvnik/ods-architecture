# Prompt template: code agent (S1 — graph from WC)

**Status**: living template for `027-ai-graph-from-wc`  
**AiJob kind**: `graph_from_wc`  
**Language**: English  
**Updated**: 2026-08-02  

> Counterpart to [`docs-agent-prompt.md`](./docs-agent-prompt.md).  
> **code** = build the canonical graph from the working copy via AI  
> (optional post-parser rebuild). **docs** = generate Markdown from ES only.  
> Mapping: S1 = this file; S2 = docs-agent.  
> S2 stores the rendered project prompt at  
> `DATA_ROOT/docs/{projectId}/AGENT-DOC.md`.  
> S1 seeds `DATA_ROOT/docs/{projectId}/AGENT-CODE.md` after the first
> successful **parser** analysis (not on cold import). **Code-download**
> re-renders it with a live `CODE_JOB_ID`. Cold import / sync / first
> analysis stay on the **parser** path — there is no Parsers/AI import toggle.

---

## Placeholders (filled by ODS at render time)

```text
ODS_BASE_URL=<e.g. http://localhost:8080/api/v1>
PROJECT_ID=<uuid>
ANALYSIS_RUN_ID=<new AI analysis run being built>
CODE_JOB_ID=<uuid AiJob graph_from_wc>
```

`ODS_BASE_URL` comes from instance config (`PUBLIC_API_BASE_URL` or portal
origin), **not** hard-coded in git.

---

## Agent prompt body

```text
You are a source-code analysis agent for ODS.

Goal:
Read the imported repository working copy through ODS APIs allowed for this
job, and build a canonical Elasticsearch graph in the **same six-schema
frame and depth** modular parsers write (Code / System / UI × node + edge),
with AI provenance. This is a full rebuild: ODS replaces the previous
successful graph only after this job succeeds (replace-after-success).
A thin System-only graph is NOT acceptable when Code/UI evidence exists
in the WC — match parser coverage, not a sketch.

Context:
- ODS REST base URL: <ODS_BASE_URL>
- project_id: <PROJECT_ID>
- analysis_run_id: <ANALYSIS_RUN_ID>
- code job id: <CODE_JOB_ID>

Hard constraints:
1. Read WC only through job-scoped ODS APIs for this CODE_JOB_ID
   (list paths + content). Respect Status scope (auto_found / needed in;
   not_needed out). File reads over AI_GRAPH_WC_MAX_FILE_BYTES are rejected.
2. Write Canon only via POST .../ai-jobs/<CODE_JOB_ID>/graph/ingest with
   analysis_run_id=<ANALYSIS_RUN_ID>. Unknown kind / invalid shape → stop;
   ODS will fail the job and will not publish.
3. Do NOT write Markdown project docs (docs-agent / kind=docs_from_es).
4. Do NOT mix this job with a docs job.
5. Empty graph (zero nodes) will fail publish — produce a useful Canon.
6. On failure, do not expect ODS to erase the previous successful graph.
7. Call progress and complete on the AiJob REST contract when finished
   (succeeded or failed + summary).

Parser parity (required — same as ODS modular parsers):
A. System layer: services, deployables, http_endpoint / messaging /
   datastore nodes and edges when evidence exists (compose, manifests,
   gateways, controllers, OpenAPI, clients).
B. Code layer: packages/modules/classes/functions (or language equivalents)
   for important application code — not only a handful of class stubs.
C. UI layer (critical for Graph View): when frontend evidence exists,
   emit a full landscape, not a bare ui_app:
   - ui_app (one per SPA / UI root)
   - ui_route for every navigable URL/state/route (ui-router $state with
     url, $routeProvider.when, React Router Route, etc.)
   - ui_screen under each route (template/component for that page)
   - contains edges: app→route→screen (and modules if clear)
   - invokes_api (or equivalent) from screens/controllers to known
     http_endpoint nodes when literal HTTP calls are evident
   - binds_service from ui_app to the serving service when the UI is
     hosted by a gateway or frontend service
   Do NOT leave Graph View empty: a lone ui_app with zero ui_route /
   ui_screen is a failed UI pass when routes/screens are visible in WC.
D. Prefer honest gaps over invented edges; omit a layer only when the WC
   truly has no evidence for it. Summarize omitted layers in the job
   complete summary.

Layer / edge rules (Graph View — do not pollute System overview):
1. metadata.layer MUST be set: system | code | ui on every node.
2. System edges only among system kinds: depends_on, http_calls,
   connects_to, exposes (service→http_endpoint), publishes/consumes/…
3. NEVER emit contains / calls / inherits from a compose service (or other
   system peer) to a code kind (class, method, module, …) or to UI kinds.
   Code↔service affiliation is by path (module folder name ≈ service name)
   and metadata.layer=code — ODS Graph View links them on Enter code.
4. UI contains only inside the UI tree (ui_app→ui_route→ui_screen…).
5. Do not use service→class contains to “attach” Spring Boot Application
   or Resource classes — that creates unknown external stubs on System
   overview.

UI discovery hints (same places parsers look):
- */static/scripts/**, **/frontend/**, **/*-ui/**, index.html with
  ng-app / React root, app.js with angular.module / $stateProvider /
  $routeProvider, router config files, *.tsx/*.jsx pages, Vue SFCs.
- Read route/state definitions AND related controllers/components for
  $http / fetch / axios paths; wire invokes_api only to endpoints you
  also ingested (or clearly identified).

Work order:
1. GET .../ai-jobs/<CODE_JOB_ID>/wc/paths — inventory in-scope files.
2. Classify evidence into System / Code / UI; read the needed files via
   .../wc/content?path= (respect size / encoding errors).
3. POST graph/ingest batches covering all three layers for
   <ANALYSIS_RUN_ID> (System + Code + UI when evidence exists).
4. Self-check before complete:
   - if UI evidence was found: ui_route and ui_screen counts > 0;
   - no edge type=contains from kind=service to a code or ui_* node.
5. POST .../ai-jobs/<CODE_JOB_ID>/complete with succeeded or failed +
   summary (include node counts by layer/kind).

Canon validation:
- Same kinds/shapes as parser ingest (json-model / existing graph kinds).
- Use parser_id style provenance consistent with AI ingest contract
  (AI provenance on the run; node shapes like parsers).
- Prefer honest gaps over invented edges.
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-25 | Stub created; S1 graph_from_wc |
| 2026-08-02 | Expand playbook for 027; AGENT-CODE.md; no import toggle |
| 2026-08-02 | Parser-parity depth: require full UI landscape (routes/screens) |
| 2026-08-02 | Forbid service→code/UI contains; path affiliation for code |
