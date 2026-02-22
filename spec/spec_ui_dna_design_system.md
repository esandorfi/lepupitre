---

# LE PUPITRE — UI DESIGN DNA (Synthesis, Standalone)

**Status**: Draft  
**Version**: 0.1  
**Date**: 2026-02-22  
**Audience**: design, product, engineering  
**Scope**: Design system DNA for the local-first desktop app (Training + Talks)  

---

## 1) Intent

Provide a single, standalone design system DNA that consolidates the validated UI design rules (system, theme tokens, and Training/Talks flow) into an implementation-ready guide.

---

## 2) Product Feel

**Style keywords**
1. Professional.
2. Elegant.
3. Minimal.
4. Focused.

**What to avoid**
1. Loud gradients.
2. Generic SaaS dashboard styling.
3. Excessive gamification.

---

## 3) Terminology (UI Labels)

**Internal -> UI**
1. Workspace -> **Espace**
2. Talk project -> **Talk**
3. Quest -> **Quête**
4. Attempt -> **Tentative**
5. Feedback -> **Feedback**
6. Boss run -> **Répétition**

**Key labels**
1. “Créer un espace”
2. “Ouvrir”
3. “Actuel”
4. “Entraînement”
5. “Talks”

---

## 4) Themes and Token System

**Themes**
1. Orange (light).
2. Terminal (dark).

**Canonical semantic tokens** (single source of truth)
1. `--color-bg`
2. `--color-surface`
3. `--color-surface-elevated`
4. `--color-text`
5. `--color-text-muted`
6. `--color-text-dimmed`
7. `--color-border`
8. `--color-border-muted`
9. `--color-accent`
10. `--color-accent-soft`
11. `--color-on-accent`
12. `--color-danger`
13. `--color-danger-soft`
14. `--color-on-danger`
15. `--color-focus`
16. `--shadow-sm`
17. `--shadow-md`

**Token rules**
1. One semantic meaning per token, stable across themes.
2. Accent and danger must have readable `on-*` text.
3. Focus token must be visible on both light and dark surfaces.
4. Keep component tokens derived from semantic tokens.

**Nuxt UI bridge (if used)**
1. `--ui-bg` -> `--color-bg`
2. `--ui-bg-muted` -> `--color-surface`
3. `--ui-bg-elevated` -> `--color-surface-elevated`
4. `--ui-text` -> `--color-text`
5. `--ui-text-muted` -> `--color-text-muted`
6. `--ui-border` -> `--color-border`
7. `--ui-border-muted` -> `--color-border-muted`
8. `--ui-primary` -> `--color-accent`

---

## 5) App Shell and Navigation

**Top app bar**
1. Height: 64 px desktop, 56 px mobile.
2. Left: brand “LE PUPITRE”.
3. Center: tabs `Entraînement` and `Talks`.
4. Right: workspace switcher pill + settings.

**Workspace switcher**
1. Always visible.
2. Shows initials + workspace name.
3. Dropdown contains list + “Gérer les espaces…” + “Créer un espace…”.

**Breadcrumbs**
1. Only on deep pages.
2. Use: `Talks / {TalkTitle} / {Subview}`.

---

## 6) Layout DNA

1. Base spacing unit: 8 px.
2. Section spacing: 24–32 px.
3. Card padding: 16–20 px.
4. Subtle borders, minimal shadow.

---

## 7) Core Components

**Workspace list row**
1. Name + metadata.
2. `Actuel` badge or `Ouvrir` CTA.
3. Overflow menu for secondary actions.

**Quest card**
1. Title + duration.
2. Chips for audio/text + category.
3. Exactly one primary CTA.

**Feedback list item**
1. Quest name + date.
2. Two action chips max.
3. Status: `Prêt` or `Vu`.

**Status chips**
1. Use accent for active.
2. Use muted for secondary.
3. Use danger for errors.

---

## 8) Training (Entraînement) — Gamey and Simple

**Single-column layout**
1. Daily quest hero.
2. Quest picker.
3. Feedback inbox.
4. History timeline.

**Daily quest hero**
1. Title: `Quête du jour · {minutes} min`.
2. Quest prompt (one line).
3. Primary CTA: `Démarrer`.

**Quest picker**
1. Category chips.
2. Compact list rows with `Démarrer`.

---

## 9) Quest Attempt Flow (Shared)

1. Pre-brief screen with goal + expected output.
2. Capture (text or audio).
3. Optional transcription (user-initiated).
4. Analysis (user-initiated, requires transcript if audio).

**Rules**
1. No automatic feedback.
2. If transcript missing, show `Transcrire d’abord`.

---

## 10) Talks Flow (Primary, Structured)

**Talks list**
1. Card per talk: title + stage chip.
2. One-line “next action”.
3. CTA: `Ouvrir`.

**Talk detail**
1. Stepper tabs: `Define` → `Builder` → `Train` → `Export`.
2. Each step has one primary CTA.

---

## 11) Settings

1. Theme: Orange / Terminal / System.
2. Language: FR / EN.
3. About with version info.

---

## 12) Accessibility

1. Minimum contrast 4.5:1 for body text.
2. Visible focus states for keyboard nav.
3. No information conveyed only by color.

---

## 13) UX Copy Tone

1. Direct and operational.
2. No marketing language.
3. Short, actionable CTAs.

