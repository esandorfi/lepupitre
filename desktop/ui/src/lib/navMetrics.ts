import { ref } from "vue";
import type { PrimaryNavMode } from "./uiPreferences";

type NavMetricsSnapshot = {
  switchCount: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  topSwitchCount: number;
  sidebarSwitchCount: number;
  sidebarSessionCount: number;
  lastUpdatedAt: string | null;
};

type NavIntent = {
  startedAt: number;
  source: PrimaryNavMode;
  itemId: string;
};

const STORAGE_KEY = "lepupitre_nav_metrics_v1";

const defaultMetrics: NavMetricsSnapshot = {
  switchCount: 0,
  totalLatencyMs: 0,
  avgLatencyMs: 0,
  topSwitchCount: 0,
  sidebarSwitchCount: 0,
  sidebarSessionCount: 0,
  lastUpdatedAt: null,
};

function sanitizeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function loadMetrics(): NavMetricsSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...defaultMetrics };
    }
    const parsed = JSON.parse(raw) as Partial<NavMetricsSnapshot>;
    const switchCount = sanitizeNumber(parsed.switchCount);
    const totalLatencyMs = sanitizeNumber(parsed.totalLatencyMs);
    return {
      switchCount,
      totalLatencyMs,
      avgLatencyMs: switchCount > 0 ? totalLatencyMs / switchCount : 0,
      topSwitchCount: sanitizeNumber(parsed.topSwitchCount),
      sidebarSwitchCount: sanitizeNumber(parsed.sidebarSwitchCount),
      sidebarSessionCount: sanitizeNumber(parsed.sidebarSessionCount),
      lastUpdatedAt:
        typeof parsed.lastUpdatedAt === "string" && parsed.lastUpdatedAt.length > 0
          ? parsed.lastUpdatedAt
          : null,
    };
  } catch {
    return { ...defaultMetrics };
  }
}

const metrics = ref<NavMetricsSnapshot>(loadMetrics());

let pendingIntent: NavIntent | null = null;
let sidebarSessionMarked = false;

function persist(next: NavMetricsSnapshot) {
  metrics.value = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function updateMetrics(mutator: (current: NavMetricsSnapshot) => NavMetricsSnapshot) {
  const next = mutator(metrics.value);
  persist(next);
}

export function recordNavIntent(source: PrimaryNavMode, itemId: string) {
  pendingIntent = {
    startedAt: Date.now(),
    source,
    itemId,
  };
}

export function flushNavIntent() {
  if (!pendingIntent) {
    return;
  }
  const elapsedMs = Math.max(0, Date.now() - pendingIntent.startedAt);
  const source = pendingIntent.source;
  pendingIntent = null;
  updateMetrics((current) => {
    const nextSwitchCount = current.switchCount + 1;
    const nextTotalLatency = current.totalLatencyMs + elapsedMs;
    return {
      ...current,
      switchCount: nextSwitchCount,
      totalLatencyMs: nextTotalLatency,
      avgLatencyMs: nextTotalLatency / nextSwitchCount,
      topSwitchCount: current.topSwitchCount + (source === "top" ? 1 : 0),
      sidebarSwitchCount:
        current.sidebarSwitchCount + (source === "sidebar-icon" ? 1 : 0),
      lastUpdatedAt: new Date().toISOString(),
    };
  });
}

export function markSidebarSession() {
  if (sidebarSessionMarked) {
    return;
  }
  sidebarSessionMarked = true;
  updateMetrics((current) => ({
    ...current,
    sidebarSessionCount: current.sidebarSessionCount + 1,
    lastUpdatedAt: new Date().toISOString(),
  }));
}

export function resetNavMetrics() {
  pendingIntent = null;
  sidebarSessionMarked = false;
  persist({ ...defaultMetrics });
}

export function useNavMetrics() {
  return {
    metrics,
    resetNavMetrics,
  };
}
