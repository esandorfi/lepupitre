<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "@/lib/i18n";
import type { FeedbackQuestLink } from "@/features/feedback/composables/useFeedbackPageState";

defineProps<{
  links: FeedbackQuestLink[];
}>();

const { t } = useI18n();
</script>

<template>
  <UCard v-if="links.length > 0" class="app-panel app-panel-compact" variant="outline">
    <div class="app-subtle text-xs uppercase tracking-[0.2em]">
      {{ t("feedback.practice_next_title") }}
    </div>
    <div class="app-muted mt-1 text-xs">
      {{ t("feedback.practice_next_subtitle") }}
    </div>
    <div class="mt-2 flex flex-wrap gap-2">
      <UButton
        v-for="item in links"
        :key="item.code"
        size="sm"
        :to="item.to"
        color="neutral"
        variant="outline"
      >
        {{ item.label }}
      </UButton>
      <RouterLink class="app-link app-text-meta inline-flex items-center underline" to="/training">
        {{ t("feedback.practice_next_training") }}
      </RouterLink>
    </div>
  </UCard>
</template>
