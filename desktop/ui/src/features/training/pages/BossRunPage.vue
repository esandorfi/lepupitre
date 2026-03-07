<script setup lang="ts">
import { RouterLink } from "vue-router";
import AudioRecorder from "@/components/AudioRecorder.vue";
import { useBossRunPageState } from "@/features/training/composables/useBossRunPageState";

const {
  t,
  error,
  isLoading,
  isSaving,
  isAnalyzing,
  run,
  activeProfileId,
  activeProject,
  talkLabel,
  runStatus,
  hasAnalysisResult,
  formatDate,
  handleAudioSaved,
  handleTranscribed,
  handleRecorderAnalyze,
  handleViewFeedback,
} = useBossRunPageState();
</script>

<template>
  <section class="space-y-6">
    <UCard class="app-panel app-panel-compact" variant="outline">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("boss_run.title") }}
      </div>
      <div class="app-text mt-2 text-sm">{{ t("boss_run.subtitle") }}</div>
      <div v-if="talkLabel" class="app-muted mt-2 text-xs">{{ talkLabel }}</div>
      <div v-else class="app-muted mt-2 text-xs">{{ t("boss_run.no_talk") }}</div>
    </UCard>

    <UCard v-if="!activeProfileId" class="app-panel app-panel-compact" variant="outline">
      <p class="app-muted text-sm">{{ t("boss_run.need_profile") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/profiles">
        {{ t("boss_run.setup_profile") }}
      </RouterLink>
    </UCard>

    <UCard v-else-if="!activeProject" class="app-panel app-panel-compact" variant="outline">
      <p class="app-muted text-sm">{{ t("boss_run.need_talk") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/project/new">
        {{ t("boss_run.setup_talk") }}
      </RouterLink>
    </UCard>

    <div v-else class="space-y-4">
      <AudioRecorder
        title-key="boss_run.audio_title"
        subtitle-key="boss_run.audio_subtitle"
        :can-analyze="!!run?.transcript_id"
        :is-analyzing="isAnalyzing || isSaving"
        :show-pass-label="false"
        :has-analysis-result="hasAnalysisResult"
        @saved="handleAudioSaved"
        @transcribed="handleTranscribed"
        @analyze="handleRecorderAnalyze"
        @view-feedback="handleViewFeedback"
      />

      <div class="flex flex-wrap items-center gap-3">
        <RouterLink
          v-if="run?.feedback_id"
          class="app-link text-xs underline"
          :to="`/feedback/${run.feedback_id}`"
        >
          {{ t("boss_run.view_report") }}
        </RouterLink>
      </div>

      <p v-if="run?.audio_artifact_id && !run?.transcript_id" class="app-muted text-xs">
        {{ t("boss_run.transcript_optional") }}
      </p>

      <UCard class="app-panel app-panel-compact" variant="outline">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">
          {{ t("boss_run.latest_title") }}
        </div>
        <div v-if="isLoading" class="app-muted mt-3 text-xs">
          {{ t("boss_run.loading") }}
        </div>
        <div v-else-if="error" class="app-danger-text mt-3 text-xs">
          {{ error }}
        </div>
        <div v-else-if="run" class="mt-3 space-y-2 text-xs">
          <div class="app-text text-sm font-semibold">{{ t("boss_run.latest_label") }}</div>
          <div class="app-muted">
            {{ t("boss_run.latest_date") }}: {{ formatDate(run.created_at) }}
          </div>
          <div class="app-muted">
            {{ t("boss_run.latest_status") }}: {{ runStatus }}
          </div>
        </div>
        <div v-else class="app-muted mt-3 text-xs">
          {{ t("boss_run.latest_empty") }}
        </div>
      </UCard>
    </div>
  </section>
</template>
