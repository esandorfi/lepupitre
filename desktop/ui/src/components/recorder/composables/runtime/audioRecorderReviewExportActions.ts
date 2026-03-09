import { open } from "@tauri-apps/plugin-shell";
import { transcriptExport } from "@/domains/asr/api";
import { audioRevealWav } from "@/domains/recorder/api";
import type { TranscriptExportFormat } from "@/schemas/ipc";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";

/**
 * Implements export transcript behavior.
 */
export async function exportTranscript(
  deps: AudioRecorderRuntimeDeps,
  format: TranscriptExportFormat
) {
  if (!deps.activeProfileId.value || !deps.activeTranscriptIdForAnalysis.value) {
    return;
  }
  deps.isExporting.value = true;
  deps.clearError();
  try {
    const result = await transcriptExport(
      deps.activeProfileId.value,
      deps.activeTranscriptIdForAnalysis.value,
      format
    );
    deps.exportPath.value = result.path;
  } catch (err) {
    deps.setError(err instanceof Error ? err.message : String(err));
  } finally {
    deps.isExporting.value = false;
  }
}

/**
 * Implements export preset behavior.
 */
export function exportPreset(
  deps: AudioRecorderRuntimeDeps,
  preset: "presentation" | "podcast" | "voice_note"
) {
  if (preset === "presentation") {
    void exportTranscript(deps, "txt");
    return;
  }
  if (preset === "podcast") {
    void exportTranscript(deps, "srt");
    return;
  }
  void exportTranscript(deps, "vtt");
}

/**
 * Implements open export path behavior.
 */
export async function openExportPath(deps: AudioRecorderRuntimeDeps) {
  if (!deps.exportPath.value) {
    return;
  }
  try {
    await open(deps.exportPath.value);
  } catch (err) {
    deps.setError(err instanceof Error ? err.message : String(err));
  }
}

/**
 * Implements reveal recording behavior.
 */
export async function revealRecording(deps: AudioRecorderRuntimeDeps) {
  if (!deps.lastSavedPath.value) {
    return;
  }
  deps.isRevealing.value = true;
  deps.clearError();
  try {
    await audioRevealWav(deps.lastSavedPath.value);
  } catch (err) {
    deps.setError(err instanceof Error ? err.message : String(err));
  } finally {
    deps.isRevealing.value = false;
  }
}
