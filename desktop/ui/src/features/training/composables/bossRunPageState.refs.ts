import { ref, type Ref } from "vue";
import type { RunSummary } from "@/schemas/ipc";

export type BossRunRefs = {
  error: Ref<string | null>;
  isLoading: Ref<boolean>;
  isSaving: Ref<boolean>;
  isAnalyzing: Ref<boolean>;
  run: Ref<RunSummary | null>;
  pendingTranscriptId: Ref<string | null>;
};

/**
 * Creates and returns the create boss run refs contract.
 */
export function createBossRunRefs(): BossRunRefs {
  return {
    error: ref<string | null>(null),
    isLoading: ref(false),
    isSaving: ref(false),
    isAnalyzing: ref(false),
    run: ref<RunSummary | null>(null),
    pendingTranscriptId: ref<string | null>(null),
  };
}
