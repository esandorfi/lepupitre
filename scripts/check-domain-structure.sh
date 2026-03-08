#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

has_errors=false

fail() {
  has_errors=true
  echo " - $1"
}

search_matches() {
  local pattern="$1"
  shift

  if command -v rg >/dev/null 2>&1; then
    rg -n "$pattern" "$@" || true
    return
  fi

  grep -R -n -E -- "$pattern" "$@" 2>/dev/null || true
}

check_forbidden_match() {
  local message="$1"
  local pattern="$2"
  shift 2
  local output
  output="$(search_matches "$pattern" "$@")"
  if [[ -n "$output" ]]; then
    fail "$message"
    echo "$output"
  fi
}

check_path_absent() {
  local path="$1"
  if [[ -e "$path" ]]; then
    fail "Legacy path must stay removed: $path"
  fi
}

# Dependency direction: Rust backend layers must not depend on command layer.
check_forbidden_match \
  "Rust backend layers depend on commands (forbidden)." \
  'crate::commands' \
  desktop/src-tauri/src/domain \
  desktop/src-tauri/src/platform \
  desktop/src-tauri/src/kernel

# Topology migration guard: legacy core path must stay removed.
check_path_absent "desktop/src-tauri/src/core"
check_path_absent "desktop/src-tauri/src/core/run"
check_path_absent "desktop/src-tauri/src/core/coach"
check_path_absent "desktop/src-tauri/src/core/preferences"
check_path_absent "desktop/src-tauri/src/core/workspace.rs"
check_path_absent "desktop/src-tauri/src/core/project.rs"
check_path_absent "desktop/src-tauri/src/core/outline.rs"
check_path_absent "desktop/src-tauri/src/core/feedback.rs"
check_path_absent "desktop/src-tauri/src/core/quest.rs"
check_path_absent "desktop/src-tauri/src/core/pack.rs"
check_path_absent "desktop/src-tauri/src/core/peer_review.rs"
check_path_absent "desktop/src-tauri/src/core/recorder.rs"
check_path_absent "desktop/src-tauri/src/core/recording.rs"
check_path_absent "desktop/src-tauri/src/core/ids.rs"
check_path_absent "desktop/src-tauri/src/core/time.rs"
check_path_absent "desktop/src-tauri/src/core/asr.rs"
check_path_absent "desktop/src-tauri/src/core/asr_live.rs"
check_path_absent "desktop/src-tauri/src/core/asr_models.rs"
check_path_absent "desktop/src-tauri/src/core/asr_sidecar.rs"
check_path_absent "desktop/src-tauri/src/core/db.rs"
check_path_absent "desktop/src-tauri/src/core/db_helpers.rs"
check_path_absent "desktop/src-tauri/src/core/seed.rs"
check_path_absent "desktop/src-tauri/src/core/analysis.rs"
check_path_absent "desktop/src-tauri/src/core/dsp.rs"
check_path_absent "desktop/src-tauri/src/core/vad.rs"
check_path_absent "desktop/src-tauri/src/core/transcript.rs"
check_path_absent "desktop/src-tauri/src/core/artifacts.rs"
check_path_absent "desktop/src-tauri/src/core/models.rs"

# Legacy core imports are forbidden after topology reset completion.
check_forbidden_match \
  "Legacy core imports are forbidden in Rust backend." \
  'crate::core::|use crate::core' \
  desktop/src-tauri/src

# Dependency direction: migrated command wrappers must not contain SQL/DB logic.
check_forbidden_match \
  "Thin command wrappers contain direct DB/SQL logic (forbidden in migrated contexts)." \
  'rusqlite::|query_row|execute\(|prepare\(' \
  desktop/src-tauri/src/commands/profile.rs \
  desktop/src-tauri/src/commands/quest.rs \
  desktop/src-tauri/src/commands/feedback.rs \
  desktop/src-tauri/src/commands/project.rs \
  desktop/src-tauri/src/commands/outline.rs \
  desktop/src-tauri/src/commands/pack.rs \
  desktop/src-tauri/src/commands/peer_review.rs

# Dependency direction: UI domain APIs must not import view/store layers.
check_forbidden_match \
  "UI domain API imports forbidden view/store layers." \
  'from "[^"]*(stores|pages|components)/|from "@/(stores|pages|components)/' \
  desktop/ui/src/domains

# File-size budgets for known orchestration/wrapper hotspots.
declare -A LINE_BUDGETS=(
  ["desktop/src-tauri/src/commands/audio.rs"]=1600
  ["desktop/src-tauri/src/commands/transcription.rs"]=1000
  ["desktop/ui/src/stores/app.ts"]=750
  ["desktop/src-tauri/src/commands/profile.rs"]=120
  ["desktop/src-tauri/src/commands/quest.rs"]=120
  ["desktop/src-tauri/src/commands/feedback.rs"]=120
  ["desktop/src-tauri/src/commands/project.rs"]=120
  ["desktop/src-tauri/src/commands/outline.rs"]=120
  ["desktop/src-tauri/src/commands/pack.rs"]=120
  ["desktop/src-tauri/src/commands/peer_review.rs"]=120
  ["desktop/ui/src/domains/workspace/api.ts"]=140
  ["desktop/ui/src/domains/quest/api.ts"]=140
  ["desktop/ui/src/domains/feedback/api.ts"]=140
  ["desktop/ui/src/domains/talk/api.ts"]=140
  ["desktop/ui/src/domains/pack/api.ts"]=140
  ["desktop/ui/src/domains/recorder/api.ts"]=140
  ["desktop/ui/src/domains/asr/api.ts"]=140
  ["desktop/ui/src/features/talks/composables/exportPage/talkExportPageRuntime.ts"]=260
  ["desktop/ui/src/features/talks/composables/reportPage/talkReportPageRuntime.ts"]=230
  ["desktop/ui/src/features/talks/composables/trainPage/talkTrainPageRuntime.ts"]=190
  ["desktop/ui/src/features/talks/composables/builderPage/talkBuilderPageActions.ts"]=220
  ["desktop/ui/src/features/talks/pages/TalksPage.vue"]=190
  ["desktop/ui/src/features/talks/pages/TalkDefinePage.vue"]=170
  ["desktop/ui/src/features/talks/pages/TalkTrainPage.vue"]=170
  ["desktop/ui/src/features/talks/pages/TalkReportPage.vue"]=190
  ["desktop/ui/src/features/talks/pages/TalkExportPage.vue"]=180
)

for file in "${!LINE_BUDGETS[@]}"; do
  if [[ ! -f "$file" ]]; then
    fail "Budget target missing: $file"
    continue
  fi
  line_count="$(wc -l < "$file" | tr -d ' ')"
  max_count="${LINE_BUDGETS[$file]}"
  if (( line_count > max_count )); then
    fail "File too large: $file has $line_count lines (max: $max_count)"
  fi
done

if [[ "$has_errors" == "true" ]]; then
  echo "Domain-structure guard rails failed."
  echo "Reference: docs/plan/PLAN-DOMAIN-CODE-ALIGNMENT.md"
  exit 1
fi

echo "Domain-structure check passed."
