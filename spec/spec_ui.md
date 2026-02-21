Voici une **spec UI “opinionated”** (format RFC UI) basée sur ton stack :

* **Vue 3 + Vite + TypeScript**
* **Vue Router (SPA)**
* **Nuxt UI** (composants) + **Tailwind**
* **Zod** (validation runtime des payloads IPC + validation JSON côté UI)

> Note compat : Nuxt UI fonctionne aussi en **projet Vue standalone** via **Vite plugin** + `@nuxt/ui/vue-plugin` (pas besoin de Nuxt) — et il faut utiliser **`@nuxt/ui`** (l’ancien `@nuxthq/ui` est déprécié). ([Nuxt UI][1])

---

# RFC-UI-0001 — UI Spec (TTQC Desktop)

**Statut** : Draft
**Version** : 0.1
**Scope** : UI SPA + couche IPC + écrans MVP (local-first) + base multi-profils + évolutions “connecté”
**Dépendances** : Vue 3, Vite, TS, Vue Router, Nuxt UI, Tailwind, Zod ([Nuxt UI][2])

## 1) Objectifs UI

1. Démarrer une **quête du jour** en 1 clic (pas de “choix paralysant”).
2. Rester **réactif** (transcription/analyse = jobs async + progress).
3. Donner un feedback **actionnable** (2 actions max).
4. Gérer **multi-profils** (switch + isolation).
5. Préparer les écrans “connecté” (server + API key) sans activer réseau en v1.

---

## 2) Installation/bootstrapping UI (normatif)

### 2.1 Nuxt UI dans Vue+Vite (normatif)

* Installer `@nuxt/ui` + `tailwindcss`
* Ajouter **Nuxt UI Vite plugin** dans `vite.config.ts`
* Installer le plugin Vue `ui` dans `main.ts`
* Importer CSS Tailwind + Nuxt UI dans `assets/main.css` ([Nuxt UI][2])

**Contrainte** : utiliser `@nuxt/ui` (pas `@nuxthq/ui`, déprécié). ([npmjs.com][3])

---

## 3) Arborescence UI (normative)

```text
desktop/ui/src/
  main.ts
  app.tsx (ou App.vue)
  router/
    index.ts
    routes.ts
  layouts/
    AppShell.vue
  pages/
    HomePage.vue
    ProfilesPage.vue
    ProjectSetupPage.vue
    QuestPage.vue
    FeedbackPage.vue
    TalkBuilderPage.vue
    BossRunPage.vue
    PacksPage.vue
    SettingsPage.vue
  components/
    TopBar.vue
    SideNav.vue
    ProfileSwitcher.vue
    ProjectSwitcher.vue
    Timer.vue
    QuestCard.vue
    TextCapture.vue
    AudioRecorder.vue
    TranscriptViewer.vue
    FeedbackPanel.vue
    ProgressToast.vue
    FilePicker.vue
  composables/
    useIpc.ts
    useJobs.ts
    useProfiles.ts
    useProject.ts
    useQuest.ts
    useRuns.ts
    usePacks.ts
  schemas/
    ipc.ts        (Zod schemas payload/response)
    domain.ts     (Zod: TranscriptV1, FeedbackV1, RubricV1…)
  stores/         (option recommandé)
    app.ts
    profile.ts
    project.ts
    jobs.ts
  lib/
    types.ts
    errors.ts
    constants.ts
```

---

## 4) Routing (Vue Router, SPA)

### 4.1 Routes MVP (normatif)

* `/` → **HomePage** (quête du jour + résumé progression)
* `/profiles` → **ProfilesPage** (liste/crea/switch)
* `/project/new` → **ProjectSetupPage**
* `/quest/:questCode` → **QuestPage** (pré-brief + capture)
* `/feedback/:feedbackId` → **FeedbackPage**
* `/builder` → **TalkBuilderPage**
* `/boss-run` → **BossRunPage**
* `/packs` → **PacksPage** (export/import)
* `/settings` → **SettingsPage**

### 4.2 Navigation UX

* AppShell avec sidebar (Home / Builder / Boss Run / Packs / Settings)
* Switch profil accessible partout (TopBar).

---

## 5) State management (recommandé)

**Recommandation** : Pinia (ou store léger maison).
Global state minimal :

* `activeProfileId`
* `activeProjectId`
* `dailyQuest`
* `jobProgressById`
* `lastErrorBanner`

*(Pinia n’est pas obligatoire, mais réduit la dette quand tu ajoutes jobs + multi-profils.)*

---

## 6) Couche IPC : contrat strict + Zod (normatif)

### 6.1 Principe

Chaque appel Tauri `invoke()` passe par un wrapper unique qui :

1. valide le **payload** avec Zod avant envoi
2. valide la **response** avec Zod au retour
3. normalise les erreurs en `AppError`

Zod = validation runtime typée (type inference TS) ([GitHub][4])

### 6.2 Pattern `invokeChecked`

Signature proposée :

* `invokeChecked(command, payloadSchema, responseSchema, payload) -> Promise<ResponseType>`

Erreurs standardisées :

* `IPC_INVALID_PAYLOAD`
* `IPC_INVALID_RESPONSE`
* `IPC_COMMAND_FAILED`
* `IPC_TIMEOUT`
* `USER_CANCELLED`

---

## 7) Zod : schémas domain + IPC (normatif)

### 7.1 Schémas Domain (alignés RFC backend)

* `TranscriptV1Schema`
* `FeedbackV1Schema`
* `RubricV1Schema`
* `PeerReviewV1Schema`
* `PackManifestV1Schema`
* `ExportResultSchema`

### 7.2 Schémas IPC (payload/response)

Exemples :

* `ProfileCreatePayloadSchema { name: string }`
* `ProfileSummarySchema { id, name, isActive }`
* `QuestDailySchema { quest: Quest, why: string, dueBossRun: boolean }`
* `AudioStopResponseSchema { artifactId: string }`
* `TranscribeResponseSchema { transcriptId: string }`
* `AnalyzeResponseSchema { feedbackId: string }`

---

## 8) Jobs & progress UI (normatif)

### 8.1 Event model

* Tauri émet des events `job_progress`, `job_completed`, `job_failed`
* UI écoute et met à jour `jobsStore`

### 8.2 UI feedback

* `ProgressToast` global :

  * transcription en cours (pct)
  * analyse en cours (pct)
  * actions possibles : “Annuler” (si supporté) / “Ouvrir”

---

## 9) Spécifications écrans (MVP)

## 9.1 HomePage

**But** : 1 clic → quête.

* Carte “Quête du jour (3 min)” :

  * titre, “pourquoi”, CTA “Démarrer”
* Bloc “Projet actif” (titre, stage, durée cible)
* Indicateur “Boss run dû” (si oui, CTA “Lancer boss run”)
* Bloc “Prototype audio” (capture rapide) :

  * ancré à la quête du jour si elle existe
  * redirige vers QuestPage (flow complet)
  * option “Quête libre” pour capturer sans enjeu
  * sinon demande de créer un talk avant de capturer

**AC**

* Si pas de projet : CTA “Créer mon talk”
* Si pas de profil : redirige `/profiles` (ou wizard)

---

## 9.2 ProfilesPage

**But** : créer/switch profil.

* liste profils
* CTA “Nouveau profil”
* action “Activer”

**AC**

* Switch profil recharge projet actif + daily quest
* “Supprimer profil” peut être MVP+ (optionnel)

---

## 9.3 ProjectSetupPage

* formulaire : titre, audience, durée, objectif
* CTA “Créer”

**AC**

* crée projet + set activeProjectId + retour Home

---

## 9.4 QuestPage (pré-brief + capture)

**États**

1. Pré-brief (10s) : objectif + sortie attendue + “Lancer timer”
2. Capture :

   * **TextCapture** OU **AudioRecorder** selon `quest.outputType`
3. Transcription (optionnelle, audio uniquement)
4. Analyse **user-initiated** → Redirect vers `/feedback/:feedbackId`

**AC**

* Timer 3:00 visible
* “Valider” bloque si vide
* Audio : record/stop + lecture
* “Demander feedback” déclenche l’analyse (pas automatique)
* Si audio sans transcript : CTA “Transcrire d’abord”
* “Skipper la transcription” conserve la tentative sans feedback

---

## 9.5 FeedbackPage

**But** : corriger sans surcharge.

* `FeedbackPanel` :

  * score
  * **Top actions max 2**
  * commentaires timestampés (cliquables → jump audio)
  * suggestions “quêtes suivantes” (1–3)

**AC**

* CTA “Marquer comme fait”
* CTA “Refaire maintenant (3 min)”
* CTA “Ajouter au talk” (attache artefact au builder)

---

## 9.6 TalkBuilderPage

**But** : plan vivant.

* Liste sections (cards)
* Artefacts liés (takeaways, transitions, exemples, snippets audio)
* Export Markdown

**AC**

* Réordonner sections (drag/drop ou boutons)
* Export crée un fichier et affiche “Ouvrir dossier”

---

## 9.7 BossRunPage

* Enregistrement 6–12 min + timer
* Processing + rapport (FeedbackPage)

**AC**

* Lancer boss run crée un `run_id`
* “Finish” attache audio_artifact_id et déclenche transcription/analyse

---

## 9.8 PacksPage

* Export pack review (zip)
* Import review (file picker)

**AC**

* Export retourne `path`
* Import affiche résultat (scores + champs textes + timestamps)

---

## 9.9 SettingsPage

* Modèle Whisper (sélection + état installé)
* Stockage local (chemin, taille)
* (futur) Connexion : server + API key + “test”

**AC**

* En v1 : pas de réseau, section connexion grisée/flag “coming soon”

---

## 10) Composants UI (normatif)

* `AppShell`: layout + sidebar
* `TopBar`: profil switcher + projet switcher + statut jobs
* `QuestCard`: résumé quête
* `Timer`: 3:00 + pause/stop (pause optionnelle)
* `AudioRecorder`: record/stop/play + waveform simple (option)
* `TranscriptViewer`: segments + jump timestamps
* `FeedbackPanel`: top2 actions + list comments
* `FilePicker`: import zip/json

Nuxt UI fournit la base (inputs, buttons, cards, modals) ([Nuxt UI][1])

---

## 11) Style / Design rules (Tailwind + Nuxt UI)

* Design “sobre enterprise” : densité faible, typographies lisibles
* Couleurs par défaut Nuxt UI, custom minimal
* Accessibilité : focus states, raccourcis clavier (MVP+)

---

## 12) Contrats UI ↔ Backend (checklist)

Pour chaque commande Tauri :

* nom de la commande
* payload Zod
* response Zod
* erreurs possibles
* event(s) attendus

Ex : `transcribe_audio`

* payload : `{ artifactAudioId, options{modelId, languageHint?} }`
* response : `{ transcriptId, jobId }` (si async)
* events : progress/completed/failed

---

# Décisions UI (ADR-UI)

**ADR-UI-0001** : SPA Vue Router
**ADR-UI-0002** : Nuxt UI + Tailwind (composants + utilitaires) ([Nuxt UI][2])
**ADR-UI-0003** : Zod validation systématique IPC/domain pour éviter “contrat fantôme” ([GitHub][4])
**ADR-UI-0004** : Jobs async + progress events (transcription/analyse)

---

## “Prompt Codex” pour générer la spec UI + squelette

```text
Crée la partie UI (Vue 3 + Vite + TS) avec Vue Router, Nuxt UI et Tailwind (standalone Vue via Vite plugin + @nuxt/ui/vue-plugin).
Implémente :
- AppShell layout + sidebar + TopBar
- Routes: /, /profiles, /project/new, /quest/:questCode, /feedback/:feedbackId, /builder, /boss-run, /packs, /settings
- Composables: useIpc (invokeChecked avec Zod), useJobs (écoute events job_progress/job_completed/job_failed), useProfiles, useProject, useQuest
- Pages MVP : HomePage, ProfilesPage, ProjectSetupPage, QuestPage (text/audio capture), FeedbackPage, TalkBuilderPage, BossRunPage, PacksPage, SettingsPage (connexion grisée)
- Zod schemas (ipc + domain) alignés avec TranscriptV1/FeedbackV1/RubricV1/PeerReviewV1/PackManifestV1
Contrainte : aucun accès réseau en v1, toutes les interactions backend passent par useIpc.
```

---

[1]: https://ui.nuxt.com/docs/getting-started?utm_source=chatgpt.com "Introduction - Nuxt UI"
[2]: https://ui3.nuxt.com/getting-started/installation/vue?utm_source=chatgpt.com "Installation - Nuxt UI for Vue"
[3]: https://npmjs.com/package/%40nuxthq/ui?utm_source=chatgpt.com "nuxthq/ui"
[4]: https://v3.zod.dev/?id=or&utm_source=chatgpt.com "TypeScript-first schema validation with static type inference"
