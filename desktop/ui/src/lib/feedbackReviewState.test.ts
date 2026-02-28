import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isFeedbackReviewed,
  markFeedbackReviewed,
  readReviewedFeedbackIds,
} from "./feedbackReviewState";

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

describe("feedbackReviewState", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: globalThis,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "window");
  });

  it("marks and reads reviewed feedback ids", () => {
    markFeedbackReviewed("p1", "fb-1");
    expect(isFeedbackReviewed("p1", "fb-1")).toBe(true);
    expect(Array.from(readReviewedFeedbackIds("p1"))).toContain("fb-1");
  });

  it("ignores blank feedback ids", () => {
    markFeedbackReviewed("p1", "   ");
    expect(readReviewedFeedbackIds("p1").size).toBe(0);
  });

  it("caps persisted ids and keeps the most recent", () => {
    for (let i = 0; i < 450; i += 1) {
      markFeedbackReviewed("p1", `fb-${i}`);
    }
    const reviewed = readReviewedFeedbackIds("p1");
    expect(reviewed.size).toBe(400);
    expect(reviewed.has("fb-0")).toBe(false);
    expect(reviewed.has("fb-449")).toBe(true);
  });

  it("returns empty set on malformed payload", () => {
    globalThis.localStorage.setItem("lepupitre.feedback.reviewed.p1", "{bad-json");
    expect(readReviewedFeedbackIds("p1").size).toBe(0);
  });
});
