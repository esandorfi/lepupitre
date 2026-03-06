<script setup lang="ts">
import { formatTrimClock } from "@/lib/recorderTrim";
import { useI18n } from "@/lib/i18n";

const props = defineProps<{
  canOpenOriginal: boolean;
  isRevealing: boolean;
  hasTranscript: boolean;
  isApplyingTrim: boolean;
  hasTrimSourceDuration: boolean;
  trimMaxSec: number;
  trimStartSec: number;
  trimEndSec: number;
  trimDurationSec: number;
  trimDirty: boolean;
  canApplyTrim: boolean;
}>();

const emit = defineEmits<{
  (event: "openOriginal"): void;
  (event: "continue"): void;
  (event: "resetTrimWindow"): void;
  (event: "updateTrimStart", value: number): void;
  (event: "updateTrimEnd", value: number): void;
  (event: "applyTrim"): void;
}>();

const { t } = useI18n();

function normalizeSliderValue(value: number | number[] | undefined): number {
  if (Array.isArray(value)) {
    return value[0] ?? 0;
  }
  return typeof value === "number" ? value : 0;
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UButton
      size="lg"
      :disabled="!props.canOpenOriginal || props.isRevealing"
      color="neutral"
      variant="outline"
      @click="emit('openOriginal')"
    >
      {{ t("audio.quick_clean_open_original") }}
    </UButton>
    <UButton
      size="lg"
      :disabled="!props.hasTranscript || props.isApplyingTrim"
      color="neutral"
      variant="outline"
      @click="emit('continue')"
    >
      {{ t("audio.quick_clean_continue") }}
    </UButton>
  </div>

  <details class="app-radius-panel-md space-y-3 border bg-[var(--color-surface-elevated)] p-4">
    <summary class="cursor-pointer app-text font-semibold">
      <span class="collapse-chevron mr-1" aria-hidden="true">></span>
      {{ t("audio.quick_clean_trim_advanced_title") }}
    </summary>
    <p class="app-muted app-text-meta">{{ t("audio.quick_clean_trim_hint") }}</p>
    <p v-if="!props.hasTrimSourceDuration" class="app-muted app-text-meta">
      {{ t("audio.quick_clean_trim_unavailable") }}
    </p>
    <div v-else class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <span class="app-text font-medium">{{ t("audio.quick_clean_trim_title") }}</span>
        <UButton
          size="sm"
          :disabled="!props.hasTrimSourceDuration || props.isApplyingTrim"
          color="neutral"
          variant="outline"
          @click="emit('resetTrimWindow')"
        >
          {{ t("audio.quick_clean_trim_reset") }}
        </UButton>
      </div>
      <div class="space-y-1">
        <div class="flex items-center justify-between text-xs">
          <span class="app-subtle">{{ t("audio.quick_clean_trim_start") }}</span>
          <span class="app-text">{{ formatTrimClock(props.trimStartSec) }}</span>
        </div>
        <USlider
          min="0"
          :max="props.trimMaxSec"
          step="0.1"
          :model-value="props.trimStartSec"
          @update:model-value="emit('updateTrimStart', normalizeSliderValue($event))"
        />
      </div>
      <div class="space-y-1">
        <div class="flex items-center justify-between text-xs">
          <span class="app-subtle">{{ t("audio.quick_clean_trim_end") }}</span>
          <span class="app-text">{{ formatTrimClock(props.trimEndSec) }}</span>
        </div>
        <USlider
          min="0"
          :max="props.trimMaxSec"
          step="0.1"
          :model-value="props.trimEndSec"
          @update:model-value="emit('updateTrimEnd', normalizeSliderValue($event))"
        />
      </div>
      <div class="app-muted app-text-meta">
        {{ t("audio.quick_clean_trim_duration") }}: {{ formatTrimClock(props.trimDurationSec) }}
      </div>
      <UButton
        size="lg"
        :disabled="!props.canApplyTrim || !props.trimDirty || props.isApplyingTrim"
        color="neutral"
        variant="outline"
        @click="emit('applyTrim')"
      >
        {{ props.isApplyingTrim ? t("audio.quick_clean_trim_applying") : t("audio.quick_clean_trim_apply") }}
      </UButton>
    </div>
  </details>
</template>

<style scoped>
summary {
  list-style: none;
}

summary::-webkit-details-marker {
  display: none;
}

.collapse-chevron {
  display: inline-block;
  transition: transform 120ms ease-out;
}

details[open] > summary .collapse-chevron {
  transform: rotate(90deg);
}
</style>
