<script setup lang="ts">
import { reactive } from "vue";
import SettingsInsightsSection from "@/features/support/components/settings/SettingsInsightsSection.vue";
import SettingsNavigationSection from "@/features/support/components/settings/SettingsNavigationSection.vue";
import SettingsTranscriptionSection from "@/features/support/components/settings/SettingsTranscriptionSection.vue";
import SettingsVoiceupSection from "@/features/support/components/settings/SettingsVoiceupSection.vue";
import { useSettingsPageController } from "../composables/useSettingsPageController";

/**
 * Page composition root (settings control center).
 * Reads: navigation metrics, recorder health, transcription models, and user preferences.
 * Actions: delegates all preference/model mutations through the settings controller.
 * Boundary: page composes sections only; side effects stay in feature composables/runtime modules.
 */
const vm = reactive(useSettingsPageController());
</script>

<template>
  <section class="space-y-4">
    <SettingsNavigationSection
      :nav-metrics="vm.navMetrics"
      :average-nav-latency-ms="vm.averageNavLatencyMs"
      :nav-mode-options="vm.navModeOptions"
      :selected-nav-mode="vm.selectedNavMode"
      :reset-nav-metrics="vm.resetNavMetrics"
      @update:selected-nav-mode="vm.selectedNavMode = $event"
    />

    <SettingsInsightsSection
      :recorder-health-metrics="vm.recorderHealthMetrics"
      :recorder-start-success-rate="vm.recorderStartSuccessRate"
      :transcribe-success-rate="vm.transcribeSuccessRate"
      :top-recorder-health-errors="vm.topRecorderHealthErrors"
      :recorder-health-daily-rows="vm.recorderHealthDailyRows"
      :reset-recorder-health-metrics="vm.resetRecorderHealthMetrics"
    />

    <SettingsVoiceupSection
      :gamification-mode-options="vm.gamificationModeOptions"
      :mascot-intensity-options="vm.mascotIntensityOptions"
      :selected-gamification-mode="vm.selectedGamificationMode"
      :mascot-enabled="vm.mascotEnabled"
      :selected-mascot-intensity="vm.selectedMascotIntensity"
      @update:selected-gamification-mode="vm.selectedGamificationMode = $event"
      @update:mascot-enabled="vm.mascotEnabled = $event"
      @update:selected-mascot-intensity="vm.selectedMascotIntensity = $event"
    />

    <SettingsTranscriptionSection
      :sidecar-badge-tone="vm.sidecarBadgeTone"
      :sidecar-status-label="vm.sidecarStatusLabel"
      :sidecar-message="vm.sidecarMessage"
      :model-select-options="vm.modelSelectOptions"
      :mode-options="vm.modeOptions"
      :language-options="vm.languageOptions"
      :selected-model="vm.selectedModel"
      :selected-mode="vm.selectedMode"
      :selected-language="vm.selectedLanguage"
      :spoken-punctuation-enabled="vm.spokenPunctuationEnabled"
      :is-loading-models="vm.isLoadingModels"
      :model-options="vm.modelOptions"
      :format-bytes="vm.formatBytes"
      :short-hash="vm.shortHash"
      :open-source-url="vm.openSourceUrl"
      :progress-percent="vm.progressPercent"
      :progress-label="vm.progressLabel"
      :download-error="vm.downloadError"
      :downloading-model-id="vm.downloadingModelId"
      :verifying-model-id="vm.verifyingModelId"
      :remove-model="vm.removeModel"
      :verify-model="vm.verifyModel"
      :download-model="vm.downloadModel"
      @update:selected-model="vm.selectedModel = $event"
      @update:selected-mode="vm.selectedMode = $event"
      @update:selected-language="vm.selectedLanguage = $event"
      @update:spoken-punctuation-enabled="vm.spokenPunctuationEnabled = $event"
    />
  </section>
</template>
