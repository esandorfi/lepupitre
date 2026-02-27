# spec_ui_help_contextual_assistance

Status: Proposed
Owner: Product + UI
Scope: Desktop UI (Vue Router) content architecture

## 1) Why

The interface will evolve. Help and onboarding content should not depend on current component layout.
This spec defines a stable content model so we can:

- keep contextual guidance consistent across redesigns,
- deep-link users to relevant help from any screen,
- maintain content as markdown files that can be reviewed and updated independently.

## 2) Goals

- Add route-context help mapping (not tied to one navigation layout).
- Support audience-specific onboarding tracks:
  - first-time speaker,
  - engineering manager,
  - conference speaker.
- Keep content local-first and bundle-friendly.
- Make copy updates possible without touching core logic.

## 3) Non-goals

- No network CMS.
- No runtime markdown editing in MVP.
- No full documentation portal.

## 4) Canonical route topic IDs

Each application route can map to a stable `topic_id`:

- `/training` -> `help.training.daily-loop`
- `/quest/:questCode` -> `help.training.quest-run`
- `/feedback/:feedbackId` -> `help.training.feedback-priorities`
- `/boss-run` -> `help.training.boss-run`
- `/talks/:projectId/builder` -> `help.talks.builder-outline`
- `/packs` -> `help.packs.import-export`
- `/settings` -> `help.settings.transcription`

The `topic_id` is stable even if URL or page composition changes.

## 5) Deep-link contract (proposal)

### 5.1 From feature pages to Help

Feature pages can link to Help with:

- `/help?topic=help.training.daily-loop`
- `/help?topic=help.talks.builder-outline&audience=conference`

### 5.2 In Help page behavior

When `topic` exists:

- scroll to matching section,
- highlight section card,
- preserve `audience` filter if present.

If `topic` is unknown, fallback to general Help top.

## 6) Markdown content contract

Every markdown file should include frontmatter:

```md
---
id: help.training.daily-loop
title: Daily training loop
audiences: [first, manager, conference]
applies_to_routes: [/training]
version: 1
---
```

Body should use consistent sections:

- `## Why this matters`
- `## 3-step workflow`
- `## Common mistakes`
- `## Done when`

## 7) Content storage (proposal)

Store seed content in repository:

- `spec/help-content/*.md` for editorial drafting
- later mirror to runtime location (for example `desktop/ui/src/content/help/*.md`)

This lets product/design iterate text before wiring runtime loaders.

## 8) Audience-specific onboarding model

Onboarding track files:

- `onboarding-first-time-speaker.md`
- `onboarding-engineering-manager.md`
- `onboarding-conference-speaker.md`

Each track should define:

- a first-week goal,
- a repeatable daily routine,
- one anti-pattern to avoid.

## 9) Migration strategy for future UI changes

When UI structure changes:

1. keep `topic_id` values stable,
2. remap routes/components to existing `topic_id`,
3. update markdown content only when behavior meaning changed.

This prevents help link breakage during redesign.

## 10) MVP implementation steps (future)

1. Add `topic` and `audience` query parsing in Help page.
2. Add per-page "Need help?" links using the `topic_id` map.
3. Render markdown sections from local files.
4. Add a small test that all mapped topic IDs resolve to existing content files.

## 11) Seed markdown files

Initial seed content lives in:

- `spec/help-content/onboarding-first-time-speaker.md`
- `spec/help-content/onboarding-engineering-manager.md`
- `spec/help-content/onboarding-conference-speaker.md`
- `spec/help-content/help-training-daily-loop.md`

