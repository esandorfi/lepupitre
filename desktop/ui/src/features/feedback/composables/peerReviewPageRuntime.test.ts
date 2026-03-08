import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { PeerReviewDetail } from "@/schemas/ipc";
import {
  createPeerReviewPageRuntime,
  type PeerReviewPageRuntimeDeps,
} from "@/features/feedback/composables/peerReviewPageRuntime";

vi.mock("@/stores/app", () => ({
  packStore: {},
  sessionStore: {},
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function setup(overrides: Partial<PeerReviewPageRuntimeDeps> = {}) {
  const state = {
    identity: {
      peerReviewId: ref("peer-1"),
    },
    model: {
      reviewDetail: ref<PeerReviewDetail | null>(null),
    },
    draft: {},
    ui: {
      error: ref<string | null>(null),
      errorCategory: ref<"validation" | "domain" | "infrastructure" | "unknown" | null>(null),
      isLoading: ref(false),
    },
  };

  const deps: PeerReviewPageRuntimeDeps = {
    bootstrapSession: async () => {},
    getPeerReview: async () => ({ id: "peer-1" } as unknown as PeerReviewDetail),
    ...overrides,
  };

  return {
    state,
    deps,
    runtime: createPeerReviewPageRuntime({ state, deps }),
  };
}

describe("peerReviewPageRuntime", () => {
  it("loads peer review details", async () => {
    const ctx = setup();

    await ctx.runtime.loadPage();

    expect(ctx.state.model.reviewDetail.value?.id).toBe("peer-1");
    expect(ctx.state.ui.error.value).toBeNull();
  });

  it("maps failures to categorized ui error", async () => {
    const ctx = setup({
      getPeerReview: async () => {
        throw new Error("peer-review-load-failed");
      },
    });

    await ctx.runtime.loadPage();

    expect(ctx.state.ui.error.value).toBe("peer-review-load-failed");
    expect(ctx.state.ui.errorCategory.value).toBe("unknown");
    expect(ctx.state.model.reviewDetail.value).toBeNull();
  });

  it("keeps latest result with concurrent loadPage calls", async () => {
    const firstStarted = createDeferred<void>();
    const first = createDeferred<PeerReviewDetail | null>();
    let calls = 0;
    const ctx = setup({
      getPeerReview: async () => {
        calls += 1;
        if (calls === 1) {
          firstStarted.resolve();
          return first.promise;
        }
        return { id: "peer-latest" } as unknown as PeerReviewDetail;
      },
    });

    const firstLoad = ctx.runtime.loadPage();
    await firstStarted.promise;
    const secondLoad = ctx.runtime.loadPage();
    first.resolve({ id: "peer-stale" } as unknown as PeerReviewDetail);
    await Promise.all([firstLoad, secondLoad]);

    expect(ctx.state.model.reviewDetail.value?.id).toBe("peer-latest");
  });
});
