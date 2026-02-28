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

# Workspace backend obligation
if changed_has "desktop/src-tauri/src/commands/profile.rs"; then
  is_triggered=true
  if ! changed_has "desktop/src-tauri/tests/workspace_flow.rs"; then
    missing+=("workspace lifecycle: touch desktop/src-tauri/tests/workspace_flow.rs when profile command changes")
  fi
fi

# Quest backend obligation
if changed_has "desktop/src-tauri/src/commands/quest.rs"; then
  is_triggered=true
  if ! changed_has "desktop/src-tauri/tests/quest_flow.rs"; then
    missing+=("quest lifecycle: touch desktop/src-tauri/tests/quest_flow.rs when quest command changes")
  fi
fi

# Run backend obligation
if changed_has "desktop/src-tauri/src/commands/run.rs"; then
  is_triggered=true
  if ! changed_has "desktop/src-tauri/tests/run_feedback_flow.rs"; then
    missing+=("run lifecycle: touch desktop/src-tauri/tests/run_feedback_flow.rs when run command changes")
  fi
fi

# Feedback backend obligation
if changed_has "desktop/src-tauri/src/commands/feedback.rs"; then
  is_triggered=true
  if ! changed_has "desktop/src-tauri/tests/run_feedback_flow.rs"; then
    missing+=("feedback lifecycle: touch desktop/src-tauri/tests/run_feedback_flow.rs when feedback command changes")
  fi
fi

if [[ "$is_triggered" == "false" ]]; then
  echo "No guarded backend domains changed; test-obligation check passed."
  exit 0
fi

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Test-obligation check failed."
  echo "Missing required test updates:"
  for item in "${missing[@]}"; do
    echo " - $item"
  done
  echo "Reference: docs/testing/TEST_MATRIX.md"
  exit 1
fi

echo "Test-obligation check passed."
