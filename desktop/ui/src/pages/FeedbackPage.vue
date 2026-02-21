<script setup lang="ts">
import { computed } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";

const { t } = useI18n();
const route = useRoute();
const feedbackId = computed(() => String(route.params.feedbackId || ""));
const attemptId = computed(() => appStore.state.lastAttemptId);
</script>

<template>
  <section class="space-y-6">
    <p class="app-muted text-sm font-semibold">{{ t("feedback.subtitle") }}</p>

    <div class="app-surface rounded-2xl border p-4 text-sm">
      <div>{{ t("feedback.feedback_id") }}: {{ feedbackId }}</div>
      <div v-if="attemptId" class="app-muted text-xs">
        {{ t("feedback.last_attempt") }}: {{ attemptId }}
      </div>
      <RouterLink class="app-link mt-3 inline-block text-xs underline" to="/">
        {{ t("feedback.back_home") }}
      </RouterLink>
    </div>
  </section>
</template>
