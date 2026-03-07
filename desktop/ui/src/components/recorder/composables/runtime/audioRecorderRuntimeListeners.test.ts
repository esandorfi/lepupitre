import { describe, expect, it } from "vitest";
import * as listenerRegistrations from "./audioRecorderRuntimeListenerRegistrations";
import * as listenerTypes from "./audioRecorderRuntimeListenerTypes";
import * as listeners from "./audioRecorderRuntimeListeners";

describe("audioRecorderRuntimeListeners", () => {
  it("re-exports listener type/factory and registration helpers", () => {
    expect(listeners.createAudioRecorderCleanupSet).toBe(listenerTypes.createAudioRecorderCleanupSet);
    expect(listeners.cleanupAudioRecorderListeners).toBe(listenerTypes.cleanupAudioRecorderListeners);
    expect(listeners.registerAudioRecorderRuntimeListeners).toBe(
      listenerRegistrations.registerAudioRecorderRuntimeListeners
    );
  });
});
