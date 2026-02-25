# Design System Rules

This document defines reusable UI/UX rules for Lepupitre screens and components.
It is the implementation-facing version of the UI specs (including theme colors and the workspace switcher decisions).

## Status & Precedence (Single Source of Truth)

- `docs/DESIGN_SYSTEM.md` is the single source of truth for **implemented and approved UI rules**.
- If this document conflicts with older UI proposal/spec files, this document wins for implementation work.
- The following spec files remain useful as historical/proposal context, but are not the canonical implementation contract:
  - `spec/spec_ui_design_system.md`
  - `spec/spec_ui_design_theme_colors.md`
- When a new UI rule is implemented or approved in review, update this document in the same change set.

### Current consolidation status

- Consolidated from `spec/spec_ui_design_theme_colors.md`:
  - semantic token architecture (`--color-*` canonical)
  - `--app-*` compatibility alias strategy
  - Nuxt UI `--ui-*` bridge strategy
  - light/dark theme behavior and contrast rules
- Consolidated from `spec/spec_ui_design_system.md`:
  - switcher/list interaction model
  - action hierarchy and destructive-action handling
  - inline rename behavior
  - accessibility/copy conventions
- Not fully consolidated yet (keep in product/page specs until implemented):
  - complete App Shell layout spec (exact header heights, page structure variants)
  - page-specific IA and screen copy for every page

### Companion docs (audit + upcoming implementation spec)

- `docs/UI_AUDIT_MACOS_DESKTOP_REPORT.md` (UI/UX audit and macOS desktop direction analysis)
- `spec/spec_ui_design_macos_desktop_system.md` (concrete desktop design system implementation spec)

## 1) Core Rules (always apply)

- Use Tailwind utilities for layout, spacing, sizing, positioning, and responsive behavior.
- Use semantic `app-*` classes and semantic CSS variables for color, surface, and typography roles.
- Theme values must live in CSS variables so theme switching stays global and consistent.
- Component code should reference semantic roles, not hex colors or palette names.
- Design decisions must remain usable in both light and dark themes.

## 2) Token Architecture Rules

### Canonical source of truth

- `--color-*` tokens are the canonical semantic layer.
- `--app-*` tokens are compatibility aliases (migration layer / ergonomic class bridge).
- `--ui-*` tokens are Nuxt UI bridge tokens and should derive from the same semantic values.

### Token usage hierarchy

- Components should prefer semantic classes (`app-text`, `app-input`, `app-button-*`) before direct CSS variable usage.
- When a component must use custom inline styles, use semantic token-derived values, not palette literals.
- Component-specific tokens (e.g. toolbar variants) must be derived from semantic tokens, not defined as independent palette roots.

### Required semantic roles (minimum)

- Surfaces: `--color-bg`, `--color-surface`, `--color-surface-elevated`
- Text: `--color-text`, `--color-text-muted`, `--color-text-dimmed`
- Borders: `--color-border`, `--color-border-muted`
- Actions: `--color-accent`, `--color-accent-hover`, `--color-accent-soft`, `--color-on-accent`
- States: `--color-danger`, `--color-danger-soft`, `--color-danger-text`, `--color-on-danger`, `--color-success`, `--color-info`
- Focus: `--color-focus`

## 3) Theme Rules (Light/Dark)

- UI labels should use `Light` / `Dark` (FR: `Clair` / `Sombre`).
- Internal theme IDs may remain implementation-specific (`orange`, `terminal`) for compatibility.
- Default theme is Light (current implementation uses `orange`).
- Any per-workspace visual override (e.g. navbar color) must provide values for both light and dark themes.
- Contrast must remain acceptable for:
  - primary text
  - muted text
  - focus ring
  - destructive actions
  - selected row states

### Theme implementation rules (repo-specific)

- Theme preference is global and persisted locally.
- UI labels use `Light` / `Dark`, while internal theme IDs may remain `orange` / `terminal` for compatibility.
- Per-entity color overrides (e.g. workspace navbar color) must be defined as theme-aware pairs (light + dark values).
- Palette options for per-entity colors must be visibly distinct from the default light theme orange.

## 4) Layout, Typography, and Primitive Component Rules

These are reusable baseline rules extracted from the UI design spec and aligned with the current implementation style.

### Layout and spacing

- Use an 8px spacing scale (`8, 16, 24, 32, 48...`).
- Prefer consistent panel/card padding in the `16-24px` range.
- Prefer rounded corners in the `10-16px` range depending on component density.
- Use larger radii for panels/popovers than for dense controls.

### Typography

- Base body size defaults to `16px`.
- Titles should prioritize clarity over style contrast (avoid decorative weight jumps).
- Secondary/meta text should use semantic muted roles (`app-muted`, `app-subtle`) rather than reduced opacity hacks.

### Buttons

- Primary button = filled accent (`app-button-primary`).
- Secondary button = outlined/neutral (`app-button-secondary`) and preferred inside lightweight switchers/popovers unless create is the dominant task.
- Icon-only buttons require accessible labels and visible focus styling.
- Practical minimum hit target is ~44x44px where layout permits.

### Inputs

- Inputs must use semantic input styling (`app-input`) and visible focus state (`app-focus-ring`).
- Do not rely on placeholders as the only label in forms.
- Avoid nested/double borders for inline editing contexts.

### States and feedback

- Loading actions should disable duplicate interactions and show local feedback (spinner/ellipsis).
- Use inline field errors for local validation problems.
- Use toasts for global context changes when available (switch/create/delete confirmations).

## 5) List & Switcher Interaction Rules (reusable pattern)

Use these rules for workspace switchers, project pickers, and similar “choose one item” panels.

### Selection model

- Row click is the primary action (`tap row = select/open/switch`).
- Do not add a separate visible `Open` button inside the row unless there is a second primary action.
- Current/selected item should be indicated by row background/highlight, not by an extra CTA chip/button.
- Keep list order stable when selecting an item (avoid re-sorting selected item to top unless the user explicitly sorted by “Current”).

### Row actions

- Keep destructive or secondary actions separated from the row tap target.
- Use a `⋯` actions menu for low-frequency actions (rename, delete, advanced settings).
- The actions menu must render as an overlay (not clipped by list overflow).
- Avoid nested overlays inside scrollable list rows when simpler alternatives exist.

### Information density

- Row title is the primary content.
- Metadata (size, date, counts) should be visually secondary.
- Do not let metadata compete with the selection/action hierarchy.

## 6) Inline Edit Rules (rename pattern)

Use for rename or quick-edit fields inside lists.

- Entering rename mode should:
  - replace row label with a full-width input
  - auto-focus the input
  - select the current text
- Clicking away should close the editor immediately and attempt save automatically.
- `Enter` saves.
- Avoid explicit Save/Cancel buttons for simple rename in dense list contexts (unless errors require a richer flow).
- If save fails, show inline error text outside the input and keep the list usable.
- Avoid double borders around inline rename (do not wrap a bordered input inside another bordered card unless visually intentional).

## 7) Action Hierarchy Rules

- One clear primary action per panel section.
- For lightweight panels (switchers/popovers), use secondary styling for create actions unless creation is the dominant task.
- Destructive actions must:
  - live behind an action menu or a dedicated confirmation step
  - use danger styling only at the final confirmation step

## 8) Personalization Color Rules (workspace/project identity)

These rules apply to per-entity color personalization (workspace, project, etc.).

- Entity color is an identity token, not only decoration.
- Show it consistently in compact form (dot/swatch) in headers and lists.
- Do not rely on color alone to indicate selection/state.
- Color controls must be simple:
  - If color change is frequent, allow a one-click cycle action.
  - If many colors exist, use a curated palette picker (named colors).
- The currently selected entity may use its assigned color as background/highlight if text contrast is preserved.
- If color is used as selected background, provide a subtle affordance (hover cue, icon, tooltip) to indicate it is interactive.
- Palette colors must be visually distinct from the default theme color.

## 9) Navigation/Header Rules

- Header pills should communicate current context (workspace/project) clearly.
- Avoid profile/account visual language when the object is a workspace.
- Keep header context labels short; remove prefixes like `WS ·` unless ambiguity exists.

## 10) Accessibility Rules

- All icon-only buttons must have accessible labels.
- Focus rings must be visible and consistent across themes.
- Color-based personalization must include non-color signals for state (e.g. checkmark for selected).
- Tap/click targets should be at least ~44px where practical.
- Menus and list actions must not be clipped by scroll containers (overlay/collision handling required).
- Keyboard support for switcher/list UIs should include:
  - open/close
  - arrow navigation
  - Enter to select
  - Escape to close/cancel edit

## 11) Copy Rules

- Prefer action-oriented titles in panels (e.g. `Switch workspace`, not only `Workspaces`).
- Avoid redundant action labels in rows when the whole row already performs the action.
- Use human-readable units for size if shown (`MB`, `GB`) and keep them secondary.

## 12) Implementation Rules for This Repo

### Styling

- Edit theme tokens in `desktop/ui/src/assets/main.css`.
- Prefer semantic class reuse before introducing new component-specific classes.
- Add small targeted classes only when the semantic utility set is insufficient.
- Keep `--color-*` as canonical; derive `--app-*` and `--ui-*` from the same semantic source.

### UI Components

- Workspace switcher patterns live in `desktop/ui/src/components/WorkspaceSwitcher.vue` and should be treated as the reference pattern for list switchers.
- Reuse the same interaction rules for future switchers (projects, sessions, etc.) unless product needs differ.

### Business Logic vs Design Naming

- Business/domain names belong to stores/state/components (`profile`, `project`, `quest`, `run`).
- Design names belong to tokens/classes (`surface`, `accent`, `muted`, `danger`).
- Avoid mixing domain terms in CSS class names unless the style is truly domain-specific.

## 13) Change Checklist (before merging UI work)

- Uses semantic tokens/classes (no hardcoded palette hex in component styles)
- Uses canonical token flow (`--color-*` -> `--app-*` / `--ui-*`) where applicable
- Works in Light and Dark
- Selected state is visually clear
- Row actions do not interfere with row selection
- Overflow/overlay behavior is not clipped
- Inline edit auto-focus and click-away save work
- Icon buttons have labels
- `just ui-smoke` passes
