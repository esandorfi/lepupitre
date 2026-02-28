set shell := ["bash", "-euo", "pipefail", "-c"]
set windows-shell := ["powershell.exe", "-NoLogo", "-NoProfile", "-Command"]

help:
  @echo "Le Pupitre just commands"; echo ""; echo "Development"; echo "  just dev-desktop                Run the full Tauri desktop app (UI + Rust backend)"; echo "  just dev-ui                     Run only the Vue UI (Vite dev server)"; echo "  just dev-desktop-asr <model>    Run desktop app with local ASR sidecar env vars set"; echo "  just dev-desktop-asr-dev <model> Run desktop app with sidecar from ../lepupitre-asr-dev/bin"; echo ""; echo "UI validation"; echo "  just ui-build                   Build the Vue UI (typecheck + Vite build)"; echo "  just ui-smoke                   Alias for ui-build (quick smoke check after UI changes)"; echo ""; echo "ASR"; echo "  just asr-build                  Build the ASR sidecar binary"; echo "  just asr-build-copy             Build and copy sidecar into src-tauri/sidecar"; echo "  just asr-dev-create             Create ../lepupitre-asr-dev/{bin,models}"; echo "  just asr-build-dev-home         Build and copy sidecar into ../lepupitre-asr-dev/bin"; echo "  just asr-model-dev <tiny|base>  Download+verify model into ../lepupitre-asr-dev/models"; echo "  just asr-smoke <sidecar> <model> Run ASR smoke test against a sidecar binary + model"; echo "  just asr-smoke-dev <model>      Run ASR smoke test using ../lepupitre-asr-dev/bin sidecar"; echo ""; echo "Release"; echo "  just release-patch              Bump patch version (no tag push)"; echo "  just release-minor              Bump minor version (no tag push)"; echo "  just release-major              Bump major version (no tag push)"; echo "  just release-tagpush            Push release tag after version bump"; echo "  just changelog <version>        Generate changelog content for a target version"; echo ""; echo "Tips"; echo "  just --list                     Show raw recipe list"

default:
  @just help

dev-desktop:
  pnpm -C desktop dev

dev-ui:
  pnpm -C desktop ui:dev

ui-build:
  pnpm -C desktop ui:build

ui-smoke:
  @just ui-build

asr-build:
  bash -lc "./scripts/build-asr-sidecar.sh"

asr-build-copy:
  bash -lc "./scripts/build-asr-sidecar.sh --copy"

asr-dev-create:
  node scripts/asr-dev-home.mjs create

asr-build-dev-home:
  node scripts/asr-dev-home.mjs build-copy

asr-model-dev model:
  node scripts/asr-dev-home.mjs model {{model}}

asr-smoke sidecar model:
  bash -lc "./scripts/asr-smoke.sh {{sidecar}} {{model}}"

asr-smoke-dev model:
  node scripts/asr-dev-home.mjs smoke {{model}}

dev-desktop-asr model:
  bash -lc "SIDE=\"$(pwd)/desktop/asr-sidecar/target/release/lepupitre-asr\"; if [ -f \"${SIDE}.exe\" ]; then SIDE=\"${SIDE}.exe\"; fi; LEPUPITRE_ASR_SIDECAR=\"${SIDE}\" LEPUPITRE_ASR_MODEL_PATH=\"{{model}}\" pnpm -C desktop dev"

dev-desktop-asr-dev model:
  node scripts/asr-dev-home.mjs dev {{model}}

release-patch:
  pnpm -C desktop release:patch

release-minor:
  pnpm -C desktop release:minor

release-major:
  pnpm -C desktop release:major

release-tagpush:
  pnpm -C desktop release:tagpush

changelog version:
  node scripts/changelog.mjs {{version}}
