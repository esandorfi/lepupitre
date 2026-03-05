import { computed, type ComputedRef } from "vue";
import { useTranscriptionSettings } from "@/lib/transcriptionSettings";
import type {
  GamificationMode,
  MascotIntensity,
  PrimaryNavMode,
} from "@/lib/uiPreferences";
import { useUiPreferences } from "@/lib/uiPreferences";

type Translate = (key: string) => string;

type ModelOption = {
  id: string;
  installed: boolean;
};

export function useSettingsPreferences(
  t: Translate,
  modelOptions: ComputedRef<ModelOption[]>
) {
  const { settings, updateSettings } = useTranscriptionSettings();
  const {
    settings: uiSettings,
    setPrimaryNavMode,
    setGamificationMode,
    setMascotEnabled,
    setMascotIntensity,
  } = useUiPreferences();

  const modeOptions = computed(() => [
    { value: "auto", label: t("settings.transcription.mode_auto") },
    { value: "live+final", label: t("settings.transcription.mode_live_final") },
    { value: "final-only", label: t("settings.transcription.mode_final_only") },
  ]);

  const navModeOptions = computed(() => [
    { value: "top", label: t("settings.navigation.mode_top") },
    { value: "sidebar-icon", label: t("settings.navigation.mode_sidebar") },
  ]);

  const gamificationModeOptions = computed(() => [
    { value: "minimal", label: t("settings.voiceup.gamification_minimal") },
    { value: "balanced", label: t("settings.voiceup.gamification_balanced") },
    { value: "quest-world", label: t("settings.voiceup.gamification_quest_world") },
  ]);

  const mascotIntensityOptions = computed(() => [
    { value: "minimal", label: t("settings.voiceup.mascot_minimal") },
    { value: "contextual", label: t("settings.voiceup.mascot_contextual") },
  ]);

  const spokenPunctuationEnabled = computed({
    get: () => settings.value.spokenPunctuation,
    set: (value: boolean) => {
      updateSettings({ spokenPunctuation: value });
    },
  });

  const languageOptions = computed(() => [
    { value: "auto", label: t("settings.transcription.language_auto") },
    { value: "en", label: t("settings.transcription.language_en") },
    { value: "fr", label: t("settings.transcription.language_fr") },
  ]);

  const selectedModel = computed({
    get: () => settings.value.model,
    set: (value: string) => {
      const model = modelOptions.value.find((option) => option.id === value);
      if (!model || !model.installed) {
        return;
      }
      updateSettings({ model: model.id as "tiny" | "base" });
    },
  });

  const selectedMode = computed({
    get: () => settings.value.mode,
    set: (value: string) => {
      updateSettings({ mode: value as "auto" | "live+final" | "final-only" });
    },
  });

  const selectedLanguage = computed({
    get: () => settings.value.language,
    set: (value: string) => {
      updateSettings({ language: value as "auto" | "en" | "fr" });
    },
  });

  const selectedNavMode = computed({
    get: () => uiSettings.value.primaryNavMode,
    set: (value: string) => {
      if (value === "top" || value === "sidebar-icon") {
        setPrimaryNavMode(value as PrimaryNavMode);
      }
    },
  });

  const selectedGamificationMode = computed({
    get: () => uiSettings.value.gamificationMode,
    set: (value: string) => {
      if (value === "minimal" || value === "balanced" || value === "quest-world") {
        setGamificationMode(value as GamificationMode);
      }
    },
  });

  const mascotEnabled = computed({
    get: () => uiSettings.value.mascotEnabled,
    set: (value: boolean) => {
      setMascotEnabled(value);
    },
  });

  const selectedMascotIntensity = computed({
    get: () => uiSettings.value.mascotIntensity,
    set: (value: string) => {
      if (value === "minimal" || value === "contextual") {
        setMascotIntensity(value as MascotIntensity);
      }
    },
  });

  return {
    modeOptions,
    navModeOptions,
    gamificationModeOptions,
    mascotIntensityOptions,
    spokenPunctuationEnabled,
    languageOptions,
    selectedModel,
    selectedMode,
    selectedLanguage,
    selectedNavMode,
    selectedGamificationMode,
    mascotEnabled,
    selectedMascotIntensity,
  };
}
