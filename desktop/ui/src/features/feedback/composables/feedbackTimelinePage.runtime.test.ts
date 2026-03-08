import { computed, ref } from "vue";
import { describe, expect, it } from "vitest";
import type { FeedbackTimelineItem, MascotMessage } from "@/schemas/ipc";
import {
  createTimelineRuntime,
  type TimelineRuntimeDeps,
} from "./feedbackTimelinePage.runtime";
import type { TimelineState } from "./feedbackTimelinePage.types";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function setup(overrides: Partial<TimelineRuntimeDeps> = {}) {
  const appState = ref<{ activeProfileId: string | null; activeProject: { id: string } | null }>({
    activeProfileId: "profile-1",
    activeProject: { id: "project-1" },
  });
  const locale = ref("en");
  const scope = ref<"workspace" | "talk">("workspace");
  const showMascotCard = ref(true);
  const focusedFeedbackId = ref("");
  const sourceContext = ref("");
  const entries = ref<FeedbackTimelineItem[]>([]);
  const reviewedIds = ref<Set<string>>(new Set());
  const mascotMessage = ref<MascotMessage | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const errorCategory = ref<"validation" | "domain" | "infrastructure" | "unknown" | null>(null);
  const filterType = ref<"all" | "quest_attempt" | "run">("all");

  const deps: TimelineRuntimeDeps = {
    getMascotContextMessage: async () =>
      ({
        id: "m1",
        kind: "nudge",
        title: "Track progress",
        body: "Keep focus",
        cta_label: null,
        cta_route: null,
      }) as MascotMessage,
    getFeedbackTimeline: async () =>
      [{ id: "fb-1" } as FeedbackTimelineItem, { id: "fb-2" } as FeedbackTimelineItem],
    readReviewedIds: () => new Set(["fb-2"]),
    ...overrides,
  };

  const runtime = createTimelineRuntime({
    state: {
      identity: {
        locale,
        scope,
        activeProjectId: computed(() => appState.value.activeProject?.id ?? null),
        showMascotCard: computed(() => showMascotCard.value),
        focusedFeedbackId: computed(() => focusedFeedbackId.value),
        sourceContext: computed(() => sourceContext.value),
      },
      model: {
        appState: computed(() => appState.value as unknown as TimelineState),
        entries,
        reviewedIds,
        mascotMessage,
      },
      ui: {
        isLoading,
        error,
        errorCategory,
        filterType,
      },
    },
    deps,
  });

  return {
    appState,
    scope,
    showMascotCard,
    focusedFeedbackId,
    sourceContext,
    entries,
    reviewedIds,
    mascotMessage,
    isLoading,
    error,
    errorCategory,
    filterType,
    runtime,
  };
}

describe("feedbackTimelinePage.runtime", () => {
  it("applies focused context filters", () => {
    const ctx = setup();
    ctx.focusedFeedbackId.value = "fb-1";
    ctx.sourceContext.value = "quest";

    ctx.runtime.applyFocusedContextFilters();
    expect(ctx.filterType.value).toBe("quest_attempt");

    ctx.sourceContext.value = "boss-run";
    ctx.runtime.applyFocusedContextFilters();
    expect(ctx.filterType.value).toBe("run");
  });

  it("resets timeline state when no active profile", async () => {
    const ctx = setup();
    ctx.appState.value.activeProfileId = null;
    ctx.entries.value = [{ id: "existing" } as FeedbackTimelineItem];
    ctx.error.value = "old-error";
    ctx.mascotMessage.value = {
      id: "existing-msg",
      kind: "nudge",
      title: "Old",
      body: "Old",
      cta_label: null,
      cta_route: null,
    };

    await ctx.runtime.loadTimeline();

    expect(ctx.entries.value).toEqual([]);
    expect(ctx.error.value).toBeNull();
    expect(ctx.reviewedIds.value.size).toBe(0);
    expect(ctx.mascotMessage.value).toBeNull();
  });

  it("loads timeline entries and reviewed ids", async () => {
    const ctx = setup();

    await ctx.runtime.loadTimeline();

    expect(ctx.entries.value).toHaveLength(2);
    expect(ctx.reviewedIds.value.has("fb-2")).toBe(true);
    expect(ctx.mascotMessage.value?.title).toBe("Track progress");
    expect(ctx.isLoading.value).toBe(false);
  });

  it("uses takeLatest behavior for concurrent loadTimeline calls", async () => {
    const first = createDeferred<FeedbackTimelineItem[]>();
    let calls = 0;
    const ctx = setup({
      getFeedbackTimeline: async () => {
        calls += 1;
        if (calls === 1) {
          return first.promise;
        }
        return [{ id: "latest" } as FeedbackTimelineItem];
      },
    });

    const firstLoad = ctx.runtime.loadTimeline();
    const secondLoad = ctx.runtime.loadTimeline();
    first.resolve([{ id: "stale" } as FeedbackTimelineItem]);
    await Promise.all([firstLoad, secondLoad]);

    expect(ctx.entries.value[0]?.id).toBe("latest");
  });

  it("maps runtime failures to categorized ui error", async () => {
    const ctx = setup({
      getFeedbackTimeline: async () => {
        throw new Error("timeline-failed");
      },
    });

    await ctx.runtime.loadTimeline();

    expect(ctx.error.value).toBe("timeline-failed");
    expect(ctx.errorCategory.value).toBe("unknown");
    expect(ctx.entries.value).toEqual([]);
  });
});
