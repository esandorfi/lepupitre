# Signing and Notarization

## Current state
- `v0.2.x` release artifacts are built by CI.
- Signing/notarization hardening is an active track in `docs/IMPLEMENTATION_PLAN.md`.
- Release CI now includes a signing/notarization gate script:
  - `scripts/check-release-signing.sh`
  - gate runs in `.github/workflows/release-packaging.yml`
- Public policy/governance pages:
  - [Code signing policy](CODE_SIGNING_POLICY.md)
  - [Project governance](../PROJECT_GOVERNANCE.md)
  - [Privacy policy](../../PRIVACY.md)

## Windows signing
- SignPath Foundation (`https://signpath.org/`) is an option when project eligibility matches their program terms.
- Signing is performed remotely by SignPath/HSM.
- Typical SignPath flow does not require storing a local `.pfx` in this repository.
- CI gate toggles:
  - `LEPUPITRE_REQUIRE_WINDOWS_SIGNING=true`
  - `LEPUPITRE_WINDOWS_SIGNING_PROVIDER=signpath|self-managed` (default: `signpath`)
- Required secrets when enabled with `LEPUPITRE_WINDOWS_SIGNING_PROVIDER=signpath`:
  - `SIGNPATH_API_TOKEN`
  - `SIGNPATH_ORGANIZATION_ID`
  - `SIGNPATH_PROJECT_SLUG`
  - `SIGNPATH_SIGNING_POLICY_SLUG`
- With `LEPUPITRE_WINDOWS_SIGNING_PROVIDER=self-managed`, preflight does not enforce provider-specific secrets (verification still enforces valid installer signatures).
- Verification gate when enabled:
  - built `*.msi` and NSIS `*.exe` installers must have valid Authenticode signatures.

## macOS signing and notarization
- Requires Apple Developer Program credentials.
- CI must be provisioned with certificate material and notarization secrets.
- Notarization should be treated as a release gate once configured.
- CI gate toggle: repository variable `LEPUPITRE_REQUIRE_MACOS_NOTARIZATION=true`.
- Required secrets when enabled:
  - `APPLE_CERTIFICATE`
  - `APPLE_CERTIFICATE_PASSWORD`
  - `APPLE_SIGNING_IDENTITY`
  - `APPLE_ID`
  - `APPLE_PASSWORD`
  - `APPLE_TEAM_ID`
- Verification gate when enabled:
  - `codesign --verify --deep --strict` on `.app`,
  - `spctl --assess` on `.app`,
  - `xcrun stapler validate` on `.dmg` when present.

## Governance rule
- If signing behavior changes, update in the same PR:
  - `docs/operations/signing.md`
  - `docs/operations/release.md`
  - `docs/STATUS.md`
  - `CHANGELOG.md` (for released versions)

## SignPath Foundation application
- Preparation checklist and submission form helper:
  - [SIGNPATH_FOUNDATION_APPLICATION.md](SIGNPATH_FOUNDATION_APPLICATION.md)
