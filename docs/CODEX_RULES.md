# Règles Codex (documentation, ADR, changelog, qualité)

## 1) Mise à jour README à la demande
Quand demandé explicitement, Codex doit:
1. Mettre à jour `README.md` (vue humaine/onboarding),
2. Mettre à jour `README_TECH.md` (architecture/tech),
3. Ajouter un résumé des changements en changelog.

## 2) Génération ADR à la demande
Quand demandé, Codex doit générer une ADR dans `docs/adr/` au format:
- `ADR-XXXX-titre-kebab.md`

Contenu minimal:
- Contexte
- Décision
- Alternatives
- Conséquences
- Statut (Proposed/Accepted/Superseded)
- Références de code/doc

## 3) Vérification divergence ADR vs codebase
Pour chaque ADR demandée, Codex doit inclure une section **"Divergence"**:
- `Conforme` si implémentation alignée.
- `Partiellement conforme` si écart partiel.
- `Divergent` si la base de code contredit la décision.
Dans les deux derniers cas, lister un plan de remédiation.

## 4) Changelog après chaque commit (multi-dev)
Après chaque commit, créer un fichier dédié dans `docs/changelog/` (ne pas réécrire un seul fichier global), format:
- `YYYYMMDD-HHMMSS_<dev>_<shortsha>.md`

Contenu:
- Auteur/dev
- Commit SHA
- Résumé
- Fichiers modifiés
- Tests/lints exécutés
- Risques/restes à faire

## 5) Exécution systématique tests et lints
Avant commit, Codex doit tenter:
- Backend: fmt + clippy + tests
- Frontend: lint + typecheck + tests

Si indisponible (repo incomplet), documenter explicitement la limite dans le changelog et le message final.

## 6) MR = stop logique (qualité & revue)
À chaque MR, Codex doit:
- marquer un point d’arrêt,
- relire la logique (risques/edge cases),
- exécuter les checks qualité disponibles,
- documenter les résultats avant de poursuivre.
