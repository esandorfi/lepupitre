<script setup lang="ts">
import { computed } from "vue";
import type { PrimaryNavMode } from "@/lib/uiPreferences";

type SelectOption = { value: string; label: string; disabled?: boolean };

const props = defineProps<{
  t: (key: string) => string;
  navMetrics: {
    switchCount: number;
    topSwitchCount: number;
    sidebarSwitchCount: number;
    sidebarSessionCount: number;
  };
  averageNavLatencyMs: number;
  navModeOptions: SelectOption[];
  selectedNavMode: PrimaryNavMode;
  resetNavMetrics: () => void;
}>();

const emit = defineEmits<{
  "update:selectedNavMode": [value: PrimaryNavMode];
}>();

const selectedNavModeModel = computed({
  get: () => props.selectedNavMode,
  set: (value: PrimaryNavMode) => emit("update:selectedNavMode", value),
});
</script>

<template>
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
          v-model="selectedNavModeModel"
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
</template>
