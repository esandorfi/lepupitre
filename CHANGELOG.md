# Changelog

## v0.2.2 - 2026-02-23
Summary: 1 features, 1 chores.
Comparing from v0.2.1 to HEAD.

### Features
- feat: ui system design for appbar

### Chores
- chore: ci

## v0.2.1 - 2026-02-23
Summary: 1 features, 1 fixes, 4 chores.
Comparing from v0.2.0 to HEAD.

### Features
- feat: ui system design for appbar

### Fixes
- fix: misc

### Chores
- chore: ci
- chore(release): bump version to 0.2.1
- chore: ci
- chore(release): v0.2.0

## v0.2.0 - 2026-02-23
Summary: 19 features, 5 fixes, 2 docs, 5 chores, 1 perf, 1 tests, 7 ci, 1 other.
Comparing from v0.1.2 to HEAD.

### Features
- feat(settings): add ASR sidecar readiness badge
- feat(settings): add spoken‑punctuation toggle for final transcripts
- feat(ui): add Settings link for missing ASR model
- feat(ui): surface ASR errors with friendly messages
- feat(asr): cap final transcript segment volume
- feat(asr): add decode performance warnings
- feat(asr): add live decode backoff on sidecar errors
- feat(asr): harden live transcript segment handling
- feat(asr): consume sidecar progress during final decode
- feat(asr): add tiny auto-benchmark to gate live mode
- feat(transcription): align final chunk window to 12s
- feat(transcription): chunk final decode + emit progress
- feat(transcription): run final pass via sidecar with settings
- feat(asr): pass model/mode/language settings into live sidecar init
- feat(asr): add stub sidecar binary + build script
- feat(asr): resolve bundled sidecar path automatically
- feat(asr): scaffold live streaming loop + stabilization
- feat(asr): add live transcript events and VAD/AGC wiring (MR4)
- feat(asr): add MR1 contracts, settings UI skeleton, and ADR

### Fixes
- fix(transcription): accept transcribe_audio args without payload wrapper
- fix(ui): make download progress update + hide action buttons while downloading
- fix(events): enforce tauri-safe ASR names with runtime guard
- fix(vad): VAD end‑silence test needed 700ms of silence (14×50ms frames).
- fix(recording): make cpal capture Send‑safe and get tests green

### Docs
- docs(asr): update ADR + plan status
- docs: lock model storage path in ADR + plan

### Chores
- chore(docs): document local sidecar dev flow and revert binary
- chore(asr): add dev-only sidecar missing warning
- chore(ci): build ASR sidecar in release packaging
- chore(asr): silence progress warning
- chore(asr): bundle sidecar placeholders + doc it

### Tests
- test(transcription): add WAV decode coverage

### CI
- ci(release): cache tiny model for ASR smoke tests
- ci(release): verify model checksum in ASR smoke tests
- ci(release): run ASR smoke tests on macOS + Windows
- ci: release
- ci: update
- ci: update release packaging
- ci: update release

### Perf
- perf(settings): cache model checksums + add verify action

### Other
- Bump to 0.1.2

## v0.1.2 - 2026-02-22
Summary: 1 chores.
Comparing from v0.1.1 to HEAD.

### Chores
- chore: distribution settings

## v0.1.1 - 2026-02-22
Summary: 17 features, 2 fixes, 1 chores, 14 other.
Initial release notes.

### Features
- feat(peer-review): surface imported reviews and harden pack inspection
- feat(packs): create peer-review talks on import and add packs nav
- feat(packs): add pack export/import flow + UI wiring
- feat(builder): add outline persistence and markdown export
- feat(talk-report): list all boss runs in timeline
- feat(boss-run): add run pipeline, UI flow, and feedback context
- feat(nav): add breadcrumb row for talk/quest/feedback
- feat(nav): move profiles to toolbar and add active quest tab
- feat(ux): add talks list, quest follow-up, and feedback notes
- feat(quests): route home audio to quest + add free quest
- feat(feedback): add analysis pipeline for text attempts
- feat(transcription): add mock transcript jobs + UI wiring
- feat(artifacts): store audio takes as profile artifacts
- feat(theme): add orange/terminal theme switcher
- feat(i18n): localize core UI for en/fr
- feat: reframe “Project” as “Talk” and de-emphasize profile
- feat: add profile rename/delete and restructure Profiles UX

### Fixes
- fix(db): soften runs rebuild lock + retry insert on NOT NULL
- fix(ui): space boss run link and add talk timeline with boss runs

### Chores
- chore: spec updates

### Other
- Update spec ui colors
- Update UI design system specification
- Create specification document for transcription feature
- Implemented the Pass 1/2 backend slice: SQLite-backed profile/project/quest commands plus a core module layout, migrations/seed loading, and ID/timestamp helpers. Active project is currently “most recently updated” (no explicit active flag yet), which keeps the schema aligned with the existing migration.
- Implemented the security spike scaffolding so you can validate least‑privilege behavior from the UI, plus a dev‑only backend probe.
- Updated the button label to “Reveal file” (no spaced-out caps) and implemented OS‑specific reveal behavior:
- Added a safe “Open file” action and live recording telemetry (level meter + input sample rate/channels) so you can see signal activity while recording and open the saved WAV with the OS default app.
- Started the Pass 0 spike plumbing: a minimal WAV 16k mono recorder in the UI that saves to appdata via a new Tauri command, plus stricter CSP and mic usage description for least‑privilege alignment.
- • Bootstrapped Pass 0 with a Tauri v2 + Vue/Nuxt UI workspace aligned to the spec, added CI, and seeded the initial DB scaffolding while tightening default capabilities for least privilege.
- Update docs
- Create UI specification document
- Add starter kit documentation
- Initial spec
- Initial commit

