<script setup lang="ts">
import { useI18n } from "@/lib/i18n";
import { talkBossRunRoute, talkQuestRoute } from "@/features/talks/composables/shared/talkRoutes";

const { t } = useI18n();

defineProps<{
  projectId: string;
  onNavigate?: () => void;
}>();
</script>

<template>
  <UCard class="app-panel">
    <div class="app-text-eyebrow">{{ t("talk_report.boss_run") }}</div>
    <p class="app-body-muted mt-2">{{ t("boss_run.subtitle") }}</p>
    <div class="mt-3 flex flex-wrap gap-2">
      <UButton
        size="lg"
        :to="talkBossRunRoute()"
        @click="onNavigate?.()"
      >
        {{ t("boss_run.title") }}
      </UButton>
      <UButton
        size="lg"
        :to="talkQuestRoute(projectId, 'FREE')"
        @click="onNavigate?.()"
      >
        {{ t("home.prototype_action_free") }}
      </UButton>
    </div>
  </UCard>
</template>
