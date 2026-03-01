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

## Worktree check procedure (Windows)
Use this when `cargo test` or `cargo clippy` fails with:
`resource path sidecar\lepupitre-asr doesn't exist`.

1. Ensure resource directory exists:

```powershell
Set-Location C:\dev.sandorfi\lepupitre-recorder-ux
New-Item -ItemType Directory -Force -Path "desktop/src-tauri/sidecar" | Out-Null
```

1. Preferred: copy real sidecar from shared dev home:

```powershell
Copy-Item "C:\dev.sandorfi\lepupitre-asr-dev\bin\lepupitre-asr.exe" "desktop/src-tauri/sidecar/lepupitre-asr.exe" -Force
Copy-Item "desktop/src-tauri/sidecar/lepupitre-asr.exe" "desktop/src-tauri/sidecar/lepupitre-asr" -Force
```

1. Compile-only fallback: create placeholders:

```powershell
New-Item -ItemType File -Force -Path "desktop/src-tauri/sidecar/lepupitre-asr.exe" | Out-Null
New-Item -ItemType File -Force -Path "desktop/src-tauri/sidecar/lepupitre-asr" | Out-Null
```

1. Verify both files are present:

```powershell
Test-Path "desktop/src-tauri/sidecar/lepupitre-asr.exe"
Test-Path "desktop/src-tauri/sidecar/lepupitre-asr"
```

1. Run checks:

```powershell
cargo test --manifest-path desktop/src-tauri/Cargo.toml
cargo clippy --manifest-path desktop/src-tauri/Cargo.toml --all-targets --all-features -- -D warnings
```

## Local development
1. Build sidecar: `./scripts/build-asr-sidecar.sh`
1. Optionally copy into resources: `./scripts/build-asr-sidecar.sh --copy`
1. Dev shared ASR home (recommended for worktrees):
   - Create folders once: `just asr-dev-create`
   - Build + copy sidecar there: `just asr-build-dev-home`
   - Location:
     - `../lepupitre-asr-dev/bin/lepupitre-asr(.exe)`
     - `../lepupitre-asr-dev/models/`
   - Windows notes:
     - Run from "Developer PowerShell for VS 2022" (or call `VsDevCmd.bat`) so `INCLUDE`/`LIB` are present.
     - From a regular PowerShell, use:
       - `$vs = 'C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat'`
       - `cmd.exe /c "\"$vs\" -arch=x64 -host_arch=x64 && cd /d C:\dev.sandorfi\lepupitre && just asr-build-dev-home"`
     - If LLVM is installed in the default location, set:
       - PowerShell: `$env:LIBCLANG_PATH = 'C:\Program Files\LLVM\bin'`
     - `asr-build-dev-home` forces single-job Cargo build on Windows (`CARGO_BUILD_JOBS=1`) to avoid intermittent MSBuild install-target failures in `whisper-rs-sys`.
1. Set env vars:
   - `LEPUPITRE_ASR_SIDECAR=/absolute/path/to/lepupitre-asr`
   - `LEPUPITRE_ASR_MODEL_PATH=/absolute/path/to/ggml-*.bin`
1. Run app: `pnpm -C desktop dev`

Helper:
- `./scripts/dev-asr-env.sh /path/to/ggml-tiny.bin`
- `just dev-desktop-asr-dev /path/to/ggml-tiny.bin`

## Model provisioning (dev home)
- `just asr-build-dev-home` only builds/copies the sidecar binary. It does not download models.
- For regular app usage, models can be downloaded from Settings.
- For local sidecar/dev-home flow, place model files in `../lepupitre-asr-dev/models/`.
- Recommended helper:
  - `just asr-model-dev tiny`
  - `just asr-model-dev base`
  - This downloads and verifies checksum/size before making the model available.

Windows PowerShell (tiny model):

```powershell
New-Item -ItemType Directory -Force C:\dev.sandorfi\lepupitre-asr-dev\models | Out-Null
Invoke-WebRequest -Uri "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin" -OutFile "C:\dev.sandorfi\lepupitre-asr-dev\models\ggml-tiny.bin"
(Get-FileHash "C:\dev.sandorfi\lepupitre-asr-dev\models\ggml-tiny.bin" -Algorithm SHA256).Hash
```

Expected SHA256:
- `ggml-tiny.bin`: `be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21`
- `ggml-base.bin`: `60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe`

Then run:
- `just asr-smoke-dev C:\dev.sandorfi\lepupitre-asr-dev\models\ggml-tiny.bin`
- `just dev-desktop-asr-dev C:\dev.sandorfi\lepupitre-asr-dev\models\ggml-tiny.bin`

## Validation and smoke
- Verify sidecar artifact is not placeholder:
  - `node scripts/verify-asr-sidecar.mjs`
- Verify sidecar identity/protocol quickly:
  - `<path-to-sidecar> --version`
  - `<path-to-sidecar> doctor --json`
  - `doctor --json` returns a stable payload (version/protocol/target/capabilities/dependencies).
- Optional smoke test:
  - `./scripts/asr-smoke.sh /path/to/lepupitre-asr /path/to/ggml-*.bin`
  - `just asr-smoke-dev /path/to/ggml-*.bin`
  - or `cargo test --manifest-path desktop/src-tauri/Cargo.toml asr_sidecar_smoke_decode` with `LEPUPITRE_ASR_SMOKE=1`.

### App compatibility gate
- `asr_sidecar_status` now verifies:
  - sidecar file exists
  - sidecar `doctor --json` executes and parses
  - protocol version matches app expectation
  - required runtime capabilities are present
- deterministic status errors:
  - `sidecar_missing`
  - `sidecar_doctor_failed`
  - `sidecar_doctor_invalid`
  - `sidecar_protocol_incompatible`
  - `sidecar_unsupported_runtime_capability`

## Error-state mapping
Expected deterministic UI states:
- `sidecar_missing`: incomplete or corrupted installation
- `model_missing`: selected model is not installed
- `sidecar_init_timeout` / `sidecar_decode_timeout`: sidecar too slow or unresponsive

## Windows troubleshooting
- `fatal error: 'stdbool.h' file not found` / `fatal error: 'stdio.h' file not found`:
  - build is not running in a VS C/C++ environment (missing Windows SDK include paths).
- `_G_fpos_t` / `_IO_FILE` size assertion overflow in generated `bindings.rs`:
  - bindgen failed and `whisper-rs-sys` fell back to bundled bindings that do not match the current toolchain.
