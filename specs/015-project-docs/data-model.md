# Data model: Project documentation (015)

**Spec**: [spec.md](./spec.md)  
**Research**: [research.md](./research.md)

## Storage map

| Store | Role |
|-------|------|
| `DATA_ROOT/docs/{projectId}/` | Markdown docs + `AGENT.md` (FS) |
| `ods-ai-jobs` (ES) | AiJob status / progress / summary |
| Existing analysis + graph indices | **Read-only** sources for docs agent |
| `DATA_ROOT/working-copies/...` | **Must not** be read/written by docs agent |

## Project docs root (filesystem)

```text
docs/{projectId}/
  AGENT.md                 # ODS-owned; seeded on import; re-rendered on Download
  spec-{project-slug}.md   # root system map (after generation)
  {component}/
    spec-{component}.md
    contracts/ …           # only if ES evidence
    messaging/ …
    data/ …
    infrastructure/ …
    {child}/…
  _generations/{generationId}/…   # only when DOCS_WRITE_MODE=versioned
```

### Rules

- Paths relative to docs root; reject traversal outside root.
- `AGENT.md` reserved — agent MUST NOT create/delete/overwrite.
- Default write mode: overwrite same relative paths.
- Versioned mode: write only under `_generations/{id}/`; current tree untouched.
- On project DELETE: remove `docs/{projectId}/` with cascade cleanup.

### Component spec content (logical)

Every `spec-*.md`:

1. YAML/header: `project_id`, `analysis_run_id`, `docs_language`, optional
   `generation_id`
2. Purpose
3. Composition
4. Operation → **Schema** (Mermaid, this node’s scope)
5. Evidence: es-ref (index + id) + visible Fetch HTTP URL for important entities

Name/link consistency: prose ↔ Schema ↔ contracts/messaging MUST match ES
canonical names (spec FR-012/013).

## AiJob (`ods-ai-jobs`)

```text
AiJob {
  id: uuid                    # also DOCS_JOB_ID in AGENT.md
  project_id: uuid
  kind: "docs_from_es"        # reserve "graph_from_wc" for future S1
  status: running | succeeded | failed | cancelled
  # MVP: no `queued` — Download prompt creates `running` immediately
  analysis_run_id: uuid       # graph-ready run at Download time
  docs_language: "en" | "ru"
  docs_write_mode: overwrite | versioned
  docs_generation_id: string | null
  progress: { stage?: string, percent?: number, message?: string }
  summary: string | null      # agent-provided on complete
  provenance: {
    model_or_agent?: string
    started_at: datetime
    finished_at?: datetime
  }
  created_at, updated_at
}
```

### State transitions

```text
(none) --Download prompt--> running
running --Download again--> cancelled  (+ new running)
running --agent complete(ok/fail)--> succeeded | failed
running --cancel/supersede--> cancelled
cancelled --complete--> rejected (no status change)
cancelled --docs write--> rejected
```

**Current job:** the latest non-`cancelled` job for `(project_id, kind=docs_from_es)`
preferring `running`, else latest terminal (`succeeded`/`failed`) for UI display.

### Validation

- Download requires graph-ready analysis (`resolveLatestGraphRunId` non-null).
- Docs writes (non-AGENT) require `job_id` == current `running` job for project.
- Complete only if job `running` and is current; trust status payload (no quality gate).
- **Write modes (FR-016):** `overwrite` → under docs root excluding active
  `_generations/` writes as current tree; `versioned` → only under
  `_generations/{docs_generation_id}/`; missing id when versioned → reject.

## Analysis / graph prerequisite model (existing + behavior change)

| Concept | Change in `015` implement |
|---------|---------------------------|
| Analysis run | Always `incremental: false` (full) |
| Graph documents | After new run graph-ready, delete older runs’ nodes/edges for project |
| Docs binding | `analysis_run_id` = latest graph-ready at Download |

No new graph entity kinds for business-process diagrams (Mermaid in Markdown only).

## Relationships

```text
Project 1──* AiJob (docs_from_es)
Project 1──1 docs root (FS)
AiJob *──1 AnalysisRun (analysis_run_id at start)
AiJob 1──* docs file writes (authorized while running & current)
```
