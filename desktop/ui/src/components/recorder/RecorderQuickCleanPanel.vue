<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "../../lib/i18n";
import { formatTrimClock, normalizeTrimWindow } from "../../lib/recorderTrim";

const props = defineProps<{
  transcriptText: string;
  sourceDurationSec: number | null;
  hasTranscript: boolean;
  isTranscribing: boolean;
  transcribeProgress: number;
  transcribeStageLabel: string | null;
  canTranscribe: boolean;
  transcribeBlockedMessage: string | null;
  isSavingEdited: boolean;
  canOpenOriginal: boolean;
  isRevealing: boolean;
}>();

const emit = defineEmits<{
  (event: "update:transcriptText", value: string): void;
  (event: "transcribe"): void;
  (event: "saveEdited"): void;
  (event: "autoCleanFillers"): void;
  (event: "fixPunctuation"): void;
  (event: "openOriginal"): void;
  (event: "continue"): void;
}>();

const { t } = useI18n();
const trimStartSec = ref(0);
const trimEndSec = ref(0);
const trimDurationSec = computed(() => Math.max(0, trimEndSec.value - trimStartSec.value));
const hasTrimSourceDuration = computed(
  () => typeof props.sourceDurationSec === "number" && props.sourceDurationSec > 0
);
const trimMaxSec = computed(() => (hasTrimSourceDuration.value ? props.sourceDurationSec ?? 0 : 0));

function applyTrimWindow(startSec: number, endSec: number) {
  const normalized = normalizeTrimWindow(trimMaxSec.value, startSec, endSec);
  if (trimStartSec.value !== normalized.startSec) {
    trimStartSec.value = normalized.startSec;
  }
  if (trimEndSec.value !== normalized.endSec) {
    trimEndSec.value = normalized.endSec;
  }
}

function onTrimStartInput(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (!target) {
    return;
  }
  applyTrimWindow(Number(target.value), trimEndSec.value);
}

function onTrimEndInput(event: Event) {
  const target = event.target as HTMLInputElement | null;
  if (!target) {
    return;
  }
  applyTrimWindow(trimStartSec.value, Number(target.value));
}

function resetTrimWindow() {
  applyTrimWindow(0, trimMaxSec.value);
}

watch(
  () => props.sourceDurationSec,
  (nextDuration) => {
    if (typeof nextDuration !== "number" || nextDuration <= 0) {
      trimStartSec.value = 0;
      trimEndSec.value = 0;
      return;
    }
    applyTrimWindow(0, nextDuration);
  },
  { immediate: true }
);
</script>

<template>
  <div class="space-y-4">
    <div v-if="props.isTranscribing || (!props.hasTranscript && props.transcribeProgress > 0)" class="app-muted app-text-meta">
      {{ props.transcribeProgress }}%
      <span v-if="props.transcribeStageLabel">({{ props.transcribeStageLabel }})</span>
    </div>

    <div v-if="!props.hasTranscript" class="space-y-3">
      <p class="app-muted app-text-body">{{ t("audio.quick_clean_not_ready") }}</p>
      <p v-if="props.transcribeBlockedMessage" class="app-danger-text app-text-meta">
        {{ props.transcribeBlockedMessage }}
      </p>
      <button
        class="app-button-info app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!props.canTranscribe"
        @click="emit('transcribe')"
      >
        {{ t("audio.quick_clean_transcribe_now") }}
      </button>
    </div>

    <div v-else class="space-y-3">
      <section class="app-panel app-panel-compact space-y-3">
        <div class="flex items-center justify-between gap-2">
          <h3 class="app-text font-semibold">{{ t("audio.quick_clean_trim_title") }}</h3>
          <button
            class="app-button-secondary app-focus-ring inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="!hasTrimSourceDuration"
            @click="resetTrimWindow"
          >
            {{ t("audio.quick_clean_trim_reset") }}
          </button>
        </div>
        <p class="app-muted app-text-meta">{{ t("audio.quick_clean_trim_hint") }}</p>
        <p v-if="!hasTrimSourceDuration" class="app-muted app-text-meta">
          {{ t("audio.quick_clean_trim_unavailable") }}
        </p>
        <div v-else class="space-y-3">
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="app-subtle">{{ t("audio.quick_clean_trim_start") }}</span>
              <span class="app-text">{{ formatTrimClock(trimStartSec) }}</span>
            </div>
            <input
              class="w-full"
              type="range"
              min="0"
              :max="trimMaxSec"
              step="0.1"
              :value="trimStartSec"
              @input="onTrimStartInput"
            />
          </div>
          <div class="space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="app-subtle">{{ t("audio.quick_clean_trim_end") }}</span>
              <span class="app-text">{{ formatTrimClock(trimEndSec) }}</span>
            </div>
            <input
              class="w-full"
              type="range"
              min="0"
              :max="trimMaxSec"
              step="0.1"
              :value="trimEndSec"
              @input="onTrimEndInput"
            />
          </div>
          <div class="app-muted app-text-meta">
            {{ t("audio.quick_clean_trim_duration") }}: {{ formatTrimClock(trimDurationSec) }}
          </div>
        </div>
      </section>

      <textarea
        :value="props.transcriptText"
        rows="10"
        class="app-input app-focus-ring app-radius-control w-full border px-3 py-2 app-text-body"
        :placeholder="t('audio.quick_clean_placeholder')"
        @input="emit('update:transcriptText', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="app-button-primary app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          :disabled="props.isSavingEdited || !props.transcriptText.trim()"
          @click="emit('saveEdited')"
        >
          {{ t("audio.quick_clean_save_edited") }}
        </button>
        <button
          class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          :disabled="props.isSavingEdited || !props.transcriptText.trim()"
          @click="emit('autoCleanFillers')"
        >
          {{ t("audio.quick_clean_auto_clean") }}
        </button>
        <button
          class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          :disabled="props.isSavingEdited || !props.transcriptText.trim()"
          @click="emit('fixPunctuation')"
        >
          {{ t("audio.quick_clean_fix_punctuation") }}
        </button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        class="app-button-secondary app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!props.canOpenOriginal || props.isRevealing"
        @click="emit('openOriginal')"
      >
        {{ t("audio.quick_clean_open_original") }}
      </button>
      <button
        class="app-button-info app-focus-ring app-button-lg inline-flex items-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        :disabled="!props.hasTranscript"
        @click="emit('continue')"
      >
        {{ t("audio.quick_clean_continue") }}
      </button>
    </div>
  </div>
</template>
