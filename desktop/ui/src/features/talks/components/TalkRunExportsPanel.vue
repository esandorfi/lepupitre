<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import type { RunSummary } from "@/schemas/ipc";
import { formatDate, runStatus } from "@/features/talks/composables/reportPage/talkReportPageHelpers";

const { t } = useI18n();

defineProps<{
  runs: RunSummary[];
  exportingRunId: string | null;
  exportPath: string | null;
  isRevealing: boolean;
  exportError: string | null;
  onExportPack: (runId: string) => void;
  onRevealExport: () => void;
}>();
</script>

<template>
  <UCard class="app-panel" variant="outline">
    <div class="app-text-eyebrow">{{ t("talk_report.export_title") }}</div>
    <div v-if="runs.length === 0" class="app-muted app-text-body mt-3">
      {{ t("boss_run.latest_empty") }}
    </div>
    <div v-else class="mt-3 space-y-2 app-text-meta">
      <div
        v-for="run in runs"
        :key="run.id"
        class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--app-border)] px-3 py-2"
      >
        <div>
          <div class="app-text text-sm">{{ t("talk_report.timeline_boss_run") }}</div>
          <div class="app-muted app-text-meta">
            {{ formatDate(run.created_at) }} - {{ runStatus(t, run) }}
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            size="sm"
            :disabled="exportingRunId === run.id"
            color="neutral"
            variant="outline"
            @click="onExportPack(run.id)"
          >
            {{ t("packs.export") }}
          </UButton>
        </div>
      </div>
    </div>
    <div v-if="exportPath" class="mt-3 flex flex-wrap items-center gap-2 text-xs">
      <span class="app-muted app-text-meta">{{ t("packs.export_path") }}:</span>
      <span class="app-text max-w-[360px] truncate" style="direction: rtl; text-align: left;">
        {{ exportPath }}
      </span>
      <UButton
        size="sm"
        :disabled="isRevealing"
        color="neutral"
        variant="ghost"
        @click="onRevealExport"
      >
        {{ t("packs.export_reveal") }}
      </UButton>
      <span class="app-subtle app-text-meta">{{ t("packs.export_ready") }}</span>
    </div>
    <div v-if="exportError" class="app-danger-text app-text-meta mt-2">
      {{ exportError }}
    </div>
  </UCard>
</template>
