import { describe, expect, it, vi } from "vitest";
import type {
  RecorderAdvancedDrawerEmit,
  RecorderAdvancedDrawerProps,
} from "./useRecorderAdvancedDrawer";
import { useRecorderAdvancedDrawer } from "./useRecorderAdvancedDrawer";

function props(overrides: Partial<RecorderAdvancedDrawerProps> = {}): RecorderAdvancedDrawerProps {
  return {
    open: false,
    model: "tiny",
    mode: "auto",
    language: "auto",
    spokenPunctuation: false,
    waveformStyle: "classic",
    inputDevices: [],
    selectedInputDeviceId: null,
    isLoadingInputDevices: false,
    qualityGuidanceMessages: [],
    telemetryBudgetSummary: null,
    diagnosticsCode: null,
    ...overrides,
  };
}

describe("useRecorderAdvancedDrawer", () => {
  it("builds select options and marks default input device", () => {
    const emit = vi.fn() as unknown as RecorderAdvancedDrawerEmit;
    const drawer = useRecorderAdvancedDrawer({
      t: (key) => key,
      props: props({
        inputDevices: [
          { id: "mic-1", label: "Internal Mic", isDefault: true },
          { id: "mic-2", label: "USB Mic", isDefault: false },
        ],
      }),
      emit,
    });

    expect(drawer.modelOptions.value.map((item) => item.value)).toEqual(["tiny", "base"]);
    expect(drawer.modeOptions.value.map((item) => item.value)).toEqual([
      "auto",
      "live+final",
      "final-only",
    ]);
    expect(drawer.languageOptions.value.map((item) => item.value)).toEqual(["auto", "en", "fr"]);
    expect(drawer.waveformStyleOptions.value.map((item) => item.value)).toEqual([
      "classic",
      "pulse-bars",
      "ribbon",
      "spark",
      "timeline",
    ]);
    expect(drawer.inputDeviceOptions.value).toEqual([
      {
        label: "Internal Mic (settings.recorder.input_device_default)",
        value: "mic-1",
      },
      { label: "USB Mic", value: "mic-2" },
    ]);
  });

  it("falls back to 'none' option and emits typed update events", () => {
    const emit = vi.fn() as unknown as RecorderAdvancedDrawerEmit;
    const drawer = useRecorderAdvancedDrawer({
      t: (key) => key,
      props: props(),
      emit,
    });

    expect(drawer.inputDeviceOptions.value).toEqual([
      { label: "settings.recorder.input_device_none", value: "" },
    ]);

    drawer.updateModel("base");
    drawer.updateMode("final-only");
    drawer.updateLanguage("fr");
    drawer.updateWaveformStyle("spark");
    drawer.updateInputDevice("mic-2");
    drawer.updateInputDevice("");

    expect(emit).toHaveBeenCalledWith("update:model", "base");
    expect(emit).toHaveBeenCalledWith("update:mode", "final-only");
    expect(emit).toHaveBeenCalledWith("update:language", "fr");
    expect(emit).toHaveBeenCalledWith("update:waveformStyle", "spark");
    expect(emit).toHaveBeenCalledWith("update:selectedInputDeviceId", "mic-2");
    expect(emit).toHaveBeenCalledWith("update:selectedInputDeviceId", null);
  });
});
