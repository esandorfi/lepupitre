<script setup lang="ts">
import { reactive } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import AudioRecorder from "@/components/AudioRecorder.vue";
import { useQuestPageState } from "@/features/training/composables/useQuestPageState";

/**
 * Page composition root (quest flow).
 * Reads: quest capture/analysis state from `useQuestPageState`.
 * Actions: submit, capture handlers, and feedback navigation commands.
 * Boundary: page renders flow steps; orchestration stays in quest actions/runtime.
 */
const { t } = useI18n();
const vm = reactive(useQuestPageState());
</script>

<template>
  <section class="app-page-shell">
    <p class="app-muted app-text-body-strong">
      {{ t("quest.code") }}: {{ vm.displayQuestCode }}
    </p>

    <UCard v-if="vm.isLoading" class="app-panel app-panel-compact" variant="outline">
      <p class="app-muted app-text-body">{{ t("quest.loading") }}</p>
    </UCard>

    <div v-else-if="vm.quest" class="space-y-4">
      <UCard class="app-panel" variant="outline">
        <div class="app-text-eyebrow">{{ t("quest.step_brief") }}</div>
        <div class="app-text app-text-section-title mt-2">{{ vm.quest.title }}</div>
        <div class="app-muted app-text-meta mt-2">{{ vm.quest.prompt }}</div>
        <div class="mt-3 flex flex-wrap items-center gap-2 app-text-meta">
          <UBadge color="neutral" variant="solid">
            {{ vm.isAudioQuest ? t("quest.output_audio") : t("quest.output_text") }}
          </UBadge>
          <UBadge color="neutral" variant="solid">
            {{ vm.quest.category }}
          </UBadge>
          <UBadge color="neutral" variant="solid">
            {{ Math.max(1, Math.round(vm.quest.estimated_sec / 60)) }} {{ t("talks.minutes") }}
          </UBadge>
        </div>
      </UCard>

      <UCard class="app-panel" variant="outline">
        <div class="app-text-eyebrow">{{ t("quest.step_capture") }}</div>

        <div v-if="vm.isAudioQuest" class="mt-3 space-y-4">
          <p class="app-muted app-text-body-strong">{{ t("quest.audio_hint") }}</p>
          <AudioRecorder
            :can-analyze="vm.canAnalyze"
            :is-analyzing="vm.isAnalyzing"
            @saved="vm.handleAudioSaved"
            @transcribed="vm.handleTranscribed"
            @analyze="vm.handleRecorderAnalyze"
          />
          <p v-if="vm.audioArtifactId && !vm.transcriptId" class="app-muted app-text-meta">
            {{ t("quest.transcript_optional") }}
          </p>
        </div>

        <div v-else class="mt-3 space-y-3">
          <UTextarea
            v-model="vm.text"
            rows="6"
            class="w-full app-text-body"
            :placeholder="t('quest.response_placeholder')"
          />

          <div class="flex flex-wrap items-center gap-3">
            <UButton size="lg" :disabled="!vm.canSubmitText" color="primary" @click="vm.submit">
              {{ vm.submitTextLabel }}
            </UButton>
            <UBadge v-if="vm.attemptId" color="success" variant="solid">
              {{ t("quest.capture_saved") }}
            </UBadge>
          </div>
          <p v-if="vm.submittedTextSnapshot" class="app-muted app-text-meta">
            {{
              vm.text.trim() === vm.submittedTextSnapshot
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
            v-if="!vm.isAudioQuest"
            size="lg"
            :disabled="!vm.canAnalyze || vm.isAnalyzing"
            color="info"
            @click="vm.requestFeedback"
          >
            {{ vm.analyzeLabel }}
          </UButton>
          <UButton
            v-if="vm.canLeaveWithoutFeedback"
            size="lg"
            color="neutral"
            variant="outline"
            @click="vm.skipTranscription"
          >
            {{ t("quest.keep_without_feedback") }}
          </UButton>
          <RouterLink class="app-muted app-text-meta underline" :to="vm.backLink">
            {{ t("quest.back") }}
          </RouterLink>
        </div>
        <p v-if="vm.captureStatusLabel" class="app-subtle app-text-meta mt-2">{{ vm.captureStatusLabel }}</p>
        <p class="app-muted app-text-meta mt-2">{{ vm.analysisHint }}</p>
      </UCard>

      <p v-if="vm.error" class="app-danger-text app-text-meta">{{ vm.error }}</p>
    </div>

    <UCard v-else class="app-panel app-panel-compact" variant="outline">
      <p class="app-muted app-text-body">{{ vm.error || t("quest.empty") }}</p>
    </UCard>
  </section>
</template>
