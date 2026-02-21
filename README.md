# Le Pupitre (TTQC) — README humain & onboarding

## 1) Ce que c’est
Le Pupitre est un coach local-first pour préparer des talks techniques internes avec des quêtes courtes quotidiennes, des sessions audio plus longues (Boss Run), du feedback actionnable, et un flux de revue pair-à-pair par export/import de pack.

## 2) État actuel du repo
Ce dépôt contient aujourd’hui principalement des spécifications:
- `spec/spec_lepupitre.md` (produit + backend + sécurité + architecture)
- `spec/spec_ui.md` (spécification UI Vue/Nuxt UI)
- `spec/starterkit.md` (arborescence et squelettes initiaux)

Le code applicatif n’est pas encore généré.

## 3) Vérification de cohérence (synthèse)
### Cohérent
- Vision produit et contraintes enterprise (local-first, offline, secrets) sont alignées.
- Le modèle ports/adapters, migrations, artefacts, et pipeline transcription/analyse sont compatibles.

### À challenger / décider explicitement
1. **Stack UI ambiguë**: starterkit mentionne `app.tsx` + prompt “React (ou minimal TS)”, alors que la spec UI est normative sur **Vue 3 + Nuxt UI**. Décision recommandée: **standardiser sur Vue**.
2. **Structure repo divergente**: starterkit propose racine `ttqc/` + dossier `rfc/`, mais repo actuel utilise `spec/`. Décision recommandée: garder `spec/` comme source documentaire et ajouter `docs/` pour l’opérationnel.
3. **Nommage des pages/routes**: `routes/*.tsx` (starterkit) vs `pages/*.vue` (spec UI). Décision recommandée: adopter `pages/*.vue` + `router/`.
4. **Capabilités Tauri**: décision fermée via ADR-SEC-0002 (least privilege, whitelist IPC, no shell/network, CSP stricte).
5. **Audio**: décision fermée via ADR-AUDIO-0001 (V1 = capture WAV 16k mono sans ffmpeg).

## 4) Onboarding rapide (humain)
## Prérequis
- Rust stable
- Node.js LTS
- pnpm ou npm
- Tauri v2 toolchain (selon OS)
- SQLite local

## Parcours conseillé (nouvel arrivant)
1. Lire `README.md` (ce document).
2. Lire `README_TECH.md` (architecture détaillée).
3. Lire `docs/IMPLEMENTATION_PLAN.md` (plan incrémental exécutable).
4. Lire `docs/CODEX_RULES.md` (règles doc/tests/changelog/ADR).
5. Lire les ADR obligatoires (`docs/adr/ADR-AUDIO-0001-...` et `docs/adr/ADR-SEC-0002-...`).
6. Ouvrir `spec/` pour le détail des contrats.

## 5) Règles qualité projet (SOTA pragmatique)
- Local-first by design (network off par défaut).
- Contrats stricts IPC (validation runtime côté UI + backend).
- Migrations DB versionnées et irréversibilités documentées.
- Secrets hors DB (keyring/stronghold).
- Tests automatiques obligatoires par passe.
- Lint bloquant en CI sur backend et frontend.
- Traçabilité décisionnelle via ADR.

## 6) Workflow standard de dev
1. Prendre un item du plan (`docs/IMPLEMENTATION_PLAN.md`).
2. Implémenter une passe verticale minimale (back + front branchés).
3. Exécuter lint + tests.
4. Mettre à jour docs/ADR/changelog selon les règles.
5. Commiter.

## 7) Commandes de validation attendues (quand le code existe)
- Backend:
  - `cargo fmt --all -- --check`
  - `cargo clippy --all-targets --all-features -- -D warnings`
  - `cargo test --all`
- Frontend:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm typecheck`

## 8) Conventions changelog multi-dev
Voir `docs/CODEX_RULES.md` (un fichier de changelog par commit et par développeur).
