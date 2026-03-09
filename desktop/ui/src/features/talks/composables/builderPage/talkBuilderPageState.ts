import { ref, type Ref } from "vue";
import type { TalksBlueprint } from "@/schemas/ipc";
import type { RuntimeErrorCategory } from "@/features/shared/runtime/runtimeContract";

export type BuilderState = {
  error: Ref<string | null>;
  errorCategory: Ref<RuntimeErrorCategory | null>;
  isLoading: Ref<boolean>;
  isSaving: Ref<boolean>;
  saveStatus: Ref<"idle" | "saving" | "saved" | "error">;
  outline: Ref<string>;
  exportPath: Ref<string | null>;
  isExporting: Ref<boolean>;
  isRevealing: Ref<boolean>;
  blueprint: Ref<TalksBlueprint | null>;
  isApplyingTemplate: Ref<boolean>;
};

/**
 * Allocates reactive state atoms used by the builder page.
 */
export function createBuilderState(): BuilderState {
  return {
    error: ref<string | null>(null),
    errorCategory: ref<RuntimeErrorCategory | null>(null),
    isLoading: ref(false),
    isSaving: ref(false),
    saveStatus: ref<"idle" | "saving" | "saved" | "error">("idle"),
    outline: ref(""),
    exportPath: ref<string | null>(null),
    isExporting: ref(false),
    isRevealing: ref(false),
    blueprint: ref<TalksBlueprint | null>(null),
    isApplyingTemplate: ref(false),
  };
}
