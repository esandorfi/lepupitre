# ASR Sidecar (whisper.cpp)

The app expects a bundled sidecar binary named `lepupitre-asr` (or `lepupitre-asr.exe` on Windows).

## Dev override

You can override the bundled path with:

- `LEPUPITRE_ASR_SIDECAR=/absolute/path/to/lepupitre-asr`
- `LEPUPITRE_ASR_MODEL_PATH=/absolute/path/to/ggml-*.bin`

## Packaging

Place the built sidecar binary in this folder before running `tauri build`:

- `desktop/src-tauri/sidecar/lepupitre-asr`
- `desktop/src-tauri/sidecar/lepupitre-asr.exe`

The Tauri config bundles `sidecar/lepupitre-asr` into app resources. Windows packaging should include the `.exe` variant; adjust `tauri.conf.json` if you want to bundle both.


## Placeholder note

This repository includes placeholder files for `lepupitre-asr` and `lepupitre-asr.exe` so builds pass. Replace them with the real sidecar binaries before release.


## Rust sidecar

The Rust sidecar lives in `desktop/asr-sidecar` and embeds whisper.cpp via `whisper-rs` (requires `cmake`). Build it with `./scripts/build-asr-sidecar.sh` and replace the placeholders in this folder before release.
