#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

has_errors=false

fail() {
  has_errors=true
  echo " - $1"
}

check_forbidden_match() {
  local message="$1"
  local pattern="$2"
  shift 2
  local output
  output="$(rg -n "$pattern" "$@" || true)"
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
  desktop/src-tauri/src/core \
  desktop/src-tauri/src/domain \
  desktop/src-tauri/src/platform \
  desktop/src-tauri/src/kernel

# Topology migration guard: migrated contexts must not return to legacy core paths.
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

# Command wrappers for migrated contexts must import new layer paths.
check_forbidden_match \
  "Migrated command wrappers still import legacy core contexts." \
  'crate::core::(run|coach|preferences|workspace|project|outline|feedback|quest|pack|peer_review|recorder|recording)' \
  desktop/src-tauri/src/commands/run.rs \
  desktop/src-tauri/src/commands/coach.rs \
  desktop/src-tauri/src/commands/preferences.rs \
  desktop/src-tauri/src/commands/profile.rs \
  desktop/src-tauri/src/commands/project.rs \
  desktop/src-tauri/src/commands/outline.rs \
  desktop/src-tauri/src/commands/feedback.rs \
  desktop/src-tauri/src/commands/quest.rs \
  desktop/src-tauri/src/commands/pack.rs \
  desktop/src-tauri/src/commands/peer_review.rs \
  desktop/src-tauri/src/commands/audio.rs

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
  ["desktop/ui/src/components/AudioRecorder.vue"]=1220
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
