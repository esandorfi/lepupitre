import { open } from "@tauri-apps/plugin-shell";
import { classifyAsrError } from "@/lib/asrErrors";
import { recordRecorderHealthEvent } from "@/lib/recorderHealthMetrics";
import { buildTranscribeAudioPayload } from "@/lib/asrPayloads";
import { isTypingTargetElement, resolveRecorderShortcutAction } from "@/lib/recorderFlow";
import { audioRevealWav } from "@/domains/recorder/api";
import { transcriptEditSave, transcriptExport, transcriptGet, transcribeAudio } from "@/domains/asr/api";
import type { TranscriptExportFormat } from "@/schemas/ipc";
import {
  resolveRecorderHealthErrorCode,
  transcriptToEditorText,
} from "@/components/recorder/composables/audioRecorderCaptureRuntime";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";

export async function transcribeRecording(deps: AudioRecorderRuntimeDeps) {
  deps.clearError();
  if (!deps.activeProfileId.value || !deps.lastArtifactId.value) {
    return;
  }
  if (!deps.canTranscribe.value) {
    return;
  }

  deps.transcribeBlockedCode.value = null;
  deps.transcribeBlockedMessage.value = null;
  deps.isTranscribing.value = true;
  deps.transcribeProgress.value = 0;
  deps.transcribeStageLabel.value = null;

  try {
    const response = await transcribeAudio(
      buildTranscribeAudioPayload(
        deps.activeProfileId.value,
        deps.lastArtifactId.value,
        deps.transcriptionSettings.value
      )
    );
    deps.transcribeJobId.value = response.jobId ?? deps.transcribeJobId.value;
    deps.baseTranscriptId.value = response.transcriptId;
    deps.editedTranscriptId.value = null;
    deps.exportPath.value = null;

    const loaded = await transcriptGet(deps.activeProfileId.value, response.transcriptId);
    deps.transcript.value = loaded;
    deps.sourceTranscript.value = loaded;
    deps.transcriptDraftText.value = transcriptToEditorText(loaded);
    deps.emit("transcribed", {
      transcriptId: response.transcriptId,
      isEdited: false,
      baseTranscriptId: response.transcriptId,
    });
    deps.transcribeProgress.value = 100;
    deps.transcribeStageLabel.value = deps.t("audio.stage_done");
    recordRecorderHealthEvent("transcribe_success");
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const code = classifyAsrError(raw);
    recordRecorderHealthEvent("transcribe_failure", {
      errorCode: code ?? resolveRecorderHealthErrorCode(raw),
    });
    if (code === "sidecar_missing") {
      deps.transcribeBlockedCode.value = code;
      deps.transcribeBlockedMessage.value = deps.t("audio.error_sidecar_missing");
      deps.setError(deps.transcribeBlockedMessage.value, code);
    } else if (code === "sidecar_incompatible") {
      deps.transcribeBlockedCode.value = code;
      deps.transcribeBlockedMessage.value = deps.t("audio.error_sidecar_incompatible");
      deps.setError(deps.transcribeBlockedMessage.value, code);
    } else if (code === "model_missing") {
      deps.transcribeBlockedCode.value = code;
      deps.transcribeBlockedMessage.value = deps.t("audio.error_model_missing");
      deps.setError(deps.transcribeBlockedMessage.value, code);
    } else if (code === "asr_timeout") {
      deps.setError(deps.t("audio.error_asr_timeout"), code);
    } else {
      deps.setError(raw);
    }
  } finally {
    deps.isTranscribing.value = false;
  }
}

export async function saveEditedTranscript(deps: AudioRecorderRuntimeDeps) {
  if (!deps.activeProfileId.value || !deps.baseTranscriptId.value) {
    return;
  }
  const editedText = deps.transcriptDraftText.value.trim();
  if (!editedText) {
    deps.setError(deps.t("audio.transcript_empty"));
    return;
  }

  deps.isSavingEdited.value = true;
  deps.clearError();
  try {
    const saved = await transcriptEditSave(
      deps.activeProfileId.value,
      deps.baseTranscriptId.value,
      editedText
    );
    deps.editedTranscriptId.value = saved.transcriptId;
    const loaded = await transcriptGet(deps.activeProfileId.value, saved.transcriptId);
    deps.transcript.value = loaded;
    deps.transcriptDraftText.value = transcriptToEditorText(loaded);
    deps.emit("transcribed", {
      transcriptId: saved.transcriptId,
      isEdited: true,
      baseTranscriptId: deps.baseTranscriptId.value,
    });
  } catch (err) {
    deps.setError(err instanceof Error ? err.message : String(err));
  } finally {
    deps.isSavingEdited.value = false;
  }
}

export function autoCleanFillers(deps: AudioRecorderRuntimeDeps) {
  const next = deps.transcriptDraftText.value
    .replace(/\b(uh|um|erm|eh|ah|oh|like|you know|i mean|sort of|kind of|basically|actually|literally)\b/gi, "")
    .replace(/\b(euh|heu|hein|ben|bah|beh|bon ben|enfin|genre|voila|quoi|du coup|en fait|tu vois|tu sais|c'est-a-dire|disons)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  deps.transcriptDraftText.value = next;
}

export function fixPunctuation(deps: AudioRecorderRuntimeDeps) {
  let next = deps.transcriptDraftText.value
    .replace(/\s+([,.;!?:])/g, "$1")
    .replace(/([,.;!?:])([^\s\n\d])/g, "$1 $2")
    .replace(
      /([.!?])\s+([a-zA-Z\u00C0-\u00FF])/g,
      (_match: string, punct: string, letter: string) => `${punct} ${letter.toUpperCase()}`
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (next.length > 0) {
    next = next[0].toUpperCase() + next.slice(1);
  }
  deps.transcriptDraftText.value = next;
}

export function goAnalyzeExport(deps: AudioRecorderRuntimeDeps) {
  if (!deps.activeTranscriptIdForAnalysis.value) {
    return;
  }
  deps.phase.value = "analyze_export";
}

export function backToQuickClean(deps: AudioRecorderRuntimeDeps) {
  deps.phase.value = "quick_clean";
}

export function requestAnalyze(deps: AudioRecorderRuntimeDeps) {
  if (!deps.activeTranscriptIdForAnalysis.value || !deps.canAnalyzeRecorder.value) {
    return;
  }
  deps.emit("analyze", { transcriptId: deps.activeTranscriptIdForAnalysis.value });
}

export function handleViewFeedback(deps: AudioRecorderRuntimeDeps) {
  deps.emit("viewFeedback");
}

export function handleOnboardingContext(
  deps: AudioRecorderRuntimeDeps,
  payload: {
    audience: string;
    audienceCustom: string;
    goal: string;
    targetMinutes: number | null;
  }
) {
  deps.emit("onboardingContext", payload);
}

export async function exportTranscript(deps: AudioRecorderRuntimeDeps, format: TranscriptExportFormat) {
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

export async function handleCapturePrimaryAction(deps: AudioRecorderRuntimeDeps) {
  if (deps.isStarting.value) {
    return;
  }
  if (deps.isRecording.value) {
    await deps.pauseRecording();
    return;
  }
  if (deps.recordingId.value && deps.isPaused.value) {
    await deps.resumeRecording();
    return;
  }
  await deps.startRecording();
}

export function handleShortcut(deps: AudioRecorderRuntimeDeps, event: KeyboardEvent) {
  if (isTypingTargetElement(event.target)) {
    return;
  }

  const action = resolveRecorderShortcutAction({
    key: event.key,
    ctrlOrMeta: event.metaKey || event.ctrlKey,
    phase: deps.phase.value,
    canTranscribe: deps.canTranscribe.value,
    hasTranscriptForAnalysis: !!deps.activeTranscriptIdForAnalysis.value,
  });
  if (!action) {
    return;
  }

  event.preventDefault();
  if (action === "capture_primary") {
    void deps.handleCapturePrimaryAction();
    return;
  }
  if (action === "transcribe") {
    void deps.transcribeRecording();
    return;
  }
  if (action === "continue_to_analyze_export") {
    deps.phase.value = "analyze_export";
    return;
  }
  if (action === "analyze") {
    requestAnalyze(deps);
  }
}

