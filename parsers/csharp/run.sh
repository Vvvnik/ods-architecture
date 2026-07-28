#!/usr/bin/env bash
set -euo pipefail

export DOTNET_ROLL_FORWARD="${DOTNET_ROLL_FORWARD:-LatestMajor}"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../_common/require-prebuilt.sh
source "$DIR/../_common/require-prebuilt.sh"

DLL="$DIR/Ods.CSharpParser/bin/Release/net8.0/Ods.CSharpParser.dll"

if [[ -f "$DLL" ]]; then
  exec dotnet "$DLL" "$@"
fi

require_prebuilt_artifact "$DLL"
exec dotnet run --project "$DIR/Ods.CSharpParser" -c Release -- "$@"
