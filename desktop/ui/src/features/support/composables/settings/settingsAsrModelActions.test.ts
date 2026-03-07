import { describe, expect, it, vi } from "vitest";
import { createDownloadProgressQueue } from "@/features/support/composables/settings/useSettingsAsrModelHelpers";
import { createAsrModelState } from "@/features/support/composables/settings/settingsAsrModelState";
import { createAsrModelActions } from "@/features/support/composables/settings/settingsAsrModelActions";

function setup() {
  const state = createAsrModelState();
  const progressQueue = {
    queueDownloadProgress: vi.fn(),
    clearModelProgress: vi.fn(),
    clearPendingProgress: vi.fn(),
  } as unknown as ReturnType<typeof createDownloadProgressQueue>;

  const deps = {
    asrSidecarStatus: vi.fn(async () => {}),
    asrModelsList: vi.fn(async () => []),
    asrModelRemove: vi.fn(async () => {}),
    asrModelVerify: vi.fn(async () => {}),
    asrModelDownload: vi.fn(async () => {}),
    classifyAsrError: vi.fn(() => "sidecar_missing" as const),
    sidecarMessageForCode: vi.fn(() => ({
      status: "missing" as const,
      message: "missing-msg",
    })),
    confirm: vi.fn(() => true),
  };

  const actions = createAsrModelActions({
    t: (key: string) => key,
    state,
    progressQueue,
    deps,
  });

  return { state, progressQueue, deps, actions };
}

describe("settingsAsrModelActions", () => {
  it("refreshes sidecar status to ready on success", async () => {
    const ctx = setup();

    await ctx.actions.refreshSidecarStatus();

    expect(ctx.state.sidecarStatus.value).toBe("ready");
    expect(ctx.state.sidecarMessage.value).toBeNull();
  });

  it("maps sidecar failures with classified message", async () => {
    const ctx = setup();
    ctx.deps.asrSidecarStatus.mockRejectedValueOnce(new Error("boom"));

    await ctx.actions.refreshSidecarStatus();

    expect(ctx.deps.classifyAsrError).toHaveBeenCalledWith("boom");
    expect(ctx.state.sidecarStatus.value).toBe("missing");
    expect(ctx.state.sidecarMessage.value).toBe("missing-msg");
  });

  it("skips removeModel when confirm is false", async () => {
    const ctx = setup();
    ctx.deps.confirm.mockReturnValueOnce(false);

    await ctx.actions.removeModel("tiny");

    expect(ctx.deps.asrModelRemove).not.toHaveBeenCalled();
  });

  it("verifies model when no in-flight operation exists", async () => {
    const ctx = setup();

    await ctx.actions.verifyModel("tiny");

    expect(ctx.deps.asrModelVerify).toHaveBeenCalledWith("tiny");
    expect(ctx.state.verifyingModelId.value).toBeNull();
  });

  it("downloads model and clears progress registration", async () => {
    const ctx = setup();

    await ctx.actions.downloadModel("base");

    expect(ctx.deps.asrModelDownload).toHaveBeenCalledWith("base");
    expect(ctx.progressQueue.clearModelProgress).toHaveBeenCalledWith("base");
    expect(ctx.state.downloadingModelId.value).toBeNull();
  });
});
