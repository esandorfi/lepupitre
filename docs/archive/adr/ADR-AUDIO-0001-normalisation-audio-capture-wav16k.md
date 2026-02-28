# ADR-AUDIO-0001 — Normalisation audio V1 (capture WAV 16k mono, sans ffmpeg)

## Statut
Accepted

## Contexte
Le MVP est local-first enterprise et doit fournir une transcription fiable sans complexifier le packaging ni la surface d’attaque. La zone grise initiale portait sur le choix de normalisation audio (ffmpeg embarqué vs bibliothèques Rust) alors que la V1 enregistre déjà l’audio localement.

## Options considérées
### Option A — ffmpeg embarqué dès V1
- Avantages:
  - couverture codec/format très robuste
  - comportement mature cross-platform
- Inconvénients:
  - binaire externe à embarquer (supply-chain, conformité IT)
  - complexité packaging/signature
  - surface d’attaque et maintenance accrues

### Option B — Rust-only avec capture contrôlée en WAV 16k mono
- Avantages:
  - dépendances réduites
  - packaging plus simple
  - posture enterprise plus stricte
- Inconvénients:
  - moins flexible si import de formats externes hétérogènes

## Décision
Pour la **V1**, la capture audio doit produire directement un **WAV mono 16kHz PCM**, compatible whisper.cpp, et **aucun ffmpeg n’est embarqué**.

La conversion externe est explicitement reportée à une évolution **V1.1+** (au moment de l’import d’audios externes).

## Conséquences
- Positives:
  - réduction de complexité et de risques supply-chain
  - meilleur alignement avec le scope MVP
- Négatives:
  - pas de support d’import audio multi-format en V1
  - nécessité de contrôler strictement le format de sortie du recorder

## Plan de validation (spike obligatoire)
- Spike 2h cross-platform (Windows/macOS/Linux):
  1. enregistrer 3 fichiers (10s/45s/2min),
  2. vérifier métadonnées WAV (mono, 16kHz, PCM),
  3. exécuter transcription whisper.cpp,
  4. mesurer taux d’échec et latence.
- Critère d’acceptation:
  - 100% des fichiers de test acceptés par whisper.cpp sans conversion.

## Rollback
Si le spike échoue significativement sur une plateforme, basculer en ADR de remplacement vers ffmpeg sidecar **strictement limité** à la normalisation, avec contrôle d’intégrité binaire.

## Divergence (ADR vs codebase)
- État: Partiellement conforme.
- Analyse: la codebase actuelle est documentaire, sans implémentation audio effective.
- Plan de remédiation: implémenter le recorder WAV 16k mono en passe 3 puis exécuter le spike en passe 4.
