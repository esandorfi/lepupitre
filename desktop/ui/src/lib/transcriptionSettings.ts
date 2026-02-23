import { ref } from "vue";

type TranscriptionModel = "tiny" | "base";
type TranscriptionMode = "auto" | "live+final" | "final-only";
type TranscriptionLanguage = "auto" | "en" | "fr";

type TranscriptionSettings = {
  model: TranscriptionModel;
  mode: TranscriptionMode;
  language: TranscriptionLanguage;
  spokenPunctuation: boolean;
};

const STORAGE_KEY = "lepupitre_transcription_settings";

const defaultSettings: TranscriptionSettings = {
  model: "tiny",
  mode: "auto",
  language: "auto",
  spokenPunctuation: false,
};

function loadSettings(): TranscriptionSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultSettings;
    }
    const parsed = JSON.parse(stored) as Partial<TranscriptionSettings>;
    return {
      ...defaultSettings,
      ...parsed,
    };
  } catch {
    return defaultSettings;
  }
}

const settings = ref<TranscriptionSettings>(loadSettings());

function persist(next: TranscriptionSettings) {
  settings.value = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function updateSettings(patch: Partial<TranscriptionSettings>) {
  persist({
    ...settings.value,
    ...patch,
  });
}

export function useTranscriptionSettings() {
  return {
    settings,
    updateSettings,
  };
}

export type { TranscriptionLanguage, TranscriptionMode, TranscriptionModel, TranscriptionSettings };
