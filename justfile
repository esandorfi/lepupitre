set shell := ["bash", "-euo", "pipefail", "-c"]

default:
  @just --list

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
