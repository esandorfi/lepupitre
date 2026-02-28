#!/usr/bin/env bash
set -euo pipefail

RUNBOOK_RELEASE="docs/operations/release.md#database-recovery-runbook"
RUNBOOK_PLAN="docs/plan/PLAN-TAURI-SQL-HARDENING.md"

echo "Running DB reliability gate tests..."
echo "Threshold policy: each reliability group must pass 100% (any failing check fails CI)."
echo "Runbooks: ${RUNBOOK_RELEASE} | ${RUNBOOK_PLAN}"

FAILED=0

run_check() {
  local label="$1"
  local test_filter="$2"
  echo "::group::${label}"
  if cargo test --manifest-path desktop/src-tauri/Cargo.toml "${test_filter}"; then
    echo "[PASS] ${label}"
  else
    echo "::error title=DB reliability gate failed::${label} failed. See ${RUNBOOK_RELEASE} and ${RUNBOOK_PLAN}"
    FAILED=1
  fi
  echo "::endgroup::"
}

run_check "Migration matrix: global recorded versions" "core::db::tests::global_migrations_are_recorded_in_order"
run_check "Migration matrix: profile recorded versions" "core::db::tests::profile_migrations_are_recorded_in_order"
run_check "Migration continuity: reject gaps" "core::db::tests::migration_continuity_rejects_gaps"
run_check "Migration upgrade path: continue from recorded prefix" "core::db::tests::profile_migration_continues_from_recorded_prefix"
run_check "Migration upgrade path: legacy schema normalization" "core::db::tests::legacy_profile_schema_upgrades_and_normalizes_orphans"
run_check "Backup before pending migration" "core::db::tests::pre_migration_snapshot_created_for_pending_profile_migrations"
run_check "Corruption drill: restore latest snapshot" "core::db::tests::recovery_restores_latest_snapshot"
run_check "Corruption drill: deterministic no-snapshot failure" "core::db::tests::recovery_fails_without_snapshot"
run_check "Index guard: required profile indexes exist" "core::db::tests::required_profile_indexes_exist_after_migration"
run_check "Query plan guard: runs uses project-time index" "core::db::tests::run_hot_query_plan_uses_project_time_index"
run_check "Query plan guard: attempts uses project-time index" "core::db::tests::attempts_hot_query_plan_uses_project_time_index"

if [[ "${FAILED}" -ne 0 ]]; then
  echo "DB reliability gate failed. See ${RUNBOOK_RELEASE} and ${RUNBOOK_PLAN}."
  exit 1
fi

echo "DB reliability gate passed."
