import { describe, expect, it, vi } from "vitest";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import type { AudioRecorderCleanupSet } from "./audioRecorderRuntimeListenerTypes";
import { registerAudioRecorderRuntimeListeners } from "./audioRecorderRuntimeListenerRegistrations";

const registrationMocks = vi.hoisted(() => ({
  hasTauriRuntime: vi.fn(),
  registerJobLifecycleListeners: vi.fn(),
  registerRecordingTelemetryListener: vi.fn(),
  registerAsrListeners: vi.fn(),
}));

vi.mock("@/lib/runtime", () => ({
  hasTauriRuntime: registrationMocks.hasTauriRuntime,
}));

vi.mock("@/components/recorder/composables/runtime/audioRecorderRuntimeJobListeners", () => ({
  registerJobLifecycleListeners: registrationMocks.registerJobLifecycleListeners,
}));

vi.mock("@/components/recorder/composables/runtime/audioRecorderRuntimeTelemetryListener", () => ({
  registerRecordingTelemetryListener: registrationMocks.registerRecordingTelemetryListener,
}));

vi.mock("@/components/recorder/composables/runtime/audioRecorderRuntimeAsrListeners", () => ({
  registerAsrListeners: registrationMocks.registerAsrListeners,
}));

function deps() {
  return {} as AudioRecorderRuntimeDeps;
}

function cleanups() {
  return {} as AudioRecorderCleanupSet;
}

describe("audioRecorderRuntimeListenerRegistrations", () => {
  it("skips listener registration when tauri runtime is unavailable", async () => {
    registrationMocks.hasTauriRuntime.mockReturnValue(false);

    await registerAudioRecorderRuntimeListeners(() => deps(), cleanups());

    expect(registrationMocks.registerJobLifecycleListeners).not.toHaveBeenCalled();
    expect(registrationMocks.registerRecordingTelemetryListener).not.toHaveBeenCalled();
    expect(registrationMocks.registerAsrListeners).not.toHaveBeenCalled();
  });

  it("registers job, telemetry and asr listeners when tauri runtime is available", async () => {
    registrationMocks.hasTauriRuntime.mockReturnValue(true);
    const getDeps = vi.fn(() => deps());
    const set = cleanups();

    await registerAudioRecorderRuntimeListeners(getDeps, set);

    expect(registrationMocks.registerJobLifecycleListeners).toHaveBeenCalledWith(getDeps, set);
    expect(registrationMocks.registerRecordingTelemetryListener).toHaveBeenCalledWith(getDeps, set);
    expect(registrationMocks.registerAsrListeners).toHaveBeenCalledWith(getDeps, set);
  });
});
