# Signing and Notarization

## Current state
- `v0.2.x` release artifacts are built by CI.
- Signing/notarization hardening is an active track in `docs/IMPLEMENTATION_PLAN.md`.

## Windows signing
- SignPath Foundation (`https://signpath.org/`) is an option when project eligibility matches their program terms.
- Signing is performed remotely by SignPath/HSM.
- Typical SignPath flow does not require storing a local `.pfx` in this repository.

## macOS signing and notarization
- Requires Apple Developer Program credentials.
- CI must be provisioned with certificate material and notarization secrets.
- Notarization should be treated as a release gate once configured.

## Governance rule
- If signing behavior changes, update in the same PR:
  - `docs/operations/signing.md`
  - `docs/operations/release.md`
  - `docs/STATUS.md`
  - `CHANGELOG.md` (for released versions)
