Parfait — je te donne :

1. **3 propositions différentes** pour l’onboarding (microcopy + micro-form)
2. un **wireframe ASCII desktop 2 colonnes** (structure + hiérarchie + tailles relatives)
3. des **règles de navigation/états** (A → B, CTA unique, progressive disclosure)

---

## 1) Onboarding (quand pas de transcript) — 3 propositions

### Proposition 1 — “Audience + objectif” (la plus coach, simple)

**But** : contextualiser le feedback sans faire remplir un formulaire.

**Colonne gauche**

* Titre : **Avant de commencer**
* Texte : “À vous de parler. On transforme cette prise en feedback clair (rythme, structure, progression). Tout reste sur votre machine.”
* Champs (compact, 2 lignes max chacun) :

  1. **Audience** (chips + champ libre)
     *Placeholder* : “Conférence, clients, équipe, classe…”
  2. **Objectif** (chips)
     “Clarté / Impact / Confiance / Timing”
  3. *(optionnel)* **Durée cible** (mm:ss)
* CTA primaire : **Générer la transcription (local)**
* CTA secondaire (petit) : “Réécouter sans transcription”

**Pourquoi c’est bien** : zéro jargon, utile pour personnaliser tes insights.

---

### Proposition 2 — “Mode de session” (ultra accessible, 1 clic)

**But** : réduire à un choix binaire, puis tout est auto.

**Colonne gauche**

* Titre : **Choisissez votre session**
* 3 grosses cartes (radio) :

  * **Répétition rapide (2 min)** — “Juste enregistrer + vérifier le rythme”
  * **Répétition complète** — “Transcription + checkpoints + feedback”
  * **Pitch / Démo** — “Focus sur clarté et transitions”
* Sous-texte : “Données locales, aucun envoi cloud.”
* CTA primaire : **Continuer**

  * si “rapide” → pas de transcript automatique, juste playback + timer
  * sinon → lance transcript
* CTA secondaire : “Paramètres avancés”

**Pourquoi c’est bien** : idéal 1ère fois, pas d’écriture.

---

### Proposition 3 — “Une phrase de description” (minimal + émotionnel)

**But** : ultra court, donne une intention.

**Colonne gauche**

* Titre : **Décrivez cette prise**
* Champ unique : **“En une phrase…”**
  *Placeholder* : “Je veux un pitch plus clair / Je révise mon intro / Je travaille mes transitions”
* Ligne “Audience” facultative (chips)
* CTA primaire : **Transcrire localement**
* CTA secondaire : “Ignorer”

**Pourquoi c’est bien** : simple, mais très utile pour nommer / retrouver les runs.

---

## 2) Wireframe ASCII — Desktop 2 colonnes (Screen B: Review)

### État : transcript absent (onboarding à gauche)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Le Pupitre · [Nom de la prise ▾]   [Local-only ✓]        [⋯ Advanced] [?]   │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────┬─────────────────────────────────────────────┐
│ LEFT (Content)                 │ RIGHT (Player)                               │
│                               │                                             │
│ ┌───────────────────────────┐ │  00:35.8 / 05:48                             │
│ │  Onboarding Card          │ │  ┌─────────────────────────────────────────┐ │
│ │  "À vous de parler..."    │ │  │ Waveform + playhead                      │ │
│ │                           │ │  └─────────────────────────────────────────┘ │
│ │  Audience: [chips][____]  │ │                                             │
│ │  Objectif: [chips]        │ │  [⟲ -5s]   [ Play/Pause ]   [ +5s ⟳ ]        │
│ │  Durée cible:  [mm:ss]    │ │                                             │
│ │                           │ │  Tools: [Skip silences ☐] [Repeat ☐] [1.0x] │
│ │  [PRIMARY: Transcrire]    │ │                                             │
│ │  (secondary) Réécouter    │ │  (secondary) Stop / Restart                 │
│ └───────────────────────────┘ │                                             │
└───────────────────────────────┴─────────────────────────────────────────────┘

Footer (optional): “Tout reste local. Whisper sur votre machine.”
```

### État : transcript présent (liste à gauche)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Le Pupitre · [Talk: Demo v3 ▾]  [Local-only ✓]        [⋯ Advanced] [Export] │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────┬─────────────────────────────────────────────┐
│ LEFT                           │ RIGHT                                       │
│ Tabs: [Transcript] [Summary]   │  02:14 / 05:48                              │
│ Search (optional): [_____]     │  ┌─────────────────────────────────────────┐ │
│                               │  │ Waveform + playhead                      │ │
│ 00:12  Intro…                 │  └─────────────────────────────────────────┘ │
│ 00:35  (Checkpoint) Point 1   │                                             │
│ 01:10  Transition…            │  [⟲ -5s]   [ Play/Pause ]   [ +5s ⟳ ]        │
│ 01:42  Point 2…               │  Tools: [Skip ☐] [Repeat ☐] [1.25x]          │
│ ...                           │                                             │
│                               │  [PRIMARY: Voir le feedback]                │
│ (secondary) + Checkpoint      │  (secondary) Partager / Export              │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

**Notes design**

* CTA primaire sur la droite (proche du player) quand transcript présent : ça oriente vers “progress”.
* Les tabs à gauche restent minimales (2 max au départ).

---

## 3) Règles de navigation / états (pragmatiques)

### A. Passage Screen A → Screen B

* Quand l’utilisateur appuie **Stop** :

  * création d’une “Run” locale
  * ouverture directe Screen B en mode **Review**
  * si transcript auto ON : lancer transcription en arrière-plan + afficher “Generating…”

### B. CTA unique basé sur l’état

* **Pas de transcript** → CTA = **Générer la transcription (local)**
* **Transcript prêt** mais pas de feedback calculé → CTA = **Voir le feedback**
* **Feedback déjà vu** → CTA = **Planifier le prochain run** (ou “Exporter un snapshot”)

> Une seule action principale par état = énorme gain d’accessibilité.

### C. Progressive disclosure (quand montrer l’avancé)

* Le menu **⋯ Advanced** est visible mais discret dès le début
* Les options “complexes” (ASR modèle, langue, export formats, nettoyage) sont :

  * soit derrière Advanced
  * soit déverrouillées après le premier transcript réussi (“Pro tips”)

### D. Onboarding “non bloquant”

* L’utilisateur peut “Réécouter sans transcription”
* Mais tu le ramènes vers le bénéfice avec une micro-hint :

  * “Pour avoir pacing + structure, générez la transcription (local).”

### E. Accessibilité / première minute

* Par défaut :

  * vitesse = 1.0x
  * skip silences OFF
  * repeat OFF
  * aucun param audio visible
* Tout réglage avancé ne doit pas empêcher de “Record → Stop → Review”.

---

## Bonus : microcopy de CTA (3 variations)

* **Transcrire localement**
* **Générer le texte (local)**
* **Créer la transcription (sur votre machine)**

---

Dis-moi quelle **proposition d’onboarding** tu préfères (1, 2 ou 3).
Et si tu veux, je peux aussi te proposer un “mode débutant” activé par défaut + un “mode pro” (toggle) qui ré-affiche tes contrôles avancés quand l’utilisateur est à l’aise.
