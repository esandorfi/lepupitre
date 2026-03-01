import { invokeChecked } from "../../composables/useIpc";
import {
  AsrModelVerifyPayloadSchema,
  AsrModelVerifyResultSchema,
  AsrSidecarStatusResponseSchema,
  EmptyPayloadSchema,
  ExportResultSchema,
  TranscriptEditSavePayloadSchema,
  TranscriptEditSaveResponseSchema,
  TranscriptExportFormat,
  TranscriptExportPayloadSchema,
  TranscriptGetPayloadSchema,
  TranscriptV1Schema,
  TranscribeAudioPayloadSchema,
  TranscribeResponseSchema,
} from "../../schemas/ipc";

export async function asrSidecarStatus() {
  return invokeChecked("asr_sidecar_status", EmptyPayloadSchema, AsrSidecarStatusResponseSchema, {});
}

export async function asrModelVerify(modelId: string) {
  return invokeChecked("asr_model_verify", AsrModelVerifyPayloadSchema, AsrModelVerifyResultSchema, {
    modelId,
  });
}

export async function transcribeAudio(payload: {
  profileId: string;
  audioArtifactId: string;
  asrSettings?: {
    model?: "tiny" | "base";
    language?: "auto" | "en" | "fr";
    spokenPunctuation?: boolean;
  };
}) {
  return invokeChecked(
    "transcribe_audio",
    TranscribeAudioPayloadSchema,
    TranscribeResponseSchema,
    payload
  );
}

export async function transcriptGet(profileId: string, transcriptId: string) {
  return invokeChecked("transcript_get", TranscriptGetPayloadSchema, TranscriptV1Schema, {
    profileId,
    transcriptId,
  });
}

export async function transcriptEditSave(
  profileId: string,
  transcriptId: string,
  editedText: string
) {
  return invokeChecked(
    "transcript_edit_save",
    TranscriptEditSavePayloadSchema,
    TranscriptEditSaveResponseSchema,
    {
      profileId,
      transcriptId,
      editedText,
    }
  );
}

export async function transcriptExport(
  profileId: string,
  transcriptId: string,
  format: TranscriptExportFormat
) {
  return invokeChecked(
    "transcript_export",
    TranscriptExportPayloadSchema,
    ExportResultSchema,
    {
      profileId,
      transcriptId,
      format,
    }
  );
}
