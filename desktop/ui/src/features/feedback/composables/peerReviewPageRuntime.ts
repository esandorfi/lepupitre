import type { Ref } from "vue";
import type { PeerReviewDetail } from "@/schemas/ipc";
import { packStore, sessionStore } from "@/stores/app";
import {
  clearRuntimeUiError,
  setRuntimeUiError,
  type RuntimeErrorCategory,
} from "@/features/shared/runtime/runtimeContract";

export type PeerReviewPageRuntimeState = {
  identity: {
    peerReviewId: Ref<string>;
  };
  model: {
    reviewDetail: Ref<PeerReviewDetail | null>;
  };
  draft: Record<string, never>;
  ui: {
    error: Ref<string | null>;
    errorCategory?: Ref<RuntimeErrorCategory | null>;
    isLoading: Ref<boolean>;
  };
};

export type PeerReviewPageRuntimeDeps = {
  bootstrapSession: () => Promise<void>;
  getPeerReview: (peerReviewId: string) => Promise<PeerReviewDetail | null>;
};

function createDefaultPeerReviewPageRuntimeDeps(): PeerReviewPageRuntimeDeps {
  return {
    bootstrapSession: () => sessionStore.bootstrap(),
    getPeerReview: (peerReviewId) => packStore.getPeerReview(peerReviewId),
  };
}

type PeerReviewPageRuntimeArgs = {
  state: PeerReviewPageRuntimeState;
  deps?: PeerReviewPageRuntimeDeps;
};

/**
 * Creates and returns the create peer review page runtime contract.
 */
export function createPeerReviewPageRuntime(args: PeerReviewPageRuntimeArgs) {
  const deps = args.deps ?? createDefaultPeerReviewPageRuntimeDeps();
  const { identity, model, ui } = args.state;
  // Policy: loadPage uses takeLatest.
  let loadSequence = 0;

  async function loadPage() {
    const requestId = ++loadSequence;
    if (!identity.peerReviewId.value) {
      model.reviewDetail.value = null;
      return;
    }
    ui.isLoading.value = true;
    clearRuntimeUiError(ui);
    try {
      await deps.bootstrapSession();
      if (requestId !== loadSequence) {
        return;
      }
      const detail = await deps.getPeerReview(identity.peerReviewId.value);
      if (requestId !== loadSequence) {
        return;
      }
      model.reviewDetail.value = detail;
    } catch (err) {
      if (requestId !== loadSequence) {
        return;
      }
      setRuntimeUiError(ui, err);
      model.reviewDetail.value = null;
    } finally {
      if (requestId === loadSequence) {
        ui.isLoading.value = false;
      }
    }
  }

  return { loadPage };
}
