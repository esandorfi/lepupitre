export type RecorderQualityHintKey =
  | "good_level"
  | "too_quiet"
  | "noisy_room"
  | "too_loud"
  | "no_signal";

type Severity = "good" | "warn" | "danger";

export type RecorderQualityHintStabilizer = {
  displayedKey: RecorderQualityHintKey;
  candidateKey: RecorderQualityHintKey | null;
  candidateSinceMs: number | null;
};

const KNOWN_HINTS = new Set<RecorderQualityHintKey>([
  "good_level",
  "too_quiet",
  "noisy_room",
  "too_loud",
  "no_signal",
]);

function severityOf(key: RecorderQualityHintKey): Severity {
  if (key === "too_loud" || key === "no_signal") {
    return "danger";
  }
  if (key === "too_quiet" || key === "noisy_room") {
    return "warn";
  }
  return "good";
}

function deescalationDelayMs(
  displayed: RecorderQualityHintKey,
  incoming: RecorderQualityHintKey
): number {
  const from = severityOf(displayed);
  const to = severityOf(incoming);

  if (from === to) {
    return 400;
  }
  if (from === "danger") {
    return 1200;
  }
  if (from === "warn" && to === "good") {
    return 900;
  }
  return 0;
}

export function normalizeRecorderQualityHint(value?: string | null): RecorderQualityHintKey {
  if (!value) {
    return "good_level";
  }
  return KNOWN_HINTS.has(value as RecorderQualityHintKey)
    ? (value as RecorderQualityHintKey)
    : "good_level";
}

export function createRecorderQualityHintStabilizer(
  initial: RecorderQualityHintKey = "good_level"
): RecorderQualityHintStabilizer {
  return {
    displayedKey: initial,
    candidateKey: null,
    candidateSinceMs: null,
  };
}

export function updateRecorderQualityHint(
  state: RecorderQualityHintStabilizer,
  incoming: RecorderQualityHintKey,
  nowMs: number
): RecorderQualityHintKey {
  if (incoming === state.displayedKey) {
    state.candidateKey = null;
    state.candidateSinceMs = null;
    return state.displayedKey;
  }

  const incomingSeverity = severityOf(incoming);
  const displayedSeverity = severityOf(state.displayedKey);
  if (
    (incomingSeverity === "danger" && displayedSeverity !== "danger") ||
    (incomingSeverity === "warn" && displayedSeverity === "good")
  ) {
    state.displayedKey = incoming;
    state.candidateKey = null;
    state.candidateSinceMs = null;
    return state.displayedKey;
  }

  const holdMs = deescalationDelayMs(state.displayedKey, incoming);
  if (holdMs <= 0) {
    state.displayedKey = incoming;
    state.candidateKey = null;
    state.candidateSinceMs = null;
    return state.displayedKey;
  }

  if (state.candidateKey !== incoming || state.candidateSinceMs === null) {
    state.candidateKey = incoming;
    state.candidateSinceMs = nowMs;
    return state.displayedKey;
  }

  if (nowMs - state.candidateSinceMs >= holdMs) {
    state.displayedKey = incoming;
    state.candidateKey = null;
    state.candidateSinceMs = null;
  }

  return state.displayedKey;
}
