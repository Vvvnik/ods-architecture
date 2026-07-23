# ods-architecture

License: Apache 2.0 ([LICENSE](LICENSE))

**ODS** is a web portal for Git projects that combines synchronization, code browsing, analysis, and a dependency graph in one interface. The repository is built around **[GitHub Spec Kit](https://github.com/github/spec-kit)** and [Spec-Driven Development](https://github.com/github/spec-kit): idea → `spec.md` → `plan.md` → `tasks.md` → code in Cursor (`/speckit-*`).

**Stack:** TypeScript (Fastify + React), Elasticsearch, Docker Compose.

---

## Purpose

The project supports **browsing, analyzing, and documenting software architecture** **from Git repository source code**, providing centralized access to project structure, component dependencies, and related metadata without switching between separate tools.

The platform imports a repository, performs language analysis, builds a canonical graph in Elasticsearch, and displays the result in a web interface. Source files remain in the working copy; metadata and the graph are stored in Elasticsearch.

| Component | Purpose |
|-------|------------|
| **Portal** | Import and sync, file tree, read-only browsing, Graph UI |
| **Analysis** | Language detector → modular parsers (`parsers/`) → canonical model in Elasticsearch |
| **Spec Kit** | Requirements and tasks in `specs/`, executed by the Cursor agent through slash commands |

Requirements and the roadmap are not duplicated here. The canonical requirements are in [`specs/**/spec.md`](specs/), and the vision is in [`specs/001-ods-vision/spec.md`](specs/001-ods-vision/spec.md).

---

## Repository structure

Code, specifications, and Spec Kit infrastructure are colocated; feature-specific details are always in the feature's `plan.md`.

| Path | Purpose |
|------|------------|
| `backend/`, `frontend/` | Portal API and SPA |
| `parsers/` | CLI parsers (TypeScript, C#, Python, C++) |
| `docker/` | Compose, `.env`, demo repositories |
| `specs/` | Specifications, plans, and tasks (SDD) |
| `.specify/`, `.cursor/` | Spec Kit and agent skills |
| `ods-help/` | User guide and drafts (non-canonical) |

---

## Prerequisites

Git and Docker are sufficient for a Docker-based pilot. Node.js and Cursor are required for local development or an SDD workflow.

| Component | Purpose |
|-----------|--------|
| **Git** | Cloning and fixtures |
| **Docker Compose** v2 | Run Elasticsearch + backend + frontend |
| **Node.js 20+** | Local `npm run dev` without Docker |
| **Cursor** | Spec Kit slash commands (`cursor-agent`, v0.11.9) |

---

## Clone

```bash
git clone git@gitlab.com:vvvnik/ods-architecture.git
cd ods-architecture
```

---

## Setup and run

After cloning, run the following from the repository **root** (Git + Docker Desktop).

**Before** `docker compose … up --build`:

```bash
cp docker/.env.example docker/.env          # .env is not in Git; create it from the example
./docker/fixtures/repos/setup-fixtures.sh   # git init in demo repositories (/repos/…)
```

Then:

```bash
docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
```

Portal: **http://localhost:8080**. Parsers are built into the image with `--build`; after changing `parsers/`, run the same `up --build -d` command again.

Optional large demos (`perf-bulk`, `large-repo`, `ods-arch`): `./docker/fixtures/repos/setup-demo-repos.sh` (or `setup-fixtures.sh --demo`).

Fixtures in the container: `/repos/<name>`. See [`docker/fixtures/repos/README.md`](docker/fixtures/repos/README.md).

---

## Verification

Verify that the API and Elasticsearch respond:

```bash
curl -s http://localhost:8080/api/v1/health
# {"status":"ok","elasticsearch":"ok"}
```

Open **http://localhost:8080** → **Import** → **Local path** (the path is **inside the container**, not on the Mac):

| Demo | `local_path` |
|------|----------------|
| Quickstart | `/repos/sample-project` |
| Dogfood ODS | `/repos/ods-arch` (after `setup-demo-repos.sh`) |
| Large / perf | `/repos/large-repo`, `/repos/perf-bulk` |

---

## Stop

```bash
docker compose -f docker/docker-compose.dev.yml --profile full down
```

The Elasticsearch volume is not deleted, so indexed projects are preserved. Do not add `-v` if the data is needed.

---

## Spec Kit in Cursor

The standard workflow runs from a feature description to task-driven implementation:

| Step | Command |
|-----|---------|
| Specification | `/speckit-specify` |
| Plan | `/speckit-plan` |
| Tasks | `/speckit-tasks` |
| Implementation | `/speckit-implement` |

For the full list, including `analyze`, `converge`, and `agent-context.update`, see [`ods-help/user-guide/commands.md`](ods-help/user-guide/commands.md).

---

## Documentation

For more detail, see:

| Topic | File |
|------|------|
| Run, import, troubleshooting | [`commands-run-project.md`](ods-help/user-guide/commands-run-project.md) |
| Demo repositories `/repos/…` | [`docker/fixtures/repos/README.md`](docker/fixtures/repos/README.md) |
| MVP architecture | [`architecture.md`](ods-help/user-guide/architecture.md) |
| SDD constitution | [`constitution.md`](.specify/memory/constitution.md) |
| Spec Kit (upstream) | [github.com/github/spec-kit](https://github.com/github/spec-kit) |
