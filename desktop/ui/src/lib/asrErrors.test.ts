import { describe, expect, it } from "vitest";
import { classifyAsrError } from "./asrErrors";

describe("classifyAsrError", () => {
  it("classifies known ASR missing dependencies", () => {
    expect(classifyAsrError("sidecar_missing")).toBe("sidecar_missing");
    expect(classifyAsrError("model_missing")).toBe("model_missing");
  });

  it("classifies sidecar timeout errors", () => {
    expect(classifyAsrError("sidecar_init_timeout")).toBe("asr_timeout");
    expect(classifyAsrError("sidecar_decode_timeout")).toBe("asr_timeout");
  });

  it("returns null for unknown errors", () => {
    expect(classifyAsrError("permission denied")).toBeNull();
  });
});
