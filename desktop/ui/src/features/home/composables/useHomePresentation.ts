import type { QuestAttemptSummary } from "@/schemas/ipc";

export type QuestMapNode = {
  id: string;
  label: string;
  reward: number;
  category: string | null;
  done: boolean;
  current: boolean;
  offsetPx: number;
};

export type DailyLoopStep = {
  id: string;
  title: string;
  done: boolean;
  ctaRoute: string;
};

export type RewardBadge = {
  id: string;
  title: string;
  unlocked: boolean;
  current: number;
  target: number;
};

type Translate = (key: string) => string;

/**
 * Provides the use home presentation composable contract.
 */
export function useHomePresentation(t: Translate) {
  function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString();
  }

  function estimatedMinutesLabel(seconds: number) {
    return Math.max(1, Math.round(seconds / 60));
  }

  function attemptStatus(attempt: QuestAttemptSummary) {
    if (attempt.has_feedback) {
      return t("quest.status_feedback");
    }
    if (attempt.has_transcript) {
      return t("quest.status_transcribed");
    }
    if (attempt.has_audio) {
      return t("quest.status_recorded");
    }
    return t("quest.status_submitted");
  }

  function outputLabel(outputType: string) {
    return outputType.toLowerCase() === "audio"
      ? t("quest.output_audio")
      : t("quest.output_text");
  }

  function toError(err: unknown) {
    return err instanceof Error ? err.message : String(err);
  }

  function mascotToneClass(kind: string | null | undefined) {
    if (kind === "celebrate") {
      return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_15%,var(--color-surface))]";
    }
    if (kind === "nudge") {
      return "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent-soft)_35%,var(--color-surface))]";
    }
    return "border-[var(--color-border)] bg-[var(--color-surface-elevated)]";
  }

  function questMapNodeClass(node: QuestMapNode) {
    if (node.done) {
      return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_22%,var(--color-surface))] text-[var(--color-success)]";
    }
    if (node.current) {
      return "border-[var(--color-accent)] bg-[var(--color-surface-selected)] text-[var(--color-accent)]";
    }
    return "border-[var(--app-border)] bg-[var(--color-surface-elevated)] text-[var(--color-muted)]";
  }

  function questMapConnectorClass(done: boolean) {
    return done
      ? "bg-[var(--color-success)]"
      : "bg-[color-mix(in_srgb,var(--app-border)_70%,transparent)]";
  }

  function dailyLoopStepClass(done: boolean) {
    if (done) {
      return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface))]";
    }
    return "border-[var(--app-border)] bg-[var(--color-surface-elevated)]";
  }

  function rewardBadgeClass(unlocked: boolean, isNext: boolean) {
    if (unlocked) {
      return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_14%,var(--color-surface))]";
    }
    if (isNext) {
      return "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent-soft)_35%,var(--color-surface))]";
    }
    return "border-[var(--app-border)] bg-[var(--color-surface-elevated)]";
  }

  function questMapNodeAriaLabel(node: QuestMapNode) {
    const category = node.category ?? t("training.quest_map_any_category");
    return `${node.label} (${category})`;
  }

  return {
    attemptStatus,
    dailyLoopStepClass,
    estimatedMinutesLabel,
    formatDate,
    mascotToneClass,
    outputLabel,
    questMapConnectorClass,
    questMapNodeAriaLabel,
    questMapNodeClass,
    rewardBadgeClass,
    toError,
  };
}
