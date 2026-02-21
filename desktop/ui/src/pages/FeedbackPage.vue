<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { useI18n } from "../lib/i18n";
import { appStore } from "../stores/app";
import type { FeedbackV1 } from "../schemas/ipc";

const { t } = useI18n();
const route = useRoute();
const feedbackId = computed(() => String(route.params.feedbackId || ""));
const feedback = ref<FeedbackV1 | null>(null);
const error = ref<string | null>(null);
const isLoading = ref(false);
const note = ref("");
const lastSavedNote = ref("");
const noteStatus = ref<"idle" | "saving" | "saved" | "error">("idle");

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

async function loadNote() {
  if (!feedbackId.value) {
    return;
  }
  try {
    const existing = await appStore.getFeedbackNote(feedbackId.value);
    note.value = existing ?? "";
    lastSavedNote.value = note.value;
  } catch {
    noteStatus.value = "error";
  }
}

async function saveNote() {
  if (!feedbackId.value) {
    return;
  }
  if (note.value === lastSavedNote.value) {
    return;
  }
  noteStatus.value = "saving";
  try {
    await appStore.setFeedbackNote(feedbackId.value, note.value);
    lastSavedNote.value = note.value;
    noteStatus.value = "saved";
    setTimeout(() => {
      noteStatus.value = "idle";
    }, 1200);
  } catch {
    noteStatus.value = "error";
  }
}

onMounted(async () => {
  if (!feedbackId.value) {
    return;
  }
  isLoading.value = true;
  error.value = null;
  try {
    await appStore.bootstrap();
    feedback.value = await appStore.getFeedback(feedbackId.value);
    await loadNote();
  } catch (err) {
    error.value = toError(err);
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <section class="space-y-6">
    <p class="app-muted text-sm font-semibold">{{ t("feedback.subtitle") }}</p>

    <div class="app-surface rounded-2xl border p-4 text-sm">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("feedback.score") }}
      </div>
      <div class="app-text mt-2 text-2xl font-semibold">
        {{ feedback?.overall_score ?? "--" }}
      </div>

      <div v-if="isLoading" class="app-muted mt-4 text-xs">
        {{ t("feedback.loading") }}
      </div>
      <div v-else-if="error" class="app-danger-text mt-4 text-xs">
        {{ error }}
      </div>

      <div v-else-if="feedback" class="mt-4 space-y-4">
        <div class="app-card rounded-xl border p-3">
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">
            {{ t("feedback.actions") }}
          </div>
          <div v-if="feedback.top_actions.length === 0" class="app-muted mt-2 text-xs">
            {{ t("feedback.no_actions") }}
          </div>
          <div v-else class="mt-2 space-y-2">
            <div v-for="action in feedback.top_actions" :key="action.action_id">
              <div class="app-text text-sm font-semibold">{{ action.title }}</div>
              <div class="app-muted text-xs">{{ action.why_it_matters }}</div>
              <div class="app-text mt-1 text-xs">{{ action.how_to_fix }}</div>
            </div>
          </div>
        </div>

        <div class="app-card rounded-xl border p-3">
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">
            {{ t("feedback.metrics") }}
          </div>
          <div class="mt-2 grid gap-2 text-xs">
            <div>
              {{ t("feedback.metric_wpm") }}:
              <span class="app-text">{{ feedback.metrics.wpm.toFixed(1) }}</span>
            </div>
            <div>
              {{ t("feedback.metric_fillers") }}:
              <span class="app-text">{{ feedback.metrics.filler_per_min.toFixed(1) }}</span>
            </div>
            <div>
              {{ t("feedback.metric_pause") }}:
              <span class="app-text">{{ feedback.metrics.pause_count }}</span>
            </div>
            <div>
              {{ t("feedback.metric_sentence") }}:
              <span class="app-text">{{ feedback.metrics.avg_sentence_words.toFixed(1) }}</span>
            </div>
            <div v-if="feedback.metrics.repeat_terms.length > 0">
              {{ t("feedback.metric_repeat") }}:
              <span class="app-text">{{ feedback.metrics.repeat_terms.join(", ") }}</span>
            </div>
          </div>
        </div>

        <div v-if="feedback.comments.length > 0" class="app-card rounded-xl border p-3">
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">
            {{ t("feedback.comments") }}
          </div>
          <div class="mt-2 space-y-2 text-xs">
            <div v-for="(comment, index) in feedback.comments" :key="index">
              <div class="app-text font-semibold">{{ comment.label }}</div>
              <div class="app-muted">{{ comment.suggestion }}</div>
            </div>
          </div>
        </div>

        <div class="app-card rounded-xl border p-3">
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">
            {{ t("feedback.notes_title") }}
          </div>
          <textarea
            v-model="note"
            rows="4"
            class="app-input mt-2 w-full rounded-lg border px-3 py-2 text-sm"
            :placeholder="t('feedback.notes_placeholder')"
            @blur="saveNote"
          ></textarea>
          <div v-if="noteStatus === 'saving'" class="app-muted mt-2 text-xs">
            {{ t("feedback.notes_saving") }}
          </div>
          <div v-else-if="noteStatus === 'saved'" class="app-subtle mt-2 text-xs">
            {{ t("feedback.notes_saved") }}
          </div>
          <div v-else-if="noteStatus === 'error'" class="app-danger-text mt-2 text-xs">
            {{ t("feedback.notes_error") }}
          </div>
        </div>
      </div>
      <div v-else class="app-muted mt-4 text-xs">
        {{ t("feedback.empty") }}
      </div>

      <RouterLink class="app-link mt-4 inline-block text-xs underline" to="/">
        {{ t("feedback.back_home") }}
      </RouterLink>
    </div>
  </section>
</template>
