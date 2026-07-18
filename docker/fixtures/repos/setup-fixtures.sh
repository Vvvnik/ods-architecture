#!/usr/bin/env bash
# Подготовка git-фикстур после git clone (каталог .git не в родительском репозитории).
#
# Из корня репозитория:
#   ./docker/fixtures/repos/setup-fixtures.sh          # sample-project + демо 008/006/009
#   ./docker/fixtures/repos/setup-fixtures.sh --demo   # + perf-bulk, large-repo, ods-arch

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
WITH_DEMO=false

for arg in "$@"; do
  case "$arg" in
    --demo) WITH_DEMO=true ;;
    -h | --help)
      echo "Usage: $0 [--demo]"
      echo "  (без флагов)  git init в sample-project, code-graph-depth-demo, graph-demo,"
      echo "               system-landscape-demo, api-routes-csharp-demo;"
      echo "               ods-arch — только если каталог уже есть"
      echo "  --demo        то же + генерация perf-bulk, large-repo и копия ods-arch (setup-demo-repos.sh)"
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
    echo "Ошибка: нет каталога $dir" >&2
    exit 1
  fi

  if [[ -d "$dir/.git" ]]; then
    echo "✓ $name — уже git-репозиторий"
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
  echo "✓ $name — готов"
}

ensure_git_repo "$ROOT/sample-project" 'sample project fixture'
ensure_git_repo "$ROOT/code-graph-depth-demo" '008 code-graph-depth demo (C# + TS)'
ensure_git_repo "$ROOT/graph-demo" 'graph demo TypeScript imports'
ensure_git_repo "$ROOT/system-landscape-demo" '009 system landscape demo'
ensure_git_repo "$ROOT/api-routes-csharp-demo" '013 api routes from code (C# controller + MapGet)'

# ods-arch не коммитится в ODS git: создаётся setup-demo-repos.sh / --demo.
# Если каталог уже есть (ручная копия) — только git init (не при --demo: там пересборка).
if [[ "$WITH_DEMO" != true ]]; then
  if [[ -d "$ROOT/ods-arch" ]]; then
    ensure_git_repo "$ROOT/ods-arch" 'ods-arch dogfood demo (ODS sources)'
  else
    echo "○ ods-arch — нет каталога (создать: $0 --demo)"
  fi
fi

if [[ "$WITH_DEMO" == true ]]; then
  exec "$ROOT/setup-demo-repos.sh"
fi

echo ""
echo "Импорт в Docker (local_path): /repos/sample-project"
echo "Демо 008 (C#+TS):            /repos/code-graph-depth-demo"
echo "Демо 009 (system):           /repos/system-landscape-demo"
echo "Демо 013 (API из кода C#):   /repos/api-routes-csharp-demo"
echo "Опционально демо-репозитории: $0 --demo  (или ./docker/fixtures/repos/setup-demo-repos.sh)"
echo "  → perf-bulk, large-repo, ods-arch"
