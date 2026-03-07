import { ref } from "vue";
import { describe, expect, it } from "vitest";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import { autoCleanFillers, fixPunctuation } from "./audioRecorderReviewTextCleanup";

function createDeps(initialText: string) {
  return {
    transcriptDraftText: ref(initialText),
  } as unknown as AudioRecorderRuntimeDeps;
}

describe("audioRecorderReviewTextCleanup", () => {
  it("removes common filler words and normalizes extra spaces/newlines", () => {
    const deps = createDeps("um hello you know there\n\n\nlike this is fine");

    autoCleanFillers(deps);

    expect(deps.transcriptDraftText.value).toBe("hello there this is fine");
  });

  it("repairs punctuation spacing and sentence capitalization", () => {
    const deps = createDeps("hello ,world. this is fine!ok?");

    fixPunctuation(deps);

    expect(deps.transcriptDraftText.value).toBe("Hello, world. This is fine! Ok?");
  });
});
