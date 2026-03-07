<script setup lang="ts">
import { RouterLink } from "vue-router";
import AudioRecorder from "@/components/AudioRecorder.vue";
import { useQuestPageState } from "@/features/training/composables/useQuestPageState";

const {
  t,
  backLink,
  displayQuestCode,
  text,
  error,
  isAnalyzing,
  isLoading,
  quest,
  attemptId,
  submittedTextSnapshot,
  audioArtifactId,
  transcriptId,
  isAudioQuest,
  canSubmitText,
  canAnalyze,
  submitTextLabel,
  analyzeLabel,
  captureStatusLabel,
  analysisHint,
  canLeaveWithoutFeedback,
  submit,
  handleAudioSaved,
  handleTranscribed,
  requestFeedback,
  handleRecorderAnalyze,
  skipTranscription,
} = useQuestPageState();
</script>

<template>
  <section class="app-page-shell">
    <p class="app-muted app-text-body-strong">
      {{ t("quest.code") }}: {{ displayQuestCode }}
    </p>

    <UCard v-if="isLoading" class="app-panel app-panel-compact" variant="outline">
      <p class="app-muted app-text-body">{{ t("quest.loading") }}</p>
    </UCard>

    <div v-else-if="quest" class="space-y-4">
      <UCard class="app-panel" variant="outline">
        <div class="app-text-eyebrow">{{ t("quest.step_brief") }}</div>
        <div class="app-text app-text-section-title mt-2">{{ quest.title }}</div>
        <div class="app-muted app-text-meta mt-2">{{ quest.prompt }}</div>
        <div class="mt-3 flex flex-wrap items-center gap-2 app-text-meta">
          <UBadge color="neutral" variant="solid">
            {{ isAudioQuest ? t("quest.output_audio") : t("quest.output_text") }}
          </UBadge>
          <UBadge color="neutral" variant="solid">
            {{ quest.category }}
          </UBadge>
          <UBadge color="neutral" variant="solid">
            {{ Math.max(1, Math.round(quest.estimated_sec / 60)) }} {{ t("talks.minutes") }}
          </UBadge>
        </div>
      </UCard>

      <UCard class="app-panel" variant="outline">
        <div class="app-text-eyebrow">{{ t("quest.step_capture") }}</div>

        <div v-if="isAudioQuest" class="mt-3 space-y-4">
          <p class="app-muted app-text-body-strong">{{ t("quest.audio_hint") }}</p>
          <AudioRecorder
            :can-analyze="canAnalyze"
            :is-analyzing="isAnalyzing"
            @saved="handleAudioSaved"
            @transcribed="handleTranscribed"
            @analyze="handleRecorderAnalyze"
          />
          <p v-if="audioArtifactId && !transcriptId" class="app-muted app-text-meta">
            {{ t("quest.transcript_optional") }}
          </p>
        </div>

        <div v-else class="mt-3 space-y-3">
          <UTextarea
            v-model="text"
            rows="6"
            class="w-full app-text-body"
            :placeholder="t('quest.response_placeholder')"
          />

          <div class="flex flex-wrap items-center gap-3">
            <UButton size="lg" :disabled="!canSubmitText" color="primary" @click="submit">
              {{ submitTextLabel }}
            </UButton>
            <UBadge v-if="attemptId" color="success" variant="solid">
              {{ t("quest.capture_saved") }}
            </UBadge>
          </div>
          <p v-if="submittedTextSnapshot" class="app-muted app-text-meta">
            {{
              text.trim() === submittedTextSnapshot
                ? t("quest.text_submitted_hint")
                : t("quest.text_changed_resubmit")
            }}
          </p>
        </div>
      </UCard>

      <UCard class="app-panel" variant="outline">
        <div class="app-text-eyebrow">{{ t("quest.step_analysis") }}</div>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <UButton
            v-if="!isAudioQuest"
            size="lg"
            :disabled="!canAnalyze || isAnalyzing"
            color="info"
            @click="requestFeedback"
          >
            {{ analyzeLabel }}
          </UButton>
          <UButton
            v-if="canLeaveWithoutFeedback"
            size="lg"
            color="neutral"
            variant="outline"
            @click="skipTranscription"
          >
            {{ t("quest.keep_without_feedback") }}
          </UButton>
          <RouterLink class="app-muted app-text-meta underline" :to="backLink">
            {{ t("quest.back") }}
          </RouterLink>
        </div>
        <p v-if="captureStatusLabel" class="app-subtle app-text-meta mt-2">{{ captureStatusLabel }}</p>
        <p class="app-muted app-text-meta mt-2">{{ analysisHint }}</p>
      </UCard>

      <p v-if="error" class="app-danger-text app-text-meta">{{ error }}</p>
    </div>

    <UCard v-else class="app-panel app-panel-compact" variant="outline">
      <p class="app-muted app-text-body">{{ error || t("quest.empty") }}</p>
    </UCard>
  </section>
</template>
