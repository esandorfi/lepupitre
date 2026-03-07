import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioRecorderRuntimeDeps } from "@/components/recorder/composables/audioRecorderRuntimeDeps";
import { createAudioRecorderCleanupSet } from "./audioRecorderRuntimeListenerTypes";
import { registerAsrListeners } from "./audioRecorderRuntimeAsrListeners";

const asrListenerMocks = vi.hoisted(() => ({
  listen: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: asrListenerMocks.listen,
}));

type EventHandler = (event: { payload: unknown }) => void;

function setupListenRegistry() {
  const handlers: Record<string, EventHandler> = {};
  asrListenerMocks.listen.mockImplementation(async (eventName: string, handler: EventHandler) => {
    handlers[eventName] = handler;
    return vi.fn();
  });
  return handlers;
}

function transcriptSegment(text: string) {
  return {
    t_start_ms: 0,
    t_end_ms: 1000,
    text,
    confidence: 0.8,
  };
}

function createDeps() {
  return {
    t: (key: string) => key,
    MAX_LIVE_SEGMENTS_PREVIEW: 2,
    isRecording: ref(true),
    livePartial: ref<string | null>(null),
    liveSegments: ref([transcriptSegment("first")]),
    isTranscribing: ref(false),
    transcribeJobId: ref<string | null>(null),
    transcribeProgress: ref(0),
    transcribeStageLabel: ref<string | null>(null),
    transcript: ref<{
      schema_version: "1.0.0";
      language: string;
      model_id: string | null;
      duration_ms: number | null;
      segments: ReturnType<typeof transcriptSegment>[];
    } | null>(null),
  } as unknown as AudioRecorderRuntimeDeps;
}

describe("audioRecorderRuntimeAsrListeners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles partial, commit, final progress and final result events", async () => {
    const handlers = setupListenRegistry();
    const deps = createDeps();
    const cleanups = createAudioRecorderCleanupSet();
    deps.isTranscribing.value = true;

    await registerAsrListeners(() => deps, cleanups);

    handlers["asr/partial/v1"]?.({
      payload: { schemaVersion: "1.0.0", text: "partial", t0Ms: 0, t1Ms: 100, seq: 1 },
    });
    expect(deps.livePartial.value).toBe("partial");

    handlers["asr/commit/v1"]?.({
      payload: {
        schemaVersion: "1.0.0",
        segments: [transcriptSegment("second"), transcriptSegment("third")],
        seq: 2,
      },
    });
    expect(deps.liveSegments.value.map((item) => item.text)).toEqual(["second", "third"]);
    expect(deps.livePartial.value).toBeNull();

    handlers["asr/final_progress/v1"]?.({
      payload: { schemaVersion: "1.0.0", processedMs: 500, totalMs: 1000 },
    });
    expect(deps.transcribeProgress.value).toBe(50);
    expect(deps.transcribeStageLabel.value).toBe("audio.stage_final");

    handlers["asr/final_result/v1"]?.({
      payload: {
        schemaVersion: "1.0.0",
        text: "done",
        segments: [transcriptSegment("done")],
      },
    });
    expect(deps.transcribeProgress.value).toBe(100);
    expect(deps.liveSegments.value).toEqual([]);
    expect(deps.livePartial.value).toBeNull();
    expect(deps.transcript.value?.segments.map((item) => item.text)).toEqual(["done"]);
  });

  it("ignores invalid payloads and skips partial updates when not recording", async () => {
    const handlers = setupListenRegistry();
    const deps = createDeps();
    const cleanups = createAudioRecorderCleanupSet();
    deps.isRecording.value = false;

    await registerAsrListeners(() => deps, cleanups);

    handlers["asr/partial/v1"]?.({
      payload: { schemaVersion: "1.0.0", text: "ignored", t0Ms: 0, t1Ms: 100, seq: 1 },
    });
    expect(deps.livePartial.value).toBeNull();

    handlers["asr/final_progress/v1"]?.({
      payload: { schemaVersion: "1.0.0", processedMs: 200, totalMs: 0 },
    });
    expect(deps.transcribeProgress.value).toBe(0);
  });
});
