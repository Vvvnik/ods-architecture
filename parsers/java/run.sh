#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JAR="$DIR/target/ods-java-parser.jar"

if [[ ! -f "$JAR" ]]; then
  if ! command -v mvn >/dev/null 2>&1; then
    echo "ods-java-parser: jar missing and mvn not found" >&2
    exit 1
  fi
  (cd "$DIR" && mvn -q -DskipTests package)
fi

exec java -jar "$JAR" "$@"
