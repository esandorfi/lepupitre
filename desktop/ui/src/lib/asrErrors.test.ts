import { describe, expect, it } from "vitest";
import { classifyAsrError } from "./asrErrors";

describe("classifyAsrError", () => {
  it("classifies known ASR missing dependencies", () => {
    expect(classifyAsrError("sidecar_missing")).toBe("sidecar_missing");
    expect(classifyAsrError("model_missing")).toBe("model_missing");
  });

  it("classifies sidecar compatibility errors", () => {
    expect(classifyAsrError("sidecar_doctor_failed")).toBe("sidecar_incompatible");
    expect(classifyAsrError("sidecar_doctor_invalid")).toBe("sidecar_incompatible");
    expect(classifyAsrError("sidecar_protocol_incompatible")).toBe("sidecar_incompatible");
    expect(classifyAsrError("sidecar_unsupported_runtime_capability")).toBe(
      "sidecar_incompatible"
    );
  });

  it("classifies sidecar timeout errors", () => {
    expect(classifyAsrError("sidecar_init_timeout")).toBe("asr_timeout");
    expect(classifyAsrError("sidecar_decode_timeout")).toBe("asr_timeout");
  });

  it("returns null for unknown errors", () => {
    expect(classifyAsrError("permission denied")).toBeNull();
  });
});
