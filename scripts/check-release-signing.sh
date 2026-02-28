#!/usr/bin/env bash
set -euo pipefail

to_bool() {
  case "${1:-}" in
    1|true|TRUE|yes|YES|on|ON)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

require_vars() {
  local label="$1"
  shift
  local missing=()
  for var_name in "$@"; do
    if [[ -z "${!var_name:-}" ]]; then
      missing+=("${var_name}")
    fi
  done
  if (( ${#missing[@]} > 0 )); then
    echo "::error title=${label} prerequisites missing::${label} requires: ${missing[*]}"
    exit 1
  fi
}

runner_os="${RUNNER_OS:-}"
require_windows="${LEPUPITRE_REQUIRE_WINDOWS_SIGNING:-false}"
require_macos="${LEPUPITRE_REQUIRE_MACOS_NOTARIZATION:-false}"
windows_provider="${LEPUPITRE_WINDOWS_SIGNING_PROVIDER:-signpath}"

echo "Release signing preflight"
echo "RUNNER_OS=${runner_os:-unknown}"
echo "LEPUPITRE_REQUIRE_WINDOWS_SIGNING=${require_windows}"
echo "LEPUPITRE_WINDOWS_SIGNING_PROVIDER=${windows_provider}"
echo "LEPUPITRE_REQUIRE_MACOS_NOTARIZATION=${require_macos}"

if [[ "${runner_os}" == "Windows" ]] && to_bool "${require_windows}"; then
  case "${windows_provider}" in
    signpath)
      require_vars \
        "Windows signing (SignPath)" \
        SIGNPATH_API_TOKEN \
        SIGNPATH_ORGANIZATION_ID \
        SIGNPATH_PROJECT_SLUG \
        SIGNPATH_SIGNING_POLICY_SLUG
      ;;
    self-managed|project-cert)
      echo "Windows signing provider is ${windows_provider}; preflight does not enforce provider-specific secrets."
      ;;
    *)
      echo "::error title=Windows signing provider invalid::Unsupported LEPUPITRE_WINDOWS_SIGNING_PROVIDER='${windows_provider}'. Use signpath or self-managed."
      exit 1
      ;;
  esac
fi

if [[ "${runner_os}" == "macOS" ]] && to_bool "${require_macos}"; then
  require_vars \
    "macOS signing/notarization" \
    APPLE_CERTIFICATE \
    APPLE_CERTIFICATE_PASSWORD \
    APPLE_SIGNING_IDENTITY \
    APPLE_ID \
    APPLE_PASSWORD \
    APPLE_TEAM_ID
fi

echo "Release signing preflight checks passed."
