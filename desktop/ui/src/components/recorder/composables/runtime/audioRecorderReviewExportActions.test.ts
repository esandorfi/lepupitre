import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import {
  exportPreset,
  exportTranscript,
  openExportPath,
  revealRecording,
} from "./audioRecorderReviewExportActions";

const exportMocks = vi.hoisted(() => ({
  transcriptExport: vi.fn(),
  audioRevealWav: vi.fn(),
  open: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: exportMocks.open,
}));

vi.mock("@/domains/asr/api", () => ({
  transcriptExport: exportMocks.transcriptExport,
}));

vi.mock("@/domains/recorder/api", () => ({
  audioRevealWav: exportMocks.audioRevealWav,
}));

function createDeps(
  overrides: Partial<{
    activeProfileId: string | null;
    transcriptId: string | null;
    exportPath: string | null;
    lastSavedPath: string | null;
  }> = {}
) {
  const activeProfileId =
    "activeProfileId" in overrides ? (overrides.activeProfileId ?? null) : "profile-1";
  const transcriptId = "transcriptId" in overrides ? (overrides.transcriptId ?? null) : "transcript-1";
  const exportPath = "exportPath" in overrides ? (overrides.exportPath ?? null) : null;
  const lastSavedPath =
    "lastSavedPath" in overrides ? (overrides.lastSavedPath ?? null) : "C:/tmp/recording.wav";

  return {
    activeProfileId: ref(activeProfileId),
    activeTranscriptIdForAnalysis: ref(transcriptId),
    isExporting: ref(false),
    exportPath: ref<string | null>(exportPath),
    lastSavedPath: ref<string | null>(lastSavedPath),
    isRevealing: ref(false),
    clearError: vi.fn(),
    setError: vi.fn(),
  } as unknown as AudioRecorderRuntimeDeps;
}

describe("audioRecorderReviewExportActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports transcript and stores resulting file path", async () => {
    const deps = createDeps();
    exportMocks.transcriptExport.mockResolvedValue({ path: "C:/tmp/transcript.txt" });

    await exportTranscript(deps, "txt");

    expect(deps.clearError).toHaveBeenCalled();
    expect(exportMocks.transcriptExport).toHaveBeenCalledWith("profile-1", "transcript-1", "txt");
    expect(deps.exportPath.value).toBe("C:/tmp/transcript.txt");
    expect(deps.isExporting.value).toBe(false);
  });

  it("does nothing when profile or transcript context is missing", async () => {
    const missingProfile = createDeps({ activeProfileId: null });
    await exportTranscript(missingProfile, "txt");
    expect(exportMocks.transcriptExport).not.toHaveBeenCalled();

    const missingTranscript = createDeps({ transcriptId: null });
    await exportTranscript(missingTranscript, "txt");
    expect(exportMocks.transcriptExport).not.toHaveBeenCalled();
  });

  it("maps export presets to expected output formats", async () => {
    const deps = createDeps();
    exportMocks.transcriptExport.mockResolvedValue({ path: "C:/tmp/transcript.out" });

    exportPreset(deps, "presentation");
    exportPreset(deps, "podcast");
    exportPreset(deps, "voice_note");
    await Promise.resolve();
    await Promise.resolve();

    expect(exportMocks.transcriptExport).toHaveBeenNthCalledWith(
      1,
      "profile-1",
      "transcript-1",
      "txt"
    );
    expect(exportMocks.transcriptExport).toHaveBeenNthCalledWith(
      2,
      "profile-1",
      "transcript-1",
      "srt"
    );
    expect(exportMocks.transcriptExport).toHaveBeenNthCalledWith(
      3,
      "profile-1",
      "transcript-1",
      "vtt"
    );
  });

  it("opens exported file path and reports shell errors", async () => {
    const deps = createDeps({ exportPath: "C:/tmp/transcript.txt" });
    await openExportPath(deps);
    expect(exportMocks.open).toHaveBeenCalledWith("C:/tmp/transcript.txt");

    exportMocks.open.mockRejectedValueOnce(new Error("shell failure"));
    await openExportPath(deps);
    expect(deps.setError).toHaveBeenCalledWith("shell failure");
  });

  it("reveals recording and reports reveal failures", async () => {
    const deps = createDeps({ lastSavedPath: "C:/tmp/recording.wav" });

    await revealRecording(deps);
    expect(deps.clearError).toHaveBeenCalled();
    expect(exportMocks.audioRevealWav).toHaveBeenCalledWith("C:/tmp/recording.wav");
    expect(deps.isRevealing.value).toBe(false);

    exportMocks.audioRevealWav.mockRejectedValueOnce(new Error("reveal failed"));
    await revealRecording(deps);
    expect(deps.setError).toHaveBeenCalledWith("reveal failed");
  });
});
