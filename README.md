# ods-architecture

License: Apache 2.0 ([LICENSE](LICENSE))

**ODS** is a web portal for Git projects that combines synchronization, code browsing, analysis, a dependency graph, and Markdown documentation in one interface. The repository is built around **[GitHub Spec Kit](https://github.com/github/spec-kit)** and [Spec-Driven Development](https://github.com/github/spec-kit): idea → `spec.md` → `plan.md` → `tasks.md` → code in Cursor (`/speckit-*`).

**Stack:** TypeScript (Fastify + React), Elasticsearch, Docker Compose.

---

## Purpose

The project supports **browsing, analyzing, and documenting software architecture** **from Git repository source code**, providing centralized access to project structure, component dependencies, and related metadata without switching between separate tools.

The platform imports a repository, performs language analysis, builds a canonical graph in Elasticsearch, and displays the result in a web interface. Source files remain in the working copy; metadata and the graph are stored in Elasticsearch.

| Component | Purpose |
|-------|------------|
| **Portal** | Import / sync, file tree + Status, read-only browsing, Graph View (System / Code), Documentation |
| **Analysis** | Language detector → modular parsers (`parsers/`) → Canon in Elasticsearch (`graph_builder: parsers`) |
| **Docs / AI graph** | External agent via downloadable prompts: `AGENT-DOC.md` (docs from ES) and `AGENT-CODE.md` (optional full graph rebuild from WC) |
| **Spec Kit** | Requirements and tasks in `specs/`, executed by the Cursor agent through slash commands |

Requirements and the roadmap are not duplicated here. Canonical requirements: [`specs/**/spec.md`](specs/). Vision / closed features: [`specs/001-ods-vision/spec.md`](specs/001-ods-vision/spec.md).

---

## Repository structure

Code, specifications, and Spec Kit infrastructure are colocated; feature-specific details are always in the feature's `plan.md`.

| Path | Purpose |
|------|------------|
| `backend/`, `frontend/` | Portal API and SPA |
| `parsers/` | CLI parsers (see [`parsers/README.md`](parsers/README.md)) |
| `docker/` | Compose, `.env`, demo repositories |
| `specs/` | Specifications, plans, and tasks (SDD) |
| `.specify/`, `.cursor/` | Spec Kit and agent skills |
| `ods-help/` | User guide and drafts (non-canonical) |
| `prompts/` | Templates for `AGENT-DOC.md` / `AGENT-CODE.md` |

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

## Setup and run (demo / pilot)

After cloning, run the following from the repository **root** (Git + Docker Desktop).

**Before** `docker compose … up --build`:

```bash
cp docker/.env.example docker/.env          # .env is not in Git; create it from the example
./docker/fixtures/repos/setup-fixtures.sh   # git init in demo repositories (/repos/…)
```

### `docker/.env` (local only — not committed)

| Fact | Detail |
|------|--------|
| Git | `docker/.env` is **gitignored**. Only `docker/.env.example` is in the repo. |
| Per machine | Each Mac / Linux / Windows host needs its **own** `.env` (absolute mount paths differ). |
| Parsers | Shipped **inside the backend image** (`PARSERS_ROOT=/app/parsers`). Do not mount host `parsers/` for the pilot; after parser code changes, `up --build -d` again. |
| Fixtures | Default `LOCAL_REPOS_HOST_PATH=./fixtures/repos` → container `/repos/…`. Import `/repos/sample-project`. |
| Extra host repo | Set `LOCAL_REPOS_EXTRA_HOST_PATH` + `LOCAL_PATH_MAP` (see `.env.example`). Use forward slashes or `C:/…` on Windows; mapping splits on `:/` so drive letters work. |
| Apply changes | Editing `.env` requires recreating the backend container (`compose up -d` / recreate). Do that only when no long analysis/sync must stay undisturbed. |

Then:

```bash
docker compose -f docker/docker-compose.dev.yml --profile full up --build -d
```

Portal: **http://localhost:8080**. Parsers are built into the image with `--build`; after changing `parsers/`, run the same `up --build -d` command again.

Optional large demos (`perf-bulk`, `large-repo`, `ods-arch`): `./docker/fixtures/repos/setup-demo-repos.sh` (or `setup-fixtures.sh --demo`).

Fixtures in the container: `/repos/<name>`. Full list: [`docker/fixtures/repos/README.md`](docker/fixtures/repos/README.md).

**Bare local (no frontend container):** see [`ods-help/user-guide/commands.md`](ods-help/user-guide/commands.md) §Running services (`elasticsearch` + `npm run dev` on `:3000` / `:5173`).

---

## Verification

Verify that the API and Elasticsearch respond:

```bash
curl -s http://localhost:8080/api/v1/health
# {"status":"ok","elasticsearch":"ok"}
```

Open **http://localhost:8080** → **Import** → **Local path**:

| Demo | `local_path` |
|------|----------------|
| Quickstart (in container) | `/repos/sample-project` |
| System / HTTP / bus | `/repos/system-landscape-demo` |
| Java calls | `/repos/java-calls-demo` |
| Python HTTP + gRPC | `/repos/python-http-grpc-demo` |
| Dogfood ODS | `/repos/ods-arch` (after `setup-demo-repos.sh`) |
| Large / perf | `/repos/large-repo`, `/repos/perf-bulk` |
| Host path (optional) | Same absolute path as on disk **if** it falls under `LOCAL_REPOS_HOST_PATH` / `LOCAL_PATH_MAP` |

After import: **Sync** → **Analysis** → **Graph View** (System / dig-in; provenance badge parsers vs AI). Optional: **Documentation** → download `AGENT-DOC.md` / `AGENT-CODE.md` for an external agent ([manual](ods-help/user-guide/manual-docs-create.md)).

On Windows, prefer `C:/Users/…` (or backslashes) in `.env` mounts; Import may use the host path or `/repos-extra/…` after mapping.

---

## Stop

```bash
docker compose -f docker/docker-compose.dev.yml --profile full down
```

The Elasticsearch volume is not deleted, so indexed projects are preserved. Do not add `-v` if the data is needed.

---

## Spec Kit in Cursor

The standard workflow runs from a feature description to task-driven
implementation. Full lifecycle with **clarify/analyze agreement gates**,
converge, and close-out:
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

For the short command list and stack smoke, see
[`ods-help/user-guide/commands.md`](ods-help/user-guide/commands.md).

---

## Documentation

| Topic | File |
|------|------|
| Run / import / Spec Kit / analysis smoke | [`commands.md`](ods-help/user-guide/commands.md) |
| Docs + AI graph prompts (`AGENT-DOC` / `AGENT-CODE`) | [`manual-docs-create.md`](ods-help/user-guide/manual-docs-create.md) |
| Spec Kit feature lifecycle (draft → close-out) | [`manual-speckit-feature.md`](ods-help/user-guide/manual-speckit-feature.md) |
| Demo repositories `/repos/…` | [`docker/fixtures/repos/README.md`](docker/fixtures/repos/README.md) |
| Parser modules | [`parsers/README.md`](parsers/README.md) |
| SDD constitution | [`constitution.md`](.specify/memory/constitution.md) |
| Spec Kit (upstream) | [github.com/github/spec-kit](https://github.com/github/spec-kit) |
