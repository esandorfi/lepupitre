# Design System

## Principles
- Use Tailwind utilities for layout, spacing, and sizing only.
- Use semantic `app-*` classes for all colors, surfaces, and typography.
- Theme values live in CSS variables so light/dark (and future themes) stay consistent.

## Naming
- Surfaces: `app-surface`, `app-card`, `app-toolbar`
- Text: `app-text`, `app-muted`, `app-subtle`
- Links: `app-link`
- Buttons: `app-button-primary`, `app-button-secondary`, `app-button-success`, `app-button-danger`, `app-button-info`
- States: `app-pill`, `app-pill-active`
- Inputs: `app-input`

## Theme Tokens
Edit tokens in `desktop/ui/src/assets/main.css`:
- `--app-bg`, `--app-toolbar-bg`, `--app-surface`, `--app-card`
- `--app-text`, `--app-muted`, `--app-subtle`
- `--app-accent`, `--app-accent-hover`
- `--app-success`, `--app-info`, `--app-danger`

## Business Logic vs. Design
- Business logic names belong to state and components (profile, talk, quest).
- Design names belong to classes/tokens (surface, accent, muted).
- Avoid mixing domain terms in CSS class names.
