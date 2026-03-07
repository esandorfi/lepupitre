import { listen } from "@tauri-apps/api/event";
import {
  AsrCommitEventSchema,
  AsrFinalProgressEventSchema,
  AsrFinalResultEventSchema,
  AsrPartialEventSchema,
} from "@/schemas/ipc";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import type { AudioRecorderCleanupSet } from "@/components/recorder/composables/runtime/audioRecorderRuntimeListenerTypes";

export async function registerAsrListeners(
  getDeps: () => AudioRecorderRuntimeDeps,
  cleanups: AudioRecorderCleanupSet
) {
  const [unlistenAsrPartial, unlistenAsrCommit, unlistenAsrFinalProgress, unlistenAsrFinalResult] =
    await Promise.all([
      listen("asr/partial/v1", (event) => {
        const scopedDeps = getDeps();
        if (!scopedDeps.isRecording.value) {
          return;
        }
        const parsed = AsrPartialEventSchema.safeParse(event.payload);
        if (!parsed.success) {
          return;
        }
        scopedDeps.livePartial.value = parsed.data.text;
      }),
      listen("asr/commit/v1", (event) => {
        const scopedDeps = getDeps();
        const parsed = AsrCommitEventSchema.safeParse(event.payload);
        if (!parsed.success) {
          return;
        }
        const merged = [...scopedDeps.liveSegments.value, ...parsed.data.segments];
        scopedDeps.liveSegments.value = merged.slice(-scopedDeps.MAX_LIVE_SEGMENTS_PREVIEW);
        scopedDeps.livePartial.value = null;
      }),
      listen("asr/final_progress/v1", (event) => {
        const scopedDeps = getDeps();
        const parsed = AsrFinalProgressEventSchema.safeParse(event.payload);
        if (!parsed.success) {
          return;
        }
        if (!scopedDeps.isTranscribing.value && !scopedDeps.transcribeJobId.value) {
          return;
        }
        const total = parsed.data.totalMs;
        if (total <= 0) {
          return;
        }
        const pct = Math.min(100, Math.round((parsed.data.processedMs / total) * 100));
        scopedDeps.transcribeProgress.value = pct;
        scopedDeps.transcribeStageLabel.value = scopedDeps.t("audio.stage_final");
      }),
      listen("asr/final_result/v1", (event) => {
        const scopedDeps = getDeps();
        const parsed = AsrFinalResultEventSchema.safeParse(event.payload);
        if (!parsed.success) {
          return;
        }
        scopedDeps.transcribeProgress.value = 100;
        scopedDeps.transcribeStageLabel.value = scopedDeps.t("audio.stage_final");
        scopedDeps.liveSegments.value = [];
        scopedDeps.livePartial.value = null;
        const current = scopedDeps.transcript.value;
        scopedDeps.transcript.value = {
          schema_version: "1.0.0",
          language: current?.language ?? "und",
          model_id: current?.model_id ?? null,
          duration_ms: current?.duration_ms ?? null,
          segments: parsed.data.segments,
        };
      }),
    ]);

  cleanups.unlistenAsrPartial = unlistenAsrPartial;
  cleanups.unlistenAsrCommit = unlistenAsrCommit;
  cleanups.unlistenAsrFinalProgress = unlistenAsrFinalProgress;
  cleanups.unlistenAsrFinalResult = unlistenAsrFinalResult;
}
