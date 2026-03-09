import type { Ref } from "vue";
import { isFeedbackReviewed, markFeedbackReviewed } from "@/lib/feedbackReviewState";
import { appState, coachStore, feedbackStore, sessionStore } from "@/stores/app";
import type { FeedbackContext, FeedbackV1, MascotMessage } from "@/schemas/ipc";
import {
  clearRuntimeUiError,
  setRuntimeUiError,
  type RuntimeErrorCategory,
} from "@/features/shared/runtime/runtimeContract";

export type FeedbackPageRuntimeState = {
  identity: {
    feedbackId: Ref<string>;
    locale: Ref<string>;
  };
  model: {
    feedback: Ref<FeedbackV1 | null>;
    context: Ref<FeedbackContext | null>;
    mascotMessage: Ref<MascotMessage | null>;
    reviewMarked: Ref<boolean>;
  };
  draft: {
    note: Ref<string>;
    lastSavedNote: Ref<string>;
  };
  ui: {
    showMascotCard: Ref<boolean>;
    error: Ref<string | null>;
    errorCategory?: Ref<RuntimeErrorCategory | null>;
    isLoading: Ref<boolean>;
    noteStatus: Ref<"idle" | "saving" | "saved" | "error">;
    noteErrorCategory?: Ref<RuntimeErrorCategory | null>;
  };
};

export type FeedbackPageRuntimeDeps = {
  getActiveProfileId: () => string | null;
  bootstrapSession: () => Promise<void>;
  getFeedback: (feedbackId: string) => Promise<FeedbackV1 | null>;
  getFeedbackContext: (feedbackId: string) => Promise<FeedbackContext | null>;
  getFeedbackNote: (feedbackId: string) => Promise<string | null>;
  setFeedbackNote: (feedbackId: string, note: string) => Promise<void>;
  getMascotContextMessage: (args: {
    routeName: "feedback";
    projectId: string | null;
    locale: string;
  }) => Promise<MascotMessage | null>;
  isFeedbackReviewed: (profileId: string, feedbackId: string) => boolean;
  markFeedbackReviewed: (profileId: string, feedbackId: string) => void;
  scheduleTimeout: (fn: () => void, delayMs: number) => void;
};

function createDefaultFeedbackPageRuntimeDeps(): FeedbackPageRuntimeDeps {
  return {
    getActiveProfileId: () => appState.activeProfileId,
    bootstrapSession: () => sessionStore.bootstrap(),
    getFeedback: (feedbackId) => feedbackStore.getFeedback(feedbackId),
    getFeedbackContext: (feedbackId) => feedbackStore.getFeedbackContext(feedbackId),
    getFeedbackNote: (feedbackId) => feedbackStore.getFeedbackNote(feedbackId),
    setFeedbackNote: (feedbackId, note) => feedbackStore.setFeedbackNote(feedbackId, note),
    getMascotContextMessage: (args) => coachStore.getMascotContextMessage(args),
    isFeedbackReviewed,
    markFeedbackReviewed,
    scheduleTimeout: (fn, delayMs) => {
      setTimeout(fn, delayMs);
    },
  };
}

type FeedbackPageRuntimeArgs = {
  state: FeedbackPageRuntimeState;
  deps?: FeedbackPageRuntimeDeps;
};

/**
 * Creates and returns the create feedback page runtime contract.
 */
export function createFeedbackPageRuntime(args: FeedbackPageRuntimeArgs) {
  const deps = args.deps ?? createDefaultFeedbackPageRuntimeDeps();
  const { identity, model, draft, ui } = args.state;
  // Policy: loadPage uses takeLatest to avoid stale response writes.
  let loadSequence = 0;
  // Policy: saveNote uses takeLatest status semantics with stale-write guards.
  let saveSequence = 0;

  async function refreshMascotMessage() {
    if (!ui.showMascotCard.value || !deps.getActiveProfileId()) {
      model.mascotMessage.value = null;
      return;
    }
    try {
      model.mascotMessage.value = await deps.getMascotContextMessage({
        routeName: "feedback",
        projectId: model.context.value?.project_id ?? null,
        locale: identity.locale.value,
      });
    } catch {
      model.mascotMessage.value = null;
    }
  }

  async function loadNote(requestId: number) {
    if (!identity.feedbackId.value) {
      return;
    }
    try {
      const existing = await deps.getFeedbackNote(identity.feedbackId.value);
      if (requestId !== loadSequence) {
        return;
      }
      draft.note.value = existing ?? "";
      draft.lastSavedNote.value = draft.note.value;
    } catch {
      if (requestId !== loadSequence) {
        return;
      }
      ui.noteStatus.value = "error";
      if (ui.noteErrorCategory) {
        ui.noteErrorCategory.value = "unknown";
      }
    }
  }

  async function saveNote() {
    if (!identity.feedbackId.value || draft.note.value === draft.lastSavedNote.value) {
      return;
    }
    const requestId = ++saveSequence;
    ui.noteStatus.value = "saving";
    if (ui.noteErrorCategory) {
      ui.noteErrorCategory.value = null;
    }
    try {
      await deps.setFeedbackNote(identity.feedbackId.value, draft.note.value);
      if (requestId !== saveSequence) {
        return;
      }
      draft.lastSavedNote.value = draft.note.value;
      ui.noteStatus.value = "saved";
      deps.scheduleTimeout(() => {
        if (requestId === saveSequence && ui.noteStatus.value === "saved") {
          ui.noteStatus.value = "idle";
        }
      }, 1200);
    } catch {
      if (requestId !== saveSequence) {
        return;
      }
      ui.noteStatus.value = "error";
      if (ui.noteErrorCategory) {
        ui.noteErrorCategory.value = "infrastructure";
      }
    }
  }

  async function loadPage() {
    if (!identity.feedbackId.value) {
      return;
    }
    const requestId = ++loadSequence;
    ui.isLoading.value = true;
    clearRuntimeUiError(ui);
    try {
      await deps.bootstrapSession();
      if (requestId !== loadSequence) {
        return;
      }
      model.feedback.value = await deps.getFeedback(identity.feedbackId.value);
      if (requestId !== loadSequence) {
        return;
      }
      model.context.value = await deps.getFeedbackContext(identity.feedbackId.value);
      if (requestId !== loadSequence) {
        return;
      }
      const activeProfileId = deps.getActiveProfileId();
      if (activeProfileId && identity.feedbackId.value) {
        const alreadyReviewed = deps.isFeedbackReviewed(activeProfileId, identity.feedbackId.value);
        if (!alreadyReviewed) {
          deps.markFeedbackReviewed(activeProfileId, identity.feedbackId.value);
          model.reviewMarked.value = true;
        } else {
          model.reviewMarked.value = false;
        }
      }
      await loadNote(requestId);
      if (requestId !== loadSequence) {
        return;
      }
      await refreshMascotMessage();
    } catch (err) {
      if (requestId !== loadSequence) {
        return;
      }
      setRuntimeUiError(ui, err);
    } finally {
      if (requestId === loadSequence) {
        ui.isLoading.value = false;
      }
    }
  }

  return {
    refreshMascotMessage,
    saveNote,
    loadPage,
  };
}
