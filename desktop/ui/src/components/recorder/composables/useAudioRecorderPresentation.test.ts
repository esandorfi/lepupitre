import { describe, expect, it, vi } from "vitest";
import type { AudioRecorderPresentationParams } from "@/components/recorder/composables/presentation/audioRecorderPresentation.types";
import { useAudioRecorderPresentation } from "./useAudioRecorderPresentation";

const presentationMocks = vi.hoisted(() => ({
  createReviewPresentation: vi.fn(),
  createVisualPresentation: vi.fn(),
}));

vi.mock("@/components/recorder/composables/presentation/audioRecorderPresentationReview", () => ({
  createReviewPresentation: presentationMocks.createReviewPresentation,
}));

vi.mock("@/components/recorder/composables/presentation/audioRecorderPresentationVisuals", () => ({
  createVisualPresentation: presentationMocks.createVisualPresentation,
}));

describe("useAudioRecorderPresentation", () => {
  it("combines review and visuals presentation factories", () => {
    const params = {} as AudioRecorderPresentationParams;
    presentationMocks.createReviewPresentation.mockReturnValue({ reviewStateLabel: "Review" });
    presentationMocks.createVisualPresentation.mockReturnValue({ waveformStyleClass: "spark" });

    const result = useAudioRecorderPresentation(params);

    expect(presentationMocks.createReviewPresentation).toHaveBeenCalledWith(params);
    expect(presentationMocks.createVisualPresentation).toHaveBeenCalledWith(params);
    expect(result).toEqual({
      reviewStateLabel: "Review",
      waveformStyleClass: "spark",
    });
  });
});
