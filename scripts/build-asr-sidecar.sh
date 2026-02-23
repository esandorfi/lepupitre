#!/usr/bin/env sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SIDECAR_DIR="$ROOT_DIR/desktop/asr-sidecar"
OUT_DIR="$ROOT_DIR/desktop/src-tauri/sidecar"
COPY=0

for arg in "$@"; do
  if [ "$arg" = "--copy" ]; then
    COPY=1
  fi
done

cargo build --release --manifest-path "$SIDECAR_DIR/Cargo.toml"

if [ "$COPY" -eq 1 ]; then
  mkdir -p "$OUT_DIR"
  if [ "$(uname -s)" = "Darwin" ] || [ "$(uname -s)" = "Linux" ]; then
    cp "$SIDECAR_DIR/target/release/lepupitre-asr" "$OUT_DIR/lepupitre-asr"
    chmod +x "$OUT_DIR/lepupitre-asr"
  else
    cp "$SIDECAR_DIR/target/release/lepupitre-asr.exe" "$OUT_DIR/lepupitre-asr.exe"
  fi
  echo "Sidecar copied to $OUT_DIR"
else
  echo "Sidecar built at $SIDECAR_DIR/target/release (use --copy to bundle into src-tauri/sidecar)"
fi
