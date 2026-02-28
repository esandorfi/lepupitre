# Revue de cohérence — specs & starterkit

## Sources analysées
- `spec/archive/spec_lepupitre.md`
- `spec/archive/spec_ui.md`
- `spec/archive/starterkit.md`

## Conclusion
Les documents sont globalement compatibles sur la vision produit, l’architecture hexagonale, et la contrainte local-first/offline. Les zones grises majeures ont été transformées en décisions actionnables (ADR + spikes courts + critères de sortie).

## Divergences majeures
1. **Framework UI**
   - `spec_ui`: Vue 3 + Nuxt UI (normatif)
   - `starterkit`: arborescence avec `app.tsx` et prompt React possible
   - **Décision retenue**: Vue only.

2. **Structure de repo cible**
   - `starterkit` suppose un repo `ttqc/` avec `rfc/`
   - dépôt actuel centré sur `spec/`
   - **Décision retenue**: conserver `spec/` comme source RFC, ajouter `docs/` pour l’opérationnel, générer le code sous `desktop/`.

3. **Nommage composants/pages**
   - starterkit: `routes/*.tsx`
   - spec_ui: `pages/*.vue` + router central
   - **Décision retenue**: convention Vue (`.vue`) avec `pages/` + `router/`.

4. **Décisions techniques non fermées (maintenant cadrées)**
   - normalisation audio (ffmpeg vs rust-only)
   - capabilities/permissions Tauri fine-grained
   - **Plan obligatoire avant implémentation**:
     - `ADR-AUDIO-0001` + spike cross-platform capture→whisper
     - `ADR-SEC-0002` + spike least-privilege + CSP
   - **Critère de sortie**: une app “hello quest” qui enregistre un WAV 16k mono, le stocke dans appdata, et dont l’UI n’a accès à rien hors sandbox.

## Points SOTA à intégrer
- Contrats IPC versionnés + validation runtime des deux côtés.
- Tests de contrat (UI<->backend) automatiques.
- Threat modeling léger par fonctionnalité sensible (import zip, secrets, sync).
- CI avec gates de qualité bloquants (lint + tests + typecheck + formatting).
- Journalisation structurée corrélée par `job_id`.

## Go / No-Go
- **Go conditionnel**: démarrage autorisé après validation des 2 spikes ADR (audio + sécurité).
