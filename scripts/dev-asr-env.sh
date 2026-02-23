#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SIDECAR_BIN="$ROOT_DIR/desktop/asr-sidecar/target/release/lepupitre-asr"
MODEL_PATH=${1:-}

if [ ! -x "$SIDECAR_BIN" ]; then
  echo "Sidecar not found: $SIDECAR_BIN"
  echo "Build it with: ./scripts/build-asr-sidecar.sh"
  exit 1
fi

if [ -z "$MODEL_PATH" ]; then
  echo "Usage: $0 /path/to/ggml-tiny.bin"
  exit 1
fi

if [ ! -f "$MODEL_PATH" ]; then
  echo "Model file not found: $MODEL_PATH"
  exit 1
fi

export LEPUPITRE_ASR_SIDECAR="$SIDECAR_BIN"
export LEPUPITRE_ASR_MODEL_PATH="$MODEL_PATH"

cat <<ENV
ASR env configured:
- LEPUPITRE_ASR_SIDECAR=$LEPUPITRE_ASR_SIDECAR
- LEPUPITRE_ASR_MODEL_PATH=$LEPUPITRE_ASR_MODEL_PATH

Run:
  pnpm -C desktop dev
ENV
