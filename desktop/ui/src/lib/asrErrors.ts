export type AsrErrorCode =
  | "sidecar_missing"
  | "sidecar_incompatible"
  | "model_missing"
  | "asr_timeout";

export function classifyAsrError(rawMessage: string): AsrErrorCode | null {
  if (rawMessage.includes("sidecar_missing")) {
    return "sidecar_missing";
  }
  if (
    rawMessage.includes("sidecar_doctor_failed") ||
    rawMessage.includes("sidecar_doctor_invalid") ||
    rawMessage.includes("sidecar_protocol_incompatible") ||
    rawMessage.includes("sidecar_unsupported_runtime_capability")
  ) {
    return "sidecar_incompatible";
  }
  if (rawMessage.includes("model_missing")) {
    return "model_missing";
  }
  if (rawMessage.includes("sidecar_init_timeout") || rawMessage.includes("sidecar_decode_timeout")) {
    return "asr_timeout";
  }
  return null;
}
