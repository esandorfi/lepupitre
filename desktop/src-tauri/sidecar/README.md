# ASR Sidecar (whisper.cpp)

The app expects a bundled sidecar binary named `lepupitre-asr` (or `lepupitre-asr.exe` on Windows).
Installer builds include this sidecar by default.

## Dev override

You can override the bundled path with:

- `LEPUPITRE_ASR_SIDECAR=/absolute/path/to/lepupitre-asr`
- `LEPUPITRE_ASR_MODEL_PATH=/absolute/path/to/ggml-*.bin`

## Packaging

Place the built sidecar binary in this folder before running `tauri build`:

- `desktop/src-tauri/sidecar/lepupitre-asr`
- `desktop/src-tauri/sidecar/lepupitre-asr.exe`

The Tauri config bundles `sidecar/lepupitre-asr` into app resources.
Windows packaging uses the `.exe` variant.


## Placeholder note

This repository includes placeholder files for `lepupitre-asr` and `lepupitre-asr.exe`.
Release packaging must replace them with real binaries.
Use `node scripts/verify-asr-sidecar.mjs` (also run automatically by `pnpm -C desktop build`) to fail fast if placeholders are still present.


## Rust sidecar

The Rust sidecar lives in `desktop/asr-sidecar` and embeds whisper.cpp via `whisper-rs` (requires `cmake`). Build it with `./scripts/build-asr-sidecar.sh` (use `--copy` to bundle into this folder before release).
