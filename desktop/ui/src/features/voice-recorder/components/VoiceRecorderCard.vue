<script setup lang="ts">
import { computed } from "vue";
import RecorderWaveform from "@/components/recorder/RecorderWaveform.vue";
import {
  formatDuration,
  levelPercent,
} from "@/components/recorder/composables/runtime/audioRecorderCaptureUtils";
import { useI18n } from "@/lib/i18n";
import type { VoiceRecorderStatus } from "@/features/voice-recorder/composables/useVoiceRecorder";

const props = defineProps<{
  status: VoiceRecorderStatus;
  durationMs: number;
  level: number;
  waveformPeaks: number[];
  qualityHintKey: string;
  error: string | null;
}>();

const emit = defineEmits<{
  (event: "start"): void;
  (event: "pause"): void;
  (event: "resume"): void;
  (event: "stop"): void;
}>();

const { t } = useI18n();

const durationLabel = computed(() => formatDuration(props.durationMs / 1000));
const levelWidth = computed(() => `${levelPercent(props.level)}%`);

const statusBadgeLabel = computed(() => {
  if (props.status === "recording") return t("voice_recorder.status_rec");
  if (props.status === "paused") return t("voice_recorder.status_paused");
  return t("voice_recorder.status_ready");
});

const statusBadgeColor = computed(() => {
  if (props.status === "recording") return "error" as const;
  if (props.status === "paused") return "warning" as const;
  return "success" as const;
});

const qualityBadgeLabel = computed(() => {
  if (props.qualityHintKey === "too_loud") return t("audio.quality_too_loud");
  if (props.qualityHintKey === "too_quiet") return t("audio.quality_too_quiet");
  if (props.qualityHintKey === "noisy_room") return t("audio.quality_noisy_room");
  if (props.qualityHintKey === "no_signal") return t("audio.quality_no_signal");
  return t("audio.quality_good_level");
});

const qualityBadgeColor = computed(() => {
  if (props.qualityHintKey === "too_loud") return "error" as const;
  if (
    props.qualityHintKey === "too_quiet" ||
    props.qualityHintKey === "noisy_room" ||
    props.qualityHintKey === "no_signal"
  )
    return "warning" as const;
  return "success" as const;
});

const isIdle = computed(() => props.status === "idle");
const isRecording = computed(() => props.status === "recording");
const isPaused = computed(() => props.status === "paused");
</script>

<template>
  <UCard variant="outline" class="app-panel">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="app-text text-sm font-semibold uppercase tracking-wider">
          {{ t("voice_recorder.title") }}
        </span>
        <UBadge :color="statusBadgeColor" variant="subtle" size="sm">
          {{ statusBadgeLabel }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <div class="text-center">
        <span class="app-text tabular-nums text-3xl font-bold tracking-tight">
          {{ durationLabel }}
        </span>
      </div>

      <RecorderWaveform :peaks="waveformPeaks" :min-bars="48" />

      <div class="app-meter-bg h-2 w-full overflow-hidden rounded-full">
        <div
          class="h-full rounded-full bg-[var(--app-info)] transition-[width] duration-150 ease-out"
          :style="{ width: levelWidth }"
        />
      </div>

      <div v-if="!isIdle" class="flex justify-center">
        <UBadge :color="qualityBadgeColor" variant="subtle" size="sm">
          {{ qualityBadgeLabel }}
        </UBadge>
      </div>

      <div v-if="error" class="text-center text-sm text-red-500">
        {{ error }}
      </div>

      <div class="flex items-center justify-center gap-3">
        <UButton
          v-if="isIdle"
          color="primary"
          size="lg"
          @click="emit('start')"
        >
          {{ t("audio.start") }}
        </UButton>

        <UButton
          v-if="isRecording"
          color="primary"
          size="lg"
          @click="emit('pause')"
        >
          {{ t("audio.pause") }}
        </UButton>

        <UButton
          v-if="isPaused"
          color="primary"
          size="lg"
          @click="emit('resume')"
        >
          {{ t("audio.resume") }}
        </UButton>

        <UButton
          v-if="!isIdle"
          color="error"
          variant="soft"
          size="lg"
          @click="emit('stop')"
        >
          {{ t("audio.stop") }}
        </UButton>
      </div>
    </div>
  </UCard>
</template>
