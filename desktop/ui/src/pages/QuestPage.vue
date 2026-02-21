<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import AudioRecorder from "../components/AudioRecorder.vue";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const questCode = computed(() => String(route.params.questCode || ""));
const text = ref("");
const error = ref<string | null>(null);
const isSubmitting = ref(false);

const dailyQuest = computed(() => appStore.state.dailyQuest);
const isAudioQuest = computed(
  () => dailyQuest.value?.quest.output_type.toLowerCase() === "audio"
);

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
    error.value = t("quest.response_required");
    return;
  }
  isSubmitting.value = true;
  error.value = null;
  try {
    const attemptId = await appStore.submitQuestText(text.value.trim());
    const feedbackId = await appStore.analyzeAttempt(attemptId);
    await router.push(`/feedback/${feedbackId}`);
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
    <p class="app-muted text-sm font-semibold">
      {{ t("quest.code") }}: {{ questCode || t("quest.daily") }}
    </p>

    <div v-if="dailyQuest" class="app-surface rounded-2xl border p-4">
      <div class="app-text text-sm">{{ dailyQuest.quest.title }}</div>
      <div class="app-muted mt-2 text-xs">{{ dailyQuest.quest.prompt }}</div>

      <div v-if="isAudioQuest" class="mt-4 space-y-3">
        <p class="app-muted text-sm font-semibold">{{ t("quest.audio_hint") }}</p>
        <AudioRecorder />
      </div>

      <div v-else class="mt-4 space-y-3">
        <textarea
          v-model="text"
          rows="6"
          class="app-input w-full rounded-lg border px-3 py-2 text-sm"
          :placeholder="t('quest.response_placeholder')"
        ></textarea>

        <div class="flex items-center gap-3">
          <button
            class="app-button-primary cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            :disabled="isSubmitting"
            @click="submit"
          >
            {{ t("quest.submit") }}
          </button>
          <RouterLink class="app-muted text-xs underline" to="/">
            {{ t("quest.back") }}
          </RouterLink>
        </div>

        <p v-if="error" class="app-danger-text text-xs">{{ error }}</p>
      </div>
    </div>

    <div v-else class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ t("quest.empty") }}</p>
    </div>
  </section>
</template>
