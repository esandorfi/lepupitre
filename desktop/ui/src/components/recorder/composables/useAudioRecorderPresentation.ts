import { createReviewPresentation } from "@/components/recorder/composables/presentation/audioRecorderPresentationReview";
import { createVisualPresentation } from "@/components/recorder/composables/presentation/audioRecorderPresentationVisuals";
import type { AudioRecorderPresentationParams } from "@/components/recorder/composables/presentation/audioRecorderPresentation.types";

/**
 * Provides the use audio recorder presentation composable contract.
 */
export function useAudioRecorderPresentation(params: AudioRecorderPresentationParams) {
  const review = createReviewPresentation(params);
  const visuals = createVisualPresentation(params);

  return {
    ...review,
    ...visuals,
  };
}
