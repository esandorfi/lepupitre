# Documentation Status Ledger

Snapshot date: 2026-02-27

This file tracks what is canonical, proposal-only, and archived.

## Canonical docs (active source of truth)

| Path | Role | State | Owner | Next action |
|---|---|---|---|---|
| `README.md` | OSS overview and onboarding | implemented | Maintainers | Keep release/security sections current |
| `docs/ARCHITECTURE.md` | Architecture and release operations | implemented | Maintainers | Keep CI/signing instructions current |
| `docs/README.md` | Documentation map and writing rules | implemented | Maintainers | Keep map aligned with real files |
| `docs/IMPLEMENTATION_PLAN.md` | Current execution priorities | implemented | Maintainers | Update tracks when scope changes |
| `docs/DESIGN_SYSTEM.md` | Implemented and approved UI rules | implemented | UI maintainers | Keep implementation-only scope |
| `docs/CONTRIBUTION_RULES.md` | Repository process gates | accepted | Maintainers | Keep contributor requirements explicit |
| `docs/DOCS_GOVERNANCE.md` | Lifecycle and anti-drift policy | accepted | Maintainers | Enforce in doc PRs |
| `docs/CODEX_RULES.md` | Agent-only behavior rules | accepted | Maintainers | Keep aligned with `AGENTS.md` |
| `docs/adr/*` | Decision records | implemented | Maintainers | Ensure each ADR has explicit status |
| `docs/plan/PLAN-WHISPER-LOCAL-TRANSCRIPTION.md` | ASR deep plan | implemented | ASR maintainers | Keep synchronized with implementation |

## Proposal docs (`spec/`)

| Path | Scope | State | Owner | Next action |
|---|---|---|---|---|
| `spec/README.md` | Spec workspace contract | accepted | Maintainers | Keep aligned with governance |
| `spec/spec_VOICEUP.md` | Product direction | proposed | Product | Convert approved parts into executable plan items |
| `spec/spec_ui_help_contextual_assistance.md` | Help/onboarding architecture proposal | proposed | UI/Product | Keep as proposal for now |
| `spec/help-content/*` | Help/onboarding editorial drafts | proposed | Product | Keep format unchanged for now |
| `spec/spec_ui_design_macos_desktop_system.md` | Next-phase UI system | proposed | UI | Promote approved rules into `docs/DESIGN_SYSTEM.md` |
| `spec/spec_ui_design_talk.md` | Training/Talk IA proposal | proposed | UI/Product | Extract remaining implementation decisions |
| `spec/spec_whisper.md` | Long-form ASR spec | proposed | ASR | Consolidate or supersede with `docs/plan` content |
| `spec/spec_ui_design_system.md` | Earlier UI proposal | superseded | UI | Move to `spec/archive/` after final extraction |
| `spec/spec_ui_design_theme_colors.md` | Earlier theme proposal | superseded | UI | Move to `spec/archive/` after final extraction |
| `spec/spec_ui_dna_design_system.md` | Early UI draft | draft | UI | Decide keep vs archive |
| `spec/spec_ui.md` | Initial UI RFC | draft | Maintainers | Keep as historical root only |
| `spec/spec_lepupitre.md` | Initial architecture draft | draft | Maintainers | Keep as historical root only |
| `spec/spec_lepupitre_hub_api.md` | Hub API draft | draft | Hub/API | Revalidate before implementation |
| `spec/starterkit.md` | Starter scaffold note | archived | Maintainers | Move to `spec/archive/` |

## Archived docs (`docs/archive/`)

| Path | Reason |
|---|---|
| `docs/archive/SPEC_COHERENCE_REVIEW.md` | Historical baseline review; no longer active implementation contract |
| `docs/archive/UI_AUDIT_MACOS_DESKTOP_REPORT.md` | Historical audit baseline replaced by current design system + active specs |

## Immediate cleanup queue
1. Create `spec/archive/` and move files already marked `archived`.
2. Resolve overlap between `spec/spec_whisper.md` and `docs/plan/PLAN-WHISPER-LOCAL-TRANSCRIPTION.md`.
3. Add explicit status (`Accepted` or `Superseded`) in ADR files still missing it.
