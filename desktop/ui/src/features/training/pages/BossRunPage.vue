<script setup lang="ts">
import { reactive } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import AudioRecorder from "@/components/AudioRecorder.vue";
import { useBossRunPageState } from "@/features/training/composables/useBossRunPageState";

/**
 * Page composition root (boss run).
 * Reads: run capture/analysis status from `useBossRunPageState`.
 * Actions: recorder handlers and feedback navigation command delegation.
 * Boundary: page renders guard + run cards only.
 */
const { t } = useI18n();
const vm = reactive(useBossRunPageState());
</script>

<template>
  <section class="space-y-6">
    <UCard class="app-panel app-panel-compact" variant="outline">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("boss_run.title") }}
      </div>
      <div class="app-text mt-2 text-sm">{{ t("boss_run.subtitle") }}</div>
      <div v-if="vm.talkLabel" class="app-muted mt-2 text-xs">{{ vm.talkLabel }}</div>
      <div v-else class="app-muted mt-2 text-xs">{{ t("boss_run.no_talk") }}</div>
    </UCard>

    <UCard v-if="!vm.activeProfileId" class="app-panel app-panel-compact" variant="outline">
      <p class="app-muted text-sm">{{ t("boss_run.need_profile") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/profiles">
        {{ t("boss_run.setup_profile") }}
      </RouterLink>
    </UCard>

    <UCard v-else-if="!vm.activeProject" class="app-panel app-panel-compact" variant="outline">
      <p class="app-muted text-sm">{{ t("boss_run.need_talk") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/project/new">
        {{ t("boss_run.setup_talk") }}
      </RouterLink>
    </UCard>

    <div v-else class="space-y-4">
      <AudioRecorder
        title-key="boss_run.audio_title"
        subtitle-key="boss_run.audio_subtitle"
        :can-analyze="!!vm.run?.transcript_id"
        :is-analyzing="vm.isAnalyzing || vm.isSaving"
        :show-pass-label="false"
        :has-analysis-result="vm.hasAnalysisResult"
        @saved="vm.handleAudioSaved"
        @transcribed="vm.handleTranscribed"
        @analyze="vm.handleRecorderAnalyze"
        @view-feedback="vm.handleViewFeedback"
      />

      <div class="flex flex-wrap items-center gap-3">
        <RouterLink
          v-if="vm.run?.feedback_id"
          class="app-link text-xs underline"
          :to="`/feedback/${vm.run.feedback_id}`"
        >
          {{ t("boss_run.view_report") }}
        </RouterLink>
      </div>

      <p v-if="vm.run?.audio_artifact_id && !vm.run?.transcript_id" class="app-muted text-xs">
        {{ t("boss_run.transcript_optional") }}
      </p>

      <UCard class="app-panel app-panel-compact" variant="outline">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("boss_run.latest_title") }}
        </div>
        <div v-if="vm.isLoading" class="app-muted mt-3 text-xs">
          {{ t("boss_run.loading") }}
        </div>
        <div v-else-if="vm.error" class="app-danger-text mt-3 text-xs">
          {{ vm.error }}
        </div>
        <div v-else-if="vm.run" class="mt-3 space-y-2 text-xs">
          <div class="app-text text-sm font-semibold">{{ t("boss_run.latest_label") }}</div>
          <div class="app-muted">
            {{ t("boss_run.latest_date") }}: {{ vm.formatDate(vm.run.created_at) }}
          </div>
          <div class="app-muted">
            {{ t("boss_run.latest_status") }}: {{ vm.runStatus }}
          </div>
        </div>
        <div v-else class="app-muted mt-3 text-xs">
          {{ t("boss_run.latest_empty") }}
        </div>
      </UCard>
    </div>
  </section>
</template>
