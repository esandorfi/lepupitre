#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

fail() {
  echo "::error::$1"
  exit 1
}

assert_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "Missing required file: $path"
}

assert_contains() {
  local path="$1"
  local pattern="$2"
  if ! grep -qiE "$pattern" "$path"; then
    fail "Missing required pattern in $path: $pattern"
  fi
}

assert_file "LICENSE"
assert_file "NOTICE"
assert_file "PRIVACY.md"
assert_file "README.md"
assert_file "docs/PROJECT_GOVERNANCE.md"
assert_file "docs/operations/CODE_SIGNING_POLICY.md"
assert_file "docs/operations/SIGNPATH_FOUNDATION_APPLICATION.md"

# OSI-compatible licensing baseline for SignPath Foundation eligibility
assert_contains "LICENSE" "Apache License"
assert_contains "LICENSE" "Version 2.0"

# Required code-signing policy wording
assert_contains "README.md" "^##[[:space:]]+Code signing policy"
assert_contains "README.md" "Free code signing provided by SignPath.io, certificate by SignPath Foundation."
assert_contains "docs/operations/CODE_SIGNING_POLICY.md" "Free code signing provided by SignPath.io, certificate by SignPath Foundation."

# Policy link integrity from README
assert_contains "README.md" "docs/operations/CODE_SIGNING_POLICY.md"
assert_contains "README.md" "docs/PROJECT_GOVERNANCE.md"
assert_contains "README.md" "PRIVACY.md"

# Privacy/network statement expected by SignPath terms
assert_contains "PRIVACY.md" "will not transfer any information to other networked systems unless specifically requested"

# Governance role mapping
assert_contains "docs/PROJECT_GOVERNANCE.md" "^##[[:space:]]+Maintainer"
assert_contains "docs/PROJECT_GOVERNANCE.md" "^##[[:space:]]+Signing roles"

echo "SignPath OSS compliance checks passed."
