<script setup lang="ts">
import { computed } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppPanel from "@/components/ui/AppPanel.vue";
import { useI18n } from "@/lib/i18n";
import type { WaveformStyle } from "@/lib/waveform";

type AsrModel = "tiny" | "base";
type AsrMode = "auto" | "live+final" | "final-only";
type AsrLanguage = "auto" | "en" | "fr";

const props = defineProps<{
  open: boolean;
  model: AsrModel;
  mode: AsrMode;
  language: AsrLanguage;
  spokenPunctuation: boolean;
  waveformStyle: WaveformStyle;
  inputDevices: Array<{ id: string; label: string; isDefault: boolean }>;
  selectedInputDeviceId: string | null;
  isLoadingInputDevices: boolean;
  qualityGuidanceMessages: string[];
  telemetryBudgetSummary: string | null;
  diagnosticsCode: string | null;
}>();

const emit = defineEmits<{
  (event: "toggle"): void;
  (event: "update:model", value: AsrModel): void;
  (event: "update:mode", value: AsrMode): void;
  (event: "update:language", value: AsrLanguage): void;
  (event: "update:spokenPunctuation", value: boolean): void;
  (event: "update:waveformStyle", value: WaveformStyle): void;
  (event: "update:selectedInputDeviceId", value: string | null): void;
  (event: "refreshInputDevices"): void;
}>();

const { t } = useI18n();

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
    return [{ label: t("settings.recorder.input_device_none"), value: "" }];
  }
  return props.inputDevices.map((device) => ({
    label: device.isDefault
      ? `${device.label} (${t("settings.recorder.input_device_default")})`
      : device.label,
    value: device.id,
  }));
});

function updateModel(value: string) {
  emit("update:model", value as AsrModel);
}

function updateMode(value: string) {
  emit("update:mode", value as AsrMode);
}

function updateLanguage(value: string) {
  emit("update:language", value as AsrLanguage);
}

function updateWaveformStyle(value: string) {
  emit("update:waveformStyle", value as WaveformStyle);
}

function updateInputDevice(value: string) {
  emit("update:selectedInputDeviceId", value || null);
}
</script>

<template>
  <AppPanel variant="compact">
    <AppButton tone="ghost" size="sm" class="gap-1 text-xs uppercase tracking-[0.16em]" @click="emit('toggle')">
      <span aria-hidden="true">{{ props.open ? "v" : ">" }}</span>
      {{ t("audio.advanced") }}
    </AppButton>
    <div v-if="props.open" class="mt-3 grid gap-3 md:grid-cols-2">
      <UFormField :label="t('settings.transcription.model_label')" class="app-text-meta">
        <USelect
          :model-value="props.model"
          class="w-full"
          :items="modelOptions"
          value-key="value"
          @update:model-value="updateModel(String($event))"
        />
      </UFormField>

      <UFormField :label="t('settings.transcription.mode_label')" class="app-text-meta">
        <USelect
          :model-value="props.mode"
          class="w-full"
          :items="modeOptions"
          value-key="value"
          @update:model-value="updateMode(String($event))"
        />
      </UFormField>

      <UFormField :label="t('settings.transcription.language_label')" class="app-text-meta">
        <USelect
          :model-value="props.language"
          class="w-full"
          :items="languageOptions"
          value-key="value"
          @update:model-value="updateLanguage(String($event))"
        />
      </UFormField>

      <UFormField :label="t('settings.transcription.spoken_punctuation_label')" class="app-text-meta">
        <USwitch
          :model-value="props.spokenPunctuation"
          @update:model-value="emit('update:spokenPunctuation', Boolean($event))"
        />
      </UFormField>

      <UFormField :label="t('settings.recorder.waveform_style_label')" class="app-text-meta md:col-span-2">
        <USelect
          :model-value="props.waveformStyle"
          class="w-full"
          :items="waveformStyleOptions"
          value-key="value"
          @update:model-value="updateWaveformStyle(String($event))"
        />
      </UFormField>

      <UFormField :label="t('settings.recorder.input_device_label')" class="app-text-meta md:col-span-2">
        <div class="flex flex-wrap items-center gap-2">
          <USelect
            :model-value="props.selectedInputDeviceId ?? ''"
            class="min-w-[220px] flex-1"
            :items="inputDeviceOptions"
            value-key="value"
            :disabled="props.isLoadingInputDevices || props.inputDevices.length === 0"
            @update:model-value="updateInputDevice(String($event))"
          />
          <AppButton tone="secondary" size="sm" @click="emit('refreshInputDevices')">
            {{ t("settings.recorder.input_device_refresh") }}
          </AppButton>
        </div>
      </UFormField>

      <div class="space-y-2 app-text-meta md:col-span-2">
        <span class="app-subtle">{{ t("audio.calibration_title") }}</span>
        <ul class="list-disc space-y-1 pl-5">
          <li v-for="(message, index) in props.qualityGuidanceMessages" :key="index">
            {{ message }}
          </li>
        </ul>
      </div>

      <p v-if="props.telemetryBudgetSummary" class="app-muted app-text-meta md:col-span-2">
        {{ t("audio.telemetry_budget_title") }}: {{ props.telemetryBudgetSummary }}
      </p>
    </div>
    <p v-if="props.open && props.diagnosticsCode" class="app-muted mt-2 text-xs">
      {{ t("audio.diagnostic") }}: {{ props.diagnosticsCode }}
    </p>
  </AppPanel>
</template>
