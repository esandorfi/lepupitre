import { computed } from "vue";
import { useNavMetrics } from "@/lib/navMetrics";
import { useRecorderHealthMetrics } from "@/lib/recorderHealthMetrics";

function formatUtcDayLabel(dayKey: string): string {
  const parsed = new Date(`${dayKey}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf())) {
    return dayKey;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(parsed);
}

export function useSettingsInsights() {
  const { metrics: navMetrics, resetNavMetrics } = useNavMetrics();
  const { metrics: recorderHealthMetrics, resetRecorderHealthMetrics } =
    useRecorderHealthMetrics();

  const averageNavLatencyMs = computed(() => Math.round(navMetrics.value.avgLatencyMs));
  const recorderStartAttempts = computed(
    () =>
      recorderHealthMetrics.value.startSuccessCount +
      recorderHealthMetrics.value.startFailureCount
  );

  const recorderStartSuccessRate = computed(() => {
    if (recorderStartAttempts.value <= 0) {
      return 0;
    }
    return Math.round(
      (recorderHealthMetrics.value.startSuccessCount / recorderStartAttempts.value) * 100
    );
  });

  const transcribeAttempts = computed(
    () =>
      recorderHealthMetrics.value.transcribeSuccessCount +
      recorderHealthMetrics.value.transcribeFailureCount
  );

  const transcribeSuccessRate = computed(() => {
    if (transcribeAttempts.value <= 0) {
      return 0;
    }
    return Math.round(
      (recorderHealthMetrics.value.transcribeSuccessCount / transcribeAttempts.value) * 100
    );
  });

  const topRecorderHealthErrors = computed(() =>
    Object.entries(recorderHealthMetrics.value.errorsByCode)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
  );

  const recorderHealthDailyRows = computed(() => {
    const rows: Array<{
      key: string;
      label: string;
      startSuccessCount: number;
      stopFailureCount: number;
      transcribeFailureCount: number;
      trimFailureCount: number;
    }> = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date();
      day.setUTCHours(0, 0, 0, 0);
      day.setUTCDate(day.getUTCDate() - offset);
      const key = day.toISOString().slice(0, 10);
      const daily = recorderHealthMetrics.value.daily[key];
      rows.push({
        key,
        label: formatUtcDayLabel(key),
        startSuccessCount: daily?.startSuccessCount ?? 0,
        stopFailureCount: daily?.stopFailureCount ?? 0,
        transcribeFailureCount: daily?.transcribeFailureCount ?? 0,
        trimFailureCount: daily?.trimFailureCount ?? 0,
      });
    }
    return rows;
  });

  return {
    navMetrics,
    resetNavMetrics,
    recorderHealthMetrics,
    resetRecorderHealthMetrics,
    averageNavLatencyMs,
    recorderStartSuccessRate,
    transcribeSuccessRate,
    topRecorderHealthErrors,
    recorderHealthDailyRows,
  };
}
