# ADR-SEC-0002 — Modèle Tauri capabilities/permissions (least privilege)

## Statut
Accepted

## Contexte
Le mode “local-only” n’est pas suffisant en environnement enterprise: il faut prouver que l’UI ne peut pas exfiltrer ni accéder arbitrairement au système. Les permissions Tauri doivent donc être minimisées, explicites et vérifiables.

## Options considérées
### Option A — Capabilities minimales puis ouverture progressive (least privilege)
- Avantages:
  - surface d’attaque réduite
  - lisibilité des permissions autorisées
  - conformité plus simple à défendre
- Inconvénients:
  - friction initiale de développement

### Option B — Capabilities larges pour accélérer le dev
- Avantages:
  - démarrage rapide
- Inconvénients:
  - forte dette sécurité
  - risques élevés d’accès non intentionnel

## Décision
Adopter **Option A (least privilege)** avec les règles v1:
1. **Whitelist IPC stricte** des commandes métier.
2. **Interdits v1**: pas de shell, pas de network, pas de FS arbitraire.
3. **Scopes FS**: uniquement sous `appdata/profiles/<id>/...` via backend.
4. **CSP stricte**: pas d’assets/scripts distants, pas de CDN.

## Tableau de gouvernance IPC (v1)
- `profile_list/create/switch` → gestion profils → accès DB global uniquement.
- `project_create/get_active` → projet actif → DB profil uniquement.
- `quest_get_daily/submit_text` → workflow quête → DB profil + artefacts contrôlés.
- `audio_start/stop` → capture audio → écriture artefact dans sandbox appdata.

## Security checklist build/release
- CSP active et vérifiée.
- `allowlist` Tauri sans shell/network.
- Aucune URL distante de script/style/font.
- Validation stricte imports ZIP (path traversal, limites taille).
- Tests de permissions négatifs (accès interdit attendu).

## Plan de validation (spike obligatoire)
- Spike “UI compromise simulation”:
  1. injecter un composant UI malicieux (test interne),
  2. tenter lecture fichier hors sandbox,
  3. tenter appel network/shell,
  4. vérifier échec systématique et logs d’audit.
- Critère d’acceptation:
  - toutes les tentatives hors périmètre sont bloquées.

## Rollback
Si blocages majeurs empêchent la livraison, ouvrir temporairement une permission additionnelle avec ADR de dérogation datée, justification, périmètre exact et date de retrait.

## Divergence (ADR vs codebase)
- État: Partiellement conforme.
- Analyse: les règles sont documentées mais non implémentées techniquement (pas encore de `src-tauri` opérationnel dans ce repo).
- Plan de remédiation: implémenter capabilities + tests négatifs en passe 0/1.
