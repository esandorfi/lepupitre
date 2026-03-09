import { ref } from "vue";
import {
  hydratePreference,
  readPreference,
  writePreference,
  writePreferenceLocal,
} from "./preferencesStorage";

type RecorderHealthCounterKey =
  | "startSuccessCount"
  | "startFailureCount"
  | "stopSuccessCount"
  | "stopFailureCount"
  | "transcribeSuccessCount"
  | "transcribeFailureCount"
  | "trimSuccessCount"
  | "trimFailureCount";

type RecorderHealthDailySnapshot = {
  startSuccessCount: number;
  startFailureCount: number;
  stopSuccessCount: number;
  stopFailureCount: number;
  transcribeSuccessCount: number;
  transcribeFailureCount: number;
  trimSuccessCount: number;
  trimFailureCount: number;
};

export type RecorderHealthSnapshot = RecorderHealthDailySnapshot & {
  errorsByCode: Record<string, number>;
  lastErrorCode: string | null;
  lastErrorAt: string | null;
  lastUpdatedAt: string | null;
  daily: Record<string, RecorderHealthDailySnapshot>;
};

export type RecorderHealthEvent =
  | "start_success"
  | "start_failure"
  | "stop_success"
  | "stop_failure"
  | "transcribe_success"
  | "transcribe_failure"
  | "trim_success"
  | "trim_failure";

const STORAGE_KEY = "lepupitre_recorder_health_metrics_v1";
const LEGACY_STORAGE_KEYS = ["lepupitre_recorder_health_metrics"] as const;
const BACKEND_FLUSH_DEBOUNCE_MS = 1200;
const DAILY_RETENTION_DAYS = 30;
const MAX_ERROR_CODES = 12;

const defaultDailyMetrics: RecorderHealthDailySnapshot = {
  startSuccessCount: 0,
  startFailureCount: 0,
  stopSuccessCount: 0,
  stopFailureCount: 0,
  transcribeSuccessCount: 0,
  transcribeFailureCount: 0,
  trimSuccessCount: 0,
  trimFailureCount: 0,
};

const defaultMetrics: RecorderHealthSnapshot = {
  ...defaultDailyMetrics,
  errorsByCode: {},
  lastErrorCode: null,
  lastErrorAt: null,
  lastUpdatedAt: null,
  daily: {},
};

const eventCounterKey: Record<RecorderHealthEvent, RecorderHealthCounterKey> = {
  start_success: "startSuccessCount",
  start_failure: "startFailureCount",
  stop_success: "stopSuccessCount",
  stop_failure: "stopFailureCount",
  transcribe_success: "transcribeSuccessCount",
  transcribe_failure: "transcribeFailureCount",
  trim_success: "trimSuccessCount",
  trim_failure: "trimFailureCount",
};

function sanitizeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function cloneDailyMetrics(value?: Partial<RecorderHealthDailySnapshot> | null): RecorderHealthDailySnapshot {
  return {
    startSuccessCount: sanitizeNumber(value?.startSuccessCount),
    startFailureCount: sanitizeNumber(value?.startFailureCount),
    stopSuccessCount: sanitizeNumber(value?.stopSuccessCount),
    stopFailureCount: sanitizeNumber(value?.stopFailureCount),
    transcribeSuccessCount: sanitizeNumber(value?.transcribeSuccessCount),
    transcribeFailureCount: sanitizeNumber(value?.transcribeFailureCount),
    trimSuccessCount: sanitizeNumber(value?.trimSuccessCount),
    trimFailureCount: sanitizeNumber(value?.trimFailureCount),
  };
}

function normalizeErrorCode(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").slice(0, 48);
  if (!normalized) {
    return null;
  }
  return normalized;
}

function pruneErrorsByCode(errorsByCode: Record<string, number>): Record<string, number> {
  const entries = Object.entries(errorsByCode).filter(
    ([code, count]) => code.length > 0 && sanitizeNumber(count) > 0
  );
  if (entries.length <= MAX_ERROR_CODES) {
    return Object.fromEntries(entries.map(([code, count]) => [code, sanitizeNumber(count)]));
  }
  entries.sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }
    return left[0].localeCompare(right[0]);
  });
  return Object.fromEntries(
    entries.slice(0, MAX_ERROR_CODES).map(([code, count]) => [code, sanitizeNumber(count)])
  );
}

function pruneDaily(daily: Record<string, RecorderHealthDailySnapshot>): Record<string, RecorderHealthDailySnapshot> {
  const keys = Object.keys(daily)
    .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))
    .sort();
  if (keys.length <= DAILY_RETENTION_DAYS) {
    return daily;
  }
  const keep = new Set(keys.slice(-DAILY_RETENTION_DAYS));
  const next: Record<string, RecorderHealthDailySnapshot> = {};
  for (const key of keys) {
    if (!keep.has(key)) {
      continue;
    }
    next[key] = daily[key];
  }
  return next;
}

function parseMetrics(raw: string): RecorderHealthSnapshot {
  try {
    const parsed = JSON.parse(raw) as Partial<RecorderHealthSnapshot>;
    const daily: Record<string, RecorderHealthDailySnapshot> = {};
    if (parsed.daily && typeof parsed.daily === "object") {
      for (const [key, value] of Object.entries(parsed.daily)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
          continue;
        }
        daily[key] = cloneDailyMetrics(value);
      }
    }
    return {
      startSuccessCount: sanitizeNumber(parsed.startSuccessCount),
      startFailureCount: sanitizeNumber(parsed.startFailureCount),
      stopSuccessCount: sanitizeNumber(parsed.stopSuccessCount),
      stopFailureCount: sanitizeNumber(parsed.stopFailureCount),
      transcribeSuccessCount: sanitizeNumber(parsed.transcribeSuccessCount),
      transcribeFailureCount: sanitizeNumber(parsed.transcribeFailureCount),
      trimSuccessCount: sanitizeNumber(parsed.trimSuccessCount),
      trimFailureCount: sanitizeNumber(parsed.trimFailureCount),
      errorsByCode: pruneErrorsByCode(parsed.errorsByCode ?? {}),
      lastErrorCode: normalizeErrorCode(parsed.lastErrorCode) ?? null,
      lastErrorAt:
        typeof parsed.lastErrorAt === "string" && parsed.lastErrorAt.length > 0
          ? parsed.lastErrorAt
          : null,
      lastUpdatedAt:
        typeof parsed.lastUpdatedAt === "string" && parsed.lastUpdatedAt.length > 0
          ? parsed.lastUpdatedAt
          : null,
      daily: pruneDaily(daily),
    };
  } catch {
    return { ...defaultMetrics, daily: {}, errorsByCode: {} };
  }
}

function loadMetrics(): RecorderHealthSnapshot {
  try {
    const raw = readPreference(STORAGE_KEY, { legacyKeys: LEGACY_STORAGE_KEYS });
    if (!raw) {
      return { ...defaultMetrics, daily: {}, errorsByCode: {} };
    }
    return parseMetrics(raw);
  } catch {
    return { ...defaultMetrics, daily: {}, errorsByCode: {} };
  }
}

const metrics = ref<RecorderHealthSnapshot>(loadMetrics());
void hydratePreference(STORAGE_KEY, { legacyKeys: LEGACY_STORAGE_KEYS }).then((raw) => {
  if (!raw) {
    return;
  }
  metrics.value = parseMetrics(raw);
});

let backendFlushTimer: ReturnType<typeof setTimeout> | null = null;
let pendingBackendSnapshot: RecorderHealthSnapshot | null = null;

function flushBackendSnapshot() {
  if (!pendingBackendSnapshot) {
    return;
  }
  writePreference(STORAGE_KEY, JSON.stringify(pendingBackendSnapshot));
  pendingBackendSnapshot = null;
}

function scheduleBackendFlush(next: RecorderHealthSnapshot) {
  pendingBackendSnapshot = next;
  if (backendFlushTimer !== null) {
    return;
  }
  backendFlushTimer = setTimeout(() => {
    backendFlushTimer = null;
    flushBackendSnapshot();
  }, BACKEND_FLUSH_DEBOUNCE_MS);
}

function persist(next: RecorderHealthSnapshot, immediateBackend = false) {
  metrics.value = next;
  writePreferenceLocal(STORAGE_KEY, JSON.stringify(next));
  if (immediateBackend) {
    if (backendFlushTimer !== null) {
      clearTimeout(backendFlushTimer);
      backendFlushTimer = null;
    }
    pendingBackendSnapshot = next;
    flushBackendSnapshot();
    return;
  }
  scheduleBackendFlush(next);
}

function updateMetrics(mutator: (current: RecorderHealthSnapshot) => RecorderHealthSnapshot) {
  const next = mutator(metrics.value);
  persist(next);
}

function dayKeyUTC(at: Date): string {
  return at.toISOString().slice(0, 10);
}

function isFailureEvent(event: RecorderHealthEvent): boolean {
  return event.endsWith("_failure");
}

/**
 * Records record recorder health event telemetry/state events.
 */
export function recordRecorderHealthEvent(
  event: RecorderHealthEvent,
  details?: { errorCode?: string | null; at?: Date }
) {
  const timestamp = details?.at ?? new Date();
  const timestampIso = timestamp.toISOString();
  const dayKey = dayKeyUTC(timestamp);
  const counterKey = eventCounterKey[event];
  const errorCode = normalizeErrorCode(details?.errorCode) ?? "unknown";

  updateMetrics((current) => {
    const nextDaily = { ...current.daily };
    const dayEntry = cloneDailyMetrics(nextDaily[dayKey]);
    dayEntry[counterKey] += 1;
    nextDaily[dayKey] = dayEntry;

    const next: RecorderHealthSnapshot = {
      ...current,
      [counterKey]: current[counterKey] + 1,
      lastUpdatedAt: timestampIso,
      daily: pruneDaily(nextDaily),
      errorsByCode: { ...current.errorsByCode },
      lastErrorCode: current.lastErrorCode,
      lastErrorAt: current.lastErrorAt,
    };

    if (isFailureEvent(event)) {
      next.errorsByCode[errorCode] = sanitizeNumber(next.errorsByCode[errorCode]) + 1;
      next.errorsByCode = pruneErrorsByCode(next.errorsByCode);
      next.lastErrorCode = errorCode;
      next.lastErrorAt = timestampIso;
    }

    return next;
  });
}

/**
 * Implements reset recorder health metrics behavior.
 */
export function resetRecorderHealthMetrics() {
  persist({ ...defaultMetrics, daily: {}, errorsByCode: {} }, true);
}

/**
 * Provides the use recorder health metrics composable contract.
 */
export function useRecorderHealthMetrics() {
  return {
    metrics,
    resetRecorderHealthMetrics,
  };
}
