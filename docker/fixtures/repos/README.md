# Test Git repositories for ODS MVP

This directory is mounted in the backend container as `/repos:ro` (see `docker/.env.example` and the volume in `docker-compose.dev.yml`).

**Host absolute paths:** set `LOCAL_REPOS_HOST_PATH` in `docker/.env` to the **absolute** host path of this directory (or a broader parent). Then Import accepts either `/repos/sample-project` **or** the same absolute host path. Optional second root: `LOCAL_REPOS_EXTRA_HOST_PATH` + `LOCAL_PATH_MAP` (see `.env.example`). On Windows use `C:/…` paths; `LOCAL_PATH_MAP` splits on `:/` so drive letters are safe. `docker/.env` is gitignored — each machine keeps its own copy.

## Directories

| Directory | In ODS Git? | Setup | Docker `local_path` |
|---------|------------|-----------------|------------------------|
| `sample-project/` | Files yes, `.git` no | `setup-fixtures.sh` | `/repos/sample-project` |
| `code-graph-depth-demo/` | Files yes | `setup-fixtures.sh` | `/repos/code-graph-depth-demo` |
| `graph-demo/` | Files yes | `setup-fixtures.sh` | `/repos/graph-demo` |
| `system-landscape-demo/` | Files yes | `setup-fixtures.sh` | `/repos/system-landscape-demo` |
| `api-routes-csharp-demo/` | Files yes | `setup-fixtures.sh` | `/repos/api-routes-csharp-demo` |
| `java-symbols-demo/` | Files yes | `setup-fixtures.sh` | `/repos/java-symbols-demo` |
| `java-http-webclient-demo/` | Files yes | `setup-fixtures.sh` | `/repos/java-http-webclient-demo` |
| `gradle-boot-demo/` | Files yes | `setup-fixtures.sh` | `/repos/gradle-boot-demo` |
| `java-bus-demo/` | Files yes | `setup-fixtures.sh` | `/repos/java-bus-demo` |
| `python-http-grpc-demo/` | Files yes | `setup-fixtures.sh` | `/repos/python-http-grpc-demo` |
| `perf-bulk/` | No | `setup-fixtures.sh --demo` | `/repos/perf-bulk` |
| `large-repo/` | No | `setup-fixtures.sh --demo` | `/repos/large-repo` |
| `ods-arch/` | No | `setup-fixtures.sh --demo` | `/repos/ods-arch` |

After cloning the parent repository, fixtures do not contain nested `.git` directories (which would make them submodules). The backend requires an actual Git repository for import; the scripts below initialize them.

## Setup after cloning

From the `ods-architecture` **root**:

```bash
# required fixtures (sample + 006/008/009); ods-arch only gets git init if its directory exists
./docker/fixtures/repos/setup-fixtures.sh

# + local demos: perf-bulk, large-repo, ods-arch
./docker/fixtures/repos/setup-fixtures.sh --demo

# equivalent to --demo:
./docker/fixtures/repos/setup-demo-repos.sh
```

| Script | Behavior |
|--------|------------|
| `setup-fixtures.sh` | Runs `git init` + an initial commit in `sample-project`, `code-graph-depth-demo`, `graph-demo`, `system-landscape-demo`, `api-routes-csharp-demo`, `java-symbols-demo`, `java-http-webclient-demo`, `gradle-boot-demo`, `java-bus-demo`, and `python-http-grpc-demo`; if `ods-arch/` exists without `.git`, it also runs `git init` there (without copying files) |
| `setup-fixtures.sh --demo` | Same, then invokes `setup-demo-repos.sh` |
| `setup-demo-repos.sh` | First runs `setup-fixtures.sh`, then **recreates** the demo repositories: generates `perf-bulk` and `large-repo`; for `ods-arch`, copies current `backend/`, `frontend/`, `parsers/`, and `docker/docker-compose.dev.yml` from the monorepo root (`rsync`, or `tar` fallback when `rsync` is missing — e.g. Git Bash on Windows; excludes `node_modules/`, `bin/`, `obj/`, `dist/`, etc.), then runs `git init` and commits |

## `sample-project`

Minimal repository for quickstart, pilot, and backend integration tests:

- `README.md` — text file for viewing in the portal
- `src/hello.ts` — sample source file (UTF-8)

### Usage

**Local backend** (`npm run dev`):

```bash
source_type: local_path
source_value: <absolute path>/docker/fixtures/repos/sample-project
```

**Backend in Docker** (`full` profile):

```bash
source_type: local_path
source_value: /repos/sample-project
```

## `code-graph-depth-demo` (spec 008)

C# + TypeScript demo for validating `calls` / `injects` after analysis:

- `csharp/Repo.cs`, `csharp/Service.cs` — `Create` → `Save`, ctor DI
- `typescript/save.ts`, `typescript/create.ts` — `create` → `save`

Details: [code-graph-depth-demo/README.md](./code-graph-depth-demo/README.md).

**Docker:** `local_path` = `/repos/code-graph-depth-demo`

```bash
curl -s -X POST http://localhost:3000/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{"source_type":"local_path","source_value":"/repos/code-graph-depth-demo","name":"008 Demo"}'
```

## `system-landscape-demo` (spec 009)

Compose + OpenAPI + appsettings + .NET + bus demo for the graph system layer:

- `docker-compose.yml`, `contracts/openapi.yaml`, `src/Api/appsettings.json`
- `*.csproj`, RabbitMQ handlers, and golden links in `backend/tests/fixtures/system-landscape/`

**Docker:** `local_path` = `/repos/system-landscape-demo`

## `graph-demo` (imports, 006)

Small TypeScript project with `imports` edges between modules (without `calls`).
Details: [graph-demo/README.md](./graph-demo/README.md). Docker: `/repos/graph-demo`.

## `ods-arch` (ODS dogfooding)

Local demo repository containing current ODS sources for importing a realistic multilingual tree into the portal.

- **Not** stored in ODS Git (see the root `.gitignore`).
- Regular `setup-fixtures.sh` **does not copy** files; it only runs `git init` if `ods-arch/` already exists.

### Creation (`setup-demo-repos.sh` / `--demo`)

1. Deletes the old `docker/fixtures/repos/ods-arch/`, if present.
2. Copies current paths from the monorepo root, preserving the real repository layout:
   - `backend/` → `ods-arch/backend/`
   - `frontend/` → `ods-arch/frontend/`
   - `parsers/` → `ods-arch/parsers/`
   - `docker/docker-compose.dev.yml` → `ods-arch/docker/docker-compose.dev.yml`
3. Excludes directories such as `node_modules/`, `bin/`, `obj/`, `dist/`, `build/`, `coverage/`, and `data/` during `rsync`.
4. Runs `git init` + an initial commit; without `.git`, the backend rejects the import.

```bash
./docker/fixtures/repos/setup-demo-repos.sh
# or:
./docker/fixtures/repos/setup-fixtures.sh --demo
```

**Docker:** `local_path` = `/repos/ods-arch`

```bash
curl -s -X POST http://localhost:3000/api/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{"source_type":"local_path","source_value":"/repos/ods-arch","name":"ODS Arch"}'
```

If the directory was copied manually without `.git`, run:

```bash
./docker/fixtures/repos/setup-fixtures.sh
```

## Demo repositories: `perf-bulk`, `large-repo`, `ods-arch`

These local directories are not stored in ODS Git. Create them with one script:

```bash
./docker/fixtures/repos/setup-demo-repos.sh
# equivalent: ./docker/fixtures/repos/setup-fixtures.sh --demo
```

| Directory | Creation | Docker import path | UI name |
|---------|----------------|-----------------|----------|
| `perf-bulk/` | Script **generates** ~520 `.txt` files → `git init` | `/repos/perf-bulk` | Perf Bulk |
| `large-repo/` | Script **generates** ≥1000 files (ts/cs/compose + pad) → `git init` | `/repos/large-repo` | Large Repo |
| `ods-arch/` | Script **copies** current `backend/`, `frontend/`, `parsers/`, and `docker/docker-compose.dev.yml` from the monorepo (excluding `node_modules`/`bin`/`obj`) → `git init` | `/repos/ods-arch` | ODS Arch |

**010 / SC-002:** DoD walk count uses `large-repo` (≥1000 files). A missing fixture is not a test PASS; create the demo first.

Empty `.txt`-only repositories are no longer the target: SC-003/SC-005 and parsers require the generated ts/cs/compose files in `large-repo`.

After running the script, register through the **Import** UI or API. Sync should complete with **Ready** status.

## Add a repository

1. Clone a repository or run `git init` in a new directory under `docker/fixtures/repos/`.
2. Verify that it is a Git repository with a `.git` directory.
3. Add at least one commit containing files.
4. Register it through the API (`POST /api/v1/projects`) or portal UI.

### Recommendations

- Use a **local path** for the pilot; Git URLs require network access and `git` in the backend container.
- Do not commit secrets or large binaries; Git fixtures are only for development and smoke tests.
- Load tests (`backend/tests/integration/*`) create repositories in temporary directories automatically.
- **`perf-bulk`**, **`large-repo`**, and **`ods-arch`** are local demos not stored in ODS Git; create them with `./docker/fixtures/repos/setup-fixtures.sh --demo`.

## Related documents

- [specs/002-domain-model/quickstart.md](../../specs/002-domain-model/quickstart.md)
- [specs/010-scale-pipeline/quickstart.md](../../specs/010-scale-pipeline/quickstart.md)
- [docker/docker-compose.dev.yml](../docker-compose.dev.yml)
