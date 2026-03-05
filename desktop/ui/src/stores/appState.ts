import { reactive } from "vue";
import type {
  FeedbackContext,
  ProfileSummary,
  ProjectListItem,
  ProjectSummary,
  QuestAttemptSummary,
  QuestDaily,
} from "../schemas/ipc";

export type AppState = {
  profiles: ProfileSummary[];
  activeProfileId: string | null;
  hasBootstrapped: boolean;
  isBootstrapping: boolean;
  activeProject: ProjectSummary | null;
  trainingProjectId: string | null;
  projects: ProjectListItem[];
  dailyQuest: QuestDaily | null;
  recentAttempts: QuestAttemptSummary[];
  lastAttemptId: string | null;
  lastFeedbackId: string | null;
  lastFeedbackContext: FeedbackContext | null;
};

export const appState = reactive<AppState>({
  profiles: [],
  activeProfileId: null,
  hasBootstrapped: false,
  isBootstrapping: false,
  activeProject: null,
  trainingProjectId: null,
  projects: [],
  dailyQuest: null,
  recentAttempts: [],
  lastAttemptId: null,
  lastFeedbackId: null,
  lastFeedbackContext: null,
});

