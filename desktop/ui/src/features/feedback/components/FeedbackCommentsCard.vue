<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import type { FeedbackV1 } from "@/schemas/ipc";

defineProps<{
  comments: FeedbackV1["comments"];
}>();

const { t } = useI18n();
</script>

<template>
  <UCard v-if="comments.length > 0" class="app-panel app-panel-compact" variant="outline">
    <div class="app-subtle text-xs uppercase tracking-[0.2em]">
      {{ t("feedback.comments") }}
    </div>
    <div class="mt-2 space-y-2 text-xs">
      <div v-for="(comment, index) in comments" :key="index">
        <div class="app-text font-semibold">{{ comment.label }}</div>
        <div class="app-muted">{{ comment.suggestion }}</div>
      </div>
    </div>
  </UCard>
</template>
