<script setup lang="ts">
const props = defineProps<{
  t: (key: string) => string;
  recorderHealthMetrics: {
    startSuccessCount: number;
    stopFailureCount: number;
    transcribeFailureCount: number;
    trimFailureCount: number;
    lastErrorCode: string | null;
  };
  recorderStartSuccessRate: number;
  transcribeSuccessRate: number;
  topRecorderHealthErrors: Array<[string, number]>;
  recorderHealthDailyRows: Array<{
    key: string;
    label: string;
    startSuccessCount: number;
    stopFailureCount: number;
    transcribeFailureCount: number;
    trimFailureCount: number;
  }>;
  resetRecorderHealthMetrics: () => void;
}>();
</script>

<template>
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
        <div class="app-nav-text mt-1 text-xl font-semibold">{{ props.recorderHealthMetrics.startSuccessCount }}</div>
      </div>
      <div class="app-surface rounded-xl border px-3 py-3">
        <div class="app-muted text-xs">{{ t("settings.insights.health_start_success_rate") }}</div>
        <div class="app-nav-text mt-1 text-xl font-semibold">{{ recorderStartSuccessRate }}%</div>
      </div>
      <div class="app-surface rounded-xl border px-3 py-3">
        <div class="app-muted text-xs">{{ t("settings.insights.health_stop_failures") }}</div>
        <div class="app-nav-text mt-1 text-xl font-semibold">{{ props.recorderHealthMetrics.stopFailureCount }}</div>
      </div>
      <div class="app-surface rounded-xl border px-3 py-3">
        <div class="app-muted text-xs">{{ t("settings.insights.health_transcribe_success_rate") }}</div>
        <div class="app-nav-text mt-1 text-xl font-semibold">{{ transcribeSuccessRate }}%</div>
      </div>
      <div class="app-surface rounded-xl border px-3 py-3">
        <div class="app-muted text-xs">{{ t("settings.insights.health_trim_failures") }}</div>
        <div class="app-nav-text mt-1 text-xl font-semibold">{{ props.recorderHealthMetrics.trimFailureCount }}</div>
      </div>
      <div class="app-surface rounded-xl border px-3 py-3">
        <div class="app-muted text-xs">{{ t("settings.insights.health_last_error") }}</div>
        <div class="app-nav-text mt-1 text-sm font-semibold break-all">
          {{ props.recorderHealthMetrics.lastErrorCode ?? t("settings.insights.health_none") }}
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
</template>
