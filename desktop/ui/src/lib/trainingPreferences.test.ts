import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  readAchievementMemory,
  readStoredHeroQuestCode,
  writeAchievementMemory,
  writeStoredHeroQuestCode,
} from "./trainingPreferences";

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

describe("trainingPreferences", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
  });

  it("reads and writes hero quest preference", () => {
    writeStoredHeroQuestCode("p1", "Q-12");
    expect(readStoredHeroQuestCode("p1")).toBe("Q-12");
  });

  it("ignores oversized hero quest values", () => {
    const oversized = "Q".repeat(70);
    writeStoredHeroQuestCode("p1", oversized);
    expect(readStoredHeroQuestCode("p1")).toBeNull();
  });

  it("reads and normalizes achievement memory", () => {
    writeAchievementMemory("p1", {
      creditTier: 2.8,
      maxStreak: 6.2,
    });
    expect(readAchievementMemory("p1")).toEqual({
      creditTier: 2,
      maxStreak: 6,
    });
  });

  it("returns null for malformed achievement memory", () => {
    globalThis.localStorage.setItem(
      "lepupitre.training.achievements.p1",
      "{\"creditTier\":\"oops\"}"
    );
    expect(readAchievementMemory("p1")).toBeNull();
  });
});
