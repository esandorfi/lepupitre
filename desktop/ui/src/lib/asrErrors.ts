export type AsrErrorCode = "sidecar_missing" | "model_missing" | "asr_timeout";

export function classifyAsrError(rawMessage: string): AsrErrorCode | null {
  if (rawMessage.includes("sidecar_missing")) {
    return "sidecar_missing";
  }
  if (rawMessage.includes("model_missing")) {
    return "model_missing";
  }
  if (rawMessage.includes("sidecar_init_timeout") || rawMessage.includes("sidecar_decode_timeout")) {
    return "asr_timeout";
  }
  return null;
}
