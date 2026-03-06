import { classifyAsrError } from "@/lib/asrErrors";
import {
  createRecorderQualityHintStabilizer,
  normalizeRecorderQualityHint,
  updateRecorderQualityHint,
} from "@/lib/recorderQualityHint";
import { estimateTelemetryPayloadBytes } from "@/lib/recorderTelemetryBudget";
import type { TranscriptV1 } from "@/schemas/ipc";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";

export function mapStageToLabel(
  deps: AudioRecorderRuntimeDeps,
  stage: string | null,
  message?: string | null
) {
  if (message) {
    switch (message) {
      case "queued":
        return deps.t("audio.stage_queued");
      case "analyze_audio":
        return deps.t("audio.stage_analyze");
      case "serialize":
        return deps.t("audio.stage_serialize");
      case "done":
        return deps.t("audio.stage_done");
      default:
        break;
    }
  }
  if (!stage) {
    return null;
  }
  if (stage === "transcribe") {
    return deps.t("audio.stage_transcribe");
  }
  return deps.t("audio.stage_processing");
}

export function resetLiveTranscript(deps: AudioRecorderRuntimeDeps) {
  deps.liveSegments.value = [];
  deps.livePartial.value = null;
}

export function resetQualityHintState(deps: AudioRecorderRuntimeDeps) {
  deps.qualityHintStabilizer.value = createRecorderQualityHintStabilizer("good_level");
  deps.qualityHintKey.value = "good_level";
}

export function applyQualityHint(deps: AudioRecorderRuntimeDeps, rawHint: string | null | undefined) {
  const normalized = normalizeRecorderQualityHint(rawHint);
  deps.qualityHintKey.value = updateRecorderQualityHint(
    deps.qualityHintStabilizer.value,
    normalized,
    Date.now()
  );
}

export function formatDuration(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "0:00";
  }
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function levelPercent(value: number) {
  return Math.max(0, Math.min(1, value)) * 100;
}

export function transcriptToEditorText(value: TranscriptV1): string {
  return value.segments.map((segment) => segment.text.trim()).join("\n").trim();
}

export function resolveRecorderHealthErrorCode(raw: string): string | null {
  const asrCode = classifyAsrError(raw);
  if (asrCode) {
    return asrCode;
  }
  const match = raw.toLowerCase().match(/\b[a-z]+(?:_[a-z0-9]+){1,}\b/);
  return match?.[0] ?? null;
}

export function peaksChanged(next: number[], current: number[], epsilon = 0.01): boolean {
  if (next.length !== current.length) {
    return true;
  }
  for (let index = 0; index < next.length; index += 1) {
    if (Math.abs((next[index] ?? 0) - (current[index] ?? 0)) > epsilon) {
      return true;
    }
  }
  return false;
}

export function resetTelemetryObservation(deps: AudioRecorderRuntimeDeps) {
  deps.telemetryWindowStartMs.value = null;
  deps.telemetryEventCount.value = 0;
  deps.telemetryMaxPayloadBytes.value = 0;
}

export function registerTelemetryObservation(deps: AudioRecorderRuntimeDeps, payload: unknown) {
  if (deps.telemetryWindowStartMs.value === null) {
    deps.telemetryWindowStartMs.value = Date.now();
  }
  deps.telemetryEventCount.value += 1;
  deps.telemetryMaxPayloadBytes.value = Math.max(
    deps.telemetryMaxPayloadBytes.value,
    estimateTelemetryPayloadBytes(payload)
  );
}
