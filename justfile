set shell := ["bash", "-euo", "pipefail", "-c"]

default:
  @just --list

release-patch:
  pnpm -C desktop release:patch

release-minor:
  pnpm -C desktop release:minor

release-major:
  pnpm -C desktop release:major

release-patch-push:
  pnpm -C desktop release:patch:push

release-minor-push:
  pnpm -C desktop release:minor:push

release-major-push:
  pnpm -C desktop release:major:push

changelog version:
  node scripts/changelog.mjs {{version}}
