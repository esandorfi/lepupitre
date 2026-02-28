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

# Dependency direction: Rust core modules must not depend on command layer.
check_forbidden_match \
  "Rust core depends on commands (forbidden)." \
  'crate::commands' \
  desktop/src-tauri/src/core

# Dependency direction: migrated command wrappers must not contain SQL/DB logic.
check_forbidden_match \
  "Thin command wrappers contain direct DB/SQL logic (forbidden in migrated contexts)." \
  'db::|rusqlite::|query_row|execute\(|prepare\(' \
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
