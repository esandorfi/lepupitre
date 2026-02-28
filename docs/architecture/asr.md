# ASR Architecture

## Runtime model
- Local whisper.cpp sidecar is used for transcription.
- Installers ship the sidecar binary by default.
- Whisper models are not bundled; users download models from Settings.

## Resource invariant
Tauri resource paths must include both filenames in CI and packaging:
- `desktop/src-tauri/sidecar/lepupitre-asr`
- `desktop/src-tauri/sidecar/lepupitre-asr.exe`

This avoids OS-specific path failures during Rust checks and packaging.

## Local development
1. Build sidecar: `./scripts/build-asr-sidecar.sh`
2. Optionally copy into resources: `./scripts/build-asr-sidecar.sh --copy`
3. Set env vars:
   - `LEPUPITRE_ASR_SIDECAR=/absolute/path/to/lepupitre-asr`
   - `LEPUPITRE_ASR_MODEL_PATH=/absolute/path/to/ggml-*.bin`
4. Run app: `pnpm -C desktop dev`

Helper:
- `./scripts/dev-asr-env.sh /path/to/ggml-tiny.bin`

## Validation and smoke
- Verify sidecar artifact is not placeholder:
  - `node scripts/verify-asr-sidecar.mjs`
- Optional smoke test:
  - `./scripts/asr-smoke.sh /path/to/lepupitre-asr /path/to/ggml-*.bin`
  - or `cargo test --manifest-path desktop/src-tauri/Cargo.toml asr_sidecar_smoke_decode` with `LEPUPITRE_ASR_SMOKE=1`.

## Error-state mapping
Expected deterministic UI states:
- `sidecar_missing`: incomplete or corrupted installation
- `model_missing`: selected model is not installed
- `sidecar_init_timeout` / `sidecar_decode_timeout`: sidecar too slow or unresponsive
