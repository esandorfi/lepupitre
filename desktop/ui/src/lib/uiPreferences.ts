import { ref } from "vue";
import { readPreference, writePreference } from "./preferencesStorage";

export type PrimaryNavMode = "top" | "sidebar-icon";
export type GamificationMode = "minimal" | "balanced" | "quest-world";
export type MascotIntensity = "minimal" | "contextual";

export type UiSettings = {
  primaryNavMode: PrimaryNavMode;
  sidebarPinned: boolean;
  onboardingSeen: boolean;
  gamificationMode: GamificationMode;
  mascotEnabled: boolean;
  mascotIntensity: MascotIntensity;
};

const STORAGE_KEY = "lepupitre_ui_settings_v1";
const LEGACY_STORAGE_KEYS = ["lepupitre_ui_settings"] as const;

const defaultSettings: UiSettings = {
  primaryNavMode: "sidebar-icon",
  sidebarPinned: false,
  onboardingSeen: false,
  gamificationMode: "balanced",
  mascotEnabled: true,
  mascotIntensity: "contextual",
};

function isPrimaryNavMode(value: unknown): value is PrimaryNavMode {
  return value === "top" || value === "sidebar-icon";
}

function isGamificationMode(value: unknown): value is GamificationMode {
  return value === "minimal" || value === "balanced" || value === "quest-world";
}

function isMascotIntensity(value: unknown): value is MascotIntensity {
  return value === "minimal" || value === "contextual";
}

function loadSettings(): UiSettings {
  try {
    const raw = readPreference(STORAGE_KEY, { legacyKeys: LEGACY_STORAGE_KEYS });
    if (!raw) {
      return defaultSettings;
    }
    const parsed = JSON.parse(raw) as Partial<UiSettings>;
    const hasLegacySettings =
      Object.prototype.hasOwnProperty.call(parsed, "primaryNavMode") ||
      Object.prototype.hasOwnProperty.call(parsed, "sidebarPinned");
    return {
      primaryNavMode: isPrimaryNavMode(parsed.primaryNavMode)
        ? parsed.primaryNavMode
        : defaultSettings.primaryNavMode,
      sidebarPinned:
        typeof parsed.sidebarPinned === "boolean"
          ? parsed.sidebarPinned
          : defaultSettings.sidebarPinned,
      onboardingSeen:
        typeof parsed.onboardingSeen === "boolean"
          ? parsed.onboardingSeen
          : hasLegacySettings,
      gamificationMode: isGamificationMode(parsed.gamificationMode)
        ? parsed.gamificationMode
        : defaultSettings.gamificationMode,
      mascotEnabled:
        typeof parsed.mascotEnabled === "boolean"
          ? parsed.mascotEnabled
          : defaultSettings.mascotEnabled,
      mascotIntensity: isMascotIntensity(parsed.mascotIntensity)
        ? parsed.mascotIntensity
        : defaultSettings.mascotIntensity,
    };
  } catch {
    return defaultSettings;
  }
}

const settings = ref<UiSettings>(loadSettings());

function persist(next: UiSettings) {
  settings.value = next;
  writePreference(STORAGE_KEY, JSON.stringify(next));
}

function updateSettings(patch: Partial<UiSettings>) {
  persist({
    ...settings.value,
    ...patch,
  });
}

function setPrimaryNavMode(primaryNavMode: PrimaryNavMode) {
  updateSettings({ primaryNavMode });
}

function setSidebarPinned(sidebarPinned: boolean) {
  updateSettings({ sidebarPinned });
}

function setOnboardingSeen(onboardingSeen: boolean) {
  updateSettings({ onboardingSeen });
}

function setGamificationMode(gamificationMode: GamificationMode) {
  updateSettings({ gamificationMode });
}

function setMascotEnabled(mascotEnabled: boolean) {
  updateSettings({ mascotEnabled });
}

function setMascotIntensity(mascotIntensity: MascotIntensity) {
  updateSettings({ mascotIntensity });
}

export function useUiPreferences() {
  return {
    settings,
    setPrimaryNavMode,
    setSidebarPinned,
    setOnboardingSeen,
    setGamificationMode,
    setMascotEnabled,
    setMascotIntensity,
  };
}
