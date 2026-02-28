<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import AudioRecorder from "../components/AudioRecorder.vue";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import type { RunSummary } from "../schemas/ipc";

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const error = ref<string | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const isAnalyzing = ref(false);
const run = ref<RunSummary | null>(null);
const requestedRunId = computed(() => String(route.query.runId || ""));

const activeProfileId = computed(() => appStore.state.activeProfileId);
const activeProject = computed(() => appStore.state.activeProject);
const talkLabel = computed(() => {
  if (!activeProject.value) {
    return "";
  }
  const number = appStore.getTalkNumber(activeProject.value.id);
  const prefix = number ? `T${number} · ` : "";
  return `${prefix}${activeProject.value.title}`;
});

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "--";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

const runStatus = computed(() => {
  if (!run.value) {
    return t("boss_run.status_empty");
  }
  if (run.value.feedback_id) {
    return t("boss_run.status_feedback");
  }
  if (run.value.transcript_id) {
    return t("boss_run.status_transcribed");
  }
  if (run.value.audio_artifact_id) {
    return t("boss_run.status_recorded");
  }
  return t("boss_run.status_empty");
});

async function loadLatest() {
  run.value = null;
  if (!activeProject.value) {
    return;
  }
  isLoading.value = true;
  error.value = null;
  try {
    if (requestedRunId.value) {
      run.value = await appStore.getRun(requestedRunId.value);
      if (!run.value) {
        run.value = await appStore.getLatestRun(activeProject.value.id);
      }
    } else {
      run.value = await appStore.getLatestRun(activeProject.value.id);
    }
  } catch (err) {
    error.value = toError(err);
  } finally {
    isLoading.value = false;
  }
}

async function handleAudioSaved(payload: { artifactId: string }) {
  if (!activeProject.value) {
    error.value = t("boss_run.need_talk");
    return;
  }
  isSaving.value = true;
  error.value = null;
  try {
    const runId = await appStore.createRun(activeProject.value.id);
    await appStore.finishRun(runId, payload.artifactId);
    run.value = await appStore.getLatestRun(activeProject.value.id);
  } catch (err) {
    error.value = toError(err);
  } finally {
    isSaving.value = false;
  }
}

async function handleTranscribed(payload: { transcriptId: string }) {
  if (!activeProject.value || !run.value) {
    error.value = t("boss_run.run_missing");
    return;
  }
  error.value = null;
  try {
    await appStore.setRunTranscript(run.value.id, payload.transcriptId);
    run.value = await appStore.getLatestRun(activeProject.value.id);
  } catch (err) {
    error.value = toError(err);
  }
}

async function requestFeedback() {
  if (!run.value) {
    error.value = t("boss_run.run_missing");
    return;
  }
  isAnalyzing.value = true;
  error.value = null;
  try {
    const feedbackId = await appStore.analyzeRun(run.value.id);
    await router.push(`/feedback?focus=${feedbackId}&source=boss-run`);
  } catch (err) {
    error.value = toError(err);
  } finally {
    isAnalyzing.value = false;
  }
}

onMounted(async () => {
  await appStore.bootstrap();
  await loadLatest();
});

watch(
  () => activeProject.value?.id,
  async () => {
    await loadLatest();
  }
);

watch(
  () => requestedRunId.value,
  () => {
    loadLatest();
  }
);
</script>

<template>
  <section class="space-y-6">
    <div class="app-panel app-panel-compact">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("boss_run.title") }}
      </div>
      <div class="app-text mt-2 text-sm">{{ t("boss_run.subtitle") }}</div>
      <div v-if="talkLabel" class="app-muted mt-2 text-xs">{{ talkLabel }}</div>
      <div v-else class="app-muted mt-2 text-xs">{{ t("boss_run.no_talk") }}</div>
    </div>

    <div v-if="!activeProfileId" class="app-panel app-panel-compact">
      <p class="app-muted text-sm">{{ t("boss_run.need_profile") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/profiles">
        {{ t("boss_run.setup_profile") }}
      </RouterLink>
    </div>

    <div v-else-if="!activeProject" class="app-panel app-panel-compact">
      <p class="app-muted text-sm">{{ t("boss_run.need_talk") }}</p>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/project/new">
        {{ t("boss_run.setup_talk") }}
      </RouterLink>
    </div>

    <div v-else class="space-y-4">
      <AudioRecorder
        title-key="boss_run.audio_title"
        subtitle-key="boss_run.audio_subtitle"
        :show-pass-label="false"
        @saved="handleAudioSaved"
        @transcribed="handleTranscribed"
      />

      <div class="flex flex-wrap items-center gap-3">
        <button
          class="app-button-info cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          :disabled="!run?.transcript_id || isAnalyzing || isSaving"
          @click="requestFeedback"
        >
          {{ t("boss_run.request_feedback") }}
        </button>
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

      <div class="app-panel app-panel-compact">
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
      </div>
    </div>
  </section>
</template>
