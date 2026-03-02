# Changelog

## v0.2.11 - 2026-03-02
Summary: 1 fixes.
Comparing from v0.2.10 to HEAD.

### Fixes
- fix(ci): harden Windows sidecar filename normalization before ASR checksum manifest

## v0.2.10 - 2026-03-02
Summary: 1 fixes, 1 ci.
Comparing from v0.2.9 to HEAD.

### Fixes
- fix(ci): upload ASR checksum manifest after release creation

### CI
- ci(workflows): narrow recorder smoke trigger paths and stop unrelated website CI runs

## v0.2.9 - 2026-03-01
Summary: 41 features, 15 fixes, 15 docs, 68 refactors, 10 chores, 1 perf, 4 tests, 8 ci, 1 style, 4 other.
Comparing from v0.2.8 to HEAD.

### Features
- feat(domain): split recorder and asr ui ipc boundaries
- feat(asr): add checksum manifest verification and release publication
- feat(asr): add diagnostics bundle export command
- feat(asr): add sidecar doctor contract and compatibility gate
- feat(recorder): add telemetry budget diagnostics and smoke gates
- feat(recorder): add input device selection and calibration guidance
- feat(ui): add waveform style presets with persisted preference
- feat(recorder): add waveform telemetry and inline audio preview
- feat(recorder): decouple recording success from ASR blockers
- feat(ui): add quick record route and primary nav entrypoint
- feat(recorder): finalize shortcut parity and recovery guidance
- feat(recorder): stabilize quality hint transitions
- feat(recorder): add non-destructive trim apply flow
- feat(recorder): complete voice-memo workflow and dev-home tooling
- feat(recorder): add quick-clean trim preview skeleton
- feat(ui): add contextual markdown help and topic mapping
- feat(site): add Astro website and GitHub Pages pipeline
- feat(oss): switch to Apache-2.0 and add SignPath policy artifacts
- feat(security): enforce local SQL secret boundary and close ws7
- feat(db): add corruption recovery and diagnostics IPC
- feat(db): add pre-migration snapshots and diagnostics helpers
- feat(db): enforce aggregate transaction boundaries for peer import
- feat(db): enforce profile foreign keys in migration 0007
- feat(db): add ordered migration tracking and continuity checks
- feat(db): enforce sqlite pragma posture on open
- feat(preferences): add tauri-backed global/profile storage with fallback
- feat(ui): centralize preferences storage and add migration plan
- feat(feedback): add reviewed state and unread inbox filter
- feat(talk-define): add readiness checklist and completion score
- feat(builder): add framework challenge prompts and template apply
- feat(feedback): add direct practice actions from recommendations
- feat(training): add milestone achievement celebration card
- feat(feedback): add focused delta insight and next action
- feat(training): add daily loop mission checklist
- feat(feedback): route analysis results to focused timeline
- feat(training): add reward board tied to streak and credits
- feat(training): make quest map checkpoints open filtered quests
- feat(training): add weekly quest map progression panel
- feat(talks): add backend-driven mission blueprint panel
- feat(feedback): add timeline screen and primary nav flow
- feat(voiceup): add contextual mascot and adaptive gamification UX

### Fixes
- fix: ci
- fix(api): security domain
- fix(rust): remove clippy too-many-arguments in talk project repo writes
- fix(workspace): block profile switch during active recording
- fix(ui): remove duplicate AnalyzeResponseSchema import
- fix(site): handle custom-domain base links for downloads
- fix(ci): resolve UI typecheck duplicate import and Rust clippy ASCII-case lint
- fix(ui): import analyze response schema in app store
- fix(db): clean exported pack file on artifact insert failure
- fix(db): clean artifact files on row insert failure
- fix(db): compensate feedback artifact writes on link failures
- fix(db): compensate artifact writes on peer import failure
- fix(db): prevent partial feedback links on missing subjects
- fix(ui): resolve review findings for build, timeline races, and storage hygiene
- fix(about): remove unsafe html rendering and update storage review plan

### Docs
- docs(asr): add PowerShell VsDevCmd helper for sidecar build
- docs(plan): add recorder waveform strategy and creative presets
- docs(recorder): close waveform polish plan after validation
- docs(asr): add worktree checks and ops verification roadmap
- docs: record help-content and website rollout decisions
- docs(plan): mark tauri sql hardening as completed
- docs(ops): add db recovery runbook and close workstream 5
- docs(plan): add SQL hardening resume playbook
- docs(db): close Workstream 3 and define write contracts
- docs: image
- docs(migrations): document runtime DB migration and upgrade flow clearly
- docs(db): adopt rusqlite repo-query layering strategy
- docs(testing): make test matrix the single source of truth
- docs(plan): add SOTA Tauri/SQLite hardening track and execution plan
- docs(spec): add generic qa branch verification prompt

### Refactors
- refactor(talk): split project service reads and writes
- refactor(training): split quest service reads and submissions
- refactor(run): split domain service by use case
- refactor(coach): split repository progress and blueprint reads
- refactor(run): split repository lookups and writes
- refactor(feedback): split repository queries and mutations
- refactor(feedback): split timeline analyze context note modules
- refactor(asr): split model catalog and integrity modules
- refactor(coach): split mascot route message builders
- refactor(coach): split blueprint framework and steps modules
- refactor(exchange): split pack repository internals
- refactor(asr): split transcript punctuation rules module
- refactor(talk): split project repository read/write modules
- refactor(training): split quest repository read/write modules
- refactor(recorder): split recording runtime modules
- refactor(workspace): split repository queries and mutations
- refactor(exchange): isolate pack import flow
- refactor(exchange): isolate pack inspect flow
- refactor(exchange): split pack types and content helpers
- refactor(exchange): extract pack archive helpers
- refactor(exchange): split pack repository module
- refactor(asr): split transcript module by concern
- refactor(asr): extract live decoder strategy module
- refactor(asr): extract model downloader module
- refactor(asr): extract diagnostics module
- refactor(asr): extract settings normalization module
- refactor(coach): split domain logic into progress mascot blueprint
- refactor(feedback): split domain module into repo and types
- refactor(talk): split project domain into mod repo types
- refactor(workspace): split profile persistence into repo module
- refactor(training): split quest domain into mod repo types
- refactor(architecture): remove legacy core layer and direct imports
- refactor(core): reduce core to compatibility facade only
- refactor(asr): move transcript helpers to asr domain module
- refactor(recorder): move dsp and vad modules to domain layer
- refactor(feedback): move analysis engine into feedback domain
- refactor(platform): move db and asr sidecar infrastructure out of core
- refactor(asr): move asr runtime modules to domain layer
- refactor(kernel): move ids and time primitives out of core
- refactor(recorder): move recorder runtime modules to domain layer
- refactor(exchange): move pack and peer review to domain layer
- refactor(training): move quest services to domain layer
- refactor(feedback): move feedback services to domain layer
- refactor(talk): move project outline services to domain layer
- refactor(workspace): move profile workspace logic to domain layer
- refactor(architecture): make domain platform kernel primary topology
- refactor(asr): move live decoder strategy to core
- refactor(recorder): move input device services to core
- refactor(asr): move diagnostics bundle assembly to core
- refactor(audio): move recorder asr runtime config to core
- refactor(transcript): move edit metadata builder to core
- refactor(asr): move model download flow to core service
- refactor(recorder): move wav trim utilities into core domain
- refactor(asr): extract transcription runtime into core domain
- refactor(audio): remove deprecated audio_save_wav command
- refactor(ipc): enforce strict ASR payload contracts
- refactor(db): standardize coach module boundaries
- refactor(db): standardize run and preferences module boundaries
- refactor(db): extract coach read-model out of command layer
- refactor(db): extract preferences data access out of command layer
- refactor(db): extract run data access out of command layer
- refactor(db): centralize external file artifact registration
- refactor(db): unify artifact compensation across import flows
- refactor(domain): extract pack boundaries in rust and ui
- refactor(domain): extract talk boundaries in rust and ui
- refactor(domain): extract feedback boundaries in rust and ui
- refactor(domain): extract quest boundaries in rust and ui
- refactor(domain): extract workspace boundaries in rust and ui

### Chores
- chore(docs): update spec
- chore(core): remove migrated legacy run coach preferences modules
- chore(docs): asr update
- chore(docs): update readme
- chore(docs): add audio recorder images
- chore: sync main updates for ui validation and docs
- chore(site): ignore generated Astro metadata
- chore(docs): asset image
- chore(docs): fix readme markdownlint eof newline
- chore(domain): enforce structure guard rails in ci

### Tests
- test(db): add workspace transaction rollback coverage
- test(db): add migration upgrade-path fixtures
- test(guardrails): simplify domain matrix and centralize flow harness
- test(guardrails): add test matrix, CI obligations, and flow specs

### CI
- ci(asr): enforce sidecar doctor contract in release workflow
- ci(pages): standardize github-pages actions deploy and pnpm version
- ci(docs): enforce signpath oss compliance artifacts
- ci(release): support signpath or self-managed windows trust mode
- ci(release): add optional signing and notarization trust gates
- ci(db): enforce reliability thresholds and move sql hardening to ws7
- ci(db): add reliability gates for migrations and query plans
- ci: update release

### Perf
- perf: offload transcription work to blocking runtime and reduce recorder hot-path allocation

### Style
- style(rust): apply rustfmt for preference key normalization

### Other
- fix: harden recorder/session lifecycle, artifact path boundaries, sidecar cleanup, and query limits
- Fix formatting in dependabot.yml comments
- Merge branch 'main' of github.com:esandorfi/lepupitre

## v0.2.8 - 2026-02-28
Summary: 1 fixes, 8 docs, 1 chores.
Comparing from v0.2.7 to HEAD.

### Fixes
- fix(ci): remove unsupported lychee --exclude-mail flag

### Docs
- docs: update images
- docs(readme): refine branded header and adopt pinned markdownlint tooling
- docs(readme): clarify product value and broaden speaking audience
- docs(license): adopt FSL-1.1-MIT and refresh project tagline
- docs(ci): make CI path-aware and add markdown quality gates
- docs(policy): simplify docs/spec governance and archive legacy decision docs
- docs(refactor): simplify docs ownership and split contributor vs agent rules
- docs(oss): establish public docs model and spec boundary

### Chores
- chore: icon update

## v0.2.7 - 2026-02-27
Summary: 1 features, 2 fixes, 1 docs, 3 tests, 1 ci.
Comparing from v0.2.6 to HEAD.

### Features
- feat(onboarding): add first-run onboarding and help foundation (#1)

### Fixes
- fix(ui): make design guard path resolution cross-platform
- fix(ci): harden windows asr smoke sidecar resource checks

### Docs
- docs(release): define signing policy and hardening gate

### Tests
- test(ui): enforce core logic contracts for redesign safety
- test(ui): lock navigation and onboarding/help route contracts
- test(asr): add MR7 guardrail tests and voiceup draft spec

### CI
- ci: release asr

## v0.2.6 - 2026-02-26
Summary: 1 features, 1 fixes.
Comparing from v0.2.5 to HEAD.

### Features
- feat: sidebar - feature flag on

### Fixes
- fix(ci): create sidecar placeholders before Rust clippy/tests in Linux workflow

## v0.2.5 - 2026-02-26
Summary: 7 features, 1 docs.
Comparing from v0.2.4 to HEAD.

### Features
- feat: update asr
- feat: update asr generation
- feat: quest
- feat: ui talk and quest
- feat: ui split talk
- feat: talk count
- feat(ui): adapt workspace

### Docs
- docs: update design system

## v0.2.4 - 2026-02-24
Summary: 3 chores, 1 ci.
Comparing from v0.2.2 to HEAD.

### Chores
- chore(release): v0.2.3
- chore: add justfile
- chore(release): v0.2.2

### CI
- ci: fix release

## v0.2.3 - 2026-02-24
Summary: 2 chores, 1 ci.
Comparing from v0.2.2 to HEAD.

### Chores
- chore: add justfile
- chore(release): v0.2.2

### CI
- ci: fix release

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
