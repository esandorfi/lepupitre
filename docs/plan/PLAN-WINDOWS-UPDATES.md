# Plan: Windows Update and Installer Reliability

Status: proposed  
Owner: maintainers  
Last update: 2026-03-02

## Goal

Provide a deterministic and user-safe Windows update experience that:
- preserves user data across upgrades,
- avoids cross-installer uninstall conflicts,
- and offers an in-app update path when release trust prerequisites are fully ready.

## Problem summary

Current release packaging can publish both Windows installer channels (`.msi` and NSIS `.exe`).
When users install with one channel and later run the other channel installer, upgrade behavior can be confusing and may require uninstall-first flows.

The app data model is local-first and upgrade-safe, but update UX is not yet explicit enough for non-technical users.

## Current baseline

- Local data is stored under `appData` (`global.db` and `profiles/<profileId>/profile.db`), not in install directories.
- Schema upgrades run in-app at runtime (global on open, profile on first profile access).
- Pre-migration snapshots and corruption recovery paths are already implemented.
- No in-app updater path is enabled yet.

## Scope

### In scope
- Windows installer channel policy and release asset clarity.
- Upgrade-path guard rails and diagnostics.
- Optional in-app update flow design and staged rollout.
- CI coverage for installer upgrade compatibility.

### Out of scope
- Linux package-manager update support.
- Full auto-update rollout before signing/trust policy is enforced.
- Replacing existing DB migration/recovery engine.

## Phased execution

## Phase 1: Channel policy and release clarity

- Define one primary Windows upgrade channel (recommended: MSI).
- Keep the secondary channel as explicit fallback/manual install only.
- Normalize release asset naming with channel + architecture markers.
- Add release notes copy: "Use the same installer type for upgrades."

Done when:
- users can identify the correct upgrade installer from filename and notes,
- maintainers publish one clearly preferred Windows installer path.

## Phase 2: App-side installer/channel awareness

- Detect current install channel via Windows uninstall metadata.
- Expose channel in diagnostics and support bundle metadata.
- Add UI warning when user is about to use mismatched installer channel.
- Add "Get latest update" action that links to the matching channel asset.

Done when:
- channel mismatch is detected before a failed upgrade attempt,
- support can confirm install channel from deterministic diagnostics.

## Phase 3: Guided in-app update flow (manual confirmation)

- Add in-app "Check for updates" and "Download update" entrypoint.
- Download only channel-compatible installer artifact.
- Before handoff to installer, trigger DB safety snapshot routine.
- Present explicit restart/install instructions and post-install validation checks.

Done when:
- update flow is available from app settings/help,
- successful guided update path does not require user channel decisions.

## Phase 4: Full updater integration (after trust readiness)

Precondition:
- release signing/notarization policy is enforced for distributed artifacts.

- Evaluate Tauri updater integration against signing and release-host constraints.
- Add staged rollout flags (off by default, canary, general availability).
- Keep manual installer fallback always available.

Done when:
- in-app updater can be enabled safely for signed release channels,
- fallback path remains deterministic if updater fails.

## Phase 5: CI and release hardening

- Add Windows upgrade matrix checks:
  - MSI -> MSI must pass,
  - NSIS -> NSIS must pass (if NSIS remains published),
  - cross-channel attempts must fail with deterministic user-facing guidance.
- Add data-retention assertions for appData across upgrade and uninstall-reinstall flows.
- Add release checklist gate for installer-channel labeling and notes.

Done when:
- CI blocks regressions in Windows upgrade reliability,
- release artifacts and notes are consistent with upgrade policy.

## Data safety invariants

- Never store user data in installer-owned directories.
- Upgrade flows must preserve `appData` by default.
- DB migrations remain append-only and runtime-applied.
- Backup/snapshot behavior must run before risky schema upgrades.

## Acceptance criteria

- Typical Windows user can upgrade without uninstall confusion when following recommended path.
- User profiles and history remain intact after supported upgrade flows.
- Cross-channel mismatch is detected early with a clear corrective action.
- CI verifies upgrade reliability paths before release publication.

## Risks and mitigations

- Risk: users continue downloading mismatched installer from release page.
  - Mitigation: clearer naming, preferred asset highlighting, in-app channel-aware links.
- Risk: updater introduces trust/security regressions.
  - Mitigation: gate updater rollout on signing policy enforcement and staged rollout flags.
- Risk: upgrade tests become flaky in CI.
  - Mitigation: deterministic VM fixtures and strict pass/fail criteria per scenario.

## Open decisions

1. Keep both MSI and NSIS long-term, or deprecate one channel.
2. Timing for updater plugin adoption relative to signing readiness.
3. Exact UX location for update controls (settings, help, or app shell header).
