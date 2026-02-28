Below is a **copy/paste-ready specification document** you can hand to Codex. It’s written to be implementation-oriented (tokens, components, behaviors, naming, accessibility). Adjust any labels if you prefer “Profils” over “Espaces”—I’m assuming you’ll rename user-facing “Profiles” to **Espaces** (Workspaces).

---

# LE PUPITRE — UI DESIGN SYSTEM SPEC (Local-first, single user, multiple workspaces)

## 0) Goals

* Make workspace context **always visible** and **one-click switchable**
* Keep UI **professional, elegant, minimal**, and **accessible**
* Unify navigation: **App Shell** (global) + **Page layout** (local)
* Support 2 themes: **Orange (light)** and **Terminal (dark)** using the same semantic token system

---

## 1) Naming & IA (Information Architecture)

### 1.1 Core entities (internal names)

* `workspace` (previously “profile”)
* `talk` (conversation / session)
* `app_shell` (global layout)
* `settings` (theme/language/about/advanced)

### 1.2 User-facing French labels (default)

* Profiles page becomes: **Espaces**
* “Create profile” becomes: **Créer un espace**
* “Active” becomes: **Actuel**
* “Switch/Activate” becomes: **Ouvrir** (opens + sets current)
* Manage: **Gérer les espaces…**
* Rename: **Renommer**
* Delete: **Supprimer**
* Search placeholder: **Rechercher un espace…**
* Nav:

  * **Accueil**
  * **Talks** (keep as product term) OR replace with **Discussions** (choose once and apply globally)

> Rule: user-facing text never shows internal IDs (e.g., `prof_*`) by default.

---

## 2) App Shell (Global Layout)

### 2.1 Structure

**Top App Bar** (always visible)

* Left: App brand/title: `LE PUPITRE` (click → workspace Home)
* Middle: Primary nav tabs (if only 2–4 sections): `Accueil` / `Talks`
* Right: Workspace switcher pill + Settings (gear)

**Content area**

* Page header (title + subtitle + primary action)
* Page body

### 2.2 Top App Bar specs

* Height: 64px desktop, 56px mobile
* Padding: 16–24px horizontal
* Background: `color.bg` or `color.surface` (theme-dependent)
* Bottom divider: `color.border` 1px

**Right-side controls**

1. Workspace switcher pill (always visible)
2. Settings icon (gear) opens settings menu

### 2.3 Primary navigation rules

* Use **tabs** for 2–4 top-level destinations (e.g., Accueil, Talks).
* Selected tab uses:

  * text color: `color.text`
  * underline/indicator: `color.accent`

### 2.4 Breadcrumb rules

Breadcrumb appears **only on deep pages**, not on top-level screens.

* Talks list: no breadcrumb
* Talk detail: breadcrumb `Talks / {TalkTitle}`
* Talk subviews: `Talks / {TalkTitle} / {Subview}`

Breadcrumb replaces the page title **only if it improves clarity**; otherwise keep title and show breadcrumb above in smaller text.

---

## 3) Workspace Context & Switching

### 3.1 Workspace switcher (header pill)

Displays current workspace:

* Leading: initials/avatar circle
* Text: `WS · {WorkspaceName}` (truncate with ellipsis)
* Trailing: chevron

**Click opens dropdown panel**

* Search input (optional on desktop, required if many workspaces)
* “Récents” list (optional)
* Workspace list (name + optional meta)
* Actions:

  * “Gérer les espaces…”
  * “Créer un espace…”

### 3.2 Switching behavior (local-first)

When user selects another workspace:

* Set it as **current workspace**
* Navigate to workspace **Accueil** by default
  *(Optional upgrade: return to last visited route per workspace.)*
* Show toast: `Espace actif : {WorkspaceName}` (3s)

### 3.3 Unsaved changes rule

If a page can have unsaved changes:

* Prefer autosave
* If not possible: on switch show confirm modal:

  * Title: `Changer d’espace ?`
  * Body: `Certaines modifications ne sont pas enregistrées.`
  * Actions: `Annuler` (secondary), `Changer d’espace` (primary)

---

## 4) Settings (Theme, Language, About)

### 4.1 Settings entry point

Top-right **gear icon** opens a menu/drawer:

* Theme: Light/Dark/System (or Orange/Terminal if those are themes)
* Language: FR/EN
* About
* Advanced (optional): storage/export/import/diagnostics

### 4.2 Version placement

Version is displayed in **About** only (not in header).

* `Le Pupitre`
* `Version vX.Y.Z (Build ####)` (build optional)
* (Optional) “Copier les infos de diagnostic”

---

## 5) Workspace Management Page (“Espaces”)

### 5.1 Page header

* Title: **Espaces**
* Subtitle: `Ouvrez un espace pour commencer ou créez-en un nouveau.`
* Primary CTA button (right): **Créer un espace**

  * Opens inline create section OR modal (choose one; default inline is fine)

### 5.2 Sections

1. **Mes espaces** (list)
2. **Ajouter un espace** (inline create form)

### 5.3 Workspace list row component

Row layout:

* Left: Avatar/initials circle
* Main:

  * Primary: Workspace name
  * Secondary (optional): `Dernière ouverture · # Talks · Taille`
* Right:

  * If current: badge `Actuel`
  * Else: button `Ouvrir`
  * Overflow menu `⋯` for secondary actions

**Overflow menu items**

* Renommer
* (Optional) Dupliquer
* (Optional) Exporter
* Supprimer (destructive, separated or colored as danger)

### 5.4 Delete confirmation

Destructive action must confirm:

* Title: `Supprimer l’espace “{name}” ?`
* Body: `Les données locales de cet espace seront supprimées de cet appareil.`
* Actions: `Annuler`, `Supprimer` (danger)

(If undo is feasible: toast with “Annuler”)

### 5.5 Create workspace form

Fields:

* Label: `Nom de l’espace`
* Placeholder: `Ex: Projet, Perso, Client…`
* Helper: `Vous pourrez le renommer plus tard.`
* Primary: `Créer`

Validation:

* Required
* Trim whitespace
* Prevent duplicates (case-insensitive) OR allow but warn (choose one)
* Inline error message under input

Success:

* Create workspace
* Set as current
* Navigate to Accueil
* Toast: `Espace créé : {name}`

### 5.6 Empty state (no workspaces)

Show centered empty state:

* Title: `Créez votre premier espace`
* Body: short explanation
* Primary: `Créer un espace`

---

## 6) Global UI Rules

### 6.1 Spacing & layout

* Use **8px grid**: 8/16/24/32/48…
* Content max width: 960–1120px
* Page padding: 24px desktop, 16px mobile
* Card padding: 16–24px
* Radius: 12–16px for cards, 10–12px for inputs/buttons

### 6.2 Typography

* Base font: 16px
* H1: 28–32px, weight 600–700
* Section label: 12–14px, weight 600, uppercase optional
* Secondary text: 14px, `color.textMuted`

### 6.3 Components

**Buttons**

* Primary: filled `color.accent` with `color.onAccent` text
* Secondary: outline `color.border`, text `color.text`
* Tertiary: text/ghost
* Minimum hit target: 44×44px

**Inputs**

* Height: 44px
* Border: 1px `color.border`
* Focus ring: 2px `color.focus` + 1px border
* Must have visible label (no placeholder-only labeling)

**Badges**

* Current/Active: subtle background `color.accentSoft`, text `color.accent`

**Icons**

* Icon-only buttons require tooltip + aria-label

### 6.4 States & feedback

* Loading: disable buttons + spinner on the button
* Toasts for:

  * workspace switched
  * created
  * deleted
* Error handling:

  * inline near field + toast for global failures

### 6.5 Accessibility (must meet)

* Contrast:

  * Normal text ≥ 4.5:1
  * Large text ≥ 3:1
* Keyboard:

  * Visible focus for all interactive elements
  * Tab order logical
* Screen reader:

  * aria-labels for icon buttons and overflow menus
  * Menu items include workspace name context where needed (e.g., “Renommer Nathalie”)

---

## 7) Theming System (Orange + Terminal)

### 7.1 Token approach

Implement themes via **semantic tokens** (NOT raw palette names in components).
Components reference only semantic tokens like `color.bg`, `color.text`, `color.accent`.

### 7.2 Required semantic tokens

**Colors**

* `color.bg`
* `color.surface`
* `color.surfaceElevated`
* `color.text`
* `color.textMuted`
* `color.border`
* `color.accent`
* `color.accentSoft`
* `color.onAccent`
* `color.danger`
* `color.dangerSoft`
* `color.onDanger`
* `color.focus`
* `shadow.sm`, `shadow.md` (or derive)

### 7.3 Suggested theme mappings (editable)

You can replace these with your existing palette.

**Theme: ORANGE (light)**

* bg: `#F7F7F8`
* surface: `#FFFFFF`
* surfaceElevated: `#FFFFFF`
* text: `#111827`
* textMuted: `#6B7280`
* border: `#E5E7EB`
* accent: `#F68B1F`
* accentSoft: `#FFE7D0`
* onAccent: `#FFFFFF`
* danger: `#DC2626`
* dangerSoft: `#FEE2E2`
* onDanger: `#FFFFFF`
* focus: `#2563EB` (high contrast ring)

**Theme: TERMINAL (dark)**

* bg: `#0B0F0C`
* surface: `#0F1612`
* surfaceElevated: `#111B15`
* text: `#E5E7EB`
* textMuted: `#9CA3AF`
* border: `#223026`
* accent: `#22C55E`
* accentSoft: `#12311E`
* onAccent: `#07130C`
* danger: `#F87171`
* dangerSoft: `#3A1414`
* onDanger: `#0B0F0C`
* focus: `#60A5FA`

### 7.4 Theme switch behavior

* Theme choice is global user preference (single user).
* Persist in local settings.
* Default: Orange unless user selects Terminal.

---

## 8) Copy rules (consistency)

* Use verbs that match action outcomes:

  * `Ouvrir` = sets current + navigates into that workspace
  * `Actuel` = indicates current workspace
* Avoid internal jargon:

  * Don’t show IDs or file names by default
* Keep microcopy short; add details only in modals/help text.

---

## 9) Implementation Notes for Codex (explicit refactor tasks)

1. Rename UI strings:

   * “Profils” → “Espaces”
   * “Basculer/Actif” → “Ouvrir/Actuel” (per rules above)
2. Add App Shell:

   * Top bar with tabs (Accueil, Talks)
   * Workspace switcher pill at top-right
   * Gear menu containing theme/lang/about
3. Move version display:

   * Remove from header
   * Add to Settings → About
4. Workspace list rows:

   * Right side: `Actuel` badge OR `Ouvrir` button + `⋯`
   * Put Rename/Delete under overflow menu
   * Delete confirmation modal required
5. Add semantic token theming:

   * Components must use semantic tokens only
   * Implement Orange and Terminal mappings

