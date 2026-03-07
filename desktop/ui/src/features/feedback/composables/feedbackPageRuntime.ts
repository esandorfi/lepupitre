import type { Ref } from "vue";
import { isFeedbackReviewed, markFeedbackReviewed } from "@/lib/feedbackReviewState";
import { appState, coachStore, feedbackStore, sessionStore } from "@/stores/app";
import type { FeedbackContext, FeedbackV1, MascotMessage } from "@/schemas/ipc";

function toError(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

type FeedbackPageRuntimeArgs = {
  feedbackId: Ref<string>;
  locale: Ref<string>;
  showMascotCard: Ref<boolean>;
  feedback: Ref<FeedbackV1 | null>;
  context: Ref<FeedbackContext | null>;
  mascotMessage: Ref<MascotMessage | null>;
  error: Ref<string | null>;
  isLoading: Ref<boolean>;
  note: Ref<string>;
  lastSavedNote: Ref<string>;
  noteStatus: Ref<"idle" | "saving" | "saved" | "error">;
  reviewMarked: Ref<boolean>;
};

export function createFeedbackPageRuntime(args: FeedbackPageRuntimeArgs) {
  const {
    feedbackId,
    locale,
    showMascotCard,
    feedback,
    context,
    mascotMessage,
    error,
    isLoading,
    note,
    lastSavedNote,
    noteStatus,
    reviewMarked,
  } = args;

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

  async function loadPage() {
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
  }

  return {
    refreshMascotMessage,
    saveNote,
    loadPage,
  };
}
