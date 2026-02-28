# Documentation Status Ledger

Snapshot date: 2026-02-28

This file tracks what is canonical, proposal-only, and archived.

## Canonical docs (active source of truth)

| Path | Role | State | Owner | Next action |
|---|---|---|---|---|
| `README.md` | Product and user onboarding | implemented | Maintainers | Keep install and trust-level notes current |
| `docs/ARCHITECTURE.md` | Architecture/operations hub | implemented | Maintainers | Keep links aligned with subpages |
| `docs/architecture/overview.md` | Architecture baseline | implemented | Maintainers | Keep module and security model current |
| `docs/architecture/ipc-contracts.md` | IPC contract rules | implemented | Maintainers | Keep Rust/Zod alignment requirements explicit |
| `docs/architecture/asr.md` | ASR architecture and troubleshooting | implemented | ASR maintainers | Keep sidecar invariants current |
| `docs/operations/release.md` | Release operations runbook | implemented | Maintainers | Keep CI path filters and channel steps current |
| `docs/operations/signing.md` | Signing/notarization policy | accepted | Maintainers | Move to implemented when release gate is active |
| `docs/README.md` | Documentation map and writing rules | implemented | Maintainers | Keep map aligned with real files |
| `docs/IMPLEMENTATION_PLAN.md` | Current execution priorities | implemented | Maintainers | Update tracks when scope changes |
| `docs/CONTRIBUTION_RULES.md` | Repository process gates | accepted | Maintainers | Keep contributor requirements explicit |
| `docs/DOCS_GOVERNANCE.md` | Lifecycle and anti-drift policy | accepted | Maintainers | Enforce in doc PRs |
| `AGENTS.md` | Agent-only behavior rules | accepted | Maintainers | Keep aligned with governance docs |
| `docs/plan/PLAN-WHISPER-LOCAL-TRANSCRIPTION.md` | ASR deep plan | implemented | ASR maintainers | Keep synchronized with implementation |

## Active spec docs (`spec/active/`)

| Path | Scope | State | Owner | Next action |
|---|---|---|---|---|
| `spec/README.md` | Spec workspace contract | accepted | Maintainers | Keep aligned with governance |
| `spec/active/README.md` | Active spec index | accepted | Maintainers | Keep groups and rules current |
| `spec/active/DECISIONS.md` | Current decision log | accepted | Maintainers | Use for all new major decisions |
| `spec/active/product/SPEC-VOICEUP.md` | Product direction | proposed | Product | Convert approved parts into executable plan items |
| `spec/active/ui/SPEC-UI-HELP-CONTEXTUAL-ASSISTANCE.md` | Help/onboarding architecture proposal | proposed | UI/Product | Keep as proposal for now |
| `spec/active/help-content/*` | Help/onboarding editorial drafts | proposed | Product | Keep format unchanged for now |
| `spec/active/ui/SPEC-UI-DESKTOP-SYSTEM.md` | Next-phase UI system | proposed | UI | Keep as active UI reference during redesign |
| `spec/active/ui/SPEC-UI-TALK-FLOW.md` | Training/Talk IA proposal | proposed | UI/Product | Extract remaining implementation decisions |
| `spec/active/asr/SPEC-ASR-WHISPER.md` | Long-form ASR spec | proposed | ASR | Consolidate or supersede with `docs/plan` content |

## Archived spec docs (`spec/archive/`)

| Path | Scope | State | Owner | Next action |
|---|---|---|---|---|
| `spec/archive/README.md` | Archive usage contract | accepted | Maintainers | Keep archive policy explicit |
| `spec/archive/spec_ui_design_system.md` | Earlier UI proposal | superseded | UI | Keep for historical traceability |
| `spec/archive/spec_ui_design_theme_colors.md` | Earlier theme proposal | superseded | UI | Keep for historical traceability |
| `spec/archive/spec_ui_dna_design_system.md` | Early UI draft | archived | UI | Keep for historical traceability |
| `spec/archive/spec_ui.md` | Initial UI RFC | archived | Maintainers | Keep as historical baseline |
| `spec/archive/spec_lepupitre.md` | Initial architecture draft | archived | Maintainers | Keep as historical baseline |
| `spec/archive/spec_lepupitre_hub_api.md` | Hub API draft | archived | Hub/API | Revalidate before any implementation |
| `spec/archive/starterkit.md` | Starter scaffold note | archived | Maintainers | Keep as historical baseline |

## Archived docs (`docs/archive/`)

| Path | Reason |
|---|---|
| `docs/archive/SPEC_COHERENCE_REVIEW.md` | Historical baseline review; no longer active implementation contract |
| `docs/archive/UI_AUDIT_MACOS_DESKTOP_REPORT.md` | Historical audit baseline replaced by active UI specs |
| `docs/archive/DESIGN_SYSTEM.md` | Archived implementation contract while UI is redesigned |
| `docs/archive/adr/*` | Historical ADR baseline; no new ADRs maintained |

## Immediate cleanup queue
1. Resolve overlap between `spec/active/asr/SPEC-ASR-WHISPER.md` and `docs/plan/PLAN-WHISPER-LOCAL-TRANSCRIPTION.md`.
