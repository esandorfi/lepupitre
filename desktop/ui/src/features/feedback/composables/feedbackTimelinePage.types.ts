import { appState } from "@/stores/app";

export type FeedbackTimelineFilterType = "all" | "quest_attempt" | "run";
export type FeedbackTimelineScope = "workspace" | "talk";

export type FeedbackTimelineRow = {
  id: string;
  contextLabel: string;
  createdAtLabel: string;
  title: string;
  reviewed: boolean;
  reviewedTone: "success" | "neutral";
  score: number;
  scoreTone: "success" | "neutral" | "error";
  hasNote: boolean;
  route: string;
  selected: boolean;
};

export type TimelineState = typeof appState;
