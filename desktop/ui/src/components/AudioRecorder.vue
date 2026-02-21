<script setup lang="ts">
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";

const TARGET_SAMPLE_RATE = 16000;

const isRecording = ref(false);
const status = ref("Idle");
const error = ref<string | null>(null);
const lastSavedPath = ref<string | null>(null);
const lastDurationSec = ref<number | null>(null);
const liveDurationSec = ref<number>(0);
const liveLevel = ref<number>(0);
const inputSampleRate = ref<number>(TARGET_SAMPLE_RATE);
const inputChannels = ref<number>(1);
const isRevealing = ref(false);

let audioContext: AudioContext | null = null;
let processor: ScriptProcessorNode | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let stream: MediaStream | null = null;
const chunks: Float32Array[] = [];
let recordedSamples = 0;


async function startRecording() {
  error.value = null;
  lastSavedPath.value = null;
  lastDurationSec.value = null;
  liveDurationSec.value = 0;
  liveLevel.value = 0;
  status.value = "Requesting microphone";

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
    status.value = "Recording";
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
    status.value = "Idle";
  }
}

async function stopRecording() {
  if (!audioContext || !processor || !source || !stream) {
    return;
  }

  isRecording.value = false;
  status.value = "Encoding";
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
    const path = await invoke<string>("audio_save_wav", { base64 });
    lastSavedPath.value = path;
    liveLevel.value = 0;
    status.value = "Idle";
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
    status.value = "Idle";
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
  <div class="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold">Audio spike</h2>
        <p class="text-sm text-slate-400">Record a WAV 16kHz mono file locally.</p>
      </div>
      <div class="text-xs uppercase tracking-[0.2em] text-slate-500">
        Pass 0
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        class="cursor-pointer rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700"
        type="button"
        :disabled="isRecording"
        @click="startRecording"
      >
        Start recording
      </button>
      <button
        class="cursor-pointer rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-rose-950 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:bg-slate-700"
        type="button"
        :disabled="!isRecording"
        @click="stopRecording"
      >
        Stop + Save
      </button>
      <button
        class="cursor-pointer rounded-full bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        type="button"
        :disabled="!lastSavedPath || isRevealing"
        @click="revealRecording"
      >
        Reveal file
      </button>
    </div>

    <div class="text-sm text-slate-300">Status: {{ status }}</div>
    <div class="space-y-1 text-xs text-slate-400">
      <div class="h-2 w-full rounded-full bg-slate-800">
        <div
          class="h-2 rounded-full bg-emerald-400 transition-all"
          :style="{ width: `${levelPercent(liveLevel)}%` }"
        ></div>
      </div>
    </div>
    <div class="text-xs text-slate-400">
      Duration:
      {{ formatDuration(isRecording ? liveDurationSec : lastDurationSec) ?? "0:00" }}
    </div>
    <div v-if="lastSavedPath" class="flex flex-wrap items-center gap-2 text-xs">
      <span class="text-emerald-300">Saved to:</span>
      <span
        class="max-w-[360px] truncate text-emerald-200"
        style="direction: rtl; text-align: left;"
      >
        {{ lastSavedPath }}
      </span>
    </div>
    <div v-if="error" class="text-xs text-rose-300">{{ error }}</div>
  </div>
</template>
