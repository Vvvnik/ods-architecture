#!/usr/bin/env bash
# Generate local demo repositories (not stored in ODS Git):
#   - perf-bulk (~520 .txt)
#   - large-repo (≥1000 files: ts/cs/compose + pad)
#   - ods-arch (copy of ODS sources: backend + frontend + parsers — dogfood)
#
# Large Repo (010): not only .txt, but also .ts / .cs / compose (+ appsettings),
# so sync+walk, the detector, parsers, and graph have a workload (without an external reference).
#
# Run from the repository root:
#   ./docker/fixtures/repos/setup-demo-repos.sh
#   # equivalent: ./docker/fixtures/repos/setup-fixtures.sh --demo

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
# docker/fixtures/repos → ODS monorepo root
REPO_ROOT="$(cd "$ROOT/../../.." && pwd)"

# Remove the old ods-arch copy before setup-fixtures; otherwise ensure_git_repo
# may commit large generated files (node_modules/bin) that will be rebuilt anyway.
rm -rf "$ROOT/ods-arch"

"$ROOT/setup-fixtures.sh"

git_commit_repo() {
  local dir="$1" msg="$2"
  (
    cd "$dir"
    rm -rf .git
    git init -q
    git config user.email 'demo@ods.local'
    git config user.name 'ODS Demo'
    git add .
    git commit -q -m "$msg"
  )
}

# Copy tree with the same excludes as rsync. Prefer rsync; fall back to tar
# (Git Bash on Windows often has no rsync).
rsync_src() {
  local src="$1" dest="$2"
  src="${src%/}"
  dest="${dest%/}"
  mkdir -p "$dest"

  local excludes=(
    '.git/'
    'node_modules/'
    'dist/'
    'build/'
    'coverage/'
    'data/'
    'bin/'
    'obj/'
    'test-results/'
    'playwright-report/'
    '*.tsbuildinfo'
    '.DS_Store'
  )

  if command -v rsync >/dev/null 2>&1; then
    local rsync_args=(-a --delete)
    local ex
    for ex in "${excludes[@]}"; do
      rsync_args+=(--exclude "$ex")
    done
    rsync "${rsync_args[@]}" "$src"/ "$dest"/
    return 0
  fi

  # tar fallback: wipe dest contents, then extract filtered archive
  find "$dest" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  local tar_excludes=()
  for ex in "${excludes[@]}"; do
    # tar --exclude wants names without trailing slash
    tar_excludes+=(--exclude="${ex%/}")
  done
  (
    cd "$src" || exit 1
    tar -cf - "${tar_excludes[@]}" .
  ) | (
    cd "$dest" || exit 1
    tar -xf -
  )
}

echo "→ perf-bulk (520 files)…"
rm -rf "$ROOT/perf-bulk"
mkdir -p "$ROOT/perf-bulk/bulk"
for i in $(seq 0 519); do
  printf 'content %s\n' "$i" > "$ROOT/perf-bulk/bulk/item-$(printf '%04d' "$i").txt"
done
git_commit_repo "$ROOT/perf-bulk" 'perf bulk demo'

echo "→ large-repo (≥1000 files: txt + ts + cs + compose)…"
rm -rf "$ROOT/large-repo"
LR="$ROOT/large-repo"
mkdir -p "$LR"

# --- system landscape stubs (compose + settings) ---
cat > "$LR/docker-compose.yml" <<'YAML'
services:
  api:
    image: ods/large-api:demo
    depends_on:
      - worker
      - postgres
  worker:
    image: ods/large-worker:demo
    depends_on:
      - rabbit
      - postgres
  postgres:
    image: postgres:15
  rabbit:
    image: rabbitmq:3-management
YAML

mkdir -p "$LR/src/Api" "$LR/contracts"
cat > "$LR/src/Api/appsettings.json" <<'JSON'
{
  "ConnectionStrings": {
    "Default": "Host=postgres;Database=large"
  },
  "RabbitMQ": {
    "Host": "rabbit",
    "Queue": "large.events"
  }
}
JSON

cat > "$LR/contracts/openapi.yaml" <<'YAML'
openapi: 3.0.3
info:
  title: Large Repo Demo API
  version: 1.0.0
paths:
  /health:
    get:
      summary: Health
      responses:
        '200':
          description: OK
YAML

# --- TypeScript modules (imports → code-graph nodes/edges) ---
mkdir -p "$LR/typescript/lib"
cat > "$LR/typescript/lib/base.ts" <<'TS'
export function base(): string {
  return 'base';
}
TS

for i in $(seq 0 199); do
  n=$(printf '%03d' "$i")
  # chain imports: m000 → base; m001 → m000; …
  if [[ "$i" -eq 0 ]]; then
    cat > "$LR/typescript/lib/m${n}.ts" <<TS
import { base } from './base';
export const m${n} = () => base() + '-${n}';
TS
  else
    prev=$(printf '%03d' "$((i - 1))")
    cat > "$LR/typescript/lib/m${n}.ts" <<TS
import { m${prev} } from './m${prev}';
export const m${n} = () => m${prev}() + '-${n}';
TS
  fi
done

# --- C# multi-project (timeout / incremental / graph depth) ---
for proj in 0 1 2 3 4; do
  pdir="$LR/csharp/Proj${proj}"
  mkdir -p "$pdir"
  cat > "$pdir/Proj${proj}.csproj" <<EOF
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
EOF
  cat > "$pdir/Repo.cs" <<EOF
namespace Proj${proj};

public class Repo
{
    public void Save() { }
}
EOF
  cat > "$pdir/Service.cs" <<EOF
namespace Proj${proj};

public class Service
{
    private readonly Repo _repo;
    public Service(Repo repo) { _repo = repo; }
    public void Create() { _repo.Save(); }
}
EOF
  # pad with trivial types for file count / csharp load
  for i in $(seq 0 19); do
    n=$(printf '%02d' "$i")
    cat > "$pdir/Type${n}.cs" <<EOF
namespace Proj${proj};
public class Type${n} { public int Id => ${i}; }
EOF
  done
done

# --- padding .txt so total files ≥ 1000 (walk / SC-002) ---
# Current approx: compose+openapi+appsettings + 1 base + 200 ts + 5*(csproj+2+20 cs) ≈ 320
# Add ~700 txt to clear 1000.
for bucket in $(seq 0 6); do
  dir="$LR/pad/dir-${bucket}"
  mkdir -p "$dir"
  for i in $(seq 0 99); do
    printf 'pad %s-%s\n' "$bucket" "$i" > "$dir/f${bucket}-$(printf '%04d' "$i").txt"
  done
done

file_count=$(find "$LR" -type f ! -path '*/.git/*' | wc -l | tr -d ' ')
echo "   files in tree: ${file_count}"

git_commit_repo "$LR" 'large repo demo (ts+cs+compose+pad)'

echo "→ ods-arch (copy of backend + frontend + parsers from monorepo)…"
rm -rf "$ROOT/ods-arch"
mkdir -p "$ROOT/ods-arch"
rsync_src "$REPO_ROOT/backend/" "$ROOT/ods-arch/backend/"
rsync_src "$REPO_ROOT/frontend/" "$ROOT/ods-arch/frontend/"
rsync_src "$REPO_ROOT/parsers/" "$ROOT/ods-arch/parsers/"
mkdir -p "$ROOT/ods-arch/docker"
cp "$REPO_ROOT/docker/docker-compose.dev.yml" "$ROOT/ods-arch/docker/docker-compose.dev.yml"
ods_count=$(find "$ROOT/ods-arch" -type f ! -path '*/.git/*' | wc -l | tr -d ' ')
echo "   files in tree: ${ods_count}"
git_commit_repo "$ROOT/ods-arch" 'ods-arch dogfood demo (ODS sources)'

echo ""
echo "Ready: $ROOT/perf-bulk, $ROOT/large-repo, $ROOT/ods-arch"
echo "Import into Docker: /repos/perf-bulk, /repos/large-repo, /repos/ods-arch"
echo "large-repo contains: typescript/lib (200+), csharp/Proj0–4, docker-compose.yml, openapi, appsettings, pad/*.txt"
echo "ods-arch contains: backend/, frontend/, parsers/, docker/docker-compose.dev.yml (excluding node_modules/bin/obj)"
