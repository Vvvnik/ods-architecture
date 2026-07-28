#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../_common/require-prebuilt.sh
source "$DIR/../_common/require-prebuilt.sh"

JAR="$DIR/target/ods-java-parser.jar"

if [[ -f "$JAR" ]]; then
  exec java -jar "$JAR" "$@"
fi

require_prebuilt_artifact "$JAR"

if ! command -v mvn >/dev/null 2>&1; then
  echo "ods-java-parser: jar missing and mvn not found" >&2
  exit 1
fi
(cd "$DIR" && mvn -q -DskipTests package)
exec java -jar "$JAR" "$@"
