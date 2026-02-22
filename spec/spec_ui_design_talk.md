Below is a **Codex-ready spec** for the **new Training (Entraînement) + Talks UI**, reflecting the mock you approved and the design decision: **Training = quests + feedback only (gamey)**, **Talks = Define → Build → Train → Export**, with quests/feedback reused as a secondary surface.

---

# LE PUPITRE — UI SPEC (vNext)

## Scope: Entraînement + Talk UI + Quest/Feedback design decisions

### 0) Terminology mapping (UI vs existing spec)

* **Espace (Workspace)** = `profile` in RFC/spec. 
* **Talk** = `talk_project` / `project` in DB & IPC.
* **Quête** = `quest`
* **Tentative** = `quest_attempt` (“Attempt”) 
* **Feedback** = `FeedbackV1` (max 2 actions, 0–7 comments)
* **Répétition (Boss run)** = `run` (6–12 min)

---

## 1) Global navigation (App shell integration)

Tabs in top app bar:

* **Entraînement**
* **Talks**

Workspace switcher + settings remain per global spec (already defined earlier).

**Routing**

* `/training` → Entraînement home
* `/talks` → Talks list
* `/talks/:projectId/define`
* `/talks/:projectId/builder`
* `/talks/:projectId/train`
* `/talks/:projectId/export`

---

## 2) Design decision: Training requires `project_id` (keep RFC invariant)

RFC requires **active profile + active talk** for attempts. 
DB schema requires `quest_attempts.project_id`. 

### Decision (implement now): “Training Talk” system project per workspace

On workspace creation (or first app run per workspace), auto-create:

* `talk_project.title = "Entraînement"`
* `talk_project.stage = "start"` (or “rehearse”, your choice)
* Store flag in DB (recommended): `is_system_training = true` *(can be in `metadata_json` if you don’t want a schema change yet)*

**Behavior**

* Entraînement mode always uses this `training_project_id` internally.
* It does **not** appear in Talks list by default (unless “Show system talks” debug toggle).

---

## 3) Entraînement UI (gamey, simple, not dashboard)

### 3.1 Entraînement Home — layout

Single-column (desktop and mobile), sections in this exact order:

1. **Hero: Quête du jour (3 min)**
2. **Choisir une autre quête** (category chips + quick picker)
3. **Feedback (Inbox)** (actionable list)
4. **Historique** (timeline feed of attempts)

### 3.2 Hero card: “Quête du jour”

**Data**

* Get daily quest with: `quest_get_daily(profile_id, training_project_id)` 

**UI contents**

* Title: `Quête du jour · {estimated_sec/60} min` (+ optional sparkles/star icon)
* Quest title
* Prompt (1 line max, truncated)
* Chips: `Audio|Texte`, category (Structure/Intro/Clarté/…)
* Optional small “streak/level” chip (pure UI; no backend required)

**Actions**

* Primary CTA: `Démarrer` (or `Continuer` if there is an in-progress attempt concept)
* Secondary (text buttons):

  * `Changer` → opens quest picker modal
  * `Quête libre` → open quest with code `FREE` (RFC requires a FREE quest exists)

**Rule**

* Exactly **one** primary CTA in the hero.

### 3.3 Quest picker modal (fast selection)

Opens from `Changer` or from chips row.

**UI**

* Category chips: `Structure / Intro / Clarté / Rythme / Q&A / Impro`
* List rows:

  * Quest title + estimated time
  * Output chip (Audio/Texte)
  * Action: `Démarrer`

**Submit**

* On click: open Quest flow (QuestPage) with selected quest code.

### 3.4 Feedback Inbox (summary list)

Feedback is **never automatic**; analysis is user-triggered.
Feedback format: **max 2 actions**.

**List item row**

* Title: `{Quest title}`
* Meta: date + duration chip
* State: `Prêt` or `Vu`
* Show the **2 actions** as small “action chips” (no long text here)
* Click → Feedback detail view

**Feedback detail view**

* Header: quest name + attempt date
* “Top actions” (max 2)
* Comments timestamped (collapsible)
* CTA: `Refaire une quête suggérée` (links to quest codes provided by feedback schema)

### 3.5 Historique (timeline feed)

Use `quest_attempts_list(profile_id, training_project_id, limit?)` 

Row:

* Quest title
* Chips: Audio/Texte, Feedback prêt, etc.
* Date
* Click row → Attempt detail (where user can transcribe/analyze)

---

## 4) Quest attempt flow (shared by Training and Talks)

### 4.1 QuestPage steps (must match RFC)

RFC flow is normative: pre-brief → capture → (optional) transcription → user-initiated analysis.

**Step 1: Pré-brief**

* goal + output expected
* CTA: `Commencer`

**Step 2: Capture**

* If `output_type = text`: text area + `Soumettre`
* If `output_type = audio`: record controls (start/stop)

**Persist attempt**

* Text: `quest_submit_text(profile_id, project_id, quest_code, text)` 
* Audio:

  * `audio_save_wav(profile_id, base64_wav)` then
  * `quest_submit_audio(profile_id, project_id, quest_code, artifact_audio_id, transcript_id?)`

**Step 3: Transcription (audio only)**

* Button: `Transcrire` (optional)
* Calls: `transcribe_audio(profile_id, artifact_audio_id)` and listens to job progress events

**Step 4: Analyze (user initiated)**

* Button: `Analyser`
* Calls: `analyze_attempt(profile_id, attempt_id)`
* If audio and transcript missing: show CTA `Transcrire d’abord` (normative rule)

---

## 5) Talks UI (primary flow, not dashboard)

### 5.1 Talks list page

Each talk card shows:

* Title
* Stage chip (mapped from `talk_projects.stage`: start|outline|build|rehearse|polish)
* One-line “next action” text (computed client-side from stage + missing fields + training state)
* CTA: `Ouvrir`

Data via `project_list(profile_id)` and `project_get_active(profile_id)` if needed. 

### 5.2 Talk detail: Stepper tabs

Inside a talk:

* **Définir**
* **Builder**
* **S’entraîner**
* **Exporter**

Right-side panel (desktop only):

* “Prochaine action” card (one CTA)
* “Feedbacks prêts: N”
* Small timeline (last 5 events)

---

## 6) Talk Step: Définir (editor-first)

This page is an editor, not a report.

**Fields (editable inline)**

* Audience
* Objectif (one sentence)
* Durée cible (minutes)

**Rules**

* If duration missing: show `Définir une durée` (no `-- min`)
* Primary CTA: `Continuer vers Builder`
* Save on blur + explicit “saved” indicator

Underlying storage is `talk_projects` table fields. 

---

## 7) Talk Step: Builder (outline-first)

Primary surface: outline editor.

**MVP actions**

* Add section
* Reorder (optional)
* Save continuously

**Export shortcut**

* Optional button: `Exporter brouillon (MD)` calling `export_outline(project_id)`

---

## 8) Talk Step: S’entraîner (secondary reuse of Training UI)

This page reuses the same components, but scoped to the talk project_id.

Top section:

* “Prochaine quête pour ce talk” (recommendation rules already exist in RFC)
* Primary CTA: `Démarrer`

Below:

* Quest list for this talk + feedback list + mini history (short)
* A secondary action: `Lancer une répétition (6–12 min)` (Boss run).

Boss run flow uses:

* `run_create(project_id)` → `run_finish(run_id, audio)` → `run_analyze(run_id)`

---

## 9) Talk Step: Exporter (ship it)

Export features per RFC:

* Outline export: Markdown (MVP), PDF optional
* Pair review pack: zip export + import review

**UI**

* `Exporter outline (MD)` → `export_outline(project_id)`
* `Exporter pack review (ZIP)` → `pack_export(run_id)` (requires a run)
* `Importer review` → `peer_review_import(path)`

---

## 10) Accessibility requirements (must)

* Contrast for text: **4.5:1** normal text, **3:1** large text (WCAG AA). ([webaim.org][1])
* Click/target size: keep minimum ~44px for interactive controls (maps well to WCAG target size guidance). ([W3C][2])
* Keyboard focus: visible focus ring on all interactive elements.

---

# 11) Codex task list (do this in order)

## Phase A — Data/selection plumbing

1. Add `training_project_id` resolution:

   * On workspace init: ensure Training talk exists (system project)
   * Cache/store its id per workspace
2. Make `/training` use `training_project_id` for all quest calls.

## Phase B — Entraînement UI

3. Implement Training Home sections:

   * Daily quest hero (`quest_get_daily`)
   * Quest picker modal
   * Feedback inbox list (from attempts with feedback_id)
   * History list (`quest_attempts_list`)
4. Implement Feedback detail view rendering `FeedbackV1` top_actions + comments. 

## Phase C — Talk UI

5. Refactor Talk detail into stepper tabs: Define/6) Define step = inline editor + CTA “Continuer vers Builder”.
6. Train step = reuse Training components but scoped to `project_id`.
7. Export step = Outline export + Pack export/import as per IPC.

## Phase D — Quest flow compliance

9. QuestPage flow with:

   * optional transcription
   * analyze is user initiated
   * audio analyze requires transcript (“Transcrire d’abord”)

---


[1]: https://webaim.org/resources/contrastchecker/?utm_source=chatgpt.com "Contrast Checker"
[2]: https://www.w3.org/TR/WCAG22/?utm_source=chatgpt.com "Web Content Accessibility Guidelines (WCAG) 2.2 - W3C"
