import { computed } from "vue";
import type { WaveformStyle } from "@/lib/waveform";

export type RecorderAdvancedAsrModel = "tiny" | "base";
export type RecorderAdvancedAsrMode = "auto" | "live+final" | "final-only";
export type RecorderAdvancedAsrLanguage = "auto" | "en" | "fr";

export type RecorderAdvancedDrawerProps = {
  open: boolean;
  model: RecorderAdvancedAsrModel;
  mode: RecorderAdvancedAsrMode;
  language: RecorderAdvancedAsrLanguage;
  spokenPunctuation: boolean;
  waveformStyle: WaveformStyle;
  inputDevices: Array<{ id: string; label: string; isDefault: boolean }>;
  selectedInputDeviceId: string | null;
  isLoadingInputDevices: boolean;
  qualityGuidanceMessages: string[];
  telemetryBudgetSummary: string | null;
  diagnosticsCode: string | null;
};

export type RecorderAdvancedDrawerEmit = {
  (event: "toggle"): void;
  (event: "update:model", value: RecorderAdvancedAsrModel): void;
  (event: "update:mode", value: RecorderAdvancedAsrMode): void;
  (event: "update:language", value: RecorderAdvancedAsrLanguage): void;
  (event: "update:spokenPunctuation", value: boolean): void;
  (event: "update:waveformStyle", value: WaveformStyle): void;
  (event: "update:selectedInputDeviceId", value: string | null): void;
  (event: "refreshInputDevices"): void;
};

const INPUT_DEVICE_NONE_SENTINEL = "__no_input_device__";

export function useRecorderAdvancedDrawer(options: {
  t: (key: string) => string;
  props: RecorderAdvancedDrawerProps;
  emit: RecorderAdvancedDrawerEmit;
}) {
  const { t, props, emit } = options;

  const modelOptions = computed(() => [
    { label: t("settings.transcription.model_tiny"), value: "tiny" as const },
    { label: t("settings.transcription.model_base"), value: "base" as const },
  ]);

  const modeOptions = computed(() => [
    { label: t("settings.transcription.mode_auto"), value: "auto" as const },
    { label: t("settings.transcription.mode_live_final"), value: "live+final" as const },
    { label: t("settings.transcription.mode_final_only"), value: "final-only" as const },
  ]);

  const languageOptions = computed(() => [
    { label: t("settings.transcription.language_auto"), value: "auto" as const },
    { label: t("settings.transcription.language_en"), value: "en" as const },
    { label: t("settings.transcription.language_fr"), value: "fr" as const },
  ]);

  const waveformStyleOptions = computed(() => [
    { label: t("settings.recorder.waveform_style_classic"), value: "classic" as const },
    { label: t("settings.recorder.waveform_style_pulse_bars"), value: "pulse-bars" as const },
    { label: t("settings.recorder.waveform_style_ribbon"), value: "ribbon" as const },
    { label: t("settings.recorder.waveform_style_spark"), value: "spark" as const },
    { label: t("settings.recorder.waveform_style_timeline"), value: "timeline" as const },
  ]);

  const inputDeviceOptions = computed(() => {
    if (props.inputDevices.length === 0) {
      return [{ label: t("settings.recorder.input_device_none"), value: INPUT_DEVICE_NONE_SENTINEL }];
    }
    return props.inputDevices.map((device) => ({
      label: device.isDefault
        ? `${device.label} (${t("settings.recorder.input_device_default")})`
        : device.label,
      value: device.id,
    }));
  });
  const selectedInputDeviceValue = computed(
    () => props.selectedInputDeviceId ?? INPUT_DEVICE_NONE_SENTINEL
  );

  function updateModel(value: string) {
    emit("update:model", value as RecorderAdvancedAsrModel);
  }

  function updateMode(value: string) {
    emit("update:mode", value as RecorderAdvancedAsrMode);
  }

  function updateLanguage(value: string) {
    emit("update:language", value as RecorderAdvancedAsrLanguage);
  }

  function updateWaveformStyle(value: string) {
    emit("update:waveformStyle", value as WaveformStyle);
  }

  function updateInputDevice(value: string) {
    emit(
      "update:selectedInputDeviceId",
      !value || value === INPUT_DEVICE_NONE_SENTINEL ? null : value
    );
  }

  return {
    modelOptions,
    modeOptions,
    languageOptions,
    waveformStyleOptions,
    inputDeviceOptions,
    selectedInputDeviceValue,
    updateModel,
    updateMode,
    updateLanguage,
    updateWaveformStyle,
    updateInputDevice,
  };
}
