#!/usr/bin/env bash
# Prepare Git fixtures after git clone (the parent repository does not include nested .git directories).
#
# From the repository root:
#   ./docker/fixtures/repos/setup-fixtures.sh          # sample-project + demos 008/006/009
#   ./docker/fixtures/repos/setup-fixtures.sh --demo   # + perf-bulk, large-repo, ods-arch

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
WITH_DEMO=false

for arg in "$@"; do
  case "$arg" in
    --demo) WITH_DEMO=true ;;
    -h | --help)
      echo "Usage: $0 [--demo]"
      echo "  (no flags)    git init in sample-project, code-graph-depth-demo, graph-demo,"
      echo "               system-landscape-demo, api-routes-csharp-demo,"
      echo "               java-symbols-demo, java-calls-demo, java-http-webclient-demo, gradle-boot-demo,"
      echo "               java-bus-demo, python-http-grpc-demo;"
      echo "               ods-arch — only if the directory already exists"
      echo "  --demo        same + generate perf-bulk and large-repo, and copy ods-arch (setup-demo-repos.sh)"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

ensure_git_repo() {
  local dir="$1" msg="$2"
  local name
  name="$(basename "$dir")"

  if [[ ! -d "$dir" ]]; then
    echo "Error: directory does not exist: $dir" >&2
    exit 1
  fi

  if [[ -d "$dir/.git" ]]; then
    echo "✓ $name — already a Git repository"
    return 0
  fi

  echo "→ $name — git init…"
  (
    cd "$dir"
    git init -q
    git config user.email 'demo@ods.local'
    git config user.name 'ODS Demo'
    git add .
    git commit -q -m "$msg"
  )
  echo "✓ $name — ready"
}

ensure_git_repo "$ROOT/sample-project" 'sample project fixture'
ensure_git_repo "$ROOT/code-graph-depth-demo" '008 code-graph-depth demo (C# + TS)'
ensure_git_repo "$ROOT/graph-demo" 'graph demo TypeScript imports'
ensure_git_repo "$ROOT/system-landscape-demo" '009 system landscape demo'
ensure_git_repo "$ROOT/api-routes-csharp-demo" '013 api routes from code (C# controller + MapGet)'
ensure_git_repo "$ROOT/java-symbols-demo" '018 java symbols demo (module + namespace + types)'
ensure_git_repo "$ROOT/java-calls-demo" '023 java language calls demo (multi-module)'
ensure_git_repo "$ROOT/java-http-webclient-demo" '019 java http calls WebClient+Feign demo'
ensure_git_repo "$ROOT/gradle-boot-demo" '019 gradle-project Boot+library demo'
ensure_git_repo "$ROOT/java-bus-demo" '019 java bus-rabbit AMQP demo'
ensure_git_repo "$ROOT/python-http-grpc-demo" '025 Python HTTP and gRPC demo'

# ods-arch is not committed to ODS Git; setup-demo-repos.sh / --demo creates it.
# If the directory already exists (manual copy), only run git init (not with --demo, which rebuilds it).
if [[ "$WITH_DEMO" != true ]]; then
  if [[ -d "$ROOT/ods-arch" ]]; then
    ensure_git_repo "$ROOT/ods-arch" 'ods-arch dogfood demo (ODS sources)'
  else
    echo "○ ods-arch — directory missing (create with: $0 --demo)"
  fi
fi

if [[ "$WITH_DEMO" == true ]]; then
  exec "$ROOT/setup-demo-repos.sh"
fi

echo ""
echo "Import into Docker (local_path): /repos/sample-project"
echo "Demo 008 (C#+TS):               /repos/code-graph-depth-demo"
echo "Demo 009 (system):              /repos/system-landscape-demo"
echo "Demo 013 (API from C# code):    /repos/api-routes-csharp-demo"
echo "Demo 018 (Java symbols):        /repos/java-symbols-demo"
echo "Demo 019 (Java WebClient):      /repos/java-http-webclient-demo"
echo "Demo 019 (Gradle Boot):         /repos/gradle-boot-demo"
echo "Demo 019 (Java bus AMQP):       /repos/java-bus-demo"
echo "Demo 025 (Python HTTP/gRPC):    /repos/python-http-grpc-demo"
echo "Optional demo repositories: $0 --demo  (or ./docker/fixtures/repos/setup-demo-repos.sh)"
echo "  → perf-bulk, large-repo, ods-arch"
