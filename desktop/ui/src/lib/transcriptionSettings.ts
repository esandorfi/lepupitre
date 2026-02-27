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

function isTranscriptionModel(value: unknown): value is TranscriptionModel {
  return value === "tiny" || value === "base";
}

function isTranscriptionMode(value: unknown): value is TranscriptionMode {
  return value === "auto" || value === "live+final" || value === "final-only";
}

function isTranscriptionLanguage(value: unknown): value is TranscriptionLanguage {
  return value === "auto" || value === "en" || value === "fr";
}

function loadSettings(): TranscriptionSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultSettings;
    }
    const parsed = JSON.parse(stored) as Partial<TranscriptionSettings>;
    return {
      model: isTranscriptionModel(parsed.model) ? parsed.model : defaultSettings.model,
      mode: isTranscriptionMode(parsed.mode) ? parsed.mode : defaultSettings.mode,
      language: isTranscriptionLanguage(parsed.language)
        ? parsed.language
        : defaultSettings.language,
      spokenPunctuation:
        typeof parsed.spokenPunctuation === "boolean"
          ? parsed.spokenPunctuation
          : defaultSettings.spokenPunctuation,
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
