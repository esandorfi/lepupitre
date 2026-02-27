import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FakeStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function createStorage(seed: Record<string, string> = {}): FakeStorage {
  const state = { ...seed };
  return {
    getItem: (key: string) => (key in state ? state[key] : null),
    setItem: (key: string, value: string) => {
      state[key] = String(value);
    },
  };
}

describe("transcriptionSettings", () => {
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

  it("defaults to tiny/auto/auto with spoken punctuation off", async () => {
    const { useTranscriptionSettings } = await import("./transcriptionSettings");
    const { settings } = useTranscriptionSettings();
    expect(settings.value).toEqual({
      model: "tiny",
      mode: "auto",
      language: "auto",
      spokenPunctuation: false,
    });
  });

  it("persists updates used by IPC payloads", async () => {
    const { useTranscriptionSettings } = await import("./transcriptionSettings");
    const { settings, updateSettings } = useTranscriptionSettings();
    updateSettings({
      model: "base",
      mode: "final-only",
      language: "fr",
      spokenPunctuation: true,
    });
    expect(settings.value).toEqual({
      model: "base",
      mode: "final-only",
      language: "fr",
      spokenPunctuation: true,
    });
    const stored = globalThis.localStorage.getItem("lepupitre_transcription_settings") ?? "";
    expect(stored).toContain("\"model\":\"base\"");
    expect(stored).toContain("\"mode\":\"final-only\"");
    expect(stored).toContain("\"language\":\"fr\"");
    expect(stored).toContain("\"spokenPunctuation\":true");
  });

  it("rejects malformed saved values and falls back safely", async () => {
    vi.resetModules();
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage({
        lepupitre_transcription_settings: JSON.stringify({
          model: "bad",
          mode: "unknown",
          language: "es",
          spokenPunctuation: "yes",
        }),
      }),
      configurable: true,
      writable: true,
    });
    const { useTranscriptionSettings } = await import("./transcriptionSettings");
    const { settings } = useTranscriptionSettings();
    expect(settings.value).toEqual({
      model: "tiny",
      mode: "auto",
      language: "auto",
      spokenPunctuation: false,
    });
  });
});
