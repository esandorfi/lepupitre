import { ref } from "vue";

const STORAGE_KEY = "lepupitre_theme";

const themes = ["orange", "terminal"] as const;
type Theme = (typeof themes)[number];

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore storage errors
  }
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
