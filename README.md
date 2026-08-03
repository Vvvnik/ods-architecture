# ods-architecture

License: Apache 2.0 ([LICENSE](LICENSE))

**ODS** is a web portal for Git projects that combines synchronization, code browsing, analysis, a dependency graph, and Markdown documentation in one interface. The repository is built around **[GitHub Spec Kit](https://github.com/github/spec-kit)** and [Spec-Driven Development](https://github.com/github/spec-kit): idea → `spec.md` → `plan.md` → `tasks.md` → code in Cursor (`/speckit-*`).

**Stack:** TypeScript (Fastify + React), Elasticsearch, Docker Compose.

**Pilot how-to** (import, demos, graphs, docs, AI graph): [`ods-help/user-guide/user-guide.md`](ods-help/user-guide/user-guide.md).

---

## Purpose

Browse, analyze, and document software architecture **from Git source**: import a repository, run language analysis, store a canonical graph in Elasticsearch, and use the portal for tree, Graph View, and docs. Source stays in the working copy; metadata and the graph live in Elasticsearch.

| Component | Purpose |
|-------|------------|
| **Portal** | Import / sync, file tree + Status, browsing, Graph View, Documentation |
| **Analysis** | Detector → `parsers/` → Canon in ES (`graph_builder: parsers`) |
| **Docs / AI graph** | External agent via `AGENT-DOC.md` (docs from ES) and `AGENT-CODE.md` (optional WC graph rebuild) |
| **Spec Kit** | Requirements in `specs/`, Cursor `/speckit-*` |

Canonical requirements: [`specs/**/spec.md`](specs/). Vision: [`specs/001-ods-vision/spec.md`](specs/001-ods-vision/spec.md).

---

## Repository structure

| Path | Purpose |
|------|------------|
| `backend/`, `frontend/` | Portal API and SPA |
| `parsers/` | CLI parsers ([`parsers/README.md`](parsers/README.md)) |
| `docker/` | Compose, `.env`, demo repositories |
| `specs/` | Specifications, plans, tasks (SDD) |
| `.specify/`, `.cursor/` | Spec Kit and agent skills |
| `ods-help/` | User guide and drafts (non-canonical) |
| `prompts/` | Templates for `AGENT-DOC.md` / `AGENT-CODE.md` |

---

## Prerequisites

| Component | Purpose |
|-----------|--------|
| **Git** | Cloning and fixtures |
| **Docker Compose** v2 | Elasticsearch + backend + frontend |
| **Node.js 20+** | Local `npm run dev` without Docker |
| **Cursor** | Spec Kit slash commands (`cursor-agent`, v0.11.9) |

Git + Docker are enough for the Docker pilot.

---

## Clone

```bash
git clone git@gitlab.com:vvvnik/ods-architecture.git
cd ods-architecture
```

---

## Setup and run (Docker pilot)

From the repository **root**:

```bash
cp docker/.env.example docker/.env
./docker/fixtures/repos/setup-fixtures.sh

docker compose -f docker/docker-compose.dev.yml --profile full up -d --build
```

Portal: **http://localhost:8080**.

```bash
curl -s http://localhost:8080/api/v1/health
# {"status":"ok","elasticsearch":"ok"}
```

### Stop

```bash
docker compose -f docker/docker-compose.dev.yml --profile full down
```

The Elasticsearch volume is kept (projects remain). Do not add `-v` unless you want to wipe data.

### `docker/.env` (local only — not committed)

| Fact | Detail |
|------|--------|
| Git | Only `docker/.env.example` is in the repo; `.env` is gitignored |
| Per machine | Each host needs its own `.env` (mount paths differ) |
| Parsers | Inside the backend image (`PARSERS_ROOT=/app/parsers`); after parser edits, `up -d --build` again |
| Fixtures | Default `LOCAL_REPOS_HOST_PATH=./fixtures/repos` → `/repos/…` in the container |
| Extra host repo | `LOCAL_REPOS_EXTRA_HOST_PATH` + `LOCAL_PATH_MAP` (see `.env.example`) |
| Apply `.env` edits | Recreate the backend container (`compose up -d`) when no long job must stay undisturbed |

Day-to-day: demos, import, Sync → Analysis → Graph View, docs and AI graph — [`user-guide.md`](ods-help/user-guide/user-guide.md).

Bare local (no frontend container): [`commands.md`](ods-help/user-guide/commands.md) §Running services.

---

## Spec Kit in Cursor

Full lifecycle (clarify/analyze gates, converge, close-out):
[`manual-speckit-feature.md`](ods-help/user-guide/manual-speckit-feature.md).

| Step | Command |
|-----|---------|
| Specification | `/speckit-specify` |
| Clarify (agree answers) | `/speckit-clarify` |
| Plan | `/speckit-plan` |
| Tasks | `/speckit-tasks` |
| Analyze (agree findings) | `/speckit-analyze` |
| Implementation | `/speckit-implement` |
| Converge | `/speckit-converge` |

---

## Documentation

| Topic | File |
|------|------|
| **Pilot user guide** (start/stop, demos, import, graphs, docs) | [`user-guide.md`](ods-help/user-guide/user-guide.md) |
| Docs from graph (`AGENT-DOC`) | [`manual-docs-create.md`](ods-help/user-guide/manual-docs-create.md) |
| AI graph from WC (`AGENT-CODE`, 027) | [`manual-ai-graph-create.md`](ods-help/user-guide/manual-ai-graph-create.md) |
| Spec Kit feature lifecycle | [`manual-speckit-feature.md`](ods-help/user-guide/manual-speckit-feature.md) |
| Spec Kit / stack smoke commands | [`commands.md`](ods-help/user-guide/commands.md) |
| Demo repositories `/repos/…` | [`docker/fixtures/repos/README.md`](docker/fixtures/repos/README.md) |
| Parser modules | [`parsers/README.md`](parsers/README.md) |
| SDD constitution | [`constitution.md`](.specify/memory/constitution.md) |
| Spec Kit (upstream) | [github.com/github/spec-kit](https://github.com/github/spec-kit) |
