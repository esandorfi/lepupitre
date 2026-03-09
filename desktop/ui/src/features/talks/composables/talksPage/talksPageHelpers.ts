type TranslateFn = (key: string) => string;

/**
 * Normalizes unknown project stages to the default talks stage.
 */
export function normalizedStage(stage: string | null | undefined) {
  if (stage === "builder" || stage === "train" || stage === "export") {
    return stage;
  }
  return "draft";
}

/**
 * Returns mascot panel tone classes from semantic message kind.
 */
export function mascotToneClass(kind: string | null | undefined) {
  if (kind === "celebrate") {
    return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_15%,var(--color-surface))]";
  }
  if (kind === "nudge") {
    return "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent-soft)_35%,var(--color-surface))]";
  }
  return "border-[var(--color-border)] bg-[var(--color-surface-elevated)]";
}

/**
 * Maps completion percent to progress-tone class.
 */
export function blueprintPercentClass(percent: number) {
  if (percent >= 100) {
    return "bg-[var(--color-success)]";
  }
  if (percent >= 60) {
    return "bg-[var(--color-accent)]";
  }
  return "bg-[var(--color-warning)]";
}

/**
 * Returns class tokens for completed vs pending blueprint steps.
 */
export function blueprintStepClass(done: boolean) {
  if (done) {
    return "border-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_14%,var(--color-surface))]";
  }
  return "border-[var(--app-border)] bg-[var(--color-surface-elevated)]";
}

/**
 * Formats duration in minutes for compact talks-card display.
 */
export function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) {
    return "--";
  }
  return Math.round(seconds / 60).toString();
}

/**
 * Builds a relative "last activity" label with translation fallbacks.
 */
export function formatLastActivity(t: TranslateFn, value: string | null | undefined) {
  if (!value) {
    return t("talks.last_activity_unknown");
  }
  const date = new Date(value);
  const now = Date.now();
  const time = date.getTime();
  if (Number.isNaN(time)) {
    return t("talks.last_activity_unknown");
  }
  const diffMs = Math.max(0, now - time);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return t("talks.last_activity_just_now");
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d`;
  }
  return date.toLocaleDateString();
}

/**
 * Formats canonical talks numbering labels (T1, T2, ...).
 */
export function talkNumberLabel(number: number | null | undefined) {
  if (!number) {
    return null;
  }
  return `T${number}`;
}

/**
 * Maps a normalized stage key to the translated talks step label.
 */
export function talkStageLabel(t: TranslateFn, stage: string | null | undefined) {
  const key = normalizedStage(stage);
  if (key === "draft") {
    return t("talk_steps.define");
  }
  if (key === "builder") {
    return t("talk_steps.builder");
  }
  if (key === "train") {
    return t("talk_steps.train");
  }
  return t("talk_steps.export");
}
