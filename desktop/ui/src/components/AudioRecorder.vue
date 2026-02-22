<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import { invokeChecked } from "../composables/useIpc";
import {
  AsrCommitEventSchema,
  AsrPartialEventSchema,
  RecordingStartPayloadSchema,
  RecordingStartResponseSchema,
  RecordingStatusPayloadSchema,
  RecordingStatusResponseSchema,
  RecordingStopPayloadSchema,
  RecordingStopResponseSchema,
  TranscriptGetPayloadSchema,
  TranscriptSegment,
  TranscriptV1,
  TranscriptV1Schema,
  TranscribeAudioPayloadSchema,
  TranscribeResponseSchema,
} from "../schemas/ipc";

type AudioStatusKey =
  | "audio.status_idle"
  | "audio.status_requesting"
  | "audio.status_recording"
  | "audio.status_encoding";

const props = withDefaults(
  defineProps<{
    titleKey?: string;
    subtitleKey?: string;
    passLabelKey?: string;
    showPassLabel?: boolean;
  }>(),
  {
    titleKey: "audio.title",
    subtitleKey: "audio.subtitle",
    passLabelKey: "audio.pass_label",
    showPassLabel: true,
  }
);
const { t } = useI18n();
const emit = defineEmits<{
  (event: "saved", payload: { artifactId: string; path: string }): void;
  (event: "transcribed", payload: { transcriptId: string }): void;
}>();
const activeProfileId = computed(() => appStore.state.activeProfileId);
const isRecording = ref(false);
const statusKey = ref<AudioStatusKey>("audio.status_idle");
const error = ref<string | null>(null);
const lastSavedPath = ref<string | null>(null);
const lastArtifactId = ref<string | null>(null);
const lastDurationSec = ref<number | null>(null);
const liveDurationSec = ref<number>(0);
const liveLevel = ref<number>(0);
const isRevealing = ref(false);
const isTranscribing = ref(false);
const transcribeProgress = ref<number>(0);
const transcribeStage = ref<string | null>(null);
const transcribeJobId = ref<string | null>(null);
const transcript = ref<TranscriptV1 | null>(null);
const recordingId = ref<string | null>(null);
const liveSegments = ref<TranscriptSegment[]>([]);
const livePartial = ref<string | null>(null);
const livePartialWindow = ref<{ t0_ms: number; t1_ms: number } | null>(null);

let statusTimer: number | null = null;
let unlistenProgress: (() => void) | null = null;
let unlistenCompleted: (() => void) | null = null;
let unlistenFailed: (() => void) | null = null;
let unlistenAsrPartial: (() => void) | null = null;
let unlistenAsrCommit: (() => void) | null = null;

type JobProgressEvent = {
  jobId: string;
  stage: string;
  pct: number;
  message?: string;
};

type JobCompletedEvent = {
  jobId: string;
  resultId: string;
};

type JobFailedEvent = {
  jobId: string;
  errorCode: string;
  message: string;
};

function resetTranscription() {
  isTranscribing.value = false;
  transcribeProgress.value = 0;
  transcribeStage.value = null;
  transcribeJobId.value = null;
  transcript.value = null;
}

function resetLiveTranscript() {
  liveSegments.value = [];
  livePartial.value = null;
  livePartialWindow.value = null;
}

function clearStatusTimer() {
  if (statusTimer) {
    window.clearInterval(statusTimer);
    statusTimer = null;
  }
}

async function refreshStatus() {
  if (!recordingId.value) {
    return;
  }
  try {
    const status = await invokeChecked(
      "recording_status",
      RecordingStatusPayloadSchema,
      RecordingStatusResponseSchema,
      { recordingId: recordingId.value }
    );
    liveDurationSec.value = status.durationMs / 1000;
    liveLevel.value = status.level;
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
}

async function startRecording() {
  error.value = null;
  if (!activeProfileId.value) {
    error.value = t("audio.profile_required");
    return;
  }
  lastSavedPath.value = null;
  lastArtifactId.value = null;
  lastDurationSec.value = null;
  liveDurationSec.value = 0;
  liveLevel.value = 0;
  statusKey.value = "audio.status_requesting";
  resetTranscription();
  resetLiveTranscript();

  try {
    const result = await invokeChecked(
      "recording_start",
      RecordingStartPayloadSchema,
      RecordingStartResponseSchema,
      { profileId: activeProfileId.value }
    );
    recordingId.value = result.recordingId;
    isRecording.value = true;
    statusKey.value = "audio.status_recording";
    clearStatusTimer();
    statusTimer = window.setInterval(refreshStatus, 200);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
    statusKey.value = "audio.status_idle";
  }
}

async function stopRecording() {
  if (!recordingId.value || !activeProfileId.value) {
    return;
  }
  isRecording.value = false;
  statusKey.value = "audio.status_encoding";
  clearStatusTimer();

  try {
    const result = await invokeChecked(
      "recording_stop",
      RecordingStopPayloadSchema,
      RecordingStopResponseSchema,
      { profileId: activeProfileId.value, recordingId: recordingId.value }
    );
    lastSavedPath.value = result.path;
    lastArtifactId.value = result.artifactId;
    lastDurationSec.value = result.durationMs / 1000;
    emit("saved", { artifactId: result.artifactId, path: result.path });
    liveLevel.value = 0;
    statusKey.value = "audio.status_idle";
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
    statusKey.value = "audio.status_idle";
  } finally {
    recordingId.value = null;
  }
}

async function transcribeRecording() {
  error.value = null;
  if (!activeProfileId.value || !lastArtifactId.value) {
    return;
  }
  isTranscribing.value = true;
  transcript.value = null;
  transcribeProgress.value = 0;
  transcribeStage.value = null;

  try {
    const response = await invokeChecked(
      "transcribe_audio",
      TranscribeAudioPayloadSchema,
      TranscribeResponseSchema,
      {
        profileId: activeProfileId.value,
        audioArtifactId: lastArtifactId.value,
      }
    );
    transcribeJobId.value = response.jobId ?? transcribeJobId.value;
    const loaded = await invokeChecked(
      "transcript_get",
      TranscriptGetPayloadSchema,
      TranscriptV1Schema,
      {
        profileId: activeProfileId.value,
        transcriptId: response.transcriptId,
      }
    );
    transcript.value = loaded;
    emit("transcribed", { transcriptId: response.transcriptId });
    transcribeProgress.value = 100;
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    isTranscribing.value = false;
  }
}

function formatDuration(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatTimestamp(ms: number | null | undefined) {
  if (ms === null || ms === undefined) {
    return "0:00";
  }
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function levelPercent(value: number) {
  return Math.max(0, Math.min(1, value)) * 100;
}

onMounted(async () => {
  unlistenProgress = await listen<JobProgressEvent>("job:progress", (event) => {
    if (transcribeJobId.value && event.payload.jobId !== transcribeJobId.value) {
      return;
    }
    if (!transcribeJobId.value) {
      transcribeJobId.value = event.payload.jobId;
    }
    transcribeProgress.value = event.payload.pct;
    transcribeStage.value = event.payload.stage;
  });

  unlistenCompleted = await listen<JobCompletedEvent>("job:completed", (event) => {
    if (transcribeJobId.value && event.payload.jobId !== transcribeJobId.value) {
      return;
    }
    transcribeProgress.value = 100;
  });

  unlistenFailed = await listen<JobFailedEvent>("job:failed", (event) => {
    if (transcribeJobId.value && event.payload.jobId !== transcribeJobId.value) {
      return;
    }
    error.value = event.payload.message;
  });

  unlistenAsrPartial = await listen("asr.partial.v1", (event) => {
    if (!isRecording.value) {
      return;
    }
    const parsed = AsrPartialEventSchema.safeParse(event.payload);
    if (!parsed.success) {
      return;
    }
    livePartial.value = parsed.data.text;
    livePartialWindow.value = { t0_ms: parsed.data.t0_ms, t1_ms: parsed.data.t1_ms };
  });

  unlistenAsrCommit = await listen("asr.commit.v1", (event) => {
    const parsed = AsrCommitEventSchema.safeParse(event.payload);
    if (!parsed.success) {
      return;
    }
    liveSegments.value = [...liveSegments.value, ...parsed.data.segments];
    livePartial.value = null;
    livePartialWindow.value = null;
  });
});

onBeforeUnmount(() => {
  clearStatusTimer();
  unlistenProgress?.();
  unlistenCompleted?.();
  unlistenFailed?.();
  unlistenAsrPartial?.();
  unlistenAsrCommit?.();
});

async function revealRecording() {
  if (!lastSavedPath.value) {
    return;
  }
  isRevealing.value = true;
  error.value = null;
  try {
    await invoke("audio_reveal_wav", { path: lastSavedPath.value });
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    isRevealing.value = false;
  }
}
</script>


<template>
  <div class="app-surface space-y-3 rounded-2xl border p-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold">{{ t(props.titleKey) }}</h2>
        <p class="app-muted text-sm">{{ t(props.subtitleKey) }}</p>
      </div>
      <div v-if="props.showPassLabel" class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t(props.passLabelKey) }}
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        class="app-button-success cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="isRecording"
        @click="startRecording"
      >
        {{ t("audio.start") }}
      </button>
      <button
        class="app-button-danger cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!isRecording"
        @click="stopRecording"
      >
        {{ t("audio.stop") }}
      </button>
      <button
        class="app-button-info cursor-pointer rounded-full px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!lastArtifactId || isTranscribing"
        @click="transcribeRecording"
      >
        {{ t("audio.transcribe") }}
      </button>
      <button
        class="app-button-primary cursor-pointer rounded-full px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!lastSavedPath || isRevealing"
        @click="revealRecording"
      >
        {{ t("audio.reveal") }}
      </button>
    </div>

    <div class="app-text text-sm">
      {{ t("audio.status") }}: {{ t(statusKey) }}
    </div>
    <div class="app-muted space-y-1 text-xs">
      <div class="app-meter-bg h-2 w-full rounded-full">
        <div
          class="h-2 rounded-full bg-[var(--app-info)] transition-all"
          :style="{ width: `${levelPercent(liveLevel)}%` }"
        ></div>
      </div>
    </div>
    <div class="app-muted text-xs">
      {{ t("audio.duration") }}:
      {{ formatDuration(isRecording ? liveDurationSec : lastDurationSec) ?? "0:00" }}
    </div>
    <div v-if="lastSavedPath" class="flex flex-wrap items-center gap-2 text-xs">
      <span class="app-link">{{ t("audio.saved_to") }}:</span>
      <span
        class="app-text max-w-[360px] truncate"
        style="direction: rtl; text-align: left;"
      >
        {{ lastSavedPath }}
      </span>
    </div>
    <div v-if="isTranscribing || transcribeProgress > 0" class="app-muted text-xs">
      {{ t("audio.transcription") }}:
      <span class="app-text">{{ transcribeProgress }}%</span>
      <span v-if="transcribeStage" class="app-subtle">({{ transcribeStage }})</span>
    </div>
        <div v-if="liveSegments.length > 0 || livePartial" class="app-card rounded-xl border p-3 text-sm">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("audio.live_transcript") }}
      </div>
      <div class="mt-2 space-y-2">
        <div v-for="(segment, index) in liveSegments" :key="`live-${index}`">
          <span class="app-subtle text-xs">
            {{ formatTimestamp(segment.t_start_ms) }}–{{ formatTimestamp(segment.t_end_ms) }}
          </span>
          <div class="app-text">{{ segment.text }}</div>
        </div>
        <div v-if="livePartial" class="app-muted text-xs">
          <span class="app-subtle">
            {{ formatTimestamp(livePartialWindow?.t0_ms) }}–{{ formatTimestamp(livePartialWindow?.t1_ms) }}
          </span>
          <div class="app-text">{{ livePartial }}</div>
        </div>
      </div>
    </div>

<div v-if="transcript" class="app-card rounded-xl border p-3 text-sm">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("audio.transcript_title") }}
      </div>
      <div class="mt-2 space-y-2">
        <div v-for="(segment, index) in transcript.segments" :key="index">
          <span class="app-subtle text-xs">
            {{ formatTimestamp(segment.t_start_ms) }}–{{ formatTimestamp(segment.t_end_ms) }}
          </span>
          <div class="app-text">{{ segment.text }}</div>
        </div>
      </div>
    </div>
    <div v-if="error" class="app-danger-text text-xs">{{ error }}</div>
  </div>
</template>
