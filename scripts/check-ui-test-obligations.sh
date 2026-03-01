#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <base_sha> <head_sha>"
  exit 2
fi

BASE_SHA="$1"
HEAD_SHA="$2"

if ! git rev-parse --verify "$BASE_SHA" >/dev/null 2>&1; then
  echo "Base SHA not found: $BASE_SHA"
  exit 2
fi

if ! git rev-parse --verify "$HEAD_SHA" >/dev/null 2>&1; then
  echo "Head SHA not found: $HEAD_SHA"
  exit 2
fi

mapfile -t CHANGED_FILES < <(git diff --name-only "$BASE_SHA" "$HEAD_SHA")

if [[ ${#CHANGED_FILES[@]} -eq 0 ]]; then
  echo "No changed files detected between $BASE_SHA and $HEAD_SHA."
  exit 0
fi

changed_has() {
  local target="$1"
  for file in "${CHANGED_FILES[@]}"; do
    if [[ "$file" == "$target" ]]; then
      return 0
    fi
  done
  return 1
}

is_triggered=false
missing=()

# Navigation routing contract
if changed_has "desktop/ui/src/router/routes.ts"; then
  is_triggered=true
  if ! changed_has "desktop/ui/src/router/routes.test.ts"; then
    missing+=("routing contract: touch desktop/ui/src/router/routes.test.ts when routes.ts changes")
  fi
fi

# Breadcrumb and link context contract
if changed_has "desktop/ui/src/lib/navigation.ts"; then
  is_triggered=true
  if ! changed_has "desktop/ui/src/lib/navigation.test.ts"; then
    missing+=("breadcrumb contract: touch desktop/ui/src/lib/navigation.test.ts when navigation.ts changes")
  fi
fi

# Nav mode persistence + fallback contract
if changed_has "desktop/ui/src/lib/navigationMode.ts"; then
  is_triggered=true
  if ! changed_has "desktop/ui/src/lib/navigationMode.test.ts"; then
    missing+=("nav mode contract: touch desktop/ui/src/lib/navigationMode.test.ts when navigationMode.ts changes")
  fi
fi

if changed_has "desktop/ui/src/lib/uiPreferences.ts"; then
  is_triggered=true
  if ! changed_has "desktop/ui/src/lib/uiPreferences.test.ts"; then
    missing+=("ui preference contract: touch desktop/ui/src/lib/uiPreferences.test.ts when uiPreferences.ts changes")
  fi
fi

# Quest progression guardrails contract
if changed_has "desktop/ui/src/lib/questFlow.ts"; then
  is_triggered=true
  if ! changed_has "desktop/ui/src/lib/questFlow.test.ts"; then
    missing+=("quest contract: touch desktop/ui/src/lib/questFlow.test.ts when questFlow.ts changes")
  fi
fi

# ASR settings and payload mapping contract
if changed_has "desktop/ui/src/lib/transcriptionSettings.ts"; then
  is_triggered=true
  if ! changed_has "desktop/ui/src/lib/transcriptionSettings.test.ts"; then
    missing+=("asr settings contract: touch desktop/ui/src/lib/transcriptionSettings.test.ts when transcriptionSettings.ts changes")
  fi
fi

if changed_has "desktop/ui/src/lib/asrPayloads.ts"; then
  is_triggered=true
  if ! changed_has "desktop/ui/src/lib/asrPayloads.test.ts"; then
    missing+=("asr payload contract: touch desktop/ui/src/lib/asrPayloads.test.ts when asrPayloads.ts changes")
  fi
fi

# ASR error-state UX contract
if changed_has "desktop/ui/src/lib/asrErrors.ts"; then
  is_triggered=true
  if ! changed_has "desktop/ui/src/lib/asrErrors.test.ts"; then
    missing+=("asr error contract: touch desktop/ui/src/lib/asrErrors.test.ts when asrErrors.ts changes")
  fi
fi

# Feedback context retention contract
if changed_has "desktop/ui/src/lib/feedbackContext.ts"; then
  is_triggered=true
  if ! changed_has "desktop/ui/src/lib/feedbackContext.test.ts"; then
    missing+=("feedback context contract: touch desktop/ui/src/lib/feedbackContext.test.ts when feedbackContext.ts changes")
  fi
fi

# IPC schema alignment contract
if changed_has "desktop/ui/src/schemas/ipc.ts"; then
  is_triggered=true
  if ! changed_has "desktop/ui/src/schemas/ipc.test.ts"; then
    missing+=("ipc schema contract: touch desktop/ui/src/schemas/ipc.test.ts when ipc.ts changes")
  fi
fi

if [[ "$is_triggered" == "false" ]]; then
  echo "No guarded UI contracts changed; UI test-obligation check passed."
  exit 0
fi

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "UI test-obligation check failed."
  echo "Missing required test updates:"
  for item in "${missing[@]}"; do
    echo " - $item"
  done
  echo "Reference: docs/testing/TEST_MATRIX.md"
  exit 1
fi

echo "UI test-obligation check passed."
