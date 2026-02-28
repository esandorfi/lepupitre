import { ref } from "vue";
import { readPreference, writePreference } from "./preferencesStorage";

const STORAGE_KEY = "lepupitre_theme";
const LEGACY_STORAGE_KEYS = ["lepupitre_theme_v1"] as const;

const themes = ["orange", "terminal"] as const;
type Theme = (typeof themes)[number];

function loadTheme(): Theme {
  try {
    const stored = readPreference(STORAGE_KEY, { legacyKeys: LEGACY_STORAGE_KEYS });
    if (stored && themes.includes(stored as Theme)) {
      return stored as Theme;
    }
  } catch {
    return "orange";
  }
  return "orange";
}

const theme = ref<Theme>(loadTheme());

function applyTheme(next: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = next;
  }
}

function setTheme(next: Theme) {
  theme.value = next;
  applyTheme(next);
  writePreference(STORAGE_KEY, next);
}

function initTheme() {
  applyTheme(theme.value);
}

function nextTheme(current: Theme): Theme {
  const index = themes.indexOf(current);
  return themes[(index + 1) % themes.length];
}

export function useTheme() {
  return {
    theme,
    themes,
    setTheme,
    initTheme,
    nextTheme,
  };
}

export type { Theme };
