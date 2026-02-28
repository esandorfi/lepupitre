import helpTrainingDailyLoopRaw from "./help-training-daily-loop.md?raw";
import helpTrainingQuestRunRaw from "./help-training-quest-run.md?raw";
import helpTrainingFeedbackPrioritiesRaw from "./help-training-feedback-priorities.md?raw";
import helpTrainingBossRunRaw from "./help-training-boss-run.md?raw";
import helpTalksBuilderOutlineRaw from "./help-talks-builder-outline.md?raw";
import helpPacksImportExportRaw from "./help-packs-import-export.md?raw";
import helpSettingsTranscriptionRaw from "./help-settings-transcription.md?raw";
import onboardingFirstTimeSpeakerRaw from "./onboarding-first-time-speaker.md?raw";
import onboardingEngineeringManagerRaw from "./onboarding-engineering-manager.md?raw";
import onboardingConferenceSpeakerRaw from "./onboarding-conference-speaker.md?raw";

export type RawHelpContent = {
  path: string;
  raw: string;
};

export const HELP_CONTENT_FILES: RawHelpContent[] = [
  { path: "help-training-daily-loop.md", raw: helpTrainingDailyLoopRaw },
  { path: "help-training-quest-run.md", raw: helpTrainingQuestRunRaw },
  { path: "help-training-feedback-priorities.md", raw: helpTrainingFeedbackPrioritiesRaw },
  { path: "help-training-boss-run.md", raw: helpTrainingBossRunRaw },
  { path: "help-talks-builder-outline.md", raw: helpTalksBuilderOutlineRaw },
  { path: "help-packs-import-export.md", raw: helpPacksImportExportRaw },
  { path: "help-settings-transcription.md", raw: helpSettingsTranscriptionRaw },
  { path: "onboarding-first-time-speaker.md", raw: onboardingFirstTimeSpeakerRaw },
  { path: "onboarding-engineering-manager.md", raw: onboardingEngineeringManagerRaw },
  { path: "onboarding-conference-speaker.md", raw: onboardingConferenceSpeakerRaw },
];
