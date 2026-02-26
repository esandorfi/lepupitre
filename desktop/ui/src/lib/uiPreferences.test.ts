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

  it("defaults to top navigation mode", async () => {
    const { useUiPreferences } = await import("./uiPreferences");
    const { settings } = useUiPreferences();
    expect(settings.value.primaryNavMode).toBe("top");
    expect(settings.value.sidebarPinned).toBe(false);
  });

  it("updates and persists navigation mode", async () => {
    const { useUiPreferences } = await import("./uiPreferences");
    const { settings, setPrimaryNavMode } = useUiPreferences();

    setPrimaryNavMode("sidebar-icon");

    expect(settings.value.primaryNavMode).toBe("sidebar-icon");
    const stored = globalThis.localStorage.getItem("lepupitre_ui_settings_v1") ?? "";
    expect(stored).toContain("sidebar-icon");
  });
});
