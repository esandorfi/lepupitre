<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";

const { t } = useI18n();
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
    error.value = t("quest.response_required");
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
    <p class="app-muted text-sm font-semibold">
      {{ t("quest.code") }}: {{ questCode || t("quest.daily") }}
    </p>

    <div v-if="dailyQuest" class="app-surface rounded-2xl border p-4">
      <div class="app-text text-sm">{{ dailyQuest.quest.title }}</div>
      <div class="app-muted mt-2 text-xs">{{ dailyQuest.quest.prompt }}</div>

      <textarea
        v-model="text"
        rows="6"
        class="app-input mt-4 w-full rounded-lg border px-3 py-2 text-sm"
        :placeholder="t('quest.response_placeholder')"
      ></textarea>

      <div class="mt-3 flex items-center gap-3">
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

      <p v-if="error" class="app-danger-text mt-2 text-xs">{{ error }}</p>
    </div>

    <div v-else class="app-surface rounded-2xl border p-4">
      <p class="app-muted text-sm">{{ t("quest.empty") }}</p>
    </div>
  </section>
</template>
