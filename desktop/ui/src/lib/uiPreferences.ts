import { ref } from "vue";

export type PrimaryNavMode = "top" | "sidebar-icon";

export type UiSettings = {
  primaryNavMode: PrimaryNavMode;
  sidebarPinned: boolean;
  onboardingSeen: boolean;
};

const STORAGE_KEY = "lepupitre_ui_settings_v1";

const defaultSettings: UiSettings = {
  primaryNavMode: "sidebar-icon",
  sidebarPinned: false,
  onboardingSeen: false,
};

function isPrimaryNavMode(value: unknown): value is PrimaryNavMode {
  return value === "top" || value === "sidebar-icon";
}

function loadSettings(): UiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    };
  } catch {
    return defaultSettings;
  }
}

const settings = ref<UiSettings>(loadSettings());

function persist(next: UiSettings) {
  settings.value = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
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

export function useUiPreferences() {
  return {
    settings,
    setPrimaryNavMode,
    setSidebarPinned,
    setOnboardingSeen,
  };
}
