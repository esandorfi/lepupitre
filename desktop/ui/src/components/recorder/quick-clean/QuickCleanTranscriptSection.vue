<script setup lang="ts">
import { computed } from "vue";
import type { CleanAnchor } from "@/components/recorder/composables/quickClean/quickClean.types";
import { useI18n } from "@/lib/i18n";

const props = defineProps<{
  transcriptText: string;
  cleanTextAnchors: CleanAnchor[];
  anchorMapCopied: boolean;
  isSavingEdited: boolean;
  isApplyingTrim: boolean;
  formatTimelineClock: (totalMs: number) => string;
}>();

const emit = defineEmits<{
  (event: "update:transcriptText", value: string): void;
  (event: "seekCaretAnchor", value: Event): void;
  (event: "seek", value: number): void;
  (event: "exportAnchorMap"): void;
  (event: "saveEdited"): void;
  (event: "autoCleanFillers"): void;
  (event: "fixPunctuation"): void;
}>();

const { t } = useI18n();
const canMutateTranscript = computed(() => {
  return !props.isSavingEdited && !props.isApplyingTrim && props.transcriptText.trim().length > 0;
});

function updateTranscript(value: string | number | null | undefined) {
  emit("update:transcriptText", String(value ?? ""));
}
</script>

<template>
  <UCard as="section" class="app-panel app-panel-compact space-y-3" variant="outline">
    <h3 class="app-text font-semibold">{{ t("audio.quick_clean_clean_text_title") }}</h3>
    <UTextarea
      :model-value="props.transcriptText"
      rows="12"
      class="min-h-56 max-h-[56vh] w-full overflow-y-auto app-text-body"
      style="resize: vertical;"
      :placeholder="t('audio.quick_clean_placeholder')"
      @update:model-value="updateTranscript"
      @click="emit('seekCaretAnchor', $event)"
    />
    <details class="space-y-2">
      <summary class="cursor-pointer app-text-meta app-link">
        <span class="collapse-chevron mr-1" aria-hidden="true">></span>
        {{ t("audio.quick_clean_clean_anchors_title") }}
      </summary>
      <p class="app-muted app-text-meta">{{ t("audio.quick_clean_clean_anchors_hint") }}</p>
      <div v-if="props.cleanTextAnchors.length > 0" class="max-h-44 space-y-2 overflow-y-auto pr-1">
        <UButton
          v-for="(anchor, index) in props.cleanTextAnchors"
          :key="`${anchor.startMs}-${anchor.endMs}-${index}`"
          size="sm"
          class="w-full justify-start items-start gap-3 rounded-lg px-3 py-2 text-left"
          color="neutral"
          variant="ghost"
          @click="emit('seek', anchor.startMs)"
        >
          <span class="app-pill-active-neutral inline-flex min-w-[3.5rem] justify-center rounded-full px-2 py-1 text-xs">
            {{ props.formatTimelineClock(anchor.startMs) }}
          </span>
          <span class="app-text-body line-clamp-2">{{ anchor.line }}</span>
        </UButton>
      </div>
      <p v-else class="app-muted app-text-meta">{{ t("audio.quick_clean_timeline_empty") }}</p>
    </details>
    <div class="flex flex-wrap items-center gap-2">
      <UButton
        size="sm"
        :disabled="props.cleanTextAnchors.length === 0"
        color="neutral"
        variant="outline"
        @click="emit('exportAnchorMap')"
      >
        {{ props.anchorMapCopied ? t("audio.quick_clean_export_anchor_map_copied") : t("audio.quick_clean_export_anchor_map") }}
      </UButton>
      <span class="app-muted app-text-meta">
        {{ t("audio.quick_clean_export_anchor_map_hint") }}
      </span>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <UButton size="lg" :disabled="!canMutateTranscript" color="primary" @click="emit('saveEdited')">
        {{ t("audio.quick_clean_save_edited") }}
      </UButton>
      <UButton size="lg" :disabled="!canMutateTranscript" color="neutral" variant="outline" @click="emit('autoCleanFillers')">
        {{ t("audio.quick_clean_auto_clean") }}
      </UButton>
      <UButton size="lg" :disabled="!canMutateTranscript" color="neutral" variant="outline" @click="emit('fixPunctuation')">
        {{ t("audio.quick_clean_fix_punctuation") }}
      </UButton>
    </div>
  </UCard>
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
