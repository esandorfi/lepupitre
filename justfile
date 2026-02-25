set shell := ["bash", "-euo", "pipefail", "-c"]

help:
  @echo "Le Pupitre just commands"
  @echo ""
  @echo "Development"
  @echo "  just dev-desktop                Run the full Tauri desktop app (UI + Rust backend)"
  @echo "  just dev-ui                     Run only the Vue UI (Vite dev server)"
  @echo "  just dev-desktop-asr <model>    Run desktop app with local ASR sidecar env vars set"
  @echo ""
  @echo "UI validation"
  @echo "  just ui-build                   Build the Vue UI (typecheck + Vite build)"
  @echo "  just ui-smoke                   Alias for ui-build (quick smoke check after UI changes)"
  @echo ""
  @echo "ASR"
  @echo "  just asr-build                  Build the ASR sidecar binary"
  @echo "  just asr-build-copy             Build and copy sidecar into src-tauri/sidecar"
  @echo "  just asr-smoke <sidecar> <model> Run ASR smoke test against a sidecar binary + model"
  @echo ""
  @echo "Release"
  @echo "  just release-patch              Bump patch version (no tag push)"
  @echo "  just release-minor              Bump minor version (no tag push)"
  @echo "  just release-major              Bump major version (no tag push)"
  @echo "  just release-tagpush            Push release tag after version bump"
  @echo "  just changelog <version>        Generate changelog content for a target version"
  @echo ""
  @echo "Tips"
  @echo "  just --list                     Show raw recipe list"

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
  ./scripts/build-asr-sidecar.sh

asr-build-copy:
  ./scripts/build-asr-sidecar.sh --copy

asr-smoke sidecar model:
  ./scripts/asr-smoke.sh {{sidecar}} {{model}}

dev-desktop-asr model:
  LEPUPITRE_ASR_SIDECAR="$(pwd)/desktop/asr-sidecar/target/release/lepupitre-asr" \
  LEPUPITRE_ASR_MODEL_PATH="{{model}}" \
  pnpm -C desktop dev

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
