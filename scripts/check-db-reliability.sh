#!/usr/bin/env bash
set -euo pipefail

echo "Running DB reliability gate tests (migration + recovery + query plan/index)..."
cargo test --manifest-path desktop/src-tauri/Cargo.toml core::db::tests::
