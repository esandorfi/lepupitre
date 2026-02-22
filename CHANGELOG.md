# Changelog

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

