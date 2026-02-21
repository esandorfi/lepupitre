<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { appStore } from "../stores/app";

const route = useRoute();
const router = useRouter();

const questCode = computed(() => String(route.params.questCode || ""));
const text = ref("");
const error = ref<string | null>(null);
const isSubmitting = ref(false);

const dailyQuest = computed(() => appStore.state.dailyQuest);

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

async function bootstrap() {
  try {
    await appStore.bootstrap();
  } catch (err) {
    error.value = toError(err);
  }
}

async function submit() {
  if (!text.value.trim()) {
    error.value = "Response cannot be empty";
    return;
  }
  isSubmitting.value = true;
  error.value = null;
  try {
    const attemptId = await appStore.submitQuestText(text.value.trim());
    await router.push(`/feedback/${attemptId}`);
  } catch (err) {
    error.value = toError(err);
  } finally {
    isSubmitting.value = false;
  }
}

onMounted(bootstrap);
</script>

<template>
  <section class="space-y-6">
    <div class="space-y-2">
      <h1 class="text-2xl font-semibold">Quest</h1>
      <p class="text-sm text-slate-400">Code: {{ questCode || "daily" }}</p>
    </div>

    <div v-if="dailyQuest" class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div class="text-sm text-slate-100">{{ dailyQuest.quest.title }}</div>
      <div class="mt-2 text-xs text-slate-400">{{ dailyQuest.quest.prompt }}</div>

      <textarea
        v-model="text"
        rows="6"
        class="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        placeholder="Write your response"
      ></textarea>

      <div class="mt-3 flex items-center gap-3">
        <button
          class="cursor-pointer rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700"
          type="button"
          :disabled="isSubmitting"
          @click="submit"
        >
          Submit text
        </button>
        <RouterLink class="text-xs text-slate-400 underline" to="/">
          Back
        </RouterLink>
      </div>

      <p v-if="error" class="mt-2 text-xs text-rose-300">{{ error }}</p>
    </div>

    <div v-else class="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p class="text-sm text-slate-400">No quest loaded yet.</p>
    </div>
  </section>
</template>
