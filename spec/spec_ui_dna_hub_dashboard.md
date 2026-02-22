---

# RFC-UI-0002 — UI DNA Spec (Lepupitre Hub Dashboard SPA)

**Status**: Draft  
**Version**: 0.1  
**Date**: 2026-02-22  
**Audience**: product, design, engineering  
**Scope**: Visual DNA + interaction principles for the hub dashboard SPA

---

**1. Goal**

Define a clear UI DNA for the hub dashboard so another agent can build a distinctive, coherent interface that feels intentional, enterprise-ready, and community-aware.

---

**1.1 Design Compliance and Precedence**

This DNA spec is an additional layer for the hub SPA and must remain compatible with the validated UI design specs in `spec/`.

**Validated design rules**
1. `spec/spec_ui_design_system.md`
2. `spec/spec_ui_design_theme_colors.md`
3. `spec/spec_ui_design_talk.md`

**Baseline UI rules**
1. `spec/spec_ui.md`

**Precedence**
1. If this DNA conflicts with any of the validated design rules, the validated design rules win.
2. If this DNA conflicts with `spec/spec_ui.md`, prefer the validated design rules, then update this DNA to align.

---

**2. Product Character**

**Keywords**
1. Calm authority.
2. Editorial clarity.
3. Crafted tools.
4. Community without noise.

**What it should feel like**
1. A control room for knowledge, not a social feed.
2. Trustworthy and measured, not flashy.
3. Deliberate hierarchy and whitespace.

**What it should avoid**
1. Generic SaaS dashboard look.
2. Purple-on-white default palettes.
3. Overly playful or gamified aesthetics.

---

**3. Core UI Metaphor**

**“Field Journal + Control Desk”**
1. Field Journal = warm, readable surfaces for content and feedback.
2. Control Desk = precise panels for status, export jobs, and permissions.

---

**4. Typography DNA**

**Primary display**
1. `Fraunces` (variable) for page titles and section headers.
2. Fallback: `Iowan Old Style`, `Georgia`, `serif`.

**Body**
1. `Source Sans 3` for UI and body text.
2. Fallback: `Segoe UI`, `Helvetica Neue`, `Arial`, `sans-serif`.

**Data and IDs**
1. `JetBrains Mono` for tokens, IDs, timestamps.
2. Fallback: `SFMono-Regular`, `Menlo`, `Consolas`, `monospace`.

**Type scale**
1. Title: 28–34 px.
2. Section: 18–22 px.
3. Body: 14–16 px.
4. Data labels: 12–13 px, uppercase tracking +2%.

---

**5. Color DNA**

**Base neutrals**
1. Canvas: `#F7F3ED` (warm off-white).
2. Surface: `#FFF9F2`.
3. Ink: `#1D1B16` (near-black).
4. Muted ink: `#6A645A`.

**Accents**
1. Clay: `#C46A4A` (primary accent).
2. Forest: `#2E5E4E` (positive, success, approval).
3. Brass: `#B58C3D` (progress, queued).
4. Slate: `#2F3B46` (information).
5. Ember: `#9C3D2B` (warning).

**Usage rules**
1. Text uses Ink or Muted ink only.
2. Accents are for states and emphasis, not backgrounds.
3. Avoid large saturated color fields; prefer gradients or textured neutrals.

---

**6. Layout DNA**

**Structure**
1. Left rail for navigation.
2. Top bar with workspace switch + search + user.
3. Content uses 12-column grid with a wide primary column and narrow secondary column.

**Spacing**
1. Base unit: 8 px.
2. Section gaps: 24–32 px.
3. Card padding: 16–20 px.

**Containers**
1. Cards with subtle borders, no heavy shadows.
2. Sections separated by thin dividers or soft color bands.

---

**7. Components DNA**

**Navigation**
1. Rail icons + labels, active state uses Clay underline, not solid fill.
2. Collapsible groups for “Community” and “Exports”.

**Tables**
1. Dense but readable, zebra striping at 4% opacity.
2. Sticky header with muted background.
3. Inline status pills for job states.

**Cards**
1. Use for highlights and snapshots, not for every list.
2. Rounded corners 10–12 px.

**Pills**
1. Small, high-contrast text with faint background tint.
2. For Challenge state, feedback category, and privacy.

**Empty states**
1. Short sentence, one action, no illustration overload.

---

**8. Motion DNA**

**Transitions**
1. Page load: fade + slight upward motion (120–160 ms).
2. Lists: staggered reveal (40 ms delay each).
3. Modals: scale 0.98 to 1.0 with fade.

**Guideline**
1. Motion is quiet and purposeful.
2. Avoid micro-bounce or playful easing.

---

**9. Data Visualization DNA**

**Charts**
1. Flat, minimal charts with no 3D or gloss.
2. Use Clay for primary line and Forest for positive deltas.
3. Annotate with small inline labels rather than legends.

**Metrics**
1. Present as “cards with numbers” and short deltas.
2. Use monospaced digits for alignment.

---

**10. Content & Tone**

**Voice**
1. Neutral, direct, operational.
2. No marketing fluff.

**Examples**
1. “Challenge accepted.”
2. “Export queued.”
3. “Transcript shared with 3 collaborators.”

---

**11. Key Screens (IA Outline)**

1. Overview (metrics, recent activity, alerts).
2. Workspaces (list + detail).
3. Talks (community publications).
4. Feedback (moderation and review).
5. Challenges (hub-assigned).
6. Exports (targets + jobs).
7. Community (quest completion signals).
8. Settings (API keys, permissions).

---

**12. Accessibility**

1. Minimum contrast 4.5:1 for body text.
2. Focus states are visible and consistent.
3. Keyboard navigation across rail, tables, and dialogs.

---

**13. Implementation Notes**

1. Use CSS variables for palette and spacing.
2. Avoid default Tailwind typography; enforce font families at root.
3. Prefer custom tokens over ad-hoc colors.
