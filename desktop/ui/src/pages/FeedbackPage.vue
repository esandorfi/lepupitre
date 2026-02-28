<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { resolveFeedbackBackLink, resolveFeedbackContextLabel } from "../lib/feedbackContext";
import { useI18n } from "../lib/i18n";
import { useUiPreferences } from "../lib/uiPreferences";
import { isFeedbackReviewed, markFeedbackReviewed } from "../lib/feedbackReviewState";
import { appStore } from "../stores/app";
import type { FeedbackContext, FeedbackV1, MascotMessage } from "../schemas/ipc";

const { t, locale } = useI18n();
const { settings: uiSettings } = useUiPreferences();
const route = useRoute();
const feedbackId = computed(() => String(route.params.feedbackId || ""));
const feedback = ref<FeedbackV1 | null>(null);
const context = ref<FeedbackContext | null>(null);
const mascotMessage = ref<MascotMessage | null>(null);
const error = ref<string | null>(null);
const isLoading = ref(false);
const note = ref("");
const lastSavedNote = ref("");
const noteStatus = ref<"idle" | "saving" | "saved" | "error">("idle");
const reviewMarked = ref(false);
const showMascotCard = computed(() => uiSettings.value.mascotEnabled);
const isQuestWorldMode = computed(() => uiSettings.value.gamificationMode === "quest-world");
const mascotBody = computed(() =>
  uiSettings.value.mascotIntensity === "minimal" ? "" : mascotMessage.value?.body ?? ""
);
const isReviewed = computed(() => {
  const profileId = appStore.state.activeProfileId;
  if (!profileId || !feedbackId.value) {
    return false;
  }
  return isFeedbackReviewed(profileId, feedbackId.value);
});
const recommendedQuestCodes = computed(() => {
  const list = feedback.value?.top_actions.flatMap((action) => action.target_quest_codes) ?? [];
  return Array.from(new Set(list.filter((code) => typeof code === "string" && code.trim().length > 0)));
});
const recommendedQuestLinks = computed(() => {
  const projectId = context.value?.project_id ?? "";
  if (!projectId) {
    return [];
  }
  return recommendedQuestCodes.value.map((code) => ({
    code,
    label: appStore.formatQuestCode(projectId, code),
    to: `/quest/${code}?projectId=${projectId}&from=talk`,
  }));
});
const backLink = computed(() => {
  return resolveFeedbackBackLink(context.value, appStore.state.activeProject?.id ?? null);
});
const contextLabel = computed(() => {
  return resolveFeedbackContextLabel(context.value, appStore.formatQuestCode, t("feedback.run_label"));
});

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function mascotToneClass(kind: string | null | undefined) {
  if (kind === "celebrate") {
    return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_15%,var(--color-surface))]";
  }
  if (kind === "nudge") {
    return "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent-soft)_35%,var(--color-surface))]";
  }
  return "border-[var(--color-border)] bg-[var(--color-surface-elevated)]";
}

async function refreshMascotMessage() {
  if (!showMascotCard.value || !appStore.state.activeProfileId) {
    mascotMessage.value = null;
    return;
  }
  try {
    mascotMessage.value = await appStore.getMascotContextMessage({
      routeName: "feedback",
      projectId: context.value?.project_id ?? null,
      locale: locale.value,
    });
  } catch {
    mascotMessage.value = null;
  }
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
    context.value = await appStore.getFeedbackContext(feedbackId.value);
    if (appStore.state.activeProfileId && feedbackId.value) {
      const alreadyReviewed = isFeedbackReviewed(appStore.state.activeProfileId, feedbackId.value);
      if (!alreadyReviewed) {
        markFeedbackReviewed(appStore.state.activeProfileId, feedbackId.value);
        reviewMarked.value = true;
      } else {
        reviewMarked.value = false;
      }
    }
    await loadNote();
    await refreshMascotMessage();
  } catch (err) {
    error.value = toError(err);
  } finally {
    isLoading.value = false;
  }
});

watch(
  () => [locale.value, uiSettings.value.mascotEnabled, uiSettings.value.mascotIntensity] as const,
  async () => {
    if (!feedbackId.value || !context.value) {
      return;
    }
    await refreshMascotMessage();
  }
);
</script>

<template>
  <section class="space-y-6">
    <p class="app-muted text-sm font-semibold">{{ t("feedback.subtitle") }}</p>
    <p v-if="isReviewed || reviewMarked" class="app-subtle text-xs font-semibold">
      {{
        reviewMarked
          ? t("feedback.review_marked")
          : t("feedback.review_already")
      }}
    </p>

    <div
      v-if="showMascotCard && mascotMessage"
      class="app-panel app-panel-compact border"
      :class="mascotToneClass(mascotMessage.kind)"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="app-text-eyebrow">{{ t("feedback.mascot_label") }}</div>
          <div class="app-text app-text-subheadline mt-1">{{ mascotMessage.title }}</div>
          <div v-if="mascotBody" class="app-muted app-text-body mt-1">{{ mascotBody }}</div>
        </div>
        <RouterLink
          v-if="mascotMessage.cta_route && mascotMessage.cta_label"
          class="app-button-secondary app-focus-ring app-button-md inline-flex items-center"
          :to="mascotMessage.cta_route"
        >
          {{ mascotMessage.cta_label }}
        </RouterLink>
      </div>
    </div>

    <div class="app-panel app-panel-compact text-sm" :class="isQuestWorldMode ? 'bg-[color-mix(in_srgb,var(--color-accent-soft)_20%,var(--color-surface))]' : ''">
      <div class="app-subtle text-xs uppercase tracking-[0.2em]">
        {{ t("feedback.score") }}
      </div>
      <div class="app-text mt-2 text-2xl font-semibold">
        {{ feedback?.overall_score ?? "--" }}
      </div>
      <div v-if="contextLabel" class="app-muted mt-2 text-xs">
        {{ t("feedback.context_label") }}: {{ contextLabel }}
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

        <div v-if="recommendedQuestLinks.length > 0" class="app-card rounded-xl border p-3">
          <div class="app-subtle text-xs uppercase tracking-[0.2em]">
            {{ t("feedback.practice_next_title") }}
          </div>
          <div class="app-muted mt-1 text-xs">
            {{ t("feedback.practice_next_subtitle") }}
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <RouterLink
              v-for="item in recommendedQuestLinks"
              :key="item.code"
              class="app-button-secondary app-focus-ring app-button-sm inline-flex items-center"
              :to="item.to"
            >
              {{ item.label }}
            </RouterLink>
            <RouterLink
              class="app-link app-text-meta inline-flex items-center underline"
              to="/training"
            >
              {{ t("feedback.practice_next_training") }}
            </RouterLink>
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

      <RouterLink class="app-link mt-4 inline-block text-xs underline" :to="backLink">
        {{ t("feedback.back_parent") }}
      </RouterLink>
    </div>
  </section>
</template>
