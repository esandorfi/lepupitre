# UI Color System & Nuxt UI Token Extraction Report

## Scope and objective
This report reviews the **current UI color system** in the repository, then challenges and refines the proposed semantic token model for the Orange/Terminal themes with a focus on:

- theme coherence (single semantic vocabulary)
- compatibility with Nuxt UI token mechanics
- maintainability for future component growth

## 1) Current state in this codebase

### 1.1 Theme implementation model
The UI currently uses CSS custom properties under `:root` and theme overrides via `:root[data-theme="orange"]` and `:root[data-theme="terminal"]`. The implementation is semantic-ish but names are app-specific (`--app-*`) and partly component-oriented (`--app-toolbar-*`, `--app-pill-*`).【F:desktop/ui/src/assets/main.css†L4-L141】

Theme switching is global, persisted in localStorage under `lepupitre_theme`, with default fallback to `orange`, then applied to `document.documentElement.dataset.theme`.【F:desktop/ui/src/lib/theme.ts†L3-L44】

### 1.2 Nuxt UI usage and integration status
Nuxt UI is installed and bootstrapped as a Vue plugin (`@nuxt/ui/vue-plugin`) and its styles are imported (`@import "@nuxt/ui"`).【F:desktop/ui/package.json†L12-L18】【F:desktop/ui/src/main.ts†L1-L13】【F:desktop/ui/src/assets/main.css†L1-L2】

In templates, usage appears intentionally limited; `UBreadcrumb` is the clearest live Nuxt UI component usage, while most styling is custom class-driven (`app-*`).【F:desktop/ui/src/layouts/AppShell.vue†L193-L199】

### 1.3 Existing color tokens inventory (current app layer)
The current `--app-*` token set includes foundation colors plus many component/state aliases:

- Foundation-like: `--app-bg`, `--app-surface`, `--app-card`, `--app-text`, `--app-muted`, `--app-border`, `--app-accent`, `--app-danger`, etc.
- Component-bound: `--app-toolbar-*`, `--app-pill-*`, `--app-breadcrumb-sep`, `--app-input-bg`, `--app-meter-bg`.

These are defined in three places (base `:root` + explicit orange + explicit terminal), which duplicates most values for orange and increases drift risk.【F:desktop/ui/src/assets/main.css†L4-L141】

## 2) Nuxt UI token mechanism relevant to extraction
Nuxt UI v4 generates semantic runtime CSS variables centered around `--ui-*` (e.g. `--ui-bg`, `--ui-bg-elevated`, `--ui-text`, `--ui-border`, `--ui-border-muted`) and maps them into utility-level semantic aliases (`--background-color-*`, `--text-color-*`, `--border-color-*`, etc.).【F:desktop/ui/node_modules/@nuxt/ui/dist/shared/ui.Ddb3hKxo.mjs†L7636-L7682】

**Practical implication:**
You can bridge your app semantic tokens to Nuxt UI by assigning `--ui-*` from your semantic layer (or the reverse), enabling consistent rendering between custom CSS classes and Nuxt UI components.

## 3) Evaluation of the proposed token model

Your proposal is directionally strong because it uses semantic role tokens (`color.bg`, `color.text`, `color.accent`) instead of direct palette names in components.

### 3.1 Strengths
- Correct separation: component code references roles, not palette hex.
- Good minimum roles for base UI surfaces + stateful actions.
- Includes dark mode + explicit on-color contrast tokens (`onAccent`, `onDanger`).

### 3.2 Coherence gaps to close
1. **Naming mismatch with existing system**
   Current code uses `--app-*`; proposal uses dotted `color.*` nomenclature. Keep one canonical naming convention in CSS (e.g. `--color-bg`) and map to legacy aliases for migration.

2. **Missing nuanced text/bg roles used by Nuxt UI**
   Nuxt UI semantics include dimmed/toned/highlighted text and multiple border/bg tiers. Add equivalents so both ecosystems stay aligned.

3. **Component tokens mixed with semantic tokens**
   Existing toolbar/pill tokens are component tokens. Keep them as derived aliases from semantic base tokens instead of standalone palette roots.

4. **Focus/ring consistency**
   You defined `focus`; ensure it also drives ring-related tokens (including Nuxt `--ui-border-accented` or ring aliases) to avoid inconsistent keyboard focus contrast.

## 4) Recommended canonical semantic token set

Adopt this as canonical (CSS custom properties):

- `--color-bg`
- `--color-surface`
- `--color-surface-elevated`
- `--color-text`
- `--color-text-muted`
- `--color-text-dimmed` *(new for richer hierarchy)*
- `--color-border`
- `--color-border-muted` *(new)*
- `--color-accent`
- `--color-accent-soft`
- `--color-on-accent`
- `--color-danger`
- `--color-danger-soft`
- `--color-on-danger`
- `--color-focus`
- `--shadow-sm`, `--shadow-md`

This keeps your proposal intact while adding the minimum extra roles needed for robust UI states and Nuxt UI parity.

## 5) Mapping recommendation

### 5.1 Map your proposed roles to current app tokens

| Proposed semantic token | Current nearest token | Notes |
|---|---|---|
| `color.bg` | `--app-bg` | Keep gradient start/end as optional derived tokens. |
| `color.surface` | `--app-surface` | Base panel surface. |
| `color.surfaceElevated` | `--app-card` | Elevated card/dialog surface. |
| `color.text` | `--app-text` | Primary readable text. |
| `color.textMuted` | `--app-muted` | Secondary text. |
| `color.border` | `--app-border` | Default border. |
| `color.accent` | `--app-accent` | Primary action color. |
| `color.accentSoft` | *(new; currently implicit)* | Today approximated by light orange pills/surfaces. |
| `color.onAccent` | `--app-accent-contrast` | Text/icon on accent. |
| `color.danger` | `--app-danger` | Destructive actions. |
| `color.dangerSoft` | `--app-danger-surface` | Destructive low-emphasis bg. |
| `color.onDanger` | `--app-danger-contrast` | Text/icon on danger. |
| `color.focus` | `--app-info` (temporary proxy) | Better as dedicated high-contrast ring token. |

Current token definitions referenced here are from the active CSS theme file.【F:desktop/ui/src/assets/main.css†L4-L141】

### 5.2 Bridge canonical semantic tokens into Nuxt UI tokens

Suggested bridge layer (conceptual):

- `--ui-bg: var(--color-bg)`
- `--ui-bg-muted: var(--color-surface)`
- `--ui-bg-elevated: var(--color-surface-elevated)`
- `--ui-text: var(--color-text)`
- `--ui-text-muted: var(--color-text-muted)`
- `--ui-border: var(--color-border)`
- `--ui-border-muted: var(--color-border-muted)`
- `--ui-primary: var(--color-accent)` *(if using Nuxt primary color channels)*

This matches how Nuxt UI consumes `--ui-*` variables internally.【F:desktop/ui/node_modules/@nuxt/ui/dist/shared/ui.Ddb3hKxo.mjs†L7645-L7682】

## 6) Theme quality review: your Orange + Terminal values

### 6.1 Orange theme
Your proposed Orange set is cleaner and more neutral in foundations than the current highly saturated warm background; this improves long-session readability and content contrast.

### 6.2 Terminal theme
Your Terminal proposal aligns with a coherent dark green terminal mood while maintaining readable text and danger states. It is directionally compatible with current terminal intent (dark base + green accent), but with better semantic regularity.

### 6.3 Cross-theme coherence checks to enforce
- Same semantic role must represent same UX meaning in both themes.
- `onAccent`/`onDanger` must pass contrast checks against `accent`/`danger`.
- `textMuted` must remain legible against all surfaces.
- Focus indicator (`color.focus`) must remain visible on both light and dark backgrounds.

## 7) Migration strategy (low risk)

1. Introduce canonical semantic tokens (`--color-*`) for orange and terminal.
2. Keep current `--app-*` tokens as aliases mapped from `--color-*`.
3. Add Nuxt bridge assignments (`--ui-*`) from the same semantic source.
4. Gradually refactor component CSS classes to semantic references where needed.
5. Remove duplicated `:root` vs `:root[data-theme="orange"]` values once stable.

## 8) Decision summary

- Keep the **semantic-token-first** direction (approved).
- Add a **minimal extended semantic set** (`text-dimmed`, `border-muted`) for coherence.
- Use a **single source of truth** (`--color-*`) and derive both `--app-*` and `--ui-*` from it.
- Preserve current global theme preference behavior (already aligned with your goal): local persistence, orange default, terminal opt-in.【F:desktop/ui/src/lib/theme.ts†L3-L44】

