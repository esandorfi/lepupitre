<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import {
  useRecorderAdvancedDrawer,
  type RecorderAdvancedDrawerEmit,
  type RecorderAdvancedDrawerProps,
} from "@/components/recorder/composables/useRecorderAdvancedDrawer";

const props = defineProps<RecorderAdvancedDrawerProps>();
const emit = defineEmits<RecorderAdvancedDrawerEmit>();

const { t } = useI18n();
const {
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
} = useRecorderAdvancedDrawer({ t, props, emit });
</script>

<template>
  <UCard class="app-panel app-panel-compact" variant="outline">
    <UButton size="sm" class="gap-1 text-xs uppercase tracking-[0.16em]" color="neutral" variant="ghost" @click="emit('toggle')">
      <span aria-hidden="true">{{ props.open ? "v" : ">" }}</span>
      {{ t("audio.advanced") }}
    </UButton>
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
            :model-value="selectedInputDeviceValue"
            class="min-w-[220px] flex-1"
            :items="inputDeviceOptions"
            value-key="value"
            :disabled="props.isLoadingInputDevices || props.inputDevices.length === 0"
            @update:model-value="updateInputDevice(String($event))"
          />
          <UButton size="sm" color="neutral" variant="outline" @click="emit('refreshInputDevices')">
            {{ t("settings.recorder.input_device_refresh") }}
          </UButton>
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
  </UCard>
</template>
