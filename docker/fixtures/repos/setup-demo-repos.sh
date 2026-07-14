#!/usr/bin/env bash
# Генерация демо-репозиториев Perf Bulk (520 файлов) и Large Repo (≥1000 файлов).
# Large Repo (010): не только .txt — также .ts / .cs / compose (+ appsettings),
# чтобы sync+walk, детектор, парсеры и граф имели нагрузку (без внешнего эталона).
#
# Запуск из корня репозитория: ./docker/fixtures/repos/setup-demo-repos.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

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

echo ""
echo "Готово: $ROOT/perf-bulk, $ROOT/large-repo"
echo "Импорт в Docker: /repos/perf-bulk, /repos/large-repo"
echo "large-repo содержит: typescript/lib (200+), csharp/Proj0–4, docker-compose.yml, openapi, appsettings, pad/*.txt"
