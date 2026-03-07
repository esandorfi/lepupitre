import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import {
  createAudioRecorderCleanupSet,
  type AudioRecorderCleanupSet,
} from "./audioRecorderRuntimeListenerTypes";
import { registerJobLifecycleListeners } from "./audioRecorderRuntimeJobListeners";

const jobListenerMocks = vi.hoisted(() => ({
  listen: vi.fn(),
  mapStageToLabel: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: jobListenerMocks.listen,
}));

vi.mock("@/components/recorder/composables/audioRecorderCaptureRuntime", () => ({
  mapStageToLabel: jobListenerMocks.mapStageToLabel,
}));

type EventHandler = (event: { payload: unknown }) => void;

function setupListenRegistry() {
  const handlers: Record<string, EventHandler> = {};
  jobListenerMocks.listen.mockImplementation(async (eventName: string, handler: EventHandler) => {
    handlers[eventName] = handler;
    return vi.fn();
  });
  return handlers;
}

function createDeps() {
  return {
    transcribeJobId: ref<string | null>(null),
    transcribeProgress: ref(0),
    transcribeStageLabel: ref<string | null>(null),
    setError: vi.fn(),
    t: (key: string) => key,
  } as unknown as AudioRecorderRuntimeDeps;
}

describe("audioRecorderRuntimeJobListeners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers job lifecycle listeners and handles progress/completed/failed events", async () => {
    const handlers = setupListenRegistry();
    const deps = createDeps();
    const cleanups: AudioRecorderCleanupSet = createAudioRecorderCleanupSet();
    jobListenerMocks.mapStageToLabel.mockReturnValue("audio.stage_processing");

    await registerJobLifecycleListeners(() => deps, cleanups);

    handlers["job:progress"]?.({
      payload: { jobId: "job-1", stage: "transcribe", pct: 44, message: "queued" },
    });
    expect(deps.transcribeJobId.value).toBe("job-1");
    expect(deps.transcribeProgress.value).toBe(44);
    expect(deps.transcribeStageLabel.value).toBe("audio.stage_processing");

    handlers["job:completed"]?.({ payload: { jobId: "job-1" } });
    expect(deps.transcribeProgress.value).toBe(100);

    handlers["job:failed"]?.({
      payload: { jobId: "job-1", errorCode: "asr_timeout", message: "timeout" },
    });
    expect(deps.setError).toHaveBeenCalledWith("timeout", "asr_timeout");
  });

  it("ignores events from unrelated jobs once a job id is set", async () => {
    const handlers = setupListenRegistry();
    const deps = createDeps();
    const cleanups = createAudioRecorderCleanupSet();
    deps.transcribeJobId.value = "job-1";

    await registerJobLifecycleListeners(() => deps, cleanups);

    handlers["job:progress"]?.({
      payload: { jobId: "job-2", stage: "transcribe", pct: 10, message: "queued" },
    });
    handlers["job:completed"]?.({ payload: { jobId: "job-2" } });
    handlers["job:failed"]?.({
      payload: { jobId: "job-2", errorCode: "x", message: "ignored" },
    });

    expect(deps.transcribeProgress.value).toBe(0);
    expect(deps.setError).not.toHaveBeenCalled();
  });
});
