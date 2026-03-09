import { computed, ref, watch } from "vue";
import { normalizeTrimWindow } from "@/lib/recorderTrim";
import type {
  RecorderQuickCleanPanelEmit,
  RecorderQuickCleanPanelProps,
} from "@/components/recorder/composables/quickClean/quickClean.types";

/**
 * Creates and returns the create trim state contract.
 */
export function createTrimState(props: RecorderQuickCleanPanelProps, emit: RecorderQuickCleanPanelEmit) {
  const trimStartSec = ref(0);
  const trimEndSec = ref(0);

  const trimDurationSec = computed(() => Math.max(0, trimEndSec.value - trimStartSec.value));
  const hasTrimSourceDuration = computed(
    () => typeof props.sourceDurationSec === "number" && props.sourceDurationSec > 0
  );
  const trimMaxSec = computed(() => (hasTrimSourceDuration.value ? props.sourceDurationSec ?? 0 : 0));
  const trimDirty = computed(
    () =>
      hasTrimSourceDuration.value &&
      (trimStartSec.value > 0.001 || Math.abs(trimEndSec.value - trimMaxSec.value) > 0.001)
  );

  function applyTrimWindow(startSec: number, endSec: number) {
    const normalized = normalizeTrimWindow(trimMaxSec.value, startSec, endSec);
    if (trimStartSec.value !== normalized.startSec) {
      trimStartSec.value = normalized.startSec;
    }
    if (trimEndSec.value !== normalized.endSec) {
      trimEndSec.value = normalized.endSec;
    }
  }

  function onTrimStartInput(value: number) {
    if (Number.isNaN(value)) {
      return;
    }
    applyTrimWindow(value, trimEndSec.value);
  }

  function onTrimEndInput(value: number) {
    if (Number.isNaN(value)) {
      return;
    }
    applyTrimWindow(trimStartSec.value, value);
  }

  function resetTrimWindow() {
    applyTrimWindow(0, trimMaxSec.value);
  }

  function applyTrim() {
    if (!trimDirty.value || props.isApplyingTrim) {
      return;
    }
    const startMs = Math.round(trimStartSec.value * 1000);
    const endMs = Math.round(trimEndSec.value * 1000);
    if (endMs <= startMs) {
      return;
    }
    emit("applyTrim", { startMs, endMs });
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

  return {
    trimStartSec,
    trimEndSec,
    trimDurationSec,
    hasTrimSourceDuration,
    trimMaxSec,
    trimDirty,
    applyTrim,
    onTrimStartInput,
    onTrimEndInput,
    resetTrimWindow,
  };
}
