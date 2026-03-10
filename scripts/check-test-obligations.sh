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

# PR checks should use the branch fork point, not the current base branch tip.
if ! EFFECTIVE_BASE_SHA="$(git merge-base "$BASE_SHA" "$HEAD_SHA")"; then
  echo "Could not determine merge-base between $BASE_SHA and $HEAD_SHA"
  exit 2
fi

mapfile -t CHANGED_FILES < <(git diff --name-only "$EFFECTIVE_BASE_SHA" "$HEAD_SHA")

if [[ ${#CHANGED_FILES[@]} -eq 0 ]]; then
  echo "No changed files detected between $EFFECTIVE_BASE_SHA and $HEAD_SHA."
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

require_changed_pair() {
  local source_file="$1"
  local required_test_file="$2"
  local message="$3"

  if changed_has "$source_file"; then
    is_triggered=true
    if ! changed_has "$required_test_file"; then
      missing+=("$message")
    fi
  fi
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

# Talks UI orchestration obligations
require_changed_pair \
  "desktop/ui/src/features/talks/composables/trainPage/talkTrainPageRuntime.ts" \
  "desktop/ui/src/features/talks/composables/trainPage/talkTrainPageRuntime.test.ts" \
  "talk train runtime: touch talkTrainPageRuntime.test.ts when talkTrainPageRuntime.ts changes"

require_changed_pair \
  "desktop/ui/src/features/talks/composables/reportPage/talkReportPageRuntime.ts" \
  "desktop/ui/src/features/talks/composables/reportPage/talkReportPageRuntime.test.ts" \
  "talk report runtime: touch talkReportPageRuntime.test.ts when talkReportPageRuntime.ts changes"

require_changed_pair \
  "desktop/ui/src/features/talks/composables/exportPage/talkExportPageRuntime.ts" \
  "desktop/ui/src/features/talks/composables/exportPage/talkExportPageRuntime.test.ts" \
  "talk export runtime: touch talkExportPageRuntime.test.ts when talkExportPageRuntime.ts changes"

require_changed_pair \
  "desktop/ui/src/features/talks/composables/definePage/talkDefinePageRuntime.ts" \
  "desktop/ui/src/features/talks/composables/definePage/talkDefinePageRuntime.test.ts" \
  "talk define runtime: touch talkDefinePageRuntime.test.ts when talkDefinePageRuntime.ts changes"

require_changed_pair \
  "desktop/ui/src/features/talks/composables/talksPage/talksPageRuntime.ts" \
  "desktop/ui/src/features/talks/composables/talksPage/talksPageRuntime.test.ts" \
  "talks page runtime: touch talksPageRuntime.test.ts when talksPageRuntime.ts changes"

require_changed_pair \
  "desktop/ui/src/features/talks/composables/projectSetupPage/projectSetupPageRuntime.ts" \
  "desktop/ui/src/features/talks/composables/projectSetupPage/projectSetupPageRuntime.test.ts" \
  "project setup runtime: touch projectSetupPageRuntime.test.ts when projectSetupPageRuntime.ts changes"

require_changed_pair \
  "desktop/ui/src/features/talks/composables/builderPage/talkBuilderPageActions.ts" \
  "desktop/ui/src/features/talks/composables/builderPage/talkBuilderPageActions.test.ts" \
  "talk builder actions: touch talkBuilderPageActions.test.ts when talkBuilderPageActions.ts changes"

require_changed_pair \
  "desktop/ui/src/features/talks/composables/shared/talkRuntimeDataLoader.ts" \
  "desktop/ui/src/features/talks/composables/shared/talkRuntimeDataLoader.test.ts" \
  "talk runtime data loader: touch talkRuntimeDataLoader.test.ts when talkRuntimeDataLoader.ts changes"

if [[ "$is_triggered" == "false" ]]; then
  echo "No guarded domains changed; test-obligation check passed."
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
