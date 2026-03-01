import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

function createStorage(seed: Record<string, string> = {}): FakeStorage {
  const state = { ...seed };
  return {
    getItem: (key: string) => (key in state ? state[key] : null),
    setItem: (key: string, value: string) => {
      state[key] = String(value);
    },
    removeItem: (key: string) => {
      delete state[key];
    },
    clear: () => {
      for (const key of Object.keys(state)) {
        delete state[key];
      }
    },
  };
}

describe("uiPreferences", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("defaults to sidebar navigation mode", async () => {
    const { useUiPreferences } = await import("./uiPreferences");
    const { settings } = useUiPreferences();
    expect(settings.value.primaryNavMode).toBe("sidebar-icon");
    expect(settings.value.sidebarPinned).toBe(false);
    expect(settings.value.onboardingSeen).toBe(false);
    expect(settings.value.gamificationMode).toBe("balanced");
    expect(settings.value.mascotEnabled).toBe(true);
    expect(settings.value.mascotIntensity).toBe("contextual");
    expect(settings.value.waveformStyle).toBe("classic");
  });

  it("updates and persists navigation mode", async () => {
    const { useUiPreferences } = await import("./uiPreferences");
    const { settings, setPrimaryNavMode } = useUiPreferences();

    setPrimaryNavMode("sidebar-icon");

    expect(settings.value.primaryNavMode).toBe("sidebar-icon");
    const stored = globalThis.localStorage.getItem("lepupitre_ui_settings_v1") ?? "";
    expect(stored).toContain("sidebar-icon");
  });

  it("updates and persists sidebar pin setting", async () => {
    const { useUiPreferences } = await import("./uiPreferences");
    const { settings, setSidebarPinned } = useUiPreferences();

    setSidebarPinned(true);

    expect(settings.value.sidebarPinned).toBe(true);
    const stored = globalThis.localStorage.getItem("lepupitre_ui_settings_v1") ?? "";
    expect(stored).toContain("\"sidebarPinned\":true");
  });

  it("updates and persists onboarding completion", async () => {
    const { useUiPreferences } = await import("./uiPreferences");
    const { settings, setOnboardingSeen } = useUiPreferences();

    setOnboardingSeen(true);

    expect(settings.value.onboardingSeen).toBe(true);
    const stored = globalThis.localStorage.getItem("lepupitre_ui_settings_v1") ?? "";
    expect(stored).toContain("\"onboardingSeen\":true");
  });

  it("marks onboarding seen for legacy saved settings", async () => {
    vi.resetModules();
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage({
        lepupitre_ui_settings_v1: JSON.stringify({
          primaryNavMode: "top",
          sidebarPinned: false,
        }),
      }),
      configurable: true,
      writable: true,
    });
    const { useUiPreferences } = await import("./uiPreferences");
    const { settings } = useUiPreferences();
    expect(settings.value.primaryNavMode).toBe("top");
    expect(settings.value.onboardingSeen).toBe(true);
    expect(settings.value.gamificationMode).toBe("balanced");
    expect(settings.value.mascotEnabled).toBe(true);
    expect(settings.value.mascotIntensity).toBe("contextual");
    expect(settings.value.waveformStyle).toBe("classic");
  });

  it("migrates legacy storage key to the current key", async () => {
    vi.resetModules();
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage({
        lepupitre_ui_settings: JSON.stringify({
          primaryNavMode: "top",
          sidebarPinned: true,
        }),
      }),
      configurable: true,
      writable: true,
    });
    const { useUiPreferences } = await import("./uiPreferences");
    const { settings } = useUiPreferences();
    expect(settings.value.primaryNavMode).toBe("top");
    expect(settings.value.sidebarPinned).toBe(true);
    expect(globalThis.localStorage.getItem("lepupitre_ui_settings")).toBeNull();
    const migrated = globalThis.localStorage.getItem("lepupitre_ui_settings_v1") ?? "";
    expect(migrated).toContain("\"primaryNavMode\":\"top\"");
  });

  it("falls back to defaults for malformed saved settings", async () => {
    vi.resetModules();
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage({
        lepupitre_ui_settings_v1: "{bad-json",
      }),
      configurable: true,
      writable: true,
    });
    const { useUiPreferences } = await import("./uiPreferences");
    const { settings } = useUiPreferences();
    expect(settings.value.primaryNavMode).toBe("sidebar-icon");
    expect(settings.value.sidebarPinned).toBe(false);
    expect(settings.value.onboardingSeen).toBe(false);
    expect(settings.value.gamificationMode).toBe("balanced");
    expect(settings.value.mascotEnabled).toBe(true);
    expect(settings.value.mascotIntensity).toBe("contextual");
    expect(settings.value.waveformStyle).toBe("classic");
  });

  it("persists voiceup mascot and gamification preferences", async () => {
    const { useUiPreferences } = await import("./uiPreferences");
    const {
      settings,
      setGamificationMode,
      setMascotEnabled,
      setMascotIntensity,
    } = useUiPreferences();

    setGamificationMode("quest-world");
    setMascotEnabled(false);
    setMascotIntensity("minimal");

    expect(settings.value.gamificationMode).toBe("quest-world");
    expect(settings.value.mascotEnabled).toBe(false);
    expect(settings.value.mascotIntensity).toBe("minimal");
    const stored = globalThis.localStorage.getItem("lepupitre_ui_settings_v1") ?? "";
    expect(stored).toContain("\"gamificationMode\":\"quest-world\"");
    expect(stored).toContain("\"mascotEnabled\":false");
    expect(stored).toContain("\"mascotIntensity\":\"minimal\"");
  });

  it("persists waveform style preferences and falls back when invalid", async () => {
    const { useUiPreferences } = await import("./uiPreferences");
    const { settings, setWaveformStyle } = useUiPreferences();

    setWaveformStyle("spark");

    expect(settings.value.waveformStyle).toBe("spark");
    const stored = globalThis.localStorage.getItem("lepupitre_ui_settings_v1") ?? "";
    expect(stored).toContain("\"waveformStyle\":\"spark\"");

    vi.resetModules();
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage({
        lepupitre_ui_settings_v1: JSON.stringify({
          waveformStyle: "invalid-style",
        }),
      }),
      configurable: true,
      writable: true,
    });
    const reloaded = (await import("./uiPreferences")).useUiPreferences();
    expect(reloaded.settings.value.waveformStyle).toBe("classic");
  });
});
