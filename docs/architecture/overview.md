# Architecture Overview

## Stack
- Desktop shell: Tauri v2
- Backend/core: Rust
- UI: Vue 3 + Vite + TypeScript + Vue Router + Nuxt UI + Tailwind
- Storage: SQLite (global + per profile) + filesystem artifacts
- Speech-to-text: local whisper.cpp sidecar

## System model
- Hexagonal architecture is the default model.
- `commands/`: small Tauri IPC surface.
- `core/domain`: entities, invariants, identifiers.
- `core/application/usecases`: business orchestration.
- `core/ports`: contracts (`TranscriptionProvider`, `ArtifactStore`, etc.).
- `core/adapters`: sqlite/fs/whisper/zip/secrets/jobs.

## Baseline decisions
1. UI stack is standardized on Vue.
2. Local-first and offline by default.
3. No generic filesystem access from UI.
4. New long-term decisions go to `spec/active/DECISIONS.md`.
5. Historical ADRs stay in `docs/archive/adr/` (read-only history).

## Security baseline
- Task-oriented IPC only.
- ZIP import validation (path traversal and size limits).
- Secrets are not stored in SQLite (use keyring/stronghold).
- Least-privilege capabilities and strict CSP.

## Observability baseline
- Structured logs in development.
- Correlation by `job_id` across transcription/analysis flows.
- Normalized UI-facing errors (`IPC_INVALID_*`, `IPC_COMMAND_FAILED`, etc.).

## Scale path
1. Stable local/offline MVP.
2. Optional remote STT.
3. Optional cloud sync.
4. Preserve local data compatibility at each step.
