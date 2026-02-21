

---

# RFC-0001 — LE PUPITRE - Tech Talk Quest Coach (Desktop Local-First, Option A)

**Statut** : Draft
**Version** : 0.9
**Date** : 2026-02-21
**Audience** : engineering, sécurité, produit
**Scope** : MVP local-first + fondations évolutives (Remote Whisper + Cloud Sync)
**Plateforme** : Desktop Tauri v2 + Rust core + Whisper local (whisper.cpp)

---

## Table des matières

1. Contexte
2. Objectifs et non-objectifs
3. Glossaire
4. Exigences fonctionnelles
5. Exigences non-fonctionnelles (entreprise)
6. Architecture cible (Option A)
7. Organisation du code (patterns)
8. Limites & API IPC (Tauri Commands)
9. Stockage local (layout + SQLite)
10. Journalisation (oplog)
11. Audio & transcription (pipeline)
12. Analyse & feedback (pipeline)
13. Système de quêtes & recommandation
14. Boss Run
15. Pair Review Pack (ZIP)
16. Backup/Restore
17. Profils & Connexion (server + API key)
18. Sécurité & threat model
19. Versioning & migrations
20. Tests & qualité
21. Packaging & rollout entreprise
22. Évolutions : Remote Whisper
23. Évolutions : Cloud Sync/API
24. Annexes : ADR
25. Annexes : Schémas JSON
26. Annexes : Exemples de manifests
27. Annexes : Prompts Codex (plan de construction)

---

## 1. Contexte

On veut un produit qui aide un **senior** à préparer un **talk interne** (≈ 1/3 mois) via :

* **quêtes quotidiennes** (3 minutes) pour structurer et pratiquer,
* capture **écrite** puis **orale**,
* analyse + feedback **actionnable** (max **2 priorités**),
* **boss run** hebdo (6–12 min) + Q&A,
* **review par un pair** via pack export (zip) et import de la grille,
* posture **enterprise** : local-first, réseau désactivé par défaut, isolation, secrets sécurisés.

---

## 2. Objectifs et non-objectifs

### 2.1 Objectifs (MVP)

* Local-first : tout fonctionne offline.
* Multi-profils : switch profil / séparation stricte des données.
* Capture texte + audio ; transcription locale (whisper.cpp).
* Feedback : métriques + 2 actions max + commentaires timestampés.
* Talk Builder : outline vivant + export Markdown (PDF optionnel).
* Pair review : export zip pack + import review.
* Fondations évolutives : providers `TranscriptionProvider` et `StorageProvider`.

### 2.2 Non-objectifs (MVP)

* “Social network” / feed public.
* Co-édition collaborative en temps réel.
* Entraînement ML/finetuning côté client.
* Streaming STT temps réel (batch suffit au MVP).

---

## 3. Glossaire

* **Profil** : espace de travail local isolé (DB + artefacts + settings).
* **Connexion** : config serveur + API key associée au profil (opt-in).
* **Artefact** : fichier local (audio, transcript, feedback, export…).
* **Attempt** : tentative de quête (texte ou audio).
* **Run** : boss run (enregistrement long).
* **Pack** : zip exporté pour review pair.
* **Provider** : impl interchangeable (local vs remote).

---

## 4. Exigences fonctionnelles

### 4.1 Quêtes

* Afficher “Quête du jour” (3 min) avec pré-brief.
* Capturer réponse texte OU audio selon la quête.
* Sauver tentative + artefacts + timestamps.
* Générer feedback.

### 4.2 Analyse & feedback

* Transcrire audio en local.
* Calculer métriques de base (wpm, fillers/min, pauses, répétitions…).
* Produire **2 actions max** + commentaires timestampés.

### 4.3 Boss run

* Enregistrer 6–12 min ; transcrire ; analyser ; rapport complet.

### 4.4 Talk Builder

* Construire outline (sections + artefacts associés).
* Export Markdown (min) + PDF (option).

### 4.5 Pair review

* Export pack zip (audio + transcript + outline + rubric + manifest).
* Import review (JSON) et afficher comparaison.

### 4.6 Multi-profils + connexion

* Créer/switch profils.
* Configurer connexion (server + API key) par profil (clé stockée hors DB).
* (Évolution) sync via API key ; remote STT.

---

## 5. Exigences non-fonctionnelles (entreprise)

### 5.1 Sécurité

* Réseau **désactivé par défaut**.
* CSP strict ; pas de scripts distants.
* Commandes IPC minimales (principe du moindre privilège).
* Import pack : validation anti path traversal + limites tailles.

### 5.2 Confidentialité

* Par défaut, **aucune donnée** n’est envoyée.
* Secrets (API key) jamais en clair en DB.

### 5.3 Robustesse & UX

* Jobs lourds en arrière-plan (transcription/analyse).
* UI ne doit jamais freezer.
* Gestion d’erreurs claire : micro permission, modèle manquant, transcription fail.

### 5.4 Maintenabilité

* Schémas JSON versionnés.
* Migrations DB gérées.
* Providers substituables.

---

## 6. Architecture cible (Option A)

### 6.1 Vue “containers”

* **UI** (WebView) : React/Vue/Svelte, state machine.
* **Core Rust** (Tauri backend) : use cases + règles + persistance.
* **Transcription local** : whisper.cpp (embedded lib ou sidecar local non réseau).
* **Local store** : SQLite + dossier artefacts.
* (Futur) **Remote services** : STT remote + sync API.

### 6.2 Dépendances autorisées (MVP)

* SQLite driver (rusqlite/sqlx).
* ZIP (zip crate).
* Hash SHA-256.
* Audio conversion (ffmpeg embarqué OU lib Rust ; décision ADR).
* whisper.cpp runner (exec) + parser output JSON.

---

## 7. Organisation du code (patterns)

### 7.1 Architecture hexagonale

* `domain/` : entités + invariants.
* `application/` : use cases.
* `ports/` : traits (interfaces).
* `adapters/` : sqlite, fs, whisper runner, zip, crypto, http (futur).

### 7.2 Interfaces clés (ports)

* `TranscriptionProvider`
* `ArtifactStore`
* `ProjectRepository`
* `PackService`
* `SecureSecretStore` (keyring/stronghold)
* `SyncEngine` (futur)

---

## 8. Limites & API IPC (Tauri Commands)

### 8.1 Principes

* UI ne touche pas le filesystem directement.
* Les commandes sont **spécifiques**, jamais “readFile arbitrary”.
* Les retours incluent des IDs (pas de paths) sauf pour exports choisis.

### 8.2 Commands MVP (normatif)

**Profil & projet**

* `profile_list() -> ProfileSummary[]`
* `profile_create(name) -> ProfileId`
* `profile_switch(profile_id) -> void`
* `project_create(payload) -> ProjectId`
* `project_get_active() -> ProjectSummary`

**Quêtes**

* `quest_get_daily(project_id) -> QuestDaily`
* `quest_submit_text(project_id, quest_code, text) -> AttemptId`

**Audio**

* `audio_start_recording(context) -> void`
* `audio_stop_recording() -> ArtifactId(audio/wav)`

**Transcription & analyse**

* `transcribe_audio(artifact_audio_id, options) -> TranscriptId`
* `analyze_attempt(attempt_id) -> FeedbackId`
* `feedback_get(feedback_id) -> FeedbackV1`

**Boss run**

* `run_create(project_id) -> RunId`
* `run_finish(run_id, artifact_audio_id) -> void`
* `run_analyze(run_id) -> FeedbackId`

**Packs**

* `pack_export(run_id) -> ExportResult{path}`
* `peer_review_import(path) -> PeerReviewId`
* `peer_review_get(id) -> PeerReviewV1`

**Exports/backup**

* `export_outline(project_id) -> ExportResult{path}`
* `backup_export() -> ExportResult{path}`
* `backup_import(path) -> void`

**Settings**

* `settings_get() -> SettingsV1`
* `settings_set(SettingsV1) -> void`

### 8.3 Events (progress)

* `job_progress(job_id, stage, pct, message?)`
* `job_completed(job_id, result_id)`
* `job_failed(job_id, error_code, message)`

---

## 9. Stockage local (layout + SQLite)

### 9.1 Layout fichier (normatif)

```
appdata/
  global.sqlite
  profiles/
    <profile_id>/
      db.sqlite
      artifacts/
        audio/<artifact_id>.wav
        transcript/<artifact_id>.json
        feedback/<artifact_id>.json
        packs/<artifact_id>.zip
      exports/
        outline/<project_id>.md
      models/
        whisper/<model_id>.bin
      logs/app.log
```

### 9.2 global.sqlite (normatif)

* `profiles(id TEXT PK, name TEXT, created_at TEXT, last_opened_at TEXT, is_active INT)`
* `global_settings(key TEXT PK, value_json TEXT)`

### 9.3 db.sqlite par profil (normatif)

Tables minimales :

* `talk_projects(id TEXT PK, title TEXT, audience TEXT, goal TEXT, duration_target_sec INT, stage TEXT, created_at TEXT, updated_at TEXT)`
* `quests(code TEXT PK, title TEXT, category TEXT, estimated_sec INT, prompt TEXT, output_type TEXT, targets_issues_json TEXT)`
* `quest_attempts(id TEXT PK, project_id TEXT, quest_code TEXT, created_at TEXT, output_text TEXT NULL, audio_artifact_id TEXT NULL, transcript_id TEXT NULL, feedback_id TEXT NULL)`
* `runs(id TEXT PK, project_id TEXT, created_at TEXT, audio_artifact_id TEXT, transcript_id TEXT NULL, feedback_id TEXT NULL)`
* `artifacts(id TEXT PK, type TEXT, local_relpath TEXT, sha256 TEXT, bytes INT, created_at TEXT, metadata_json TEXT)`
* `auto_feedback(id TEXT PK, subject_type TEXT, subject_id TEXT, created_at TEXT, feedback_json_artifact_id TEXT, overall_score INT)`
* `peer_reviews(id TEXT PK, run_id TEXT, created_at TEXT, reviewer_tag TEXT NULL, review_json_artifact_id TEXT)`

Connexion + sync fondations :

* `connection_config(profile_id TEXT PK, server_base_url TEXT, api_key_ref TEXT, remote_user_id TEXT NULL, sync_enabled INT, remote_stt_enabled INT, last_sync_at TEXT NULL, last_error TEXT NULL, schema_version INT)`
* `sync_state(profile_id TEXT PK, cursor TEXT NULL, last_full_sync_at TEXT NULL)`
* `oplog(id TEXT PK, ts TEXT, op_type TEXT, entity TEXT, entity_id TEXT, payload_json TEXT, sent INT)`

Indexes (normatif minimal) :

* `quest_attempts(project_id, created_at)`
* `runs(project_id, created_at)`
* `artifacts(sha256)`

---

## 10. Journalisation (oplog)

### 10.1 But

Préparer la sync future sans refactor majeur.

### 10.2 Événements enregistrés (MVP)

* Création/édition : `talk_project`, `quest_attempt`, `run`, `peer_review`, `artifact`.
* `payload_json` contient le delta minimal (pas forcément l’audio).

### 10.3 Règles

* Toute mutation applicative passe par use case qui écrit dans `oplog`.
* `sent=0` au départ ; la sync future marque `sent=1`.

---

## 11. Audio & transcription (pipeline)

### 11.1 Normalisation audio (normatif)

* Format interne : `WAV PCM mono 16kHz`.
* Toute capture convertit vers ce format avant transcription.

### 11.2 Transcription locale

* `LocalWhisperCppProvider` :

  * input : path wav
  * output : `TranscriptV1` (segments timestampés)
  * stocke transcript JSON dans `artifacts/transcript/`

### 11.3 Gestion modèles whisper

* Modèle par défaut : `small` quantifié CPU (configurable).
* Le modèle est un artefact géré dans `models/whisper/`.
* Référencement par `model_id` (ex: `whisper-small-q5_1`).

### 11.4 Jobs

* `TranscriptionJob` : progress 0–100.
* Annulation possible (best effort).

---

## 12. Analyse & feedback (pipeline)

### 12.1 Métriques v1 (normatif)

À partir de transcript + audio metadata :

* `wpm`
* `avg_sentence_words`
* `filler_per_min`
* `pause_count` (approx via silences si dispo, sinon proxy via segments)
* `repeat_terms` (top 5)
* `jargon_terms` (liste heuristique : tokens ALLCAPS, termes techniques non définis)
* `density_score` (heuristique : phrases longues + concepts/segment)

### 12.2 Feedback v1 (normatif)

* `top_actions` : **0..2**
* `comments` : **0..7** timestampés
* `suggested_quests` : 1..3 par action

### 12.3 Règle “2 actions max” (normatif)

Sélection :

1. calculer impact par issue (densité/structure/jargon/fillers/preuve)
2. prendre les 2 issues “impact élevé” + “corrigeables en 3 minutes”
3. mapper vers quêtes recommandées

---

## 13. Système de quêtes & recommandation

### 13.1 Catalogue

Le catalogue est seedé dans `quests` au premier run depuis un JSON embarqué (build-time) versionné.

### 13.2 Recommandation rule-based (MVP)

Inputs :

* stage (`start|outline|build|rehearse|polish`)
* historique métriques & actions
* “boss run dû” (toutes 7 quêtes)

Règles :

* si pas de plan → A01/A03/C01
* sinon corriger issue top-1 non traitée récemment
* si boss run dû → E10

---

## 14. Boss Run

### 14.1 Définition

* Un `Run` = audio long + transcript + feedback.

### 14.2 Output

* Rapport feedback identique au format `FeedbackV1`, avec davantage de commentaires (toujours max 7 au MVP).

---

## 15. Pair Review Pack (ZIP)

### 15.1 Objectif

Permettre à un pair de reviewer sans compute : transcript fourni.

### 15.2 Structure ZIP (normatif exact)

```
pack_<pack_id>.zip
  manifest.json
  run/audio.wav
  run/transcript.json
  run/outline.md
  rubric/rubric.json
  review/review_template.json
  viewer/index.html
  viewer/assets/*   (optionnel)
```

### 15.3 `manifest.json` (normatif)

Contient :

* ids : pack_id, run_id, project_id, profile_id (optionnel)
* versions : app_version, schema_version
* liste des fichiers avec hash/tailles/mime/role

### 15.4 Validation à l’import (normatif)

* Refuser toute entrée zip avec `..`, chemins absolus, symlinks.
* Vérifier taille max par fichier (config).
* Vérifier SHA-256 si présent.
* Vérifier `schema_version` compatible.

---

## 16. Backup/Restore

### 16.1 Structure backup ZIP (normatif exact)

```
backup_<backup_id>.zip
  manifest.json
  global/global.sqlite
  profiles/<profile_id>/db.sqlite
  profiles/<profile_id>/artifacts/**/*
  profiles/<profile_id>/exports/**/*
  profiles/<profile_id>/models/**/*
```

### 16.2 Secret policy

* Les API keys **ne sont pas** incluses dans backup (stockées dans keyring).
* À l’import, l’utilisateur devra reconfigurer la connexion si besoin.

---

## 17. Profils & Connexion (server + API key)

### 17.1 Multi-profils (normatif)

* Chaque profil = DB + artefacts isolés.
* Switch profil :

  * annuler jobs en cours (ou les attacher au profil d’origine),
  * fermer DB,
  * ouvrir DB nouveau profil,
  * rafraîchir UI.

### 17.2 Connexion (normatif)

* `server_base_url` : string, canonicalisée (https recommandé).
* `api_key` stockée dans keyring/vault ; DB contient seulement `api_key_ref`.

### 17.3 Format `api_key_ref` (normatif)

* `keyring://ttqc/<profile_id>/<sha256(server_base_url)>`

### 17.4 Commandes connexion

* `connection_set(profile_id, server_base_url, api_key_plaintext)`
* `connection_test(profile_id)` (future si réseau activé)
* `connection_clear(profile_id)` (supprime secret + config)

---

## 18. Sécurité & threat model

### 18.1 Menaces principales

* Exfiltration réseau involontaire
* Import zip malicieux (path traversal, zip bomb)
* Accès FS trop large depuis UI
* Vol d’API key en clair
* Mélange de données entre profils

### 18.2 Mitigations (normatives)

* Réseau désactivé par défaut (pas de plugin HTTP en v1).
* Capabilities/permissions minimales ; IPC restreint.
* CSP strict, aucune ressource distante.
* API key : keyring/vault uniquement.
* Import zip : validation stricte + limites.
* Profil isolation : DB/artefacts séparés.

---

## 19. Versioning & migrations

### 19.1 Versioning schémas JSON

* `schema_version` = SemVer string (ex: `"1.0.0"`).
* Compat :

  * minor/patch backward compatible
  * major = breaking

### 19.2 DB migrations

* Migrations ordonnées, idempotentes.
* `schema_version` en table `settings` par profil.

---

## 20. Tests & qualité

### 20.1 Unit tests (Rust)

* domain invariants
* reco engine rules
* parsers (whisper output → segments)
* zip validation (anti traversal)

### 20.2 Integration tests

* create profile/project → quest text attempt → export outline
* record audio stub → transcript mock → feedback generation
* pack export/import (golden files)

### 20.3 Non-regression

* “golden transcript” + “golden feedback” snapshots.

---

## 21. Packaging & rollout entreprise

### 21.1 Déploiement

* MSI/PKG selon OS (à préciser par équipe).
* Mode sans auto-update (préféré en entreprise).

### 21.2 Logs

* Logs locaux par profil + global
* Mode “diagnostic export” (sans données sensibles si possible)

---

## 22. Évolutions : Remote Whisper (STT hébergé)

### 22.1 Provider

Ajouter `RemoteWhisperProvider : TranscriptionProvider`.

### 22.2 Activation

* Feature flag `stt.mode = local|remote`.
* Plugin HTTP activé uniquement en mode connecté.
* Scopes URL whitelist stricts.

### 22.3 Contract API (proposé)

* `POST /stt/transcribe` (wav) → `TranscriptV1`
* `GET /me` → remote_user_id, policies

---

## 23. Évolutions : Cloud Sync/API

### 23.1 Provider

Ajouter `CloudStorageProvider` + `SyncEngine`.

### 23.2 Modèle sync

* DB locale = source of truth.
* Oplog delta upload + download changes.
* Blobs audio chiffrés (option “zero knowledge” recommandée).

---

# 24. Annexes : ADR (Architecture Decision Records)

## ADR-0001 — Plateforme Desktop Tauri v2

**Décision** : utiliser Tauri v2 + Rust core.
**Motif** : posture sécurité/enterprise, surface plus contrôlable que solutions lourdes.
**Conséquences** : besoin CI multi-OS, compétences Rust.

## ADR-0002 — Isolation forte : DB + artefacts par profil

**Décision** : 1 DB par profil + dossiers isolés.
**Motif** : éviter mélange de données, supprimer/exporter facilement.
**Conséquences** : plus de plumbing au switch.

## ADR-0003 — STT local via whisper.cpp

**Décision** : transcription locale whisper.cpp.
**Motif** : local-first, packaging raisonnable.
**Conséquences** : gestion modèles/performances CPU.

## ADR-0004 — Réseau désactivé par défaut (MVP)

**Décision** : aucun appel réseau en v1.
**Motif** : conformité entreprise, limiter risques.
**Conséquences** : features remote en v2.

## ADR-0005 — Secrets via Keyring/Vault, jamais en DB

**Décision** : API keys stockées dans secure storage OS.
**Motif** : réduire exposition.
**Conséquences** : backup n’inclut pas les clés.

## ADR-0006 — Pack review ZIP versionné avec manifest

**Décision** : pack zip contient manifest + artefacts + rubric.
**Motif** : partage simple/offline.
**Conséquences** : validation zip à l’import obligatoire.

## ADR-0007 — Oplog dès v1

**Décision** : journal d’opérations persistant.
**Motif** : faciliter sync future.
**Conséquences** : toute mutation passe par use cases.

## ADR-0008 — Feedback limité à 2 actions max

**Décision** : max 2 priorités.
**Motif** : éviter surcharge, favoriser itération.
**Conséquences** : heuristique de priorisation explicite.

---

# 25. Annexes : Schémas JSON (normatifs)

> Tous les schémas utilisent JSON Schema Draft 2020-12.

## 25.1 TranscriptV1 — `run/transcript.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ttqc.local/schemas/transcript.v1.json",
  "title": "TranscriptV1",
  "type": "object",
  "required": ["schema_version", "language", "segments"],
  "properties": {
    "schema_version": { "type": "string", "const": "1.0.0" },
    "language": { "type": "string", "minLength": 2 },
    "model_id": { "type": "string" },
    "duration_ms": { "type": "integer", "minimum": 0 },
    "segments": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["t_start_ms", "t_end_ms", "text"],
        "properties": {
          "t_start_ms": { "type": "integer", "minimum": 0 },
          "t_end_ms": { "type": "integer", "minimum": 0 },
          "text": { "type": "string" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

## 25.2 FeedbackV1 — `artifacts/feedback/<id>.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ttqc.local/schemas/feedback.v1.json",
  "title": "FeedbackV1",
  "type": "object",
  "required": ["schema_version", "overall_score", "top_actions", "comments", "metrics"],
  "properties": {
    "schema_version": { "type": "string", "const": "1.0.0" },
    "overall_score": { "type": "integer", "minimum": 0, "maximum": 100 },
    "top_actions": {
      "type": "array",
      "maxItems": 2,
      "items": {
        "type": "object",
        "required": ["action_id", "title", "why_it_matters", "how_to_fix", "target_quest_codes"],
        "properties": {
          "action_id": { "type": "string" },
          "title": { "type": "string" },
          "why_it_matters": { "type": "string" },
          "how_to_fix": { "type": "string" },
          "target_quest_codes": {
            "type": "array",
            "minItems": 1,
            "maxItems": 3,
            "items": { "type": "string" }
          }
        },
        "additionalProperties": false
      }
    },
    "comments": {
      "type": "array",
      "maxItems": 7,
      "items": {
        "type": "object",
        "required": ["t_start_ms", "t_end_ms", "severity", "label", "suggestion"],
        "properties": {
          "t_start_ms": { "type": "integer", "minimum": 0 },
          "t_end_ms": { "type": "integer", "minimum": 0 },
          "severity": { "type": "string", "enum": ["low", "medium", "high"] },
          "label": { "type": "string" },
          "evidence": { "type": "object", "additionalProperties": true },
          "suggestion": { "type": "string" }
        },
        "additionalProperties": false
      }
    },
    "metrics": {
      "type": "object",
      "required": ["wpm", "filler_per_min", "pause_count", "avg_sentence_words", "repeat_terms"],
      "properties": {
        "wpm": { "type": "number", "minimum": 0 },
        "filler_per_min": { "type": "number", "minimum": 0 },
        "pause_count": { "type": "integer", "minimum": 0 },
        "avg_sentence_words": { "type": "number", "minimum": 0 },
        "repeat_terms": {
          "type": "array",
          "maxItems": 10,
          "items": { "type": "string" }
        },
        "jargon_terms": {
          "type": "array",
          "items": { "type": "string" }
        },
        "density_score": { "type": "number", "minimum": 0 }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

## 25.3 RubricV1 — `rubric/rubric.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ttqc.local/schemas/rubric.v1.json",
  "title": "RubricV1",
  "type": "object",
  "required": ["schema_version", "rubric_id", "scale", "items", "required_free_text"],
  "properties": {
    "schema_version": { "type": "string", "const": "1.0.0" },
    "rubric_id": { "type": "string" },
    "scale": {
      "type": "object",
      "required": ["min", "max", "labels"],
      "properties": {
        "min": { "type": "integer", "const": 1 },
        "max": { "type": "integer", "const": 5 },
        "labels": {
          "type": "object",
          "required": ["1", "3", "5"],
          "properties": {
            "1": { "type": "string" },
            "3": { "type": "string" },
            "5": { "type": "string" }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "items": {
      "type": "array",
      "minItems": 5,
      "items": {
        "type": "object",
        "required": ["key", "label"],
        "properties": {
          "key": { "type": "string" },
          "label": { "type": "string" }
        },
        "additionalProperties": false
      }
    },
    "required_free_text": {
      "type": "array",
      "minItems": 2,
      "items": {
        "type": "object",
        "required": ["key", "label"],
        "properties": {
          "key": { "type": "string" },
          "label": { "type": "string" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

## 25.4 PeerReviewV1 — `review/review_template.json` (rempli par le pair)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ttqc.local/schemas/peer_review.v1.json",
  "title": "PeerReviewV1",
  "type": "object",
  "required": ["schema_version", "rubric_id", "scores", "free_text"],
  "properties": {
    "schema_version": { "type": "string", "const": "1.0.0" },
    "rubric_id": { "type": "string" },
    "reviewer_tag": { "type": "string" },
    "scores": {
      "type": "object",
      "minProperties": 5,
      "additionalProperties": {
        "type": "integer",
        "minimum": 1,
        "maximum": 5
      }
    },
    "free_text": {
      "type": "object",
      "minProperties": 2,
      "additionalProperties": { "type": "string" }
    },
    "timestamps": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["t_ms", "note"],
        "properties": {
          "t_ms": { "type": "integer", "minimum": 0 },
          "note": { "type": "string" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

## 25.5 PackManifestV1 — `manifest.json` (pack review)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ttqc.local/schemas/pack_manifest.v1.json",
  "title": "PackManifestV1",
  "type": "object",
  "required": ["schema_version", "pack_id", "created_at", "app_version", "run", "files"],
  "properties": {
    "schema_version": { "type": "string", "const": "1.0.0" },
    "pack_id": { "type": "string" },
    "created_at": { "type": "string" },
    "app_version": { "type": "string" },
    "profile_id": { "type": "string" },
    "project_id": { "type": "string" },
    "run": {
      "type": "object",
      "required": ["run_id", "duration_ms"],
      "properties": {
        "run_id": { "type": "string" },
        "duration_ms": { "type": "integer", "minimum": 0 }
      },
      "additionalProperties": false
    },
    "files": {
      "type": "array",
      "minItems": 4,
      "items": {
        "type": "object",
        "required": ["path", "role", "sha256", "bytes", "mime"],
        "properties": {
          "path": { "type": "string" },
          "role": {
            "type": "string",
            "enum": ["audio", "transcript", "outline", "rubric", "review_template", "viewer"]
          },
          "sha256": { "type": "string", "minLength": 64, "maxLength": 64 },
          "bytes": { "type": "integer", "minimum": 0 },
          "mime": { "type": "string" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

## 25.6 BackupManifestV1 — `manifest.json` (backup)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ttqc.local/schemas/backup_manifest.v1.json",
  "title": "BackupManifestV1",
  "type": "object",
  "required": ["schema_version", "backup_id", "created_at", "app_version", "files"],
  "properties": {
    "schema_version": { "type": "string", "const": "1.0.0" },
    "backup_id": { "type": "string" },
    "created_at": { "type": "string" },
    "app_version": { "type": "string" },
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["path", "sha256", "bytes"],
        "properties": {
          "path": { "type": "string" },
          "sha256": { "type": "string", "minLength": 64, "maxLength": 64 },
          "bytes": { "type": "integer", "minimum": 0 }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

---

# 26. Annexes : Exemples de manifests (normatifs)

## 26.1 Exemple `pack manifest.json`

```json
{
  "schema_version": "1.0.0",
  "pack_id": "pack_01J1Z7N9X8D2K6A3",
  "created_at": "2026-02-21T20:10:00Z",
  "app_version": "0.1.0",
  "profile_id": "prof_01J1Z7M...",
  "project_id": "proj_01J1Z7P...",
  "run": { "run_id": "run_01J1Z7Q...", "duration_ms": 612000 },
  "files": [
    { "path": "run/audio.wav", "role": "audio", "sha256": "…", "bytes": 12345678, "mime": "audio/wav" },
    { "path": "run/transcript.json", "role": "transcript", "sha256": "…", "bytes": 45678, "mime": "application/json" },
    { "path": "run/outline.md", "role": "outline", "sha256": "…", "bytes": 3456, "mime": "text/markdown" },
    { "path": "rubric/rubric.json", "role": "rubric", "sha256": "…", "bytes": 2345, "mime": "application/json" },
    { "path": "review/review_template.json", "role": "review_template", "sha256": "…", "bytes": 1234, "mime": "application/json" },
    { "path": "viewer/index.html", "role": "viewer", "sha256": "…", "bytes": 5678, "mime": "text/html" }
  ]
}
```

---

# 27. Annexes : Prompts Codex (plan de construction)

## M0 — Repo skeleton

* Générer monorepo Tauri v2 + UI + modules Rust `domain/application/ports/adapters`.

## M1 — Multi-profils (P1)

* Impl `global.sqlite` + CRUD profils + switch + layout dossiers.

## M2 — DB par profil + artefacts store

* Impl migrations profil DB + `ArtifactStore`.

## M3 — Catalogue quêtes + reco

* Seed JSON → table `quests` + `quest_get_daily`.

## M4 — Audio capture + WAV

* Start/stop record → artifact audio.

## M5 — whisper.cpp provider + transcript schema

* `transcribe_audio` → `TranscriptV1` JSON.

## M6 — Analyse + FeedbackV1 (2 actions max)

* Métriques v1 + heuristiques + UI feedback.

## M7 — Boss Run

* run_create/finish/analyze + rapport.

## M8 — Pack zip + manifest + import review

* Export exact structure + validation zip + import `PeerReviewV1`.

## M9 — Hardening

* CSP + IPC minimal + limites import + logs.

