# Contract: Agent prompts (027)

## Product templates (repo)

| Template | AiJob kind | Rendered project file |
|----------|------------|------------------------|
| `prompts/docs-agent-prompt.md` | `docs_from_es` | `docs/{projectId}/AGENT-DOC.md` |
| `prompts/code-agent-prompt.md` | `graph_from_wc` | `docs/{projectId}/AGENT-CODE.md` |

## Docs template updates

- Replace references to `AGENT.md` with `AGENT-DOC.md`.
- Keep ES-only read / Markdown write rules from `015`.

## Code template (S1 playbook) MUST state

1. Goal: build Canon graph from WC via ODS; provenance AI.
2. Read only job-scoped WC APIs; respect Status scope and
   `AI_GRAPH_WC_MAX_FILE_BYTES` (default 1 MiB).
3. Write only via job-bound graph ingest; no Markdown docs writes.
4. Do not mix with `docs_from_es`.
5. Invalid/unknown Canon → stop; ODS will fail the job.
6. Empty graph (zero nodes) will fail publish.
7. Progress + complete REST as AiJob contract.
8. Remove legacy “Parsers/AI import toggle” language.

## Portal UI

Two buttons (i18n en/ru), for example:

- Download docs prompt → docs download route  
- Download code prompt → code download route  

Code button enabled when prerequisite met per
[rest-graph-from-wc.md](./rest-graph-from-wc.md) (first: parser
graph-ready in history; subsequent: any graph-ready).
