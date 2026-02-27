# spec_ui_design_macos_desktop_system

Status: Proposed implementation spec (next-phase foundation)

Purpose:

- convert the macOS desktop UI audit into enforceable implementation rules
- define exact typography, density, layout, and component patterns
- provide a migration plan that can be implemented incrementally

This spec complements:

- `docs/DESIGN_SYSTEM.md` (canonical implemented rules)
- `docs/archive/UI_AUDIT_MACOS_DESKTOP_REPORT.md` (historical audit + rationale)

When this spec is implemented/approved, the relevant rules must be merged into `docs/DESIGN_SYSTEM.md`.

## 1) Scope

Applies to:

- `desktop/ui/src/layouts/*`
- `desktop/ui/src/pages/*`
- `desktop/ui/src/components/*` (shared UI patterns)

Focus:

- macOS desktop visual density and layout behavior
- typography and control size standardization
- reusable page/component primitives
- workflow-consistent screen structure

Non-goals (for this spec):

- color token redesign (already covered by theme/color specs)
- full visual rebrand
- native AppKit component replacement

## 2) Product Workflow Model (Design Intent)

The UI must optimize two primary workflows:

1. `Training`
- quick practice launch
- quest selection
- feedback review
- history replay

2. `Talks`
- scan/manage talks
- step-based talk progression (`Define -> Builder -> Train -> Export`)
- review/export/import loops

Design rule:

- App-level navigation supports these workflows.
- Page-level context (breadcrumbs, titles, sub-actions) lives in page content, not the app toolbar.

## 3) macOS Desktop Design Principles (Implementation Rules)

1. Pointer-first density
- default controls should be desktop-sized, not touch-sized
- large controls are reserved for high-emphasis actions

2. Clear hierarchy
- title > body > meta
- avoid overuse of micro uppercase labels

3. Stable structure
- reuse page shells and section panels
- avoid rebuilding layout patterns in each page

4. Context separation
- toolbar = app-level navigation and utilities
- breadcrumb/page header = page-level context

5. Progressive disclosure
- primary actions visible
- secondary actions inline or contextual
- destructive actions behind confirmation

## 4) Typography Spec (Strict Desktop Ramp)

All page/component templates should use semantic classes mapped to these sizes.

## Typography scale (v1)

- `--font-size-caption`: `11px`
- `--font-size-meta`: `12px`
- `--font-size-body`: `13px`
- `--font-size-body-strong`: `13px` (semibold)
- `--font-size-subheadline`: `15px`
- `--font-size-section-title`: `17px`
- `--font-size-page-title`: `21px`

## Usage rules

- `11px` (`caption`) is only for tertiary metadata, badges, and helper microcopy.
- `12px` (`meta`) is default for secondary metadata and labels.
- `13px` (`body`) is the default app text size for dense desktop screens.
- `15px`+ is for content emphasis and section readability.
- Avoid arbitrary `text-[10px]` and `text-[11px]` in templates after migration.

## Migration rule

- New code must not introduce `text-[10px]` or `text-[11px]`.
- Existing occurrences are migrated page-by-page to semantic typography classes.

## 5) Control Density Spec (Desktop-First)

## Control height tiers

- `--control-h-xs`: `24px`
- `--control-h-sm`: `28px`
- `--control-h-md`: `32px` (default desktop button/input)
- `--control-h-lg`: `36px` (prominent in-page action)
- `--control-h-xl`: `44px` (hero CTA / recorder / onboarding)

## Usage rules

- Toolbar buttons, row actions, pill toggles: `sm` or `md`
- Standard page buttons/inputs: `md`
- Hero actions and recording actions: `lg` or `xl`
- `44px` controls must be justified by emphasis or touch-like interaction need

## Migration rule

- New screens default to `32px` controls.
- Existing `min-h-11` usage should be reduced in desktop-only contexts.

## 6) Radius Spec (Consistent Shape Language)

## Radius tiers

- `--radius-control`: `8px`
- `--radius-card`: `12px`
- `--radius-panel`: `14px`
- `--radius-large-panel`: `16px`
- `--radius-pill`: `9999px`

## Usage rules

- Inputs/buttons/dropdowns: control radius
- Dense row cards / item cards: card radius
- Main panels / page sections: panel radius
- Do not mix `rounded-lg/xl/2xl` arbitrarily in page templates

## 7) Spacing Spec (8px Base Grid)

## Spacing scale (v1)

- `4`, `8`, `12`, `16`, `24`, `32`, `40`, `48`

## Rules

- Panel padding defaults:
  - compact panel: `16px`
  - standard panel: `20px`
  - hero panel: `24px`
- Internal row/item padding should be consistent within a screen section.
- Avoid one-off `px/py` combinations unless part of a documented component variant.

## 8) App Shell Spec (macOS Desktop)

## Toolbar (App Bar)

Must contain only app-level controls:

- brand/home entry
- workspace switcher
- primary mode nav (`Training`, `Talks`, `Current talk`)
- utilities/settings menu

Must not contain:

- page breadcrumbs
- page-specific action clusters

## Toolbar behavior

- sticky/fixed top app bar
- content scrolls below the bar
- top bar remains visible during page scrolling

## “Current talk” nav button

- third primary nav item
- enabled when `activeProject` exists
- disabled when no active talk
- label format: `T# Title` (truncated)

## Breadcrumb placement

- render inside page content area, above page content
- style as page context, not toolbar chrome
- breadcrumb should be visually quieter than the page title

## 9) Page Shell Variants (Required Primitives)

These components should be implemented and reused.

## `PageShell`

Responsibilities:

- content width
- page padding
- optional breadcrumb slot
- optional page header slot

## `PageHeader`

Responsibilities:

- title
- subtitle / supporting copy
- primary/secondary actions
- compact metadata row

Variants:

- `standard`
- `compact`
- `hero`

## `SectionPanel`

Responsibilities:

- consistent surface/border/radius/padding
- optional title row
- optional header action slot

Variants:

- `compact`
- `default`
- `dense-list`

## `EntityRow`

Responsibilities:

- standard row layout for selectable/openable items
- left identity, center content, right actions/meta
- desktop density defaults

Use for:

- talks list rows (future table/list migration)
- picker rows
- history rows

## 10) Screen-Specific Layout & Workflow Spec

## A. `Training` screen

Primary goal:

- launch a quest quickly and review activity

### Layout (desktop, v2 target)

- `>= 1024px`: 2-column layout
  - left (main): hero quest + quest picker
  - right (side): activity panel (Feedback/History tabs)
- `< 1024px`: single column stack (current structure acceptable)

### Interaction rules

- `Change quest` selects hero quest (does not auto-launch)
- row `Start now` launches immediately
- hero quest selection may persist locally per workspace
- activity panel tabs should preserve keyboard accessibility

## B. `Talks` screen

Primary goal:

- scan and open talks efficiently

### Short-term (current card list)

- show stage badge in title row
- show compact metadata line (`Target`, `Last activity`)
- keep open/select actions compact

### Medium-term (target)

- migrate to dense list/table view with columns:
  - Talk
  - Stage
  - Target
  - Last activity
  - Active status
  - Actions

## C. `Talk` step pages (`Define`, `Builder`, `Train`, `Export`)

Primary goal:

- progress one talk through a clear workflow

### Requirements

- shared `TalkStepPageShell` primitive
- shared page header structure
- consistent summary metadata strip
- step tabs always present
- stage progression reflected in UI

### Stage behavior

- stage can be edited in `Define`
- stage auto-advances from key actions:
  - Builder actions -> at least `builder`
  - Train actions -> at least `train`
  - Export actions -> at least `export`
- stage auto-advance must be non-blocking to primary action completion

## D. `Quest` screen

Primary goal:

- complete a single quest efficiently

### Required flow

- brief -> capture -> submit -> analyze
- no auto-analyze for text
- audio analyze requires transcript

### Desktop UX guidelines

- prioritize focus and readability over stacked cards
- add keyboard shortcuts (future phase)
- keep state labels clear and minimal

## 11) Component Pattern Rules (Strict)

## Buttons

Variants:

- `primary`
- `secondary`
- `ghost`
- `danger`
- `info`

Rules:

- define fixed height variants (`sm`, `md`, `lg`) and use them consistently
- avoid ad-hoc padding/height combinations in page templates
- icon-only buttons require label/title and visible focus ring

## Inputs

Rules:

- default desktop height `md` (`32px`)
- multiline textareas define explicit minimum heights per use case
- no nested/double borders

## Pills/Chips

Rules:

- use only for status, filter, or compact metadata
- avoid turning every label into a pill
- status pills should have consistent density (caption/meta scale)

## Cards/Panels

Rules:

- panels and cards must come from primitives or semantic classes with documented variants
- avoid mixing panel/card radii and paddings within one screen section

## 12) Accessibility and Keyboard Spec

Required for interactive lists/pickers:

- `Tab` focus order sensible
- `ArrowUp/ArrowDown` navigation where list acts like chooser
- `Enter` primary action
- `Escape` closes picker/dialog

Text/readability:

- do not rely on 10px text for important information
- ensure contrast in both themes

## 13) Implementation Rules (Enforcement)

## New code constraints

- no new arbitrary font-size utilities (`text-[...]`) in pages/components without explicit justification
- no new arbitrary radius utilities for common controls/panels
- no new `min-h-11` for standard desktop controls unless it is a hero/recorder/high-emphasis control

## Preferred implementation pattern

- use semantic component/primitives + semantic classes
- use Tailwind for layout only (spacing/positioning/responsive)
- avoid page-local reinvention of headers/panels/rows

## Suggested lint/CI checks (follow-up)

- warn on `text-[10px]`, `text-[11px]` usage
- warn on `min-h-11` usage outside approved components
- warn on repeated panel inline patterns once primitives exist

## 14) Migration Plan (Concrete)

## Phase 1: Typography and density foundation

Tasks:

- add semantic typography classes (`app-text-caption`, `app-text-meta`, `app-text-body`, etc.)
- add control size utility classes (`app-control-sm/md/lg`)
- add panel/card radius utility classes or primitive wrappers
- update `docs/DESIGN_SYSTEM.md` with exact ramps and tiers

Acceptance:

- no new arbitrary text sizes in changed files
- top-level screens use semantic text sizes for titles/meta

## Phase 2: Primitive component rollout

Tasks:

- implement `PageShell`, `PageHeader`, `SectionPanel`
- implement `TalkStepPageShell`
- refactor `TalkDefine`, `TalkBuilder`, `TalkTrain`, `TalkExport`

Acceptance:

- talk step pages share the same structural shell
- visual spacing/radius consistency improves without page-local overrides

## Phase 3: Desktop workflow layout upgrades

Tasks:

- `Training`: 2-column desktop layout
- `Talks`: dense list/table redesign
- breadcrumb styling refinement (page-context style)

Acceptance:

- visible reduction in page vertical sprawl
- improved scan speed in `Talks`

## Phase 4: Enforcement and polish

Tasks:

- CI checks for typography/density drift
- keyboard navigation audit across screens
- utility/admin screen normalization

Acceptance:

- UI changes stop introducing arbitrary sizing drift
- keyboard parity available in major workflows

## 15) Acceptance Checklist For UI PRs (Desktop SOTA Track)

- Uses documented typography tiers (no ad-hoc micro sizes)
- Uses documented control height tiers
- Uses page primitives (or includes justification)
- Keeps app-level vs page-level context separated
- Keyboard interactions work for list/picker screens
- Works in Light and Dark
- `just ui-smoke` passes

## 16) Notes for Current Codebase

Current implementation already aligns with parts of this spec:

- fixed/sticky app bar + scrolling body
- breadcrumbs moved out of app bar
- current talk nav button
- training quest picker keyboard support
- stage progression hooks in talk workflow

This spec formalizes the next step: consistency and desktop density.
