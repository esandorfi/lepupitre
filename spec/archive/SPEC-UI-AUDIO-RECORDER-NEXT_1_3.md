Parfait — **2 colonnes** + un **onboarding quand il n’y a pas encore de transcript** est exactement le bon pattern pour rendre l’app accessible dès la première minute, tout en gardant de la puissance ensuite.

Voici une **spécification wireframe + composants + actions + écrans/états**, pensée “progressive disclosure” (débutant → avancé), dans le **feeling** des screenshots.

---

## Architecture des écrans (flow simple)

1. **Screen A — Record (Capture)**

* Objectif : enregistrer sans réfléchir.

2. **Screen B — Review (2 colonnes)**

* Objectif : comprendre / améliorer.
* Si transcript absent : afficher **onboarding** (micro-form + CTA transcription)
* Si transcript présent : afficher transcript synchronisé + “insights” légers.

> Optionnel (plus tard) : Screen C “Insights détaillés / Export”, mais en pratique tu peux le faire en **tabs** dans Screen B.

---

## Screen A — Record (Capture) : spécification

### Layout

* **Top bar** : Back · Titre “Audio Recorder” (ou nom du talk si connu) · menu ⋯
* **Zone status** :

  * Pastille REC + état (`Recording`, `Paused`)
  * Timer XXL
  * Sous-texte discret : “Local-only” / “On-device”
* **Waveform** : simple, playhead central
* **Transport (bottom)** :

  * **Primary (centre)** : Record / Pause / Resume (selon état)
  * **Secondary droite** : Stop
  * **Secondary gauche** : Play/monitor (si dispo) ou “Restart”
  * **Quick marker** (bookmark) : action instantanée “Add checkpoint”

### Primary / Secondary actions

* Primary : Record / Pause / Resume
* Secondary : Stop, Add checkpoint
* Avancé (⋯) : input device, sample rate, etc. (caché)

### Règles d’UX

* **Une seule action dominante** à l’écran : le bouton central.
* Les réglages ne doivent **jamais** voler l’attention au record.

---

## Screen B — Review (2 colonnes) : le cœur “coach”

### Layout global (2 colonnes)

* **Header (full width)**

  * Nom de la prise / talk + rename inline
  * Statut : “Local-only” badge
  * Actions secondaires : ⋯ (Advanced), ? (help)
* **Colonne gauche (contenu)**

  * Zone qui change selon l’état : Onboarding / Transcript / Notes
* **Colonne droite (player + actions)**

  * Timer + waveform + transport + micro-tools (speed, skip silences)

---

# État 1 : Pas encore de transcript → Onboarding (colonne gauche)

### Objectif

Transformer “je viens d’enregistrer” en “je comprends ce que je vais obtenir”.

### Contenu (colonne gauche)

Un bloc onboarding en 3 étapes **très courtes** + micro-form.

**Bloc onboarding (copy proposée, ton simple)**

* Titre : **Bienvenue. Prêt à vous entraîner ?**
* Texte :

  * “Faites une prise. Ensuite, on vous aide à améliorer le rythme et la structure.”
  * “Tout reste sur votre machine.”

**Micro-form (1 minute max)**

* Champ 1 (obligatoire, court) : **“À qui parlez-vous ?”**

  * Placeholder : “Audience : jury, clients, équipe, conférence…”
  * Suggestions chips : “Conférence”, “Clients”, “Équipe”, “Classe”
* Champ 2 (optionnel, ultra-court) : **“Un mot pour décrire votre objectif”**

  * Placeholder : “clair / convaincant / énergique…”
  * Suggestions chips : “Clarté”, “Impact”, “Confiance”, “Timing”
* Champ 3 (optionnel) : **“Durée cible”**

  * ex : 5:00, 10:00, 20:00

**CTA principal (gros, unique)**

* **“Générer la transcription (local)”**

  * sous-texte : “Whisper sur votre machine · aucune donnée envoyée”

**CTA secondaire**

* “Passer pour l’instant” (si tu veux autoriser juste la réécoute)

### Pourquoi ça marche

* Tu utilises l’onboarding pour **segmenter** (audience) et **donner une intention** (objectif), ce qui aide ensuite tes feedbacks.
* Et tu restes fidèle au local-first (“aucune donnée envoyée”).

---

# État 2 : Transcript présent → Transcript + markers (colonne gauche)

### Colonne gauche (Transcript)

* Tabs simples (pas trop) :

  * **Transcript** (par défaut)
  * **Summary** (optionnel, court)
  * (plus tard) **Insights** si tu veux, mais évite 3 tabs dès le début

**Transcript list**

* Segments avec timestamp
* Click segment = seek audio + highlight
* Markers intégrés :

  * soit comme “chapitres” (Intro / Point 1 / etc.)
  * soit comme bookmarks libres

**Actions contextuelles légères**

* “Ajouter checkpoint”
* “Renommer checkpoint”
* “Transformer en plan” (optionnel)

### Colonne droite (Player)

* Waveform + playhead
* Transport : Play/Pause central, Stop, +/-5s
* Micro-tools (petits) :

  * Speed (0.75 / 1.0 / 1.25 / 1.5)
  * Skip silences toggle
  * Repeat toggle

### CTA principal (selon progression)

* Si transcript OK mais pas encore “feedback” :

  * **“Voir le feedback”** (ou “Analyser”)
* Après feedback :

  * **“Planifier le prochain run”** (si ton app a la boucle training)
  * ou “Exporter un snapshot” (si tu veux un output simple)

---

## Progressive disclosure : débutant → avancé

### Niveau 1 (première utilisation)

* Record
* Playback
* Transcript (1 bouton)
* 1 CTA “Voir le feedback”

### Niveau 2 (utilisateur régulier)

* Checkpoints
* Speed / Skip silence
* Summary
* Comparaison de runs

### Niveau 3 (avancé, caché dans ⋯ / Advanced)

* réglages audio / device
* options transcription (langue, modèle)
* exports (formats, naming conventions)
* outils de nettoyage (trim, normalize, etc.)

> Règle : l’Advanced panel n’apparaît pas comme “important” tant que l’utilisateur n’a pas obtenu un transcript ou un feedback une fois.

---

## Composants (design system) à définir

* **Primary Button** (CTA unique)
* **Secondary Button** (petit)
* **Chip selector** (audience / objectif)
* **Timer display** (xxl, accessible)
* **Waveform** (simple, haute lisibilité)
* **Transcript item** (timestamp + text + state active)
* **Marker** (bookmark/chapter)
* **Local-only badge**
* **Empty state / Onboarding card**
* **Advanced drawer** (panel latéral)

---

## Proposition pragmatique vs ton UI (pour simplifier)

Si aujourd’hui tu as beaucoup d’actions visibles dès le départ, mon conseil “product” est :

* **Sur Screen A** : retirer tout ce qui n’est pas Record/Pause/Stop/Marker.
* **Sur Screen B** : rendre le transcript **le pivot**. Tant qu’il n’existe pas → onboarding + 1 CTA.
* Tout le reste → **Advanced drawer** (⋯) ou tabs secondaires.

Ça te donne l’accessibilité “first usage”, sans perdre la richesse.

---

Si tu veux, je peux maintenant te proposer :

1. un **wireframe ASCII** (ou pseudo-layout) pour desktop 2 colonnes avec tailles/hiérarchie,
2. la **microcopy exacte** FR/EN pour l’onboarding,
3. une proposition de **règles de navigation** (quand on passe de A → B, quand on affiche “Analyze”, etc.).
