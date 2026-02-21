import { ref } from "vue";

type Locale = "en" | "fr";

const STORAGE_KEY = "lepupitre_locale";

const messages: Record<Locale, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.profiles": "Profiles",
    "nav.talk": "Talks",
    "theme.label": "Theme",
    "theme.orange": "Light",
    "theme.terminal": "Dark",
    "home.title": "Home",
    "home.subtitle": "Daily quest loop, local-first.",
    "home.talk_title": "Talk",
    "home.talk_empty": "No active talk",
    "home.talk_action": "Set up talk",
    "home.profile_title": "Profile",
    "home.profile_empty": "No active profile",
    "home.profile_active": "Active",
    "home.profile_action": "Manage profiles",
    "home.quest_title": "Daily quest",
    "home.quest_empty": "Create a profile and talk to load quests.",
    "home.quest_action": "Start quest",
    "profiles.title": "Profiles",
    "profiles.subtitle": "Create a profile to start your local workspace.",
    "profiles.create_title": "Create profile",
    "profiles.create_placeholder": "Profile name",
    "profiles.create_action": "Create",
    "profiles.existing_title": "Existing profiles",
    "profiles.add_title": "Add profile",
    "profiles.name_required": "Name is required",
    "profiles.name_exists": "Profile name already exists",
    "profiles.confirm_delete": "Delete this profile and its local data?",
    "profiles.confirm_delete_action": "Delete",
    "profiles.cancel": "Cancel",
    "profiles.active": "Active",
    "profiles.switch": "Switch",
    "talk.title": "Talk setup",
    "talk.subtitle": "Define the talk you want to practice.",
    "talk.need_profile": "Create a profile first.",
    "talk.goto_profiles": "Go to Profiles",
    "talk.active_title": "Active talk",
    "talk.title_placeholder": "Talk title",
    "talk.audience_placeholder": "Audience (optional)",
    "talk.goal_placeholder": "Goal (optional)",
    "talk.duration_placeholder": "Target duration in minutes",
    "talk.save": "Save talk",
    "talk.back": "Back to Home",
    "talk.title_required": "Title is required",
    "quest.title": "Quest",
    "quest.code": "Code",
    "quest.daily": "daily",
    "quest.response_placeholder": "Write your response",
    "quest.submit": "Submit text",
    "quest.back": "Back",
    "quest.empty": "No quest loaded yet.",
    "quest.response_required": "Response cannot be empty",
    "feedback.title": "Feedback",
    "feedback.subtitle": "Placeholder for feedback pipeline.",
    "feedback.feedback_id": "Feedback id",
    "feedback.last_attempt": "Last attempt id",
    "feedback.back_home": "Back to Home",
    "security.title": "Security Probe (dev)",
    "security.subtitle": "Expect both tests to be blocked in production.",
    "security.test_network": "Test network",
    "security.test_blocked": "Test blocked path",
    "security.test_appdata": "Test appdata path",
    "security.network": "Network",
    "security.fs_blocked": "File system (blocked path)",
    "security.fs_appdata": "File system (appdata)",
    "audio.title": "Audio spike",
    "audio.subtitle": "Record a voice take locally.",
    "audio.pass_label": "Pass 0",
    "audio.start": "Start recording",
    "audio.stop": "Stop + Save",
    "audio.reveal": "Reveal file",
    "audio.status": "Status",
    "audio.status_idle": "Idle",
    "audio.status_requesting": "Requesting microphone",
    "audio.status_recording": "Recording",
    "audio.status_encoding": "Encoding",
    "audio.duration": "Duration",
    "audio.saved_to": "Saved to",
    "audio.profile_required": "Create a profile before recording.",
    "status.idle": "idle",
    "status.running": "running",
    "status.allowed": "allowed",
    "status.blocked": "blocked",
    "status.error": "error"
  },
  fr: {
    "nav.home": "Accueil",
    "nav.profiles": "Profils",
    "nav.talk": "Talks",
    "theme.label": "Thème",
    "theme.orange": "Clair",
    "theme.terminal": "Sombre",
    "home.title": "Accueil",
    "home.subtitle": "Daily quest loop,\nlocal-first.",
    "home.talk_title": "Talk",
    "home.talk_empty": "Aucun talk actif",
    "home.talk_action": "Créer le talk",
    "home.profile_title": "Profil",
    "home.profile_empty": "Aucun profil actif",
    "home.profile_active": "Actif",
    "home.profile_action": "Gérer les profils",
    "home.quest_title": "Quête du jour",
    "home.quest_empty": "Crée un profil et un talk pour charger les quêtes.",
    "home.quest_action": "Démarrer la quête",
    "profiles.title": "Profils",
    "profiles.subtitle": "Crée un profil pour démarrer l'espace local.",
    "profiles.create_title": "Créer un profil",
    "profiles.create_placeholder": "Nom du profil",
    "profiles.create_action": "Créer",
    "profiles.existing_title": "Profils existants",
    "profiles.add_title": "Ajouter un profil",
    "profiles.name_required": "Le nom est requis",
    "profiles.name_exists": "Ce nom existe déjà",
    "profiles.confirm_delete": "Supprimer ce profil et ses données locales ?",
    "profiles.confirm_delete_action": "Supprimer",
    "profiles.cancel": "Annuler",
    "profiles.active": "Actif",
    "profiles.switch": "Basculer",
    "talk.title": "Préparer un talk",
    "talk.subtitle": "Préparer un talk, une conférence, un pitch.",
    "talk.need_profile": "Crée d'abord un profil.",
    "talk.goto_profiles": "Aller aux profils",
    "talk.active_title": "Talk actif",
    "talk.title_placeholder": "Titre du talk",
    "talk.audience_placeholder": "Audience (optionnel)",
    "talk.goal_placeholder": "Objectif (optionnel)",
    "talk.duration_placeholder": "Durée cible en minutes",
    "talk.save": "Enregistrer",
    "talk.back": "Retour à l'accueil",
    "talk.title_required": "Le titre est requis",
    "quest.title": "Quête",
    "quest.code": "Code",
    "quest.daily": "quotidien",
    "quest.response_placeholder": "Rédige ta réponse",
    "quest.submit": "Soumettre le texte",
    "quest.back": "Retour",
    "quest.empty": "Aucune quête chargée.",
    "quest.response_required": "La réponse ne peut pas être vide",
    "feedback.title": "Feedback",
    "feedback.subtitle": "Placeholder pour le pipeline de feedback.",
    "feedback.feedback_id": "ID feedback",
    "feedback.last_attempt": "Dernière tentative",
    "feedback.back_home": "Retour à l'accueil",
    "security.title": "Sonde sécurité (dev)",
    "security.subtitle": "Les deux tests doivent être bloqués en production.",
    "security.test_network": "Tester le réseau",
    "security.test_blocked": "Tester un chemin interdit",
    "security.test_appdata": "Tester appdata",
    "security.network": "Réseau",
    "security.fs_blocked": "Système de fichiers (interdit)",
    "security.fs_appdata": "Système de fichiers (appdata)",
    "audio.title": "Prototype audio",
    "audio.subtitle": "Enregistre une prise de voix en local.",
    "audio.pass_label": "Passe 0",
    "audio.start": "Démarrer",
    "audio.stop": "Arrêter + sauver",
    "audio.reveal": "Afficher le fichier",
    "audio.status": "Statut",
    "audio.status_idle": "Inactif",
    "audio.status_requesting": "Demande micro",
    "audio.status_recording": "Enregistrement",
    "audio.status_encoding": "Encodage",
    "audio.duration": "Durée",
    "audio.saved_to": "Enregistré dans",
    "audio.profile_required": "Crée un profil avant d'enregistrer.",
    "status.idle": "inactif",
    "status.running": "en cours",
    "status.allowed": "autorisé",
    "status.blocked": "bloqué",
    "status.error": "erreur"
  }
};

function loadLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "fr") {
      return stored;
    }
  } catch {
    return "en";
  }
  return "en";
}

const locale = ref<Locale>(loadLocale());

function setLocale(next: Locale) {
  locale.value = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore storage errors
  }
}

function t(key: string) {
  return messages[locale.value][key] ?? key;
}

export function useI18n() {
  return { locale, setLocale, t };
}
