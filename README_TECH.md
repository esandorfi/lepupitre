# README_TECH — Architecture et règles d’implémentation

## 1) Cible architecture
- **Desktop**: Tauri v2
- **Core**: Rust
- **UI**: Vue 3 + Vite + TypeScript + Vue Router + Nuxt UI + Tailwind
- **Stockage**: SQLite (global + par profil) + filesystem artefacts
- **STT**: whisper.cpp local via adapter

## 2) Décisions de cohérence retenues
1. **UI standardisée Vue** (la variante React du starterkit est rejetée pour cohérence avec la spec UI).
2. **Docs source**: `spec/` reste la source RFC; `README*` + `docs/` portent l’opérationnel.
3. **Architecture hexagonale** maintenue: domain/application/ports/adapters.
4. **No network by default** dès le MVP.
5. **Décisions non fermées transformées en ADR obligatoires**: ADR-AUDIO-0001 et ADR-SEC-0002 avec spikes et critères de sortie.


## 2.1 ADR obligatoires avant implémentation
- `docs/adr/ADR-AUDIO-0001-normalisation-audio-capture-wav16k.md`
- `docs/adr/ADR-SEC-0002-tauri-capabilities-least-privilege.md`

Critère de sortie commun: app “hello quest” capable d’enregistrer un WAV 16k mono dans appdata, sans accès UI hors sandbox.

## 3) Modules backend (proposition exécutable)
- `commands/`: surface IPC Tauri minimale.
- `core/domain`: entités, invariants, IDs.
- `core/application/usecases`: orchestration métier.
- `core/ports`: interfaces (`TranscriptionProvider`, `ArtifactStore`, etc.).
- `core/adapters`: sqlite/fs/whisper/zip/secrets/jobs.

## 4) Contrats et versioning
- Schémas JSON versionnés (`schemas/*.v1.json`).
- Migrations SQL versionnées (`migrations/*`).
- Tous les changements de contrat => ADR + entrée changelog.

## 5) Sécurité (baseline)
- Aucun accès FS générique depuis UI.
- IPC “task-oriented” uniquement.
- Validation imports zip anti traversal + limites taille.
- Secrets via keyring/stronghold, jamais en clair dans SQLite.

## 6) Tests et lint (gates obligatoires)
## Backend
- format: `cargo fmt --all -- --check`
- lint: `cargo clippy --all-targets --all-features -- -D warnings`
- tests: `cargo test --all`

## Frontend
- lint: `pnpm lint`
- types: `pnpm typecheck`
- tests: `pnpm test`

## E2E minimal
- test parcours: création profil -> création projet -> soumission quête texte -> feedback affiché.

## 7) Observabilité locale
- logs structurés JSON en dev.
- IDs corrélés par `job_id` pour transcription/analyse.
- erreurs UI normalisées (`IPC_INVALID_*`, `IPC_COMMAND_FAILED`, etc.).

## 8) Plan de montée en puissance
- MVP offline stable.
- then remote STT opt-in.
- then sync cloud opt-in.
Chaque étape doit préserver la compatibilité des données locales.
