import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type {
  AudioRecorderPhase,
  AudioRecorderRuntimeDeps,
} from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import {
  backToQuickClean,
  goAnalyzeExport,
  handleCapturePrimaryAction,
  handleOnboardingContext,
  handleShortcut,
  handleViewFeedback,
  requestAnalyze,
} from "./audioRecorderReviewNavigationActions";

function createDeps(
  overrides: Partial<{
    phase: AudioRecorderPhase;
    transcriptId: string | null;
    canAnalyze: boolean;
    canTranscribe: boolean;
    isStarting: boolean;
    isRecording: boolean;
    recordingId: string | null;
    isPaused: boolean;
  }> = {}
) {
  const phase = "phase" in overrides ? (overrides.phase ?? "quick_clean") : "quick_clean";
  const transcriptId = "transcriptId" in overrides ? (overrides.transcriptId ?? null) : "transcript-1";
  const canAnalyze = "canAnalyze" in overrides ? (overrides.canAnalyze ?? true) : true;
  const canTranscribe = "canTranscribe" in overrides ? (overrides.canTranscribe ?? true) : true;
  const isStarting = "isStarting" in overrides ? (overrides.isStarting ?? false) : false;
  const isRecording = "isRecording" in overrides ? (overrides.isRecording ?? false) : false;
  const recordingId = "recordingId" in overrides ? (overrides.recordingId ?? null) : null;
  const isPaused = "isPaused" in overrides ? (overrides.isPaused ?? false) : false;

  return {
    phase: ref<AudioRecorderPhase>(phase),
    activeTranscriptIdForAnalysis: ref(transcriptId),
    canAnalyzeRecorder: ref(canAnalyze),
    canTranscribe: ref(canTranscribe),
    isStarting: ref(isStarting),
    isRecording: ref(isRecording),
    recordingId: ref<string | null>(recordingId),
    isPaused: ref(isPaused),
    emit: vi.fn(),
    pauseRecording: vi.fn(async () => {}),
    resumeRecording: vi.fn(async () => {}),
    startRecording: vi.fn(async () => {}),
    handleCapturePrimaryAction: vi.fn(async () => {}),
    transcribeRecording: vi.fn(async () => {}),
  } as unknown as AudioRecorderRuntimeDeps;
}

function keyboardEvent(
  overrides: Partial<{
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    target: EventTarget | null;
  }> = {}
) {
  const preventDefault = vi.fn();
  return {
    key: overrides.key ?? " ",
    ctrlKey: overrides.ctrlKey ?? false,
    metaKey: overrides.metaKey ?? false,
    target: overrides.target ?? null,
    preventDefault,
  } as unknown as KeyboardEvent;
}

describe("audioRecorderReviewNavigationActions", () => {
  it("moves to analyze/export only when a transcript is available", () => {
    const deps = createDeps({ phase: "quick_clean", transcriptId: "transcript-1" });
    goAnalyzeExport(deps);
    expect(deps.phase.value).toBe("analyze_export");

    const noTranscriptDeps = createDeps({ phase: "quick_clean", transcriptId: null });
    goAnalyzeExport(noTranscriptDeps);
    expect(noTranscriptDeps.phase.value).toBe("quick_clean");
  });

  it("handles quick clean navigation and feedback/onboarding emits", () => {
    const deps = createDeps({ phase: "analyze_export" });

    backToQuickClean(deps);
    expect(deps.phase.value).toBe("quick_clean");

    handleViewFeedback(deps);
    expect(deps.emit).toHaveBeenCalledWith("viewFeedback");

    const context = {
      audience: "devs",
      audienceCustom: "platform",
      goal: "demo",
      targetMinutes: 8,
    };
    handleOnboardingContext(deps, context);
    expect(deps.emit).toHaveBeenCalledWith("onboardingContext", context);
  });

  it("requests analyze only when context allows it", () => {
    const deps = createDeps({ transcriptId: "transcript-1", canAnalyze: true });
    requestAnalyze(deps);
    expect(deps.emit).toHaveBeenCalledWith("analyze", { transcriptId: "transcript-1" });

    const blockedDeps = createDeps({ transcriptId: null, canAnalyze: true });
    requestAnalyze(blockedDeps);
    expect(blockedDeps.emit).not.toHaveBeenCalledWith("analyze", expect.anything());
  });

  it("routes capture primary action to start/pause/resume based on transport state", async () => {
    const recordingDeps = createDeps({ isRecording: true });
    await handleCapturePrimaryAction(recordingDeps);
    expect(recordingDeps.pauseRecording).toHaveBeenCalled();
    expect(recordingDeps.resumeRecording).not.toHaveBeenCalled();
    expect(recordingDeps.startRecording).not.toHaveBeenCalled();

    const pausedDeps = createDeps({ recordingId: "rec-1", isPaused: true });
    await handleCapturePrimaryAction(pausedDeps);
    expect(pausedDeps.resumeRecording).toHaveBeenCalled();
    expect(pausedDeps.pauseRecording).not.toHaveBeenCalled();
    expect(pausedDeps.startRecording).not.toHaveBeenCalled();

    const idleDeps = createDeps();
    await handleCapturePrimaryAction(idleDeps);
    expect(idleDeps.startRecording).toHaveBeenCalled();
    expect(idleDeps.pauseRecording).not.toHaveBeenCalled();
    expect(idleDeps.resumeRecording).not.toHaveBeenCalled();

    const startingDeps = createDeps({ isStarting: true });
    await handleCapturePrimaryAction(startingDeps);
    expect(startingDeps.startRecording).not.toHaveBeenCalled();
    expect(startingDeps.pauseRecording).not.toHaveBeenCalled();
    expect(startingDeps.resumeRecording).not.toHaveBeenCalled();
  });

  it("resolves keyboard shortcuts for capture, transcribe, analyze and ignores typing targets", () => {
    const captureDeps = createDeps({ phase: "capture" });
    const spaceEvent = keyboardEvent({ key: " " });
    handleShortcut(captureDeps, spaceEvent);
    expect(spaceEvent.preventDefault).toHaveBeenCalled();
    expect(captureDeps.handleCapturePrimaryAction).toHaveBeenCalled();

    const transcribeDeps = createDeps({ phase: "capture", canTranscribe: true });
    const transcribeEvent = keyboardEvent({ key: "Enter", ctrlKey: true });
    handleShortcut(transcribeDeps, transcribeEvent);
    expect(transcribeEvent.preventDefault).toHaveBeenCalled();
    expect(transcribeDeps.transcribeRecording).toHaveBeenCalled();

    const quickCleanDeps = createDeps({ phase: "quick_clean", transcriptId: "transcript-1" });
    const continueEvent = keyboardEvent({ key: "Enter", ctrlKey: true });
    handleShortcut(quickCleanDeps, continueEvent);
    expect(quickCleanDeps.phase.value).toBe("analyze_export");

    const analyzeDeps = createDeps({ phase: "analyze_export", transcriptId: "transcript-1" });
    const analyzeEvent = keyboardEvent({ key: "Enter", ctrlKey: true });
    handleShortcut(analyzeDeps, analyzeEvent);
    expect(analyzeDeps.emit).toHaveBeenCalledWith("analyze", { transcriptId: "transcript-1" });

    const typingDeps = createDeps({ phase: "capture" });
    const typingEvent = keyboardEvent({
      key: " ",
      target: { tagName: "INPUT", isContentEditable: false } as unknown as EventTarget,
    });
    handleShortcut(typingDeps, typingEvent);
    expect(typingEvent.preventDefault).not.toHaveBeenCalled();
    expect(typingDeps.handleCapturePrimaryAction).not.toHaveBeenCalled();
  });
});
