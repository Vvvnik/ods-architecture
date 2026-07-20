# Spec Kit commands

## Design commands

* `/speckit-constitution` — set the project constitution;
* `/speckit-specify` — create/update `spec.md`;

* `/speckit.agent-context.update` — refresh the plan link in `.cursor/rules/specify-rules.mdc` (`SPECKIT START`/`END` block) from `.specify/feature.json`; does **not** change the persistent part of the rule. Run manually if the path was not filled after `/speckit-plan`; usually the hook does this after `/speckit-specify` and `/speckit-plan`. Until the feature has `plan.md`, the path may be missing or fall back to the previous plan — then use `feature.json` → `{feature_directory}/plan.md`.
* `/speckit-clarify` — clarify/check spec inconsistencies; required when resolving specification gaps;
* `/speckit-plan` — write the implementation plan — input for `/speckit-implement`;
* `/speckit-tasks` — generate tasks — input for `/speckit-implement`;
* `/speckit-analyze` — consistency check — use for the report and to inspect issues in the spec, tasks, and plan;
* `/speckit-checklist` — generate a checklist — report-only.

## Implementation commands

* `/speckit-implement` — execute tasks.

* `/speckit-converge` — append remaining tasks; always run after implement to verify everything is done.

## Extra commands

* `/speckit-taskstoissues` — convert tasks into GitHub issues.

**What `/speckit-taskstoissues` does:**

Takes lines from `specs/*/tasks.md` and creates GitHub Issues like `T048: Fix FileViewer…`.

Useful when:

– you work via the GitHub tracker (board, assignee, PR ↔ issue);
– several people share the tasks;
– you want history in the repo, not only in `tasks.md`.

Not needed when:

– you fix 1–2 bugs yourself in Cursor;
– you go converge → implement in one session.

## Running services

```bash
docker compose -f docker/docker-compose.dev.yml up -d elasticsearch
cd backend && npm run dev          # :3000
cd frontend && npm run dev         # :5173
```

Open http://localhost:5173/projects — import via `/import` (local path: `docker/fixtures/repos/sample-project`).

```bash
docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
curl http://localhost:8080/api/v1/health   # {"status":"ok","elasticsearch":"ok"}
# Verified via nginx: project register (/repos/sample-project), sync, tree, read src/hello.ts.
```

## Item 1: DELETE project

Specs: `002` first, then `003` (backend blocks frontend).

1. `/speckit-specify` on `specs/002-domain-model`
   → add FR: `DELETE /projects/{id}`, ES cascade
2. `/speckit-plan` on `specs/002-domain-model`
   → `openapi.yaml`, data-model
3. `/speckit-tasks` on `specs/002-domain-model`
4. `/speckit-implement` on `specs/002-domain-model`
   → backend
5. `/speckit-converge` on `specs/002-domain-model`
6. `/speckit-specify` on `specs/003-portal-mvp`
   → FR: Delete control, confirm, redirect
7. `/speckit-plan` on `specs/003-portal-mvp`
8. `/speckit-tasks` on `specs/003-portal-mvp`
9. `/speckit-implement` on `specs/003-portal-mvp`
   → frontend
10. `/speckit-converge` on `specs/003-portal-mvp`

## Item 2: Code analysis (005)

Specs: `005-code-analysis` (backend + parsers); graph consumer — `006-project-graph`.

Prerequisite: MVP `002`/`003` (sync, workspace, DELETE).

```bash
docker compose -f docker/docker-compose.dev.yml --profile full up -d
```

Recommended implement order:

1. `/speckit-implement specs/005-code-analysis` — US1–US4 (detector, modals, orchestrator, incremental)
2. `/speckit-implement specs/005-code-analysis` — US5 (parsers: typescript → csharp → python → cpp)
3. `/speckit-implement specs/005-code-analysis` — Phase 8 (DELETE cascade, api-consumer, quickstart)
4. `/speckit-converge specs/005-code-analysis`
5. `/speckit-implement specs/006-project-graph` — per `tasks.md` (ingest + API + graph UI)
6. `/speckit-converge specs/006-project-graph`

Analysis check (API): `specs/005-code-analysis/quickstart.md`  
E2E UI (optional): `cd frontend && npm run test:e2e` (stack on `:8080`, `E2E_PROJECT_PATH=/repos/sample-project`)

## Item: Scale pipeline (010)

After `009`: harden for large repos — one file inventory per sync, progress UI
(phase + parser N/M), parallel parsers, timing gates.

- Quickstart: `specs/010-scale-pipeline/quickstart.md`
- Fixture: `./docker/fixtures/repos/setup-fixtures.sh --demo` → `/repos/large-repo`
- Closing smoke on an **external** `local_path` — **do not** commit the baseline into ODS
- `skipIf` without fixture ≠ PASS (see `contracts/scale-acceptance.md`)
