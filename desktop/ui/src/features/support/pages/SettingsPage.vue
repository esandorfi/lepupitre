<script setup lang="ts">
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
  downloadProgress,
  downloadingModelId,
  verifyingModelId,
  removeModel,
  verifyModel,
  downloadModel,
} = useSettingsPageController();
</script>

<template>
  <section class="space-y-4">
    <UCard class="app-panel app-panel-compact app-radius-panel-lg" variant="outline">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="app-nav-text text-lg font-semibold">
            {{ t("settings.navigation.title") }}
          </h2>
          <p class="app-muted text-xs">
            {{ t("settings.navigation.subtitle") }}
          </p>
        </div>
        <div class="app-muted text-xs">
          {{ t("settings.navigation.scope") }}
        </div>
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <UFormField
          :label="t('settings.navigation.mode_label')"
          :help="t('settings.navigation.mode_note')"
          class="app-nav-text text-xs"
        >
          <USelect
            v-model="selectedNavMode"
            class="w-full"
            :items="navModeOptions"
            value-key="value"
          />
        </UFormField>

        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-nav-text text-sm font-semibold">
            {{ t("settings.navigation.metrics_title") }}
          </div>
          <div class="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div class="app-muted">{{ t("settings.navigation.metrics_switch_count") }}</div>
            <div class="text-right font-semibold">{{ navMetrics.switchCount }}</div>
            <div class="app-muted">{{ t("settings.navigation.metrics_avg_latency") }}</div>
            <div class="text-right font-semibold">{{ averageNavLatencyMs }} ms</div>
            <div class="app-muted">{{ t("settings.navigation.metrics_top_switch") }}</div>
            <div class="text-right font-semibold">{{ navMetrics.topSwitchCount }}</div>
            <div class="app-muted">{{ t("settings.navigation.metrics_sidebar_switch") }}</div>
            <div class="text-right font-semibold">{{ navMetrics.sidebarSwitchCount }}</div>
            <div class="app-muted">{{ t("settings.navigation.metrics_sidebar_sessions") }}</div>
            <div class="text-right font-semibold">{{ navMetrics.sidebarSessionCount }}</div>
          </div>
          <div class="mt-3 flex justify-end">
            <UButton size="sm" color="neutral" variant="outline" @click="resetNavMetrics">
              {{ t("settings.navigation.metrics_reset") }}
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <UCard class="app-panel app-panel-compact app-radius-panel-lg" variant="outline">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="app-nav-text text-lg font-semibold">
            {{ t("settings.insights.health_title") }}
          </h2>
          <p class="app-muted text-xs">
            {{ t("settings.insights.health_subtitle") }}
          </p>
        </div>
        <div class="app-muted text-xs">
          {{ t("settings.insights.health_scope") }}
        </div>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-muted text-xs">{{ t("settings.insights.health_recordings_started") }}</div>
          <div class="app-nav-text mt-1 text-xl font-semibold">{{ recorderHealthMetrics.startSuccessCount }}</div>
        </div>
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-muted text-xs">{{ t("settings.insights.health_start_success_rate") }}</div>
          <div class="app-nav-text mt-1 text-xl font-semibold">{{ recorderStartSuccessRate }}%</div>
        </div>
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-muted text-xs">{{ t("settings.insights.health_stop_failures") }}</div>
          <div class="app-nav-text mt-1 text-xl font-semibold">{{ recorderHealthMetrics.stopFailureCount }}</div>
        </div>
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-muted text-xs">{{ t("settings.insights.health_transcribe_success_rate") }}</div>
          <div class="app-nav-text mt-1 text-xl font-semibold">{{ transcribeSuccessRate }}%</div>
        </div>
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-muted text-xs">{{ t("settings.insights.health_trim_failures") }}</div>
          <div class="app-nav-text mt-1 text-xl font-semibold">{{ recorderHealthMetrics.trimFailureCount }}</div>
        </div>
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-muted text-xs">{{ t("settings.insights.health_last_error") }}</div>
          <div class="app-nav-text mt-1 text-sm font-semibold break-all">
            {{ recorderHealthMetrics.lastErrorCode ?? t("settings.insights.health_none") }}
          </div>
        </div>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-nav-text text-sm font-semibold">
            {{ t("settings.insights.health_daily_title") }}
          </div>
          <div class="mt-2 grid grid-cols-[70px_repeat(4,minmax(0,1fr))] gap-2 text-xs">
            <div class="app-muted">{{ t("settings.insights.health_day") }}</div>
            <div class="app-muted text-right">{{ t("settings.insights.health_daily_recordings") }}</div>
            <div class="app-muted text-right">{{ t("settings.insights.health_daily_stop_fail") }}</div>
            <div class="app-muted text-right">{{ t("settings.insights.health_daily_transcribe_fail") }}</div>
            <div class="app-muted text-right">{{ t("settings.insights.health_daily_trim_fail") }}</div>
            <template v-for="row in recorderHealthDailyRows" :key="row.key">
              <div class="app-text">{{ row.label }}</div>
              <div class="app-text text-right font-semibold">{{ row.startSuccessCount }}</div>
              <div class="app-text text-right font-semibold">{{ row.stopFailureCount }}</div>
              <div class="app-text text-right font-semibold">{{ row.transcribeFailureCount }}</div>
              <div class="app-text text-right font-semibold">{{ row.trimFailureCount }}</div>
            </template>
          </div>
        </div>

        <div class="app-surface rounded-xl border px-3 py-3">
          <div class="app-nav-text text-sm font-semibold">
            {{ t("settings.insights.health_top_errors_title") }}
          </div>
          <div v-if="topRecorderHealthErrors.length === 0" class="app-muted mt-2 text-xs">
            {{ t("settings.insights.health_none") }}
          </div>
          <div v-else class="mt-2 space-y-2">
            <div
              v-for="[code, count] in topRecorderHealthErrors"
              :key="code"
              class="flex items-center justify-between gap-2 text-xs"
            >
              <span class="app-text break-all">{{ code }}</span>
              <span class="app-text font-semibold">{{ count }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-3 flex justify-end">
        <UButton size="sm" color="neutral" variant="outline" @click="resetRecorderHealthMetrics">
          {{ t("settings.insights.health_reset") }}
        </UButton>
      </div>
    </UCard>

    <UCard class="app-panel app-panel-compact app-radius-panel-lg" variant="outline">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="app-nav-text text-lg font-semibold">
            {{ t("settings.voiceup.title") }}
          </h2>
          <p class="app-muted text-xs">
            {{ t("settings.voiceup.subtitle") }}
          </p>
        </div>
        <div class="app-muted text-xs">
          {{ t("settings.voiceup.scope") }}
        </div>
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <UFormField
          :label="t('settings.voiceup.gamification_label')"
          :help="t('settings.voiceup.gamification_note')"
          class="app-nav-text text-xs"
        >
          <USelect
            v-model="selectedGamificationMode"
            class="w-full"
            :items="gamificationModeOptions"
            value-key="value"
          />
        </UFormField>

        <UFormField
          :label="t('settings.voiceup.mascot_enabled_label')"
          :help="t('settings.voiceup.mascot_note')"
          class="app-nav-text text-xs"
        >
          <USwitch
            v-model="mascotEnabled"
            :label="mascotEnabled ? t('settings.voiceup.mascot_on') : t('settings.voiceup.mascot_off')"
            size="md"
          />
        </UFormField>

        <UFormField
          :label="t('settings.voiceup.mascot_intensity_label')"
          :help="t('settings.voiceup.mascot_intensity_note')"
          class="app-nav-text text-xs"
        >
          <USelect
            v-model="selectedMascotIntensity"
            class="w-full"
            :disabled="!mascotEnabled"
            :items="mascotIntensityOptions"
            value-key="value"
          />
        </UFormField>
      </div>
    </UCard>

    <UCard class="app-panel app-panel-compact app-radius-panel-lg" variant="outline">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="app-nav-text text-lg font-semibold">
            {{ t("settings.transcription.title") }}
          </h2>
          <div class="mt-1 flex items-center gap-2 text-xs">
            <span class="app-muted">{{ t("settings.transcription.sidecar_label") }}</span>
            <UBadge :color="sidecarBadgeTone" variant="solid">
              {{ sidecarStatusLabel }}
            </UBadge>
          </div>
          <p class="app-muted text-xs">
            {{ t("settings.transcription.subtitle") }}
          </p>
          <p v-if="sidecarMessage" class="app-danger-text text-xs">{{ sidecarMessage }}</p>
        </div>
        <div class="app-muted text-xs">
          {{ t("settings.transcription.scope") }}
        </div>
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <UFormField
          :label="t('settings.transcription.model_label')"
          :help="t('settings.transcription.model_note')"
          class="app-nav-text text-xs"
        >
          <USelect
            v-model="selectedModel"
            class="w-full"
            :items="modelSelectOptions"
            value-key="value"
          />
        </UFormField>

        <UFormField
          :label="t('settings.transcription.mode_label')"
          :help="t('settings.transcription.mode_note')"
          class="app-nav-text text-xs"
        >
          <USelect
            v-model="selectedMode"
            class="w-full"
            :items="modeOptions"
            value-key="value"
          />
        </UFormField>

        <UFormField
          :label="t('settings.transcription.language_label')"
          :help="t('settings.transcription.language_note')"
          class="app-nav-text text-xs"
        >
          <USelect
            v-model="selectedLanguage"
            class="w-full"
            :items="languageOptions"
            value-key="value"
          />
        </UFormField>
        <UFormField
          :label="t('settings.transcription.spoken_punctuation_label')"
          :help="t('settings.transcription.spoken_punctuation_note')"
          class="app-nav-text text-xs"
        >
          <USwitch
            v-model="spokenPunctuationEnabled"
            :label="spokenPunctuationEnabled
              ? t('settings.transcription.spoken_punctuation_on')
              : t('settings.transcription.spoken_punctuation_off')"
            size="md"
          />
          <p class="app-muted text-xs">
            {{ t("settings.transcription.spoken_punctuation_help") }}
          </p>
        </UFormField>
      </div>

      <div class="mt-4 space-y-2">
        <div v-if="isLoadingModels" class="app-muted text-xs">
          {{ t("settings.transcription.model_loading") }}
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="model in modelOptions"
            :key="model.id"
            class="app-surface rounded-xl border px-3 py-3"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-1">
                <div class="app-nav-text text-sm font-semibold">{{ model.label }}</div>
                <div class="app-muted text-xs">{{ model.status }}</div>
                <div class="app-muted text-xs">
                  {{ t("settings.transcription.model_size") }}: {{ formatBytes(model.expectedBytes) }}
                </div>
                <div class="app-muted text-xs">
                  {{ t("settings.transcription.model_hash") }}: {{ shortHash(model.checksum) }}
                </div>
              </div>
              <div class="flex flex-col items-end gap-2">
                <div class="app-muted text-xs">
                  {{ t("settings.transcription.model_source") }}:
                  <UButton
                    class="app-link max-w-[320px] justify-start truncate text-left !px-0 !py-0 !font-normal"
                    size="sm"
                   
                    color="neutral"
                   variant="ghost" @click="openSourceUrl(model.sourceUrl)">
                    {{ model.sourceUrl }}
                  </UButton>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span v-if="downloadingModelId === model.id" class="app-muted text-xs">
                    {{ t("settings.transcription.model_downloading") }}
                  </span>
                  <span v-else-if="verifyingModelId === model.id" class="app-muted text-xs">
                    {{ t("settings.transcription.model_verifying") }}
                  </span>
                  <UButton
                    v-else-if="!model.installed"
                    size="sm"
                   
                    color="neutral"
                   variant="outline" @click="downloadModel(model.id)">
                    {{ t("settings.transcription.download_action") }}
                  </UButton>
                  <template v-else>
                    <UButton
                      v-if="model.checksumOk == null"
                      size="sm"
                     
                      color="neutral"
                     variant="outline" @click="verifyModel(model.id)">
                      {{ t("settings.transcription.model_verify") }}
                    </UButton>
                    <UButton
                      size="sm"
                     
                      color="neutral"
                     variant="outline" @click="removeModel(model.id)">
                      {{ t("settings.transcription.model_remove") }}
                    </UButton>
                  </template>
                  <span v-if="model.installed" class="app-muted text-xs">
                    {{ t("settings.transcription.model_installed") }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="downloadingModelId === model.id && downloadProgress[model.id]" class="mt-2 flex items-center gap-2 text-xs">
              <div class="app-meter-bg h-2 w-32 rounded-full">
                <div
                  class="h-2 rounded-full bg-[var(--app-info)]"
                  :style="{ width: `${progressPercent(model.id)}%` }"
                ></div>
              </div>
              <span class="app-muted">{{ progressLabel(model.id) }}</span>
              <span class="app-text">{{ progressPercent(model.id) }}%</span>
            </div>
          </div>
        </div>

        <div v-if="downloadError" class="app-danger-text text-xs">
          {{ downloadError }}
        </div>
      </div>
    </UCard>
  </section>
</template>

