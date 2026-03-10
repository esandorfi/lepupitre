import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

type UiPreferencesModule = Awaited<typeof import("./uiPreferences")>;

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

function setLocalStorage(seed: Record<string, string> = {}) {
  vi.resetModules();
  Object.defineProperty(globalThis, "localStorage", {
    value: createStorage(seed),
    configurable: true,
    writable: true,
  });
}

async function loadUiPreferences(): Promise<ReturnType<UiPreferencesModule["useUiPreferences"]>> {
  return (await import("./uiPreferences")).useUiPreferences();
}

function expectDefaultSettings(settings: ReturnType<UiPreferencesModule["useUiPreferences"]>["settings"]) {
  expect(settings.value.primaryNavMode).toBe("sidebar-icon");
  expect(settings.value.sidebarPinned).toBe(false);
  expect(settings.value.onboardingSeen).toBe(false);
  expect(settings.value.gamificationMode).toBe("balanced");
  expect(settings.value.mascotEnabled).toBe(true);
  expect(settings.value.mascotIntensity).toBe("contextual");
  expect(settings.value.waveformStyle).toBe("classic");
}

describe("uiPreferences", () => {
  beforeEach(() => {
    setLocalStorage();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("defaults to sidebar navigation mode", async () => {
    const { settings } = await loadUiPreferences();
    expectDefaultSettings(settings);
  });

  it("updates and persists navigation mode", async () => {
    const { settings, setPrimaryNavMode } = await loadUiPreferences();

    setPrimaryNavMode("sidebar-icon");

    expect(settings.value.primaryNavMode).toBe("sidebar-icon");
    const stored = globalThis.localStorage.getItem("lepupitre_ui_settings_v1") ?? "";
    expect(stored).toContain("sidebar-icon");
  });

  it("updates and persists sidebar pin setting", async () => {
    const { settings, setSidebarPinned } = await loadUiPreferences();

    setSidebarPinned(true);

    expect(settings.value.sidebarPinned).toBe(true);
    const stored = globalThis.localStorage.getItem("lepupitre_ui_settings_v1") ?? "";
    expect(stored).toContain("\"sidebarPinned\":true");
  });

  it("updates and persists onboarding completion", async () => {
    const { settings, setOnboardingSeen } = await loadUiPreferences();

    setOnboardingSeen(true);

    expect(settings.value.onboardingSeen).toBe(true);
    const stored = globalThis.localStorage.getItem("lepupitre_ui_settings_v1") ?? "";
    expect(stored).toContain("\"onboardingSeen\":true");
  });

  it("marks onboarding seen for legacy saved settings", async () => {
    setLocalStorage({
      lepupitre_ui_settings_v1: JSON.stringify({
        primaryNavMode: "top",
        sidebarPinned: false,
      }),
    });
    const { settings } = await loadUiPreferences();
    expect(settings.value.primaryNavMode).toBe("top");
    expect(settings.value.onboardingSeen).toBe(true);
    expect(settings.value.gamificationMode).toBe("balanced");
    expect(settings.value.mascotEnabled).toBe(true);
    expect(settings.value.mascotIntensity).toBe("contextual");
    expect(settings.value.waveformStyle).toBe("classic");
  });

  it("migrates legacy storage key to the current key", async () => {
    setLocalStorage({
      lepupitre_ui_settings: JSON.stringify({
        primaryNavMode: "top",
        sidebarPinned: true,
      }),
    });
    const { settings } = await loadUiPreferences();
    expect(settings.value.primaryNavMode).toBe("top");
    expect(settings.value.sidebarPinned).toBe(true);
    expect(globalThis.localStorage.getItem("lepupitre_ui_settings")).toBeNull();
    const migrated = globalThis.localStorage.getItem("lepupitre_ui_settings_v1") ?? "";
    expect(migrated).toContain("\"primaryNavMode\":\"top\"");
  });

  it("falls back to defaults for malformed saved settings", async () => {
    setLocalStorage({
      lepupitre_ui_settings_v1: "{bad-json",
    });
    const { settings } = await loadUiPreferences();
    expectDefaultSettings(settings);
  });

  it("persists voiceup mascot and gamification preferences", async () => {
    const {
      settings,
      setGamificationMode,
      setMascotEnabled,
      setMascotIntensity,
    } = await loadUiPreferences();

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
    const { settings, setWaveformStyle } = await loadUiPreferences();

    setWaveformStyle("spark");

    expect(settings.value.waveformStyle).toBe("spark");
    const stored = globalThis.localStorage.getItem("lepupitre_ui_settings_v1") ?? "";
    expect(stored).toContain("\"waveformStyle\":\"spark\"");

    setLocalStorage({
      lepupitre_ui_settings_v1: JSON.stringify({
        waveformStyle: "invalid-style",
      }),
    });
    const reloaded = await loadUiPreferences();
    expect(reloaded.settings.value.waveformStyle).toBe("classic");
  });

  it("exposes setter helpers for the full UI preference contract", async () => {
    const preferences = await loadUiPreferences();

    expect(typeof preferences.setPrimaryNavMode).toBe("function");
    expect(typeof preferences.setSidebarPinned).toBe("function");
    expect(typeof preferences.setOnboardingSeen).toBe("function");
    expect(typeof preferences.setGamificationMode).toBe("function");
    expect(typeof preferences.setMascotEnabled).toBe("function");
    expect(typeof preferences.setMascotIntensity).toBe("function");
    expect(typeof preferences.setWaveformStyle).toBe("function");
  });
});
