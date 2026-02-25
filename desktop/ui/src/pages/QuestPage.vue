<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AudioRecorder from "../components/AudioRecorder.vue";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import type { Quest } from "../schemas/ipc";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const questCode = computed(() => String(route.params.questCode || ""));
const routeProjectId = computed(() => String(route.query.projectId || ""));
const contextProjectId = computed(() => routeProjectId.value || appStore.state.activeProject?.id || "");
const backLink = computed(() => {
  if (route.query.from === "training") {
    return "/training";
  }
  if (route.query.projectId) {
    return `/talks/${route.query.projectId}/train`;
  }
  if (appStore.state.activeProject?.id) {
    return `/talks/${appStore.state.activeProject.id}/train`;
  }
  return "/training";
});
const displayQuestCode = computed(() => {
  const code = questCode.value;
  if (!code) {
    return t("quest.daily");
  }
  const projectId =
    String(route.query.projectId || "") || appStore.state.activeProject?.id || "";
  return appStore.formatQuestCode(projectId, code);
});
const text = ref("");
const error = ref<string | null>(null);
const isSubmitting = ref(false);
const isAnalyzing = ref(false);
const isLoading = ref(false);
const submittedTextSnapshot = ref<string | null>(null);

const quest = ref<Quest | null>(null);
const attemptId = ref<string | null>(null);
const audioArtifactId = ref<string | null>(null);
const transcriptId = ref<string | null>(null);

const isAudioQuest = computed(
  () => quest.value?.output_type.toLowerCase() === "audio"
);
const canSubmitText = computed(() => {
  if (isAudioQuest.value) {
    return false;
  }
  if (isSubmitting.value) {
    return false;
  }
  const trimmed = text.value.trim();
  if (!trimmed) {
    return false;
  }
  return submittedTextSnapshot.value !== trimmed;
});
const canAnalyze = computed(() => {
  if (!attemptId.value) {
    return false;
  }
  if (!isAudioQuest.value) {
    return true;
  }
  return Boolean(transcriptId.value);
});
const submitTextLabel = computed(() => {
  if (submittedTextSnapshot.value && text.value.trim() !== submittedTextSnapshot.value) {
    return t("quest.submit_update");
  }
  return t("quest.submit");
});
const analyzeLabel = computed(() =>
  isAudioQuest.value && attemptId.value && !transcriptId.value
    ? t("quest.transcribe_first")
    : t("quest.analyze")
);
const captureStatusLabel = computed(() => {
  if (!attemptId.value) {
    return null;
  }
  if (!isAudioQuest.value) {
    return t("quest.capture_saved_text");
  }
  if (transcriptId.value) {
    return t("quest.capture_ready_audio");
  }
  return t("quest.capture_saved_audio");
});
const analysisHint = computed(() => {
  if (!attemptId.value) {
    if (isAudioQuest.value) {
      return t("quest.analysis_wait_record");
    }
    return text.value.trim()
      ? t("quest.analysis_wait_submit")
      : t("quest.analysis_wait_capture");
  }
  if (isAudioQuest.value && !transcriptId.value) {
    return t("quest.analysis_wait_transcript");
  }
  return t("quest.analysis_ready");
});
const canLeaveWithoutFeedback = computed(
  () => isAudioQuest.value && Boolean(audioArtifactId.value) && !transcriptId.value
);

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

async function bootstrap() {
  await appStore.bootstrap();
}

async function loadQuest() {
  error.value = null;
  quest.value = null;
  attemptId.value = null;
  audioArtifactId.value = null;
  transcriptId.value = null;
  text.value = "";
  submittedTextSnapshot.value = null;

  const code = questCode.value.trim();
  if (!code) {
    error.value = t("quest.empty");
    return;
  }

  isLoading.value = true;
  try {
    await bootstrap();
    if (!appStore.state.activeProfileId || !contextProjectId.value) {
      error.value = t("home.quest_empty");
      return;
    }

    if (appStore.state.dailyQuest?.quest.code === code) {
      quest.value = appStore.state.dailyQuest.quest;
    } else {
      quest.value = await appStore.getQuestByCode(code);
    }
  } catch (err) {
    error.value = toError(err);
  } finally {
    isLoading.value = false;
  }
}

async function submit() {
  if (!quest.value) {
    error.value = t("quest.empty");
    return;
  }
  if (!text.value.trim()) {
    error.value = t("quest.response_required");
    return;
  }
  isSubmitting.value = true;
  error.value = null;
  try {
    const attempt = await appStore.submitQuestTextForProject(
      contextProjectId.value,
      quest.value.code,
      text.value.trim()
    );
    attemptId.value = attempt;
    submittedTextSnapshot.value = text.value.trim();
  } catch (err) {
    error.value = toError(err);
  } finally {
    isSubmitting.value = false;
  }
}

async function handleAudioSaved(payload: { artifactId: string }) {
  if (!quest.value) {
    return;
  }
  error.value = null;
  transcriptId.value = null;
  audioArtifactId.value = payload.artifactId;
  try {
    const attempt = await appStore.submitQuestAudioForProject(contextProjectId.value, {
      questCode: quest.value.code,
      audioArtifactId: payload.artifactId,
      transcriptId: null,
    });
    attemptId.value = attempt;
  } catch (err) {
    error.value = toError(err);
  }
}

async function handleTranscribed(payload: { transcriptId: string }) {
  if (!quest.value || !audioArtifactId.value) {
    return;
  }
  error.value = null;
  transcriptId.value = payload.transcriptId;
  try {
    const attempt = await appStore.submitQuestAudioForProject(contextProjectId.value, {
      questCode: quest.value.code,
      audioArtifactId: audioArtifactId.value,
      transcriptId: payload.transcriptId,
    });
    attemptId.value = attempt;
  } catch (err) {
    error.value = toError(err);
  }
}

async function requestFeedback() {
  if (!attemptId.value) {
    error.value = t("quest.empty");
    return;
  }
  if (isAudioQuest.value && !transcriptId.value) {
    error.value = t("quest.transcribe_first");
    return;
  }
  isAnalyzing.value = true;
  error.value = null;
  try {
    const feedbackId = await appStore.analyzeAttempt(attemptId.value);
    await router.push(`/feedback/${feedbackId}`);
  } catch (err) {
    error.value = toError(err);
  } finally {
    isAnalyzing.value = false;
  }
}

async function skipTranscription() {
  await router.push(backLink.value);
}

onMounted(loadQuest);
watch([questCode, routeProjectId], loadQuest);
watch(text, (nextValue) => {
  if (isAudioQuest.value) {
    return;
  }
  if (!attemptId.value || submittedTextSnapshot.value === null) {
    return;
  }
  if (nextValue.trim() !== submittedTextSnapshot.value) {
    attemptId.value = null;
    submittedTextSnapshot.value = null;
  }
});
</script>

<template>
  <section class="space-y-6">
    <p class="app-muted text-sm font-semibold">
      {{ t("quest.code") }}: {{ displayQuestCode }}
    </p>

    <div v-if="isLoading" class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ t("quest.loading") }}</p>
    </div>

    <div v-else-if="quest" class="space-y-4">
      <div class="app-surface rounded-2xl border p-4">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">{{ t("quest.step_brief") }}</div>
        <div class="app-text mt-2 text-sm font-semibold">{{ quest.title }}</div>
        <div class="app-muted mt-2 text-xs">{{ quest.prompt }}</div>
        <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
            {{ isAudioQuest ? t("quest.output_audio") : t("quest.output_text") }}
          </span>
          <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
            {{ quest.category }}
          </span>
          <span class="app-badge-neutral rounded-full px-2 py-1 font-semibold">
            {{ Math.max(1, Math.round(quest.estimated_sec / 60)) }} {{ t("talks.minutes") }}
          </span>
        </div>
      </div>

      <div class="app-surface rounded-2xl border p-4">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">{{ t("quest.step_capture") }}</div>

        <div v-if="isAudioQuest" class="mt-3 space-y-4">
          <p class="app-muted text-sm font-semibold">{{ t("quest.audio_hint") }}</p>
          <AudioRecorder @saved="handleAudioSaved" @transcribed="handleTranscribed" />
          <p v-if="audioArtifactId && !transcriptId" class="app-muted text-xs">
            {{ t("quest.transcript_optional") }}
          </p>
        </div>

        <div v-else class="mt-3 space-y-3">
          <textarea
            v-model="text"
            rows="6"
            class="app-input w-full rounded-lg border px-3 py-2 text-sm"
            :placeholder="t('quest.response_placeholder')"
          ></textarea>

          <div class="flex flex-wrap items-center gap-3">
            <button
              class="app-button-primary cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              :disabled="!canSubmitText"
              @click="submit"
            >
              {{ submitTextLabel }}
            </button>
            <span v-if="attemptId" class="app-badge-success rounded-full px-2 py-1 text-[10px] font-semibold">
              {{ t("quest.capture_saved") }}
            </span>
          </div>
          <p
            v-if="submittedTextSnapshot"
            class="app-muted text-xs"
          >
            {{
              text.trim() === submittedTextSnapshot
                ? t("quest.text_submitted_hint")
                : t("quest.text_changed_resubmit")
            }}
          </p>
        </div>
      </div>

      <div class="app-surface rounded-2xl border p-4">
        <div class="app-subtle text-xs uppercase tracking-[0.2em]">{{ t("quest.step_analysis") }}</div>
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <button
            class="app-button-info cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="!canAnalyze || isAnalyzing"
            @click="requestFeedback"
          >
            {{ analyzeLabel }}
          </button>
          <button
            v-if="canLeaveWithoutFeedback"
            class="app-button-secondary cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            @click="skipTranscription"
          >
            {{ t("quest.keep_without_feedback") }}
          </button>
          <RouterLink class="app-muted text-xs underline" :to="backLink">
            {{ t("quest.back") }}
          </RouterLink>
        </div>
        <p v-if="captureStatusLabel" class="app-subtle mt-2 text-xs">{{ captureStatusLabel }}</p>
        <p class="app-muted mt-2 text-xs">{{ analysisHint }}</p>
      </div>

      <p v-if="error" class="app-danger-text text-xs">{{ error }}</p>
    </div>

    <div v-else class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ error || t("quest.empty") }}</p>
    </div>
  </section>
</template>
