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
const text = ref("");
const error = ref<string | null>(null);
const isSubmitting = ref(false);
const isAnalyzing = ref(false);
const isLoading = ref(false);

const quest = ref<Quest | null>(null);
const attemptId = ref<string | null>(null);
const audioArtifactId = ref<string | null>(null);
const transcriptId = ref<string | null>(null);

const isAudioQuest = computed(
  () => quest.value?.output_type.toLowerCase() === "audio"
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

  const code = questCode.value.trim();
  if (!code) {
    error.value = t("quest.empty");
    return;
  }

  isLoading.value = true;
  try {
    await bootstrap();
    if (!appStore.state.activeProfileId || !appStore.state.activeProject) {
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
    const attempt = await appStore.submitQuestText(quest.value.code, text.value.trim());
    const feedbackId = await appStore.analyzeAttempt(attempt);
    await router.push(`/feedback/${feedbackId}`);
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
    const attempt = await appStore.submitQuestAudio({
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
    const attempt = await appStore.submitQuestAudio({
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
  await router.push("/");
}

onMounted(loadQuest);
watch(questCode, loadQuest);
</script>

<template>
  <section class="space-y-6">
    <p class="app-muted text-sm font-semibold">
      {{ t("quest.code") }}: {{ questCode || t("quest.daily") }}
    </p>

    <div v-if="isLoading" class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ t("quest.loading") }}</p>
    </div>

    <div v-else-if="quest" class="app-surface rounded-2xl border p-4">
      <div class="app-text text-sm">{{ quest.title }}</div>
      <div class="app-muted mt-2 text-xs">{{ quest.prompt }}</div>

      <div v-if="isAudioQuest" class="mt-4 space-y-4">
        <p class="app-muted text-sm font-semibold">{{ t("quest.audio_hint") }}</p>
        <AudioRecorder @saved="handleAudioSaved" @transcribed="handleTranscribed" />

        <div class="flex flex-wrap items-center gap-3">
          <button
            class="app-button-info cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="!transcriptId || isAnalyzing"
            @click="requestFeedback"
          >
            {{ t("quest.request_feedback") }}
          </button>
          <button
            class="app-button-secondary cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="!audioArtifactId"
            @click="skipTranscription"
          >
            {{ t("quest.skip_transcription") }}
          </button>
          <RouterLink class="app-muted text-xs underline" to="/">
            {{ t("quest.back") }}
          </RouterLink>
        </div>

        <p v-if="audioArtifactId && !transcriptId" class="app-muted text-xs">
          {{ t("quest.transcript_optional") }}
        </p>
      </div>

      <div v-else class="mt-4 space-y-3">
        <textarea
          v-model="text"
          rows="6"
          class="app-input w-full rounded-lg border px-3 py-2 text-sm"
          :placeholder="t('quest.response_placeholder')"
        ></textarea>

        <div class="flex items-center gap-3">
          <button
            class="app-button-primary cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="isSubmitting"
            @click="submit"
          >
            {{ t("quest.submit") }}
          </button>
          <RouterLink class="app-muted text-xs underline" to="/">
            {{ t("quest.back") }}
          </RouterLink>
        </div>
      </div>

      <p v-if="error" class="app-danger-text text-xs">{{ error }}</p>
    </div>

    <div v-else class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ error || t("quest.empty") }}</p>
    </div>
  </section>
</template>
