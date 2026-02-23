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

# Work around a ggml/whisper.cpp ARM feature detection mismatch seen on some
# macOS CI runners (Xcode 16.4 / AppleClang 17) where i8mm code can be emitted
# even when the compile flags resolve to +noi8mm. ggml disables GGML_NATIVE when
# SOURCE_DATE_EPOCH is set, which avoids that code path.
if [ "$(uname -s)" = "Darwin" ] && [ "$(uname -m)" = "arm64" ]; then
  SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-1}" \
    cargo build --release --manifest-path "$SIDECAR_DIR/Cargo.toml"
else
  cargo build --release --manifest-path "$SIDECAR_DIR/Cargo.toml"
fi

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
