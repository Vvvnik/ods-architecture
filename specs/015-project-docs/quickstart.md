# Quickstart: Project documentation (015)

**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)  
**Contracts**: [contracts/](./contracts/)

## Prerequisites

- Stack: `docker compose -f docker/docker-compose.dev.yml --profile full up -d`
  (rebuild backend/frontend after implementation).
- Project imported with successful **full** analysis (always-full after
  prerequisite tasks).
- External agent capable of HTTP to `http://localhost:8080/api/v1` (or set
  `PUBLIC_API_BASE_URL`).

## 1. Import → Documentation seed

1. Import/open a project.
2. Menu → **Documentation** (`/projects/:id/docs`).

**Expect:** tree non-empty; `AGENT.md` visible; viewer opens it (SC-001).

## 2. Download prompt

1. Ensure analysis succeeded (graph-ready).
2. Right panel: choose language `en`/`ru` → **Download prompt**.

**Expect:** download of filled `AGENT.md`; properties show docs job `running`;
`ANALYSIS_RUN_ID` / `DOCS_JOB_ID` / `DOCS_LANGUAGE` populated (SC-002).
Without successful analysis → action blocked.

## 3. External agent (or fixture)

1. Run external agent with downloaded prompt **or** simulate with API:
   - read graph/summary via existing APIs;
   - `PUT` docs content with current `job_id` for
     `spec-{project}.md` + one child `spec-*.md` including Schema Mermaid;
   - `POST .../ai-jobs/:id/complete` `{ status: "succeeded", summary: "…" }`.

**Expect:** tree updates; properties show `succeeded` + summary; **Export**
enabled (SC-006 / SC-007).

## 4. Export-pack

1. With job `succeeded`, click **Export** (or
   `POST /api/v1/projects/{id}/docs/export`).

**Expect:** zip download `export-{projectId}-*.zip` with `docs/`, `es-data/`,
`README.md` (BASE_ES_URL guidance). While job is not succeeded, Export is
disabled / API returns `409 docs_export_not_ready`.

## 5. Supersede

1. Start Download prompt again while “agent” would still be running.
2. Attempt write/complete with **old** `job_id`.

**Expect:** old job `cancelled`; new job current; old write/complete → 409.

## 6. Prerequisite smoke (always-full / replace-after-success)

1. Run analysis twice successfully on the same project.
2. Confirm runs are full (not incremental-by-default).
3. Confirm graph UI/docs bind to latest graph-ready run; older run graph data
   removed or no longer serving as current after success (per research R2).

## Out of this quickstart

- In-ODS LLM
- Live Mermaid rendering perfection (fenced Schema presence is enough)
