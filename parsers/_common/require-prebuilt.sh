#!/usr/bin/env bash
# Shared hot-path gate for Release DLL / JAR (026 prebuilt-hot-path).
# Usage: require_prebuilt_artifact "/absolute/path/to/artifact"
# When ANALYSIS_REQUIRE_PREBUILT is true/1/yes and the file is missing, exits 1.
# When require is false, returns 0 so the caller may use a local fallback.

require_prebuilt_artifact() {
  local artifact="${1:-}"
  if [[ -z "$artifact" ]]; then
    echo "ods: require_prebuilt_artifact: missing artifact path" >&2
    return 1
  fi

  local require="${ANALYSIS_REQUIRE_PREBUILT:-false}"
  case "$(printf '%s' "$require" | tr '[:upper:]' '[:lower:]')" in
    1|true|yes) ;;
    *) return 0 ;;
  esac

  if [[ -f "$artifact" ]]; then
    return 0
  fi

  echo "ods: prebuilt artifact missing (ANALYSIS_REQUIRE_PREBUILT): $artifact" >&2
  exit 1
}
