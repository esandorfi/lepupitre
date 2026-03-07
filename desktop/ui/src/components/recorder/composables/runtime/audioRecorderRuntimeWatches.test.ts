import { nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { TranscriptionSettings } from "@/lib/transcriptionSettings";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import { bindAudioRecorderRuntimeWatches } from "./audioRecorderRuntimeWatches";

function createDeps() {
  const refreshTranscribeReadiness = vi.fn(async () => {});
  const refreshInputDevices = vi.fn(async () => {});
  const refreshTelemetryBudget = vi.fn(async () => {});

  const deps = {
    transcriptionSettings: ref({ model: "tiny" } as TranscriptionSettings),
    phase: ref<"capture" | "quick_clean" | "analyze_export">("capture"),
    refreshTranscribeReadiness,
    advancedOpen: ref(false),
    inputDevices: ref<Array<{ id: string; label: string; isDefault: boolean }>>([]),
    isLoadingInputDevices: ref(false),
    refreshInputDevices,
    telemetryBudget: ref<unknown | null>(null),
    refreshTelemetryBudget,
  } as unknown as AudioRecorderRuntimeDeps;

  return {
    deps,
    refreshTranscribeReadiness,
    refreshInputDevices,
    refreshTelemetryBudget,
  };
}

describe("audioRecorderRuntimeWatches", () => {
  it("refreshes transcribe readiness when model changes outside capture phase", async () => {
    const { deps, refreshTranscribeReadiness } = createDeps();
    bindAudioRecorderRuntimeWatches(() => deps);

    deps.transcriptionSettings.value = { model: "base" } as TranscriptionSettings;
    await nextTick();
    expect(refreshTranscribeReadiness).not.toHaveBeenCalled();

    deps.phase.value = "quick_clean";
    deps.transcriptionSettings.value = { model: "tiny" } as TranscriptionSettings;
    await nextTick();
    expect(refreshTranscribeReadiness).toHaveBeenCalled();
  });

  it("loads input devices and telemetry budget when advanced panel opens", async () => {
    const { deps, refreshInputDevices, refreshTelemetryBudget } = createDeps();
    bindAudioRecorderRuntimeWatches(() => deps);

    deps.advancedOpen.value = true;
    await nextTick();
    expect(refreshInputDevices).toHaveBeenCalled();
    expect(refreshTelemetryBudget).toHaveBeenCalled();

    refreshInputDevices.mockClear();
    refreshTelemetryBudget.mockClear();
    deps.advancedOpen.value = false;
    await nextTick();
    deps.inputDevices.value = [{ id: "mic-1", label: "Microphone", isDefault: true }];
    deps.telemetryBudget.value = {
      eventIntervalMs: 100,
      maxEventRateHz: 10,
      maxPayloadBytes: 8192,
      waveformBins: 32,
      estimatedPayloadBytes: 512,
    };
    deps.advancedOpen.value = true;
    await nextTick();

    expect(refreshInputDevices).not.toHaveBeenCalled();
    expect(refreshTelemetryBudget).not.toHaveBeenCalled();
  });

  it("refreshes transcribe readiness on quick-clean phase transitions", async () => {
    const { deps, refreshTranscribeReadiness } = createDeps();
    bindAudioRecorderRuntimeWatches(() => deps);

    deps.phase.value = "analyze_export";
    await nextTick();
    refreshTranscribeReadiness.mockClear();
    deps.phase.value = "quick_clean";
    await nextTick();

    expect(refreshTranscribeReadiness).toHaveBeenCalled();
  });
});
