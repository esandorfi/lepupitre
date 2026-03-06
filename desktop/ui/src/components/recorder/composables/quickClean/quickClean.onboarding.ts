import { ref } from "vue";
import type { RecorderQuickCleanPanelEmit } from "@/components/recorder/composables/quickClean/quickClean.types";

export function createOnboardingState(emit: RecorderQuickCleanPanelEmit) {
  const showOnboarding = ref(true);
  const onboardingAudience = ref("");
  const onboardingAudienceCustom = ref("");
  const onboardingGoal = ref("");
  const onboardingTargetMinutes = ref<number | null>(null);

  function emitOnboardingContext() {
    emit("onboardingContext", {
      audience: onboardingAudience.value,
      audienceCustom: onboardingAudienceCustom.value,
      goal: onboardingGoal.value,
      targetMinutes: onboardingTargetMinutes.value,
    });
  }

  function selectAudience(value: string) {
    onboardingAudience.value = onboardingAudience.value === value ? "" : value;
    if (onboardingAudience.value !== "other") {
      onboardingAudienceCustom.value = "";
    }
    emitOnboardingContext();
  }

  function selectGoal(value: string) {
    onboardingGoal.value = onboardingGoal.value === value ? "" : value;
    emitOnboardingContext();
  }

  function skipOnboarding() {
    showOnboarding.value = false;
  }

  return {
    showOnboarding,
    onboardingAudience,
    onboardingAudienceCustom,
    onboardingGoal,
    onboardingTargetMinutes,
    emitOnboardingContext,
    selectAudience,
    selectGoal,
    skipOnboarding,
  };
}
