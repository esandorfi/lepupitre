<script setup lang="ts">
import { computed } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { appStore } from "../stores/app";

const route = useRoute();
const feedbackId = computed(() => String(route.params.feedbackId || ""));
const attemptId = computed(() => appStore.state.lastAttemptId);
</script>

<template>
  <section class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-2xl font-semibold">Feedback</h1>
      <p class="text-sm text-slate-400">Placeholder for feedback pipeline.</p>
    </div>

    <div class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-100">
      <div>Feedback id: {{ feedbackId }}</div>
      <div v-if="attemptId" class="text-xs text-slate-400">
        Last attempt id: {{ attemptId }}
      </div>
      <RouterLink class="mt-3 inline-block text-xs text-emerald-300 underline" to="/">
        Back to Home
      </RouterLink>
    </div>
  </section>
</template>
