import { classifyAsrError } from "@/lib/asrErrors";
import { buildTranscribeAudioPayload } from "@/lib/asrPayloads";
import { recordRecorderHealthEvent } from "@/lib/recorderHealthMetrics";
import { transcriptEditSave, transcriptGet, transcribeAudio } from "@/domains/asr/api";
import {
  resolveRecorderHealthErrorCode,
  transcriptToEditorText,
} from "@/components/recorder/composables/runtime/audioRecorderCaptureUtils";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";

/**
 * Implements transcribe recording behavior.
 */
export async function transcribeRecording(deps: AudioRecorderRuntimeDeps) {
  deps.clearError();
  if (!deps.activeProfileId.value || !deps.lastArtifactId.value) {
    return;
  }
  await deps.refreshTranscribeReadiness();
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

/**
 * Implements save edited transcript behavior.
 */
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
