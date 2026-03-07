import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { resolveFeedbackBackLink, resolveFeedbackContextLabel } from "@/lib/feedbackContext";
import { isFeedbackReviewed, markFeedbackReviewed } from "@/lib/feedbackReviewState";
import { useI18n } from "@/lib/i18n";
import { useUiPreferences } from "@/lib/uiPreferences";
import { appState, coachStore, feedbackStore, sessionStore, trainingStore } from "@/stores/app";
import type { FeedbackContext, FeedbackV1, MascotMessage } from "@/schemas/ipc";

export type FeedbackNoteStatus = "idle" | "saving" | "saved" | "error";
export type FeedbackQuestLink = { code: string; label: string; to: string };

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

export function useFeedbackPageState() {
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
  const noteStatus = ref<FeedbackNoteStatus>("idle");
  const reviewMarked = ref(false);

  const showMascotCard = computed(() => uiSettings.value.mascotEnabled);
  const isQuestWorldMode = computed(() => uiSettings.value.gamificationMode === "quest-world");
  const mascotBody = computed(() =>
    uiSettings.value.mascotIntensity === "minimal" ? "" : mascotMessage.value?.body ?? ""
  );
  const isReviewed = computed(() => {
    const profileId = appState.activeProfileId;
    if (!profileId || !feedbackId.value) {
      return false;
    }
    return isFeedbackReviewed(profileId, feedbackId.value);
  });
  const recommendedQuestCodes = computed(() => {
    const list = feedback.value?.top_actions.flatMap((action) => action.target_quest_codes) ?? [];
    return Array.from(
      new Set(list.filter((code) => typeof code === "string" && code.trim().length > 0))
    );
  });
  const recommendedQuestLinks = computed<FeedbackQuestLink[]>(() => {
    const projectId = context.value?.project_id ?? "";
    if (!projectId) {
      return [];
    }
    return recommendedQuestCodes.value.map((code) => ({
      code,
      label: trainingStore.formatQuestCode(projectId, code),
      to: `/quest/${code}?projectId=${projectId}&from=talk`,
    }));
  });
  const backLink = computed(() =>
    resolveFeedbackBackLink(context.value, appState.activeProject?.id ?? null)
  );
  const contextLabel = computed(() =>
    resolveFeedbackContextLabel(context.value, trainingStore.formatQuestCode, t("feedback.run_label"))
  );

  async function refreshMascotMessage() {
    if (!showMascotCard.value || !appState.activeProfileId) {
      mascotMessage.value = null;
      return;
    }
    try {
      mascotMessage.value = await coachStore.getMascotContextMessage({
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
      const existing = await feedbackStore.getFeedbackNote(feedbackId.value);
      note.value = existing ?? "";
      lastSavedNote.value = note.value;
    } catch {
      noteStatus.value = "error";
    }
  }

  async function saveNote() {
    if (!feedbackId.value || note.value === lastSavedNote.value) {
      return;
    }
    noteStatus.value = "saving";
    try {
      await feedbackStore.setFeedbackNote(feedbackId.value, note.value);
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
      await sessionStore.bootstrap();
      feedback.value = await feedbackStore.getFeedback(feedbackId.value);
      context.value = await feedbackStore.getFeedbackContext(feedbackId.value);
      if (appState.activeProfileId && feedbackId.value) {
        const alreadyReviewed = isFeedbackReviewed(appState.activeProfileId, feedbackId.value);
        if (!alreadyReviewed) {
          markFeedbackReviewed(appState.activeProfileId, feedbackId.value);
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

  return {
    t,
    feedback,
    mascotMessage,
    error,
    isLoading,
    note,
    noteStatus,
    reviewMarked,
    showMascotCard,
    isQuestWorldMode,
    mascotBody,
    isReviewed,
    recommendedQuestLinks,
    backLink,
    contextLabel,
    saveNote,
  };
}
