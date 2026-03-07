import { describe, expect, it, vi } from "vitest";
import type { RecorderQuickCleanPanelEmit } from "./quickClean.types";
import { createOnboardingState } from "./quickClean.onboarding";

describe("quickClean.onboarding", () => {
  it("initializes onboarding refs and emits context updates", () => {
    const emit = vi.fn() as unknown as RecorderQuickCleanPanelEmit;
    const onboarding = createOnboardingState(emit);

    expect(onboarding.showOnboarding.value).toBe(true);
    expect(onboarding.onboardingAudience.value).toBe("");
    expect(onboarding.onboardingGoal.value).toBe("");
    expect(onboarding.onboardingTargetMinutes.value).toBeNull();

    onboarding.selectAudience("team");
    expect(onboarding.onboardingAudience.value).toBe("team");
    expect(emit).toHaveBeenLastCalledWith("onboardingContext", {
      audience: "team",
      audienceCustom: "",
      goal: "",
      targetMinutes: null,
    });

    onboarding.onboardingAudienceCustom.value = "Executives";
    onboarding.selectAudience("other");
    expect(onboarding.onboardingAudience.value).toBe("other");
    expect(emit).toHaveBeenLastCalledWith("onboardingContext", {
      audience: "other",
      audienceCustom: "Executives",
      goal: "",
      targetMinutes: null,
    });

    onboarding.selectAudience("other");
    expect(onboarding.onboardingAudience.value).toBe("");
    expect(onboarding.onboardingAudienceCustom.value).toBe("");
  });

  it("toggles goal, supports skip, and forwards target minutes in payload", () => {
    const emit = vi.fn() as unknown as RecorderQuickCleanPanelEmit;
    const onboarding = createOnboardingState(emit);

    onboarding.onboardingTargetMinutes.value = 12;
    onboarding.selectGoal("inform");
    expect(onboarding.onboardingGoal.value).toBe("inform");
    expect(emit).toHaveBeenLastCalledWith("onboardingContext", {
      audience: "",
      audienceCustom: "",
      goal: "inform",
      targetMinutes: 12,
    });

    onboarding.selectGoal("inform");
    expect(onboarding.onboardingGoal.value).toBe("");

    onboarding.skipOnboarding();
    expect(onboarding.showOnboarding.value).toBe(false);
  });
});
