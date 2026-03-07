import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscriptionSettings } from "@/lib/transcriptionSettings";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import {
  saveEditedTranscript,
  transcribeRecording,
} from "./audioRecorderReviewTranscribeActions";

const transcribeMocks = vi.hoisted(() => ({
  classifyAsrError: vi.fn(),
  buildTranscribeAudioPayload: vi.fn(),
  recordRecorderHealthEvent: vi.fn(),
  transcribeAudio: vi.fn(),
  transcriptGet: vi.fn(),
  transcriptEditSave: vi.fn(),
  resolveRecorderHealthErrorCode: vi.fn(),
  transcriptToEditorText: vi.fn(),
}));

vi.mock("@/lib/asrErrors", () => ({
  classifyAsrError: transcribeMocks.classifyAsrError,
}));

vi.mock("@/lib/asrPayloads", () => ({
  buildTranscribeAudioPayload: transcribeMocks.buildTranscribeAudioPayload,
}));

vi.mock("@/lib/recorderHealthMetrics", () => ({
  recordRecorderHealthEvent: transcribeMocks.recordRecorderHealthEvent,
}));

vi.mock("@/domains/asr/api", () => ({
  transcribeAudio: transcribeMocks.transcribeAudio,
  transcriptGet: transcribeMocks.transcriptGet,
  transcriptEditSave: transcribeMocks.transcriptEditSave,
}));

vi.mock("@/components/recorder/composables/runtime/audioRecorderCaptureUtils", () => ({
  resolveRecorderHealthErrorCode: transcribeMocks.resolveRecorderHealthErrorCode,
  transcriptToEditorText: transcribeMocks.transcriptToEditorText,
}));

function createDeps(
  overrides: Partial<{
    activeProfileId: string | null;
    lastArtifactId: string | null;
    canTranscribe: boolean;
    baseTranscriptId: string | null;
    transcriptDraftText: string;
  }> = {}
) {
  const activeProfileId =
    "activeProfileId" in overrides ? (overrides.activeProfileId ?? null) : "profile-1";
  const lastArtifactId =
    "lastArtifactId" in overrides ? (overrides.lastArtifactId ?? null) : "artifact-1";
  const canTranscribe = "canTranscribe" in overrides ? (overrides.canTranscribe ?? true) : true;
  const baseTranscriptId =
    "baseTranscriptId" in overrides ? (overrides.baseTranscriptId ?? null) : "base-transcript-1";
  const transcriptDraftText =
    "transcriptDraftText" in overrides ? (overrides.transcriptDraftText ?? "") : "Edited transcript";

  return {
    t: (key: string) => key,
    emit: vi.fn(),
    clearError: vi.fn(),
    setError: vi.fn(),
    activeProfileId: ref(activeProfileId),
    lastArtifactId: ref(lastArtifactId),
    canTranscribe: ref(canTranscribe),
    transcriptionSettings: ref({} as TranscriptionSettings),
    transcribeBlockedCode: ref<string | null>("legacy"),
    transcribeBlockedMessage: ref<string | null>("legacy"),
    isTranscribing: ref(false),
    transcribeProgress: ref(0),
    transcribeStageLabel: ref<string | null>(null),
    transcribeJobId: ref<string | null>("job-prev"),
    baseTranscriptId: ref<string | null>(baseTranscriptId),
    editedTranscriptId: ref<string | null>("edited-prev"),
    exportPath: ref<string | null>("C:/tmp/prev.txt"),
    transcript: ref<unknown | null>(null),
    sourceTranscript: ref<unknown | null>(null),
    transcriptDraftText: ref(transcriptDraftText),
    isSavingEdited: ref(false),
  } as unknown as AudioRecorderRuntimeDeps;
}

describe("audioRecorderReviewTranscribeActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transcribes recording, hydrates transcript state and emits success event", async () => {
    const deps = createDeps();
    const transcript = { id: "transcript-1", text: "Hello world" };
    transcribeMocks.buildTranscribeAudioPayload.mockReturnValue({ payload: "ok" });
    transcribeMocks.transcribeAudio.mockResolvedValue({ jobId: "job-1", transcriptId: "transcript-1" });
    transcribeMocks.transcriptGet.mockResolvedValue(transcript);
    transcribeMocks.transcriptToEditorText.mockReturnValue("Hello world");

    await transcribeRecording(deps);

    expect(deps.clearError).toHaveBeenCalled();
    expect(transcribeMocks.transcribeAudio).toHaveBeenCalledWith({ payload: "ok" });
    expect(deps.transcribeJobId.value).toBe("job-1");
    expect(deps.baseTranscriptId.value).toBe("transcript-1");
    expect(deps.editedTranscriptId.value).toBeNull();
    expect(deps.exportPath.value).toBeNull();
    expect(deps.transcript.value).toEqual(transcript);
    expect(deps.sourceTranscript.value).toEqual(transcript);
    expect(deps.transcriptDraftText.value).toBe("Hello world");
    expect(deps.transcribeProgress.value).toBe(100);
    expect(deps.transcribeStageLabel.value).toBe("audio.stage_done");
    expect(deps.isTranscribing.value).toBe(false);
    expect(deps.emit).toHaveBeenCalledWith("transcribed", {
      transcriptId: "transcript-1",
      isEdited: false,
      baseTranscriptId: "transcript-1",
    });
    expect(transcribeMocks.recordRecorderHealthEvent).toHaveBeenCalledWith("transcribe_success");
  });

  it("maps sidecar missing errors to blocked state and localized message", async () => {
    const deps = createDeps();
    transcribeMocks.buildTranscribeAudioPayload.mockReturnValue({ payload: "ok" });
    transcribeMocks.transcribeAudio.mockRejectedValue(new Error("sidecar missing"));
    transcribeMocks.classifyAsrError.mockReturnValue("sidecar_missing");

    await transcribeRecording(deps);

    expect(deps.transcribeBlockedCode.value).toBe("sidecar_missing");
    expect(deps.transcribeBlockedMessage.value).toBe("audio.error_sidecar_missing");
    expect(deps.setError).toHaveBeenCalledWith("audio.error_sidecar_missing", "sidecar_missing");
    expect(transcribeMocks.recordRecorderHealthEvent).toHaveBeenCalledWith("transcribe_failure", {
      errorCode: "sidecar_missing",
    });
  });

  it("reports raw error for unclassified failures", async () => {
    const deps = createDeps();
    transcribeMocks.buildTranscribeAudioPayload.mockReturnValue({ payload: "ok" });
    transcribeMocks.transcribeAudio.mockRejectedValue(new Error("network failure"));
    transcribeMocks.classifyAsrError.mockReturnValue(null);
    transcribeMocks.resolveRecorderHealthErrorCode.mockReturnValue("unknown");

    await transcribeRecording(deps);

    expect(deps.setError).toHaveBeenCalledWith("network failure");
    expect(transcribeMocks.recordRecorderHealthEvent).toHaveBeenCalledWith("transcribe_failure", {
      errorCode: "unknown",
    });
  });

  it("skips transcription when recorder context is incomplete", async () => {
    const noProfile = createDeps({ activeProfileId: null });
    await transcribeRecording(noProfile);
    expect(transcribeMocks.transcribeAudio).not.toHaveBeenCalled();

    const noArtifact = createDeps({ lastArtifactId: null });
    await transcribeRecording(noArtifact);
    expect(transcribeMocks.transcribeAudio).not.toHaveBeenCalled();

    const blocked = createDeps({ canTranscribe: false });
    await transcribeRecording(blocked);
    expect(transcribeMocks.transcribeAudio).not.toHaveBeenCalled();
  });

  it("saves edited transcript and emits edited transcript payload", async () => {
    const deps = createDeps({ baseTranscriptId: "base-1", transcriptDraftText: " Edited text " });
    const editedTranscript = { id: "edited-1", text: "Edited text" };
    transcribeMocks.transcriptEditSave.mockResolvedValue({ transcriptId: "edited-1" });
    transcribeMocks.transcriptGet.mockResolvedValue(editedTranscript);
    transcribeMocks.transcriptToEditorText.mockReturnValue("Edited text");

    await saveEditedTranscript(deps);

    expect(deps.clearError).toHaveBeenCalled();
    expect(transcribeMocks.transcriptEditSave).toHaveBeenCalledWith(
      "profile-1",
      "base-1",
      "Edited text"
    );
    expect(deps.editedTranscriptId.value).toBe("edited-1");
    expect(deps.transcript.value).toEqual(editedTranscript);
    expect(deps.transcriptDraftText.value).toBe("Edited text");
    expect(deps.isSavingEdited.value).toBe(false);
    expect(deps.emit).toHaveBeenCalledWith("transcribed", {
      transcriptId: "edited-1",
      isEdited: true,
      baseTranscriptId: "base-1",
    });
  });

  it("blocks saving when draft text is empty", async () => {
    const deps = createDeps({ transcriptDraftText: "   " });

    await saveEditedTranscript(deps);

    expect(deps.setError).toHaveBeenCalledWith("audio.transcript_empty");
    expect(transcribeMocks.transcriptEditSave).not.toHaveBeenCalled();
  });
});
