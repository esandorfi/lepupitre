# Plan d’implémentation suivable (back -> front, incréments fonctionnels)

## Objectif
Avoir une application fonctionnelle après chaque passe, avec valeur visible.

## Passe 0 — Fondations repo & CI
- Générer monorepo Tauri + Vue.
- Mettre en place CI lint/tests.
- Ajouter migrations v1 et seed minimal.
- Exécuter 2 spikes obligatoires:
  - spike audio capture→whisper (ADR-AUDIO-0001)
  - spike sécurité least-privilege + CSP (ADR-SEC-0002)
- Critère done: pipeline CI vert + app démarre.
- Critère de sortie ADR: app “hello quest” enregistre un WAV 16k mono, le stocke dans appdata, et l’UI ne peut rien lire hors sandbox.

## Passe 1 — Profils + projet actif (vertical slice)
### Back
- commands profile_list/create/switch
- global DB + active profile
- project_create/get_active
### Front
- ProfilesPage + ProjectSetupPage + état actif
### Done
- User peut créer profil + projet puis revenir Home.

## Passe 2 — Quête texte (MVP visible)
### Back
- quest_get_daily
- quest_submit_text
- génération feedback heuristique v1 (sans STT)
### Front
- Home -> QuestPage -> FeedbackPage
### Done
- Boucle complète quête texte en local.

## Passe 3 — Artefacts + audio recording
### Back
- ArtifactStore (put_bytes/resolve_path)
- audio_start/stop -> artefact WAV
### Front
- AudioRecorder + progression basique
### Done
- Capture audio persistée et consultable.

## Passe 4 — Transcription whisper.cpp + jobs
### Back
- adapter whisper + JobQueue + events progression
- transcribe_attempt
### Front
- ProgressToast + suivi job
### Done
- Audio -> transcript affiché sans freeze UI.

## Passe 5 — Analyse avancée + recommandations 2 priorités
### Back
- métriques (wpm/fillers/pauses) + rules_v1
### Front
- FeedbackPanel enrichi
### Done
- Feedback actionnable limité à 2 actions.

## Passe 6 — Boss Run + rapport
### Back
- run_start/stop + pipeline analyse
### Front
- BossRunPage + navigation vers rapport
### Done
- Session longue complète fonctionnelle.

## Passe 7 — Talk Builder + export markdown
### Back
- modèle outline + export markdown
### Front
- TalkBuilderPage
### Done
- Outline éditable + export markdown.

## Passe 8 — Pair review pack
### Back
- export_pack + import_review + validation zip
### Front
- PacksPage (export/import)
### Done
- Revue pair offline opérationnelle.

## Passe 9 — Hardening enterprise
- sécurité import, limites ressources
- gestion erreurs et retry
- tests de non-régression
- docs ADR + runbook

## Règle de passage
Une passe n’est close que si:
1. lint/test OK,
2. doc mise à jour,
3. docs mises à jour si nécessaire.
