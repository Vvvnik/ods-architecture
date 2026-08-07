# ODS user guide (pilot)

Short operator path: start the stack, import a demo, build the parser graph,
optionally generate docs or an AI graph. Details live in the linked manuals.

**Portal (Docker full profile):** http://localhost:8080  
**API health:** `curl -s http://localhost:8080/api/v1/health`

Portal UI uses an i18n locale catalog (current `en` default and `ru` via the
header switcher; more locales may be added the same way). API errors use
English `message` + `code`; the UI shows copy by `code`.

Root README covers clone, `.env`, Compose up/down. This page is day-to-day
use after the stack is up.

---

## 1. Start and stop

From the repository **root**:

```bash
cp docker/.env.example docker/.env   # once per machine
./docker/fixtures/repos/setup-fixtures.sh

docker compose -f docker/docker-compose.dev.yml --profile full up -d --build
```

Stop (keeps the Elasticsearch volume — indexed projects stay):

```bash
docker compose -f docker/docker-compose.dev.yml --profile full down
```

Do not add `-v` unless you intend to wipe ES data. After changing `parsers/`,
run the same `up -d --build` again (parsers are baked into the backend image).

Bare local (ES container + `npm run dev`): see [`commands.md`](./commands.md).

---

## 2. Demo repositories

Fixtures must be real Git repos (`git init` + commit). After clone:

```bash
./docker/fixtures/repos/setup-fixtures.sh          # required demos
./docker/fixtures/repos/setup-fixtures.sh --demo   # + perf-bulk, large-repo, ods-arch
# or: ./docker/fixtures/repos/setup-demo-repos.sh
```

In the container they appear as `/repos/<name>`. Default mount:
`LOCAL_REPOS_HOST_PATH=./fixtures/repos` in `docker/.env`. Full list and host
path tips: [`docker/fixtures/repos/README.md`](../../docker/fixtures/repos/README.md).

| Demo | Import `local_path` |
|------|---------------------|
| Quickstart | `/repos/sample-project` |
| System / HTTP / bus | `/repos/system-landscape-demo` |
| Java calls | `/repos/java-calls-demo` |
| Python HTTP + gRPC | `/repos/python-http-grpc-demo` |
| Dogfood ODS | `/repos/ods-arch` (after `--demo`) |
| Large / perf | `/repos/large-repo`, `/repos/perf-bulk` |

---

## 3. Import → Sync → Analysis → Graph

1. Open **http://localhost:8080** → **Import**.
2. **Local path** — use a `/repos/…` value from the table (or a host path
   under `LOCAL_REPOS_HOST_PATH` / `LOCAL_PATH_MAP`).
3. Open the project → **Sync** (refresh working copy / tree).
4. Run **Analysis** (parsers). Wait until it succeeds.
5. Open **Graph View** — System / Code (and UI when present). Badge
   **Built by parsers** after a parser run.

Cold import and first analysis always use the **parser** path. AI does not
run on import or sync.

---

## 4. Documentation (Markdown from the graph)

After a successful analysis:

1. Open **Documentation**.
2. **Download docs prompt** → `AGENT-DOC.md`.
3. Give the file to an external agent (ODS does not run the LLM).
4. When the AiJob is `succeeded`, browse `spec-*.md` in the docs tree;
   optional **Export**.

Step-by-step: [`manual-docs-create.md`](./manual-docs-create.md).

---

## 5. AI graph (optional rebuild from working copy)

Use when the parser landscape is incomplete and you want a full Canon rebuild
with AI provenance (same Graph View; last successful publish wins).

1. At least one successful **parser** analysis (gates **Download code
   prompt** and seeds `AGENT-CODE.md`).
2. **Documentation** → **Download code prompt** → `AGENT-CODE.md`.
3. External agent follows the prompt (job-scoped WC + Canon ingest).
4. Refresh **Graph View** — badge **Built by AI** on success.

Step-by-step: [`manual-ai-graph-create.md`](./manual-ai-graph-create.md).

---

## 6. Spec Kit (developing ODS itself)

Feature lifecycle in Cursor (`/speckit-*`):
[`manual-speckit-feature.md`](./manual-speckit-feature.md).  
Command list: [`commands.md`](./commands.md).

---

## Related

| Topic | File |
|-------|------|
| Clone, `.env`, Compose | [`README.md`](../../README.md) |
| Docs prompts (`AGENT-DOC`) | [`manual-docs-create.md`](./manual-docs-create.md) |
| AI graph prompts (`AGENT-CODE`) | [`manual-ai-graph-create.md`](./manual-ai-graph-create.md) |
| Spec Kit lifecycle | [`manual-speckit-feature.md`](./manual-speckit-feature.md) |
| Spec Kit / stack smoke commands | [`commands.md`](./commands.md) |
| Demo fixtures | [`docker/fixtures/repos/README.md`](../../docker/fixtures/repos/README.md) |
| Parsers | [`parsers/README.md`](../../parsers/README.md) |
