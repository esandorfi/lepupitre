import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { invokeChecked } from "../composables/useIpc";

vi.mock("../composables/useIpc", () => ({
  invokeChecked: vi.fn(),
}));

type FakeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
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
  };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("preferencesStorage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(invokeChecked).mockReset();
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage(),
      configurable: true,
      writable: true,
    });
    Reflect.deleteProperty(globalThis, "window");
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "window");
  });

  it("uses local fallback when Tauri runtime is unavailable", async () => {
    const { writePreference, readPreference } = await import("./preferencesStorage");
    writePreference("lepupitre.locale", "fr");
    expect(readPreference("lepupitre.locale")).toBe("fr");
    expect(vi.mocked(invokeChecked)).not.toHaveBeenCalled();
  });

  it("hydrates local value from backend when available", async () => {
    Object.defineProperty(globalThis, "window", {
      value: { __TAURI_INTERNALS__: {} },
      configurable: true,
      writable: true,
    });
    vi.mocked(invokeChecked).mockResolvedValue("terminal");

    const { readPreference } = await import("./preferencesStorage");
    expect(readPreference("lepupitre_theme")).toBeNull();
    await flush();
    expect(globalThis.localStorage.getItem("lepupitre_theme")).toBe("terminal");
  });

  it("seeds backend from local value when backend has no value", async () => {
    Object.defineProperty(globalThis, "window", {
      value: { __TAURI_INTERNALS__: {} },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage({ lepupitre_locale: "fr" }),
      configurable: true,
      writable: true,
    });
    vi.mocked(invokeChecked).mockImplementation(async (command: string) => {
      if (command === "preference_global_get") {
        return null;
      }
      return null;
    });

    const { readPreference } = await import("./preferencesStorage");
    expect(readPreference("lepupitre_locale")).toBe("fr");
    await flush();

    expect(vi.mocked(invokeChecked)).toHaveBeenCalledWith(
      "preference_global_set",
      expect.anything(),
      expect.anything(),
      {
        key: "lepupitre_locale",
        value: "fr",
      }
    );
  });

  it("writes profile-scoped preferences through profile IPC command", async () => {
    Object.defineProperty(globalThis, "window", {
      value: { __TAURI_INTERNALS__: {} },
      configurable: true,
      writable: true,
    });
    vi.mocked(invokeChecked).mockResolvedValue(null);

    const { writePreference } = await import("./preferencesStorage");
    writePreference("lepupitre.training.heroQuest.p1", "Q-12", {
      scope: "profile",
      profileId: "p1",
    });
    await flush();

    expect(vi.mocked(invokeChecked)).toHaveBeenCalledWith(
      "preference_profile_set",
      expect.anything(),
      expect.anything(),
      {
        profileId: "p1",
        key: "lepupitre.training.heroQuest.p1",
        value: "Q-12",
      }
    );
  });
});
