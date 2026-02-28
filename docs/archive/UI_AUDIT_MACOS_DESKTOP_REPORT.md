# UI Audit Report (macOS Desktop Direction)

Generated: 2026-02-25

## Purpose

This report captures the current UI/UX audit for Lepupitre and evaluates the app against a stricter, macOS desktop-oriented design-system standard.

It is a product/design audit (not an implementation spec). The concrete implementation spec lives in:

- `spec/active/ui/SPEC-UI-DESKTOP-SYSTEM.md`

## Executive Summary

The product direction is strong:

- `Training` is a clear daily practice loop.
- `Talks` is a clear end-to-end talk workflow (`Define -> Builder -> Train -> Export`).
- Workspace separation is useful and now much simpler in practice.

The UI quality concern is valid:

- color theming improved significantly
- interaction patterns improved in key places (workspace switcher, training quest picker)
- but the design system is not yet strict enough to produce a coherent macOS desktop feel

Main issue: the app is still built page-by-page with shared colors, but without a strict system for typography, density, layout shells, and reusable component patterns.

## Product Focus and User Workflows

## 1) Primary Jobs To Be Done

### A. Daily practice loop

User goal:

- open app
- choose/confirm a quest
- practice quickly
- get feedback
- return later

Current workflow:

- `Training` -> `Quest` -> `Feedback`

Status:

- strong direction
- much improved by the new training quest picker and explicit quest flow

### B. End-to-end talk preparation

User goal:

- define a talk
- build the outline
- train via quests / boss runs
- export materials
- import peer feedback and iterate

Current workflow:

- `Talks` -> `Define` -> `Builder` -> `Train` -> `Export`

Status:

- strong IA
- stepper is now real and usable
- stage progression is starting to be systemized

### C. Workspace separation (local contexts)

User goal:

- keep talks and training data separate by context (work/personal/client/etc.)

Current workflow:

- workspace switcher in app header

Status:

- strong, now simplified
- likely the right primary workspace management UX

## 2) Screen Goals (What Each Screen Should Optimize)

### `Training`

Primary goal:

- launch practice quickly
- review recent feedback/history

Strengths:

- quest hero is clear
- quest picker is strong (search/filter/sort/keyboard)
- activity data is accessible

Gaps:

- desktop layout still feels like a vertical mobile card stack
- too many pills/chips for desktop density
- section headers overuse micro uppercase labels

### `Quest`

Primary goal:

- focused execution flow (capture -> submit -> analyze)

Strengths:

- explicit step structure
- no auto-analyze for text
- transcript gate for audio is clearer

Gaps:

- still visually card-heavy
- desktop density and keyboard ergonomics can improve

### `Talks`

Primary goal:

- scan and choose talks quickly
- see stage and recency at a glance

Strengths:

- stage badge
- last activity metadata
- active talk handling

Gaps:

- card stack pattern is not optimal for desktop scanning at scale
- should move toward a denser list/table model

### `Talk Define / Builder / Train / Export`

Primary goal:

- guide the user through a single talk workflow with clear progression

Strengths:

- route structure is now correct
- `Define` supports autosave and stage control
- stage can auto-advance from page actions

Gaps:

- repeated page headers/summary panels are hand-built
- visual drift risk remains high without a shared step-page shell

### Utility/Admin screens (`Settings`, `Packs`, `PeerReview`, `BossRun`, `About`)

Primary goal:

- support operational tasks without adding product friction

Gaps:

- likely to drift most because they reuse patterns informally
- need page-shell/component primitives to stay coherent

## Design-System Maturity Assessment

## What is working

- Semantic color tokens are in much better shape.
- Theme naming/behavior is clearer (`Light` / `Dark` in UI).
- Workspace and Training picker interactions are becoming reusable patterns.

## What is not strict enough yet

### 1) Typography drift

Evidence from current Vue templates:

- `60` occurrences of `text-[10px]` / `text-[11px]`

Impact:

- weak hierarchy consistency
- too much micro text
- dashboard-like UI feel instead of macOS desktop clarity

### 2) Desktop density mismatch (too touch-sized by default)

Evidence:

- `27` occurrences of `min-h-11` (44px) controls in pages/components

Impact:

- oversized controls in pointer-first workflows
- reduced information density
- “tablet/touch” feeling on desktop

### 3) Repeated page patterns instead of strict primitives

Repeated patterns are common, but still inline:

- `app-surface rounded-2xl border p-4`
- `app-card rounded-xl border p-3`

Impact:

- good local consistency, but weak enforceability
- updates require page-by-page edits
- spacing/radius decisions drift over time

### 4) App-level vs page-level context was mixed

Recent improvements:

- fixed app bar
- breadcrumbs moved out of app bar
- current talk button added

Remaining risk:

- without an AppShell spec, future changes can re-mix page context into global nav

## macOS / Apple HIG Alignment (High-Level)

This audit uses Apple Human Interface Guidelines as directional guidance for a macOS desktop application.

Key takeaways relevant to Lepupitre:

- prioritize clarity and hierarchy over decorative UI
- match control density to pointer-driven desktop use
- keep toolbars focused on app-level actions
- place page context within page content, not toolbar chrome
- support keyboard navigation and predictable interactions
- preserve readability with a disciplined type ramp

### Current alignment status

Aligned / improving:

- app-level navigation is becoming clearer
- page context is now moving out of the toolbar
- keyboard support exists in key switcher/picker flows

Not yet aligned enough:

- typography and control sizing are not standardized
- too many page-local pattern reinventions
- list-heavy desktop workflows still use mobile-like card stacks

## Core Risks If No System Tightening Happens

- Every new screen increases cleanup cost.
- Visual consistency will continue to depend on manual discipline.
- “Almost-good” UI quality will persist even as functionality improves.
- Desktop UX will feel crowded/oversized rather than efficient.

## Recommendations (Strategic)

## 1) Tighten the real design system (highest priority)

Move beyond color tokens into strict rules for:

- typography scale
- control heights
- radius tiers
- spacing tiers
- page shells
- component patterns

## 2) Build reusable page/component primitives

Create and enforce primitives such as:

- `PageShell`
- `PageHeader`
- `SectionPanel`
- `MetaLine`
- `EntityRow`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `TalkStepPageShell`

## 3) Lean into desktop workflows

- `Talks` should evolve toward a dense list/table view.
- `Training` should become a 2-column desktop layout on wide windows.
- `Feedback` should evolve toward a reading/review workspace feel.

## 4) Add governance and UI quality controls

- CI/lint checks for arbitrary font sizes and control heights
- PR checklist for desktop screenshots and keyboard paths
- design-system doc updates in the same PR as UI changes

## Recommended Delivery Roadmap

### Phase 1 (System Foundations)

- define exact type ramp
- define control-height tiers
- define radius tiers
- define page-shell variants
- ban new arbitrary text sizes

### Phase 2 (Primitive Components)

- implement page/layout primitives
- refactor talk step pages first

### Phase 3 (Desktop IA Refinement)

- `Talks` list/table redesign
- `Training` two-column desktop layout
- breadcrumb styling refinement

### Phase 4 (Ongoing Quality Bar)

- keyboard parity across screens
- UI lint rules
- visual QA for utility/admin screens

## Source References (Apple / Platform Guidance)

- Apple Human Interface Guidelines: <https://developer.apple.com/design/human-interface-guidelines/>
- Designing for macOS (Apple HIG): <https://developer.apple.com/design/human-interface-guidelines/designing-for-macos>
- Accessibility / Text Size (Apple HIG): <https://developer.apple.com/design/human-interface-guidelines/accessibility#Text-size>
- Toolbars (Apple HIG): <https://developer.apple.com/design/human-interface-guidelines/toolbars>
- Menus (Apple HIG): <https://developer.apple.com/design/human-interface-guidelines/menus>

## Companion Document

For exact sizes, component contracts, rollout steps, and enforcement rules, use:

- `spec/active/ui/SPEC-UI-DESKTOP-SYSTEM.md`
