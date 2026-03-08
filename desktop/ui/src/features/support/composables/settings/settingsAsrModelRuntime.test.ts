import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAsrModelState } from "@/features/support/composables/settings/settingsAsrModelState";
import { useAsrModelRuntime } from "@/features/support/composables/settings/settingsAsrModelRuntime";

const mockCreateAsrModelActions = vi.hoisted(() => vi.fn());
const mockBindAsrModelLifecycle = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(),
}));

vi.mock("@/features/support/composables/settings/settingsAsrModelActions", () => ({
  createAsrModelActions: mockCreateAsrModelActions,
}));

vi.mock("@/features/support/composables/settings/settingsAsrModelLifecycle", () => ({
  bindAsrModelLifecycle: mockBindAsrModelLifecycle,
}));

describe("settingsAsrModelRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAsrModelActions.mockReturnValue({
      refreshModels: vi.fn(async () => {}),
      refreshSidecarStatus: vi.fn(async () => {}),
      removeModel: vi.fn(async () => {}),
      verifyModel: vi.fn(async () => {}),
      downloadModel: vi.fn(async () => {}),
    });
  });

  it("binds lifecycle and exposes model actions", async () => {
    const state = createAsrModelState();
    const openUrl = vi.fn(async () => {});

    const runtime = useAsrModelRuntime({
      t: (key: string) => key,
      state,
      deps: { openUrl },
    });

    await runtime.openSourceUrl("https://example.com/model");

    expect(openUrl).toHaveBeenCalledWith("https://example.com/model");
    expect(mockCreateAsrModelActions).toHaveBeenCalledTimes(1);
    expect(mockBindAsrModelLifecycle).toHaveBeenCalledTimes(1);
    expect(typeof runtime.removeModel).toBe("function");
    expect(typeof runtime.verifyModel).toBe("function");
    expect(typeof runtime.downloadModel).toBe("function");
    expect(state.downloadError.value).toBeNull();
    expect(state.downloadErrorCategory.value).toBeNull();
  });

  it("stores open url failures in downloadError", async () => {
    const state = createAsrModelState();
    const openUrl = vi.fn(async () => {
      throw new Error("open-url-failed");
    });

    const runtime = useAsrModelRuntime({
      t: (key: string) => key,
      state,
      deps: { openUrl },
    });

    await runtime.openSourceUrl("https://example.com/model");

    expect(state.downloadError.value).toBe("open-url-failed");
    expect(state.downloadErrorCategory.value).toBe("unknown");
  });
});
