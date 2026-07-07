#!/usr/bin/env bash
# Генерация демо-репозиториев Perf Bulk (520 файлов) и Large Repo (1000 файлов).
# Также готовит sample-project, если ещё не git.
#
# Запуск из корня репозитория: ./docker/fixtures/repos/setup-demo-repos.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

"$ROOT/setup-fixtures.sh"

git_commit_repo() {
  local dir="$1" msg="$2"
  (
    cd "$dir"
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

echo "→ large-repo (1000 files)…"
rm -rf "$ROOT/large-repo"
mkdir -p "$ROOT/large-repo"
for bucket in $(seq 0 9); do
  dir="$ROOT/large-repo/dir-${bucket}"
  mkdir -p "$dir"
  for i in $(seq 0 99); do
    printf 'content %s\n' "$i" > "$dir/f${bucket}-$(printf '%04d' "$i").txt"
  done
done
git_commit_repo "$ROOT/large-repo" 'large repo demo'

echo ""
echo "Готово: $ROOT/perf-bulk, $ROOT/large-repo"
echo "Импорт в Docker: /repos/perf-bulk, /repos/large-repo"
