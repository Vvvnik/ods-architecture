#!/usr/bin/env bash
set -euo pipefail

export DOTNET_ROLL_FORWARD="${DOTNET_ROLL_FORWARD:-LatestMajor}"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DLL="$DIR/Ods.CSharpParser/bin/Release/net8.0/Ods.CSharpParser.dll"

if [[ -f "$DLL" ]]; then
  exec dotnet "$DLL" "$@"
fi

exec dotnet run --project "$DIR/Ods.CSharpParser" -c Release -- "$@"
