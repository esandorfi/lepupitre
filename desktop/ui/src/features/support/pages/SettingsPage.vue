<script setup lang="ts">
import SettingsInsightsSection from "@/features/support/components/settings/SettingsInsightsSection.vue";
import SettingsNavigationSection from "@/features/support/components/settings/SettingsNavigationSection.vue";
import SettingsTranscriptionSection from "@/features/support/components/settings/SettingsTranscriptionSection.vue";
import SettingsVoiceupSection from "@/features/support/components/settings/SettingsVoiceupSection.vue";
import { useSettingsPageController } from "../composables/useSettingsPageController";

const {
  t,
  navMetrics,
  resetNavMetrics,
  recorderHealthMetrics,
  resetRecorderHealthMetrics,
  modelOptions,
  modelSelectOptions,
  modeOptions,
  navModeOptions,
  gamificationModeOptions,
  mascotIntensityOptions,
  sidecarBadgeTone,
  sidecarStatusLabel,
  sidecarMessage,
  spokenPunctuationEnabled,
  languageOptions,
  selectedModel,
  selectedMode,
  selectedLanguage,
  selectedNavMode,
  selectedGamificationMode,
  mascotEnabled,
  selectedMascotIntensity,
  averageNavLatencyMs,
  recorderStartSuccessRate,
  transcribeSuccessRate,
  topRecorderHealthErrors,
  recorderHealthDailyRows,
  formatBytes,
  shortHash,
  openSourceUrl,
  progressPercent,
  progressLabel,
  isLoadingModels,
  downloadError,
  downloadingModelId,
  verifyingModelId,
  removeModel,
  verifyModel,
  downloadModel,
} = useSettingsPageController();
</script>

<template>
  <section class="space-y-4">
    <SettingsNavigationSection
      :t="t"
      :nav-metrics="navMetrics"
      :average-nav-latency-ms="averageNavLatencyMs"
      :nav-mode-options="navModeOptions"
      :selected-nav-mode="selectedNavMode"
      :reset-nav-metrics="resetNavMetrics"
      @update:selected-nav-mode="selectedNavMode = $event"
    />

    <SettingsInsightsSection
      :t="t"
      :recorder-health-metrics="recorderHealthMetrics"
      :recorder-start-success-rate="recorderStartSuccessRate"
      :transcribe-success-rate="transcribeSuccessRate"
      :top-recorder-health-errors="topRecorderHealthErrors"
      :recorder-health-daily-rows="recorderHealthDailyRows"
      :reset-recorder-health-metrics="resetRecorderHealthMetrics"
    />

    <SettingsVoiceupSection
      :t="t"
      :gamification-mode-options="gamificationModeOptions"
      :mascot-intensity-options="mascotIntensityOptions"
      :selected-gamification-mode="selectedGamificationMode"
      :mascot-enabled="mascotEnabled"
      :selected-mascot-intensity="selectedMascotIntensity"
      @update:selected-gamification-mode="selectedGamificationMode = $event"
      @update:mascot-enabled="mascotEnabled = $event"
      @update:selected-mascot-intensity="selectedMascotIntensity = $event"
    />

    <SettingsTranscriptionSection
      :t="t"
      :sidecar-badge-tone="sidecarBadgeTone"
      :sidecar-status-label="sidecarStatusLabel"
      :sidecar-message="sidecarMessage"
      :model-select-options="modelSelectOptions"
      :mode-options="modeOptions"
      :language-options="languageOptions"
      :selected-model="selectedModel"
      :selected-mode="selectedMode"
      :selected-language="selectedLanguage"
      :spoken-punctuation-enabled="spokenPunctuationEnabled"
      :is-loading-models="isLoadingModels"
      :model-options="modelOptions"
      :format-bytes="formatBytes"
      :short-hash="shortHash"
      :open-source-url="openSourceUrl"
      :progress-percent="progressPercent"
      :progress-label="progressLabel"
      :download-error="downloadError"
      :downloading-model-id="downloadingModelId"
      :verifying-model-id="verifyingModelId"
      :remove-model="removeModel"
      :verify-model="verifyModel"
      :download-model="downloadModel"
      @update:selected-model="selectedModel = $event"
      @update:selected-mode="selectedMode = $event"
      @update:selected-language="selectedLanguage = $event"
      @update:spoken-punctuation-enabled="spokenPunctuationEnabled = $event"
    />
  </section>
</template>
