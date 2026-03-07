<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import type { FeedbackNoteStatus } from "@/features/feedback/composables/useFeedbackPageState";

const props = defineProps<{
  note: string;
  status: FeedbackNoteStatus;
}>();

const emit = defineEmits<{
  (event: "update:note", value: string): void;
  (event: "save"): void;
}>();

const { t } = useI18n();
</script>

<template>
  <UCard class="app-panel app-panel-compact" variant="outline">
    <div class="app-subtle text-xs uppercase tracking-[0.2em]">
      {{ t("feedback.notes_title") }}
    </div>
    <UTextarea
      :model-value="props.note"
      rows="4"
      class="mt-2 w-full"
      :placeholder="t('feedback.notes_placeholder')"
      @update:model-value="emit('update:note', String($event ?? ''))"
      @blur="emit('save')"
    />
    <div v-if="props.status === 'saving'" class="app-muted mt-2 text-xs">
      {{ t("feedback.notes_saving") }}
    </div>
    <div v-else-if="props.status === 'saved'" class="app-subtle mt-2 text-xs">
      {{ t("feedback.notes_saved") }}
    </div>
    <div v-else-if="props.status === 'error'" class="app-danger-text mt-2 text-xs">
      {{ t("feedback.notes_error") }}
    </div>
  </UCard>
</template>
