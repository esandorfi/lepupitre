import { ref, type Ref } from "vue";
import type { Quest } from "@/schemas/ipc";

export type QuestRefs = {
  text: Ref<string>;
  error: Ref<string | null>;
  isSubmitting: Ref<boolean>;
  isAnalyzing: Ref<boolean>;
  isLoading: Ref<boolean>;
  submittedTextSnapshot: Ref<string | null>;
  quest: Ref<Quest | null>;
  attemptId: Ref<string | null>;
  audioArtifactId: Ref<string | null>;
  transcriptId: Ref<string | null>;
};

export function createQuestRefs(): QuestRefs {
  return {
    text: ref(""),
    error: ref<string | null>(null),
    isSubmitting: ref(false),
    isAnalyzing: ref(false),
    isLoading: ref(false),
    submittedTextSnapshot: ref<string | null>(null),
    quest: ref<Quest | null>(null),
    attemptId: ref<string | null>(null),
    audioArtifactId: ref<string | null>(null),
    transcriptId: ref<string | null>(null),
  };
}
