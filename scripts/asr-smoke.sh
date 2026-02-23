#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 /path/to/lepupitre-asr /path/to/ggml-*.bin"
  exit 1
fi

export LEPUPITRE_ASR_SMOKE=1
export LEPUPITRE_ASR_SIDECAR="$1"
export LEPUPITRE_ASR_MODEL_PATH="$2"

cargo test --manifest-path desktop/src-tauri/Cargo.toml asr_sidecar_smoke_decode
