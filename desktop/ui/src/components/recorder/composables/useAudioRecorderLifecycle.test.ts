import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import {
  bindAudioRecorderMountedHooks,
  bindAudioRecorderWatches,
} from "./useAudioRecorderLifecycle";

const lifecycleMocks = vi.hoisted(() => ({
  onMounted: vi.fn(),
  onBeforeUnmount: vi.fn(),
  bindAudioRecorderRuntimeWatches: vi.fn(),
  createAudioRecorderCleanupSet: vi.fn(() => ({ marker: "cleanups" })),
  registerAudioRecorderRuntimeListeners: vi.fn(async () => {}),
  cleanupAudioRecorderListeners: vi.fn(),
}));

vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");
  return {
    ...actual,
    onMounted: lifecycleMocks.onMounted,
    onBeforeUnmount: lifecycleMocks.onBeforeUnmount,
  };
});

vi.mock("@/components/recorder/composables/runtime/audioRecorderRuntimeWatches", () => ({
  bindAudioRecorderRuntimeWatches: lifecycleMocks.bindAudioRecorderRuntimeWatches,
}));

vi.mock("@/components/recorder/composables/runtime/audioRecorderRuntimeListeners", () => ({
  createAudioRecorderCleanupSet: lifecycleMocks.createAudioRecorderCleanupSet,
  registerAudioRecorderRuntimeListeners: lifecycleMocks.registerAudioRecorderRuntimeListeners,
  cleanupAudioRecorderListeners: lifecycleMocks.cleanupAudioRecorderListeners,
}));

type MountedCallback = () => Promise<void> | void;
type UnmountCallback = () => void;

describe("useAudioRecorderLifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("binds mounted/unmounted hooks and lifecycle listeners", async () => {
    let timerCallback: (() => void) | null = null;
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const setTimeoutMock = vi.fn((cb: () => void) => {
      timerCallback = cb;
      return 123 as unknown as ReturnType<typeof setTimeout>;
    });

    const previousWindow = globalThis.window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = {
      addEventListener,
      removeEventListener,
      setTimeout: setTimeoutMock,
    };

    const deps = {
      DEFERRED_BACKGROUND_CHECK_MS: 10,
      advancedOpen: { value: true },
      handleShortcut: vi.fn(),
      clearDeferredBackgroundCheckTimer: vi.fn(),
      setDeferredBackgroundCheckTimer: vi.fn(),
      refreshInputDevices: vi.fn(async () => {}),
      refreshTelemetryBudget: vi.fn(async () => {}),
      clearStatusTimer: vi.fn(),
      clearTelemetryFallbackTimer: vi.fn(),
    } as unknown as AudioRecorderRuntimeDeps;

    const getDeps = vi.fn(() => deps);
    bindAudioRecorderMountedHooks(getDeps);

    const mounted = lifecycleMocks.onMounted.mock.calls[0]?.[0] as MountedCallback;
    const unmounted = lifecycleMocks.onBeforeUnmount.mock.calls[0]?.[0] as UnmountCallback;

    await mounted();
    expect(deps.clearDeferredBackgroundCheckTimer).toHaveBeenCalled();
    expect(setTimeoutMock).toHaveBeenCalledWith(expect.any(Function), 10);
    expect(deps.setDeferredBackgroundCheckTimer).toHaveBeenCalledWith(123);
    expect(addEventListener).toHaveBeenCalledWith("keydown", deps.handleShortcut);
    expect(lifecycleMocks.registerAudioRecorderRuntimeListeners).toHaveBeenCalledWith(getDeps, {
      marker: "cleanups",
    });

    const deferredCallback = timerCallback as (() => void) | null;
    if (deferredCallback) {
      deferredCallback();
    }
    expect(deps.setDeferredBackgroundCheckTimer).toHaveBeenCalledWith(null);
    expect(deps.refreshInputDevices).toHaveBeenCalled();
    expect(deps.refreshTelemetryBudget).toHaveBeenCalled();

    unmounted();
    expect(deps.clearStatusTimer).toHaveBeenCalled();
    expect(deps.clearTelemetryFallbackTimer).toHaveBeenCalled();
    expect(deps.clearDeferredBackgroundCheckTimer).toHaveBeenCalled();
    expect(removeEventListener).toHaveBeenCalledWith("keydown", deps.handleShortcut);
    expect(lifecycleMocks.cleanupAudioRecorderListeners).toHaveBeenCalledWith({
      marker: "cleanups",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = previousWindow;
  });

  it("binds runtime watches through watcher helper", () => {
    const getDeps = vi.fn();

    bindAudioRecorderWatches(getDeps as () => AudioRecorderRuntimeDeps);

    expect(lifecycleMocks.bindAudioRecorderRuntimeWatches).toHaveBeenCalledWith(getDeps);
  });
});
