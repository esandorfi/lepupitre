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
    <div class="space-y-2">
      <h1 class="text-2xl font-semibold">{{ t("feedback.title") }}</h1>
      <p class="text-sm text-slate-400">{{ t("feedback.subtitle") }}</p>
    </div>

    <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-100">
      <div>{{ t("feedback.feedback_id") }}: {{ feedbackId }}</div>
      <div v-if="attemptId" class="text-xs text-slate-400">
        {{ t("feedback.last_attempt") }}: {{ attemptId }}
      </div>
      <RouterLink class="mt-3 inline-block text-xs text-emerald-300 underline" to="/">
        {{ t("feedback.back_home") }}
      </RouterLink>
    </div>
  </section>
</template>
