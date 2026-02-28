#!/usr/bin/env sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SIDECAR_DIR="$ROOT_DIR/desktop/asr-sidecar"
OUT_DIR="$ROOT_DIR/desktop/src-tauri/sidecar"
DEV_HOME_DIR="$ROOT_DIR/../lepupitre-asr-dev"
COPY=0
COPY_DEV_HOME=0

for arg in "$@"; do
  if [ "$arg" = "--copy" ]; then
    COPY=1
  elif [ "$arg" = "--copy-dev-home" ]; then
    COPY_DEV_HOME=1
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
  COPIED=0

  if [ -f "$SIDECAR_DIR/target/release/lepupitre-asr" ]; then
    cp "$SIDECAR_DIR/target/release/lepupitre-asr" "$OUT_DIR/lepupitre-asr"
    chmod +x "$OUT_DIR/lepupitre-asr"
    COPIED=1
  fi

  if [ -f "$SIDECAR_DIR/target/release/lepupitre-asr.exe" ]; then
    cp "$SIDECAR_DIR/target/release/lepupitre-asr.exe" "$OUT_DIR/lepupitre-asr.exe"
    COPIED=1
  fi

  if [ "$COPIED" -ne 1 ]; then
    echo "No sidecar output found in $SIDECAR_DIR/target/release" >&2
    exit 1
  fi

  # Tauri bundle resources are configured with both filenames.
  # Keep both paths present on all platforms so CI builds don't fail
  # when running Rust checks on a different host OS.
  if [ ! -f "$OUT_DIR/lepupitre-asr" ] && [ -f "$OUT_DIR/lepupitre-asr.exe" ]; then
    cp "$OUT_DIR/lepupitre-asr.exe" "$OUT_DIR/lepupitre-asr"
    chmod +x "$OUT_DIR/lepupitre-asr"
  fi
  if [ ! -f "$OUT_DIR/lepupitre-asr.exe" ] && [ -f "$OUT_DIR/lepupitre-asr" ]; then
    cp "$OUT_DIR/lepupitre-asr" "$OUT_DIR/lepupitre-asr.exe"
  fi

  echo "Sidecar copied to $OUT_DIR"
fi

if [ "$COPY_DEV_HOME" -eq 1 ]; then
  DEV_BIN_DIR="$DEV_HOME_DIR/bin"
  DEV_MODELS_DIR="$DEV_HOME_DIR/models"
  mkdir -p "$DEV_BIN_DIR" "$DEV_MODELS_DIR"
  COPIED=0

  if [ -f "$SIDECAR_DIR/target/release/lepupitre-asr" ]; then
    cp "$SIDECAR_DIR/target/release/lepupitre-asr" "$DEV_BIN_DIR/lepupitre-asr"
    chmod +x "$DEV_BIN_DIR/lepupitre-asr"
    COPIED=1
  fi

  if [ -f "$SIDECAR_DIR/target/release/lepupitre-asr.exe" ]; then
    cp "$SIDECAR_DIR/target/release/lepupitre-asr.exe" "$DEV_BIN_DIR/lepupitre-asr.exe"
    COPIED=1
  fi

  if [ "$COPIED" -ne 1 ]; then
    echo "No sidecar output found in $SIDECAR_DIR/target/release" >&2
    exit 1
  fi

  if [ ! -f "$DEV_BIN_DIR/lepupitre-asr" ] && [ -f "$DEV_BIN_DIR/lepupitre-asr.exe" ]; then
    cp "$DEV_BIN_DIR/lepupitre-asr.exe" "$DEV_BIN_DIR/lepupitre-asr"
    chmod +x "$DEV_BIN_DIR/lepupitre-asr"
  fi
  if [ ! -f "$DEV_BIN_DIR/lepupitre-asr.exe" ] && [ -f "$DEV_BIN_DIR/lepupitre-asr" ]; then
    cp "$DEV_BIN_DIR/lepupitre-asr" "$DEV_BIN_DIR/lepupitre-asr.exe"
  fi

  echo "Sidecar copied to $DEV_BIN_DIR (models dir: $DEV_MODELS_DIR)"
fi

if [ "$COPY" -ne 1 ] && [ "$COPY_DEV_HOME" -ne 1 ]; then
  echo "Sidecar built at $SIDECAR_DIR/target/release (use --copy for src-tauri/sidecar or --copy-dev-home for ../lepupitre-asr-dev/bin)"
fi
