<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import { invokeChecked } from "../composables/useIpc";
import {
  AudioSavePayloadSchema,
  AudioSaveResponseSchema,
  TranscriptGetPayloadSchema,
  TranscriptV1,
  TranscriptV1Schema,
  TranscribeAudioPayloadSchema,
  TranscribeResponseSchema,
} from "../schemas/ipc";

const TARGET_SAMPLE_RATE = 16000;
type AudioStatusKey =
  | "audio.status_idle"
  | "audio.status_requesting"
  | "audio.status_recording"
  | "audio.status_encoding";

const { t } = useI18n();
const activeProfileId = computed(() => appStore.state.activeProfileId);
const isRecording = ref(false);
const statusKey = ref<AudioStatusKey>("audio.status_idle");
const error = ref<string | null>(null);
const lastSavedPath = ref<string | null>(null);
const lastArtifactId = ref<string | null>(null);
const lastDurationSec = ref<number | null>(null);
const liveDurationSec = ref<number>(0);
const liveLevel = ref<number>(0);
const inputSampleRate = ref<number>(TARGET_SAMPLE_RATE);
const inputChannels = ref<number>(1);
const isRevealing = ref(false);
const isTranscribing = ref(false);
const transcribeProgress = ref<number>(0);
const transcribeStage = ref<string | null>(null);
const transcribeJobId = ref<string | null>(null);
const transcript = ref<TranscriptV1 | null>(null);

let audioContext: AudioContext | null = null;
let processor: ScriptProcessorNode | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let stream: MediaStream | null = null;
const chunks: Float32Array[] = [];
let recordedSamples = 0;
let unlistenProgress: (() => void) | null = null;
let unlistenCompleted: (() => void) | null = null;
let unlistenFailed: (() => void) | null = null;

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

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = await createAudioContext();
    inputSampleRate.value = audioContext.sampleRate;
    const settings = stream.getAudioTracks()[0]?.getSettings();
    inputChannels.value = settings?.channelCount ?? 1;
    source = audioContext.createMediaStreamSource(stream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (event) => {
      const data = event.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(data));
      recordedSamples += data.length;
      liveDurationSec.value = recordedSamples / inputSampleRate.value;
      liveLevel.value = calculateRms(data);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    isRecording.value = true;
    recordedSamples = 0;
    statusKey.value = "audio.status_recording";
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
    statusKey.value = "audio.status_idle";
  }
}

async function stopRecording() {
  if (!audioContext || !processor || !source || !stream) {
    return;
  }

  isRecording.value = false;
  statusKey.value = "audio.status_encoding";
  processor.disconnect();
  source.disconnect();
  stream.getTracks().forEach((track) => track.stop());

  const inputRate = inputSampleRate.value;
  await audioContext.close();

  const rawSamples = concatChunks(chunks);
  chunks.length = 0;

  const samples = resample(rawSamples, inputRate, TARGET_SAMPLE_RATE);
  lastDurationSec.value = samples.length / TARGET_SAMPLE_RATE;
  const wavBytes = encodeWav(samples, TARGET_SAMPLE_RATE);
  const base64 = toBase64(wavBytes);

  try {
    const result = await invokeChecked(
      "audio_save_wav",
      AudioSavePayloadSchema,
      AudioSaveResponseSchema,
      {
        profileId: activeProfileId.value,
        base64,
      }
    );
    lastSavedPath.value = result.path;
    lastArtifactId.value = result.artifactId;
    liveLevel.value = 0;
    statusKey.value = "audio.status_idle";
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
    statusKey.value = "audio.status_idle";
  }
}

async function createAudioContext(): Promise<AudioContext> {
  try {
    return new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  } catch {
    return new AudioContext();
  }
}

function concatChunks(chunksList: Float32Array[]) {
  const totalLength = chunksList.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;
  for (const chunk of chunksList) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function resample(input: Float32Array, fromRate: number, toRate: number) {
  if (fromRate === toRate) {
    return input;
  }

  const ratio = fromRate / toRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const weight = position - left;
    output[i] = input[left] * (1 - weight) + input[right] * weight;
  }

  return output;
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}

function writeString(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function calculateRms(samples: Float32Array) {
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

function levelPercent(value: number) {
  return Math.min(100, Math.round(value * 160));
}

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return null;
  }
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

async function transcribeRecording() {
  if (!activeProfileId.value || !lastArtifactId.value) {
    return;
  }
  error.value = null;
  transcript.value = null;
  isTranscribing.value = true;
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
    transcribeProgress.value = 100;
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    isTranscribing.value = false;
  }
}

function formatTimestamp(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

onMounted(async () => {
  unlistenProgress = await listen<JobProgressEvent>("job_progress", (event) => {
    if (!isTranscribing.value) {
      return;
    }
    if (transcribeJobId.value && event.payload.jobId !== transcribeJobId.value) {
      return;
    }
    if (!transcribeJobId.value) {
      transcribeJobId.value = event.payload.jobId;
    }
    transcribeProgress.value = event.payload.pct;
    transcribeStage.value = event.payload.stage;
  });
  unlistenCompleted = await listen<JobCompletedEvent>("job_completed", (event) => {
    if (transcribeJobId.value && event.payload.jobId !== transcribeJobId.value) {
      return;
    }
    transcribeProgress.value = 100;
  });
  unlistenFailed = await listen<JobFailedEvent>("job_failed", (event) => {
    if (transcribeJobId.value && event.payload.jobId !== transcribeJobId.value) {
      return;
    }
    error.value = `${event.payload.errorCode}: ${event.payload.message}`;
  });
});

onBeforeUnmount(() => {
  unlistenProgress?.();
  unlistenCompleted?.();
  unlistenFailed?.();
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
        <h2 class="text-lg font-bold">{{ t("audio.title") }}</h2>
        <p class="app-muted text-sm">{{ t("audio.subtitle") }}</p>
      </div>
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("audio.pass_label") }}
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
