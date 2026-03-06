import type { Ref } from "vue";
import type { UiSettings } from "@/lib/uiPreferences";
import type { AudioRecorderState } from "@/components/recorder/composables/useAudioRecorderState";

export type AudioRecorderPresentationParams = {
  state: AudioRecorderState;
  t: (key: string) => string;
  uiSettings: Ref<UiSettings>;
  canAnalyze: Ref<boolean>;
  hasAnalysisResult: Ref<boolean>;
};
